document.addEventListener('DOMContentLoaded', () => {
    // ---  VARIABLES AND CONSTANTS ---
    const API_KEY = "7737d7d92f72b8cda5fb8afd9d20d58d"; 
    
    // DOM Element References
    const cityInput = document.getElementById('city-input');
    const tabsContainer = document.querySelector('.container'); // Main container for event delegation
    const tabContents = document.querySelectorAll('.tab-content');
    const searchContent = document.getElementById('search-content');
    const clothingContent = document.getElementById('clothing-content');
    const aqiContent = document.getElementById('aqi-content');

    // State to hold fetched data
    let currentWeatherData = null;

    // --- NEW: Map-related variables ---
    let map = null;
    let mapInitialized = false;

    // --- EVENT LISTENERS ---
    
    // Using event delegation on a parent container for all tab clicks
    tabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-link')) {
            const tabName = e.target.dataset.tab;
            handleTabClick(tabName);
        }
    });

    cityInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            handleTabClick('search');
        }
    });

    // ---  TAB HANDLING LOGIC ---

    function handleTabClick(tabName) {
        document.querySelectorAll('.tab-link').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        if (tabName === 'search') {
            const city = cityInput.value.trim();
            if (city) {
                fetchWeatherByCity(city);
            } else {
                showContent('search-content');
            }
        } else if (tabName === 'location') {
            fetchWeatherByLocation();
        } else if (tabName === 'clothing') {
            displayClothingSuggestions();
        } else if (tabName === 'aqi') {
            displayAqiInfo();
        } else if (tabName === 'map') { 
            showContent('map-content');
            if (!mapInitialized) {
                initMap();
            }
        }
    }

    function showContent(contentId) {
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === contentId);
        });
    }

    // --- NEW: MAP INITIALIZATION LOGIC ---

    function initMap() {
        map = L.map('map').setView([20, 0], 2); // Centered to see the world

        // Base map layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // OpenWeatherMap temperature layer
        L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`, {
            attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
        }).addTo(map);
        
        // Map click event
        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            fetchAllData(lat, lng);
            // Switch back to search tab to show results
            handleTabClick('search');
        });

        mapInitialized = true;
    }

    // ---  API FETCHING LOGIC ---

    async function fetchWeatherByCity(city) {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
        try {
            const response = await fetch(weatherUrl);
            if (!response.ok) throw new Error('City not found.');
            const data = await response.json();
            const { lat, lon } = data.coord;
            fetchAllData(lat, lon, data.name);
        } catch (error) {
            alert(error.message);
        }
    }
    
    function fetchWeatherByLocation() {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            fetchAllData(latitude, longitude);
        }, error => {
            alert('Unable to retrieve your location. Please allow location access or search for a city.');
        });
    }

    async function fetchAllData(lat, lon) {
        try {
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
            const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

            const [weatherRes, forecastRes, aqiRes] = await Promise.all([
                fetch(weatherUrl),
                fetch(forecastUrl),
                fetch(aqiUrl)
            ]);

            if (!weatherRes.ok || !forecastRes.ok || !aqiRes.ok) throw new Error('Failed to fetch weather data.');

            const weatherData = await weatherRes.json();
            const forecastData = await forecastRes.json();
            const aqiData = await aqiRes.json();
            
            currentWeatherData = { weather: weatherData, forecast: forecastData, aqi: aqiData.list[0] };
            
            displayCurrentWeather(currentWeatherData);
            displayForecast(currentWeatherData.forecast);
            showContent('search-content');

        } catch (error) {
            alert(error.message);
        }
    }

    // ---  UI DISPLAY FUNCTIONS ---

    function displayCurrentWeather({ weather }) {
        const infoContainer = searchContent.querySelector('.weather-info-container');
        infoContainer.innerHTML = `
            <div class="current-weather-card">
                <h2>${weather.name}, ${weather.sys.country}</h2>
                <div class="temp">${Math.round(weather.main.temp)}°C</div>
                <img src="https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png" alt="${weather.weather[0].description}">
                <p style="text-transform: capitalize;">${weather.weather[0].description}</p>
                <div class="weather-details">
                    <span><strong>Wind:</strong> ${weather.wind.speed} M/S</span>
                    <span><strong>Humidity:</strong> ${weather.main.humidity}%</span>
                </div>
            </div>
        `;
    }

    function displayForecast({ list }) {
        const forecastContainer = searchContent.querySelector('.forecast-container');
        const dailyForecasts = list.filter(item => item.dt_txt.includes("12:00:00"));
        
        forecastContainer.innerHTML = `<h2>5-Day Forecast</h2>` + dailyForecasts.map(day => `
            <div class="forecast-card">
                <h3>${new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}</h3>
                <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="${day.weather[0].description}">
                <p><strong>${Math.round(day.main.temp)}°C</strong></p>
            </div>
        `).join('');
    }

   function displayClothingSuggestions() {
    if (!currentWeatherData) {
        clothingContent.innerHTML = `<h2>Please search for a city first to get suggestions.</h2>`;
        showContent('clothing-content');
        return;
    }
    
    const temp = Math.round(currentWeatherData.weather.main.temp);
    const condition = currentWeatherData.weather.weather[0].main;
    
    let suggestion = "";

    // --- FINAL LOGIC: Single, cohesive suggestions for each weather type ---

    if (condition === "Rain" || condition === "Drizzle" || condition === "Thunderstorm") {
        if (temp > 20) { // Warm Rain
            suggestion = "<p>A light waterproof jacket over a t-shirt is a good choice. Don't forget an umbrella! 🌧️</p>";
        } else { // Cool Rain
            suggestion = "<p>A waterproof jacket over a warm sweater is recommended. 🌧️</p>";
        }
    } else if (condition === "Snow") {
        suggestion = "<p>It's snowing! A heavy, waterproof coat, warm layers, and gloves are essential. ❄️</p>";
    } else {
        // --- Dry Day Logic ---
        if (temp >= 28) {
            suggestion = "<p>It's a warm and dry day! A t-shirt and shorts are perfect. 💧</p>";
        } else if (temp >= 18 && temp < 28) {
            suggestion = "<p>The weather is mild and pleasant. Long sleeves or a light jacket will be comfortable. 👍</p>";
        } else { // temp < 18
            suggestion = "<p>It's a cool and dry day! A warm jacket or sweater is recommended. 🧥</p>";
        }
    }

    clothingContent.innerHTML = `
        <h2>Today's Clothing Suggestion for ${currentWeatherData.weather.name}</h2>
        <div>${suggestion}</div>
    `;
    showContent('clothing-content');
}

    function displayAqiInfo() {
        if (!currentWeatherData) {
            aqiContent.innerHTML = `<h2>Please search for a city first to get AQI data.</h2>`;
            showContent('aqi-content');
            return;
        }

        const aqi = currentWeatherData.aqi.main.aqi;
        const { level, color, advice } = getAqiDetails(aqi);

        aqiContent.innerHTML = `
            <h2>Air Quality Index (AQI) in ${currentWeatherData.weather.name}</h2>
            <div class="aqi-card">
                <div class="aqi-level" style="background-color: ${color};">${level}</div>
                <h3>Health Advice</h3>
                <p><strong>General Population:</strong> <span class="advice-text">${advice.general}</span></p>
                <p><strong>Children & Elderly:</strong> <span class="advice-text">${advice.sensitive}</span></p>
            </div>
        `;
        showContent('aqi-content');
    }

    // ---  HELPER FUNCTIONS ---

    function getAqiDetails(aqi) {
        switch (aqi) {
            case 1: return { level: 'Good', color: '#2ECC71', advice: { general: 'It\'s a great day to be active outside.', sensitive: 'Enjoy the fresh air!' } };
            case 2: return { level: 'Fair', color: '#F1C40F', advice: { general: 'Air quality is acceptable.', sensitive: 'Unusually sensitive people should consider reducing prolonged or heavy exertion.' } };
            case 3: return { level: 'Moderate', color: '#E67E22', advice: { general: 'Sensitive groups may experience health effects.', sensitive: 'Limit prolonged outdoor exertion.' } };
            case 4: return { level: 'Poor', color: '#E74C3C', advice: { general: 'Everyone may begin to experience health effects.', sensitive: 'Avoid prolonged outdoor exertion; consider staying indoors.' } };
            case 5: return { level: 'Very Poor', color: '#9B59B6', advice: { general: 'Health alert: everyone may experience more serious health effects.', sensitive: 'Everyone should avoid all outdoor exertion.' } };
            default: return { level: 'Unknown', color: '#95A5A6', advice: { general: 'Data not available.', sensitive: 'Data not available.' } };
        }
    }
});