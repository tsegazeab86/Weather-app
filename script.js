const API_KEY = 'b8b1c93c3732437bb6d182601261510';  
const BASE_URL = 'https://api.weatherapi.com/v1';

let currentUnit = 'C';  
let currentWeatherData = null;
let map = null;

const loadingOverlay = document.getElementById('loadingOverlay');
const weatherContent = document.getElementById('weatherContent');
const errorAlert = document.getElementById('errorAlert');
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const saveFavBtn = document.getElementById('saveFavBtn');
const favoritesList = document.getElementById('favoritesList');
const unitCBtn = document.getElementById('unitC');
const unitFBtn = document.getElementById('unitF');

function safeInitIcons() {
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

function hideLoader() {
  if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

function showLoader() {
  if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

async function getWeatherByCity(city) {
  showLoader();
  if (errorAlert) errorAlert.classList.add('d-none');

  try {
    const response = await fetch(`${BASE_URL}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(city)}&days=5&aqi=no`);
    if (!response.ok) throw new Error('City not found');
    
    currentWeatherData = await response.json();
    updateUI(currentWeatherData);
  } catch (err) {
    if (errorAlert) {
      errorAlert.textContent = `Could not fetch weather for "${city}". Please check city name or connection.`;
      errorAlert.classList.remove('d-none');
    }
    hideLoader();
  }
}

async function getWeatherByCoords(lat, lon) {
  showLoader();
  try {
    const response = await fetch(`${BASE_URL}/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=5&aqi=no`);
    if (!response.ok) throw new Error('Location failed');
    
    currentWeatherData = await response.json();
    updateUI(currentWeatherData);
  } catch (err) {
    getWeatherByCity('Injibara');
  }
}

function updateUI(data) {
  const current = data.current;
  const location = data.location;
  const forecastDays = data.forecast.forecastday;

  document.getElementById('cityName').textContent = `${location.name}, ${location.country}`;
  
  const temp = currentUnit === 'C' ? Math.round(current.temp_c) : Math.round(current.temp_f);
  const feelsLike = currentUnit === 'C' ? Math.round(current.feelslike_c) : Math.round(current.feelslike_f);
  document.getElementById('tempValue').textContent = `${temp}°${currentUnit}`;
  document.getElementById('feelsLike').textContent = `Feels like ${feelsLike}°${currentUnit}`;
  
  document.getElementById('weatherDesc').textContent = current.condition.text;
  document.getElementById('humidityVal').textContent = `${current.humidity}%`;
  document.getElementById('windVal').textContent = `${Math.round(current.wind_kph)} km/h`;
  document.getElementById('pressureVal').textContent = `${current.pressure_mb} hPa`;
  document.getElementById('visibilityVal').textContent = `${current.vis_km} km`;

  if (forecastDays[0] && forecastDays[0].astro) {
    document.getElementById('sunriseVal').textContent = forecastDays[0].astro.sunrise;
    document.getElementById('sunsetVal').textContent = forecastDays[0].astro.sunset;
  }

  const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
  document.getElementById('weatherDate').textContent = new Date(location.localtime).toLocaleDateString('en-US', options);

  const iconUrl = current.condition.icon.startsWith('//') ? `https:${current.condition.icon}` : current.condition.icon;
  document.getElementById('weatherIcon').src = iconUrl.replace('64x64', '128x128');

  renderMap(location.lat, location.lon, location.name);

  const conditionText = current.condition.text.toLowerCase();
  document.body.className = '';
  if (conditionText.includes('sun') || conditionText.includes('clear')) document.body.classList.add('theme-clear');
  else if (conditionText.includes('cloud') || conditionText.includes('overcast')) document.body.classList.add('theme-clouds');
  else if (conditionText.includes('rain') || conditionText.includes('drizzle')) document.body.classList.add('theme-rain');
  else document.body.classList.add('theme-default');

  renderForecast(forecastDays);

  if (weatherContent) weatherContent.classList.remove('d-none');
  hideLoader();
  safeInitIcons();
}

function renderMap(lat, lon, cityName) {
  if (!map) {
    map = L.map('weatherMap').setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
  } else {
    map.setView([lat, lon], 10);
  }
  L.marker([lat, lon]).addTo(map).bindPopup(cityName).openPopup();
}

function renderForecast(forecastDays) {
  const forecastContainer = document.getElementById('forecastContainer');
  if (!forecastContainer) return;
  forecastContainer.innerHTML = '';

  forecastDays.forEach(dayData => {
    const dateObj = new Date(dayData.date);
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const tempVal = currentUnit === 'C' ? Math.round(dayData.day.avgtemp_c) : Math.round(dayData.day.avgtemp_f);
    const iconUrl = dayData.day.condition.icon.startsWith('//') ? `https:${dayData.day.condition.icon}` : dayData.day.condition.icon;

    const card = document.createElement('div');
    card.className = 'glass-card p-3 text-center forecast-card text-white';
    card.innerHTML = `
      <p class="small text-light-50 font-mono mb-1">${dateStr}</p>
      <img src="${iconUrl}" alt="icon" style="width: 50px;">
      <h6 class="fw-bold mb-0 mt-1">${tempVal}°${currentUnit}</h6>
      <span class="text-xs text-light-50 text-capitalize">${dayData.day.condition.text}</span>
    `;
    forecastContainer.appendChild(card);
  });
}

function getFavorites() {
  return JSON.parse(localStorage.getItem('fav_cities') || '["Injibara", "Addis Ababa", "London"]');
}

function renderFavorites() {
  const favs = getFavorites();
  favoritesList.innerHTML = '<span>Saved:</span>';
  favs.forEach(city => {
    const badge = document.createElement('span');
    badge.className = 'badge bg-white-10 text-cyan cursor-pointer hover-scale';
    badge.textContent = city;
    badge.onclick = () => getWeatherByCity(city);
    favoritesList.appendChild(badge);
  });
}

if (saveFavBtn) {
  saveFavBtn.addEventListener('click', () => {
    if (!currentWeatherData) return;
    const city = currentWeatherData.location.name;
    let favs = getFavorites();
    if (!favs.includes(city)) {
      favs.push(city);
      localStorage.setItem('fav_cities', JSON.stringify(favs));
      renderFavorites();
    }
  });
}

unitCBtn.addEventListener('click', () => {
  if (currentUnit !== 'C') {
    currentUnit = 'C';
    unitCBtn.classList.add('active-unit', 'text-white');
    unitFBtn.classList.remove('active-unit', 'text-white');
    if (currentWeatherData) updateUI(currentWeatherData);
  }
});

unitFBtn.addEventListener('click', () => {
  if (currentUnit !== 'F') {
    currentUnit = 'F';
    unitFBtn.classList.add('active-unit', 'text-white');
    unitCBtn.classList.remove('active-unit', 'text-white');
    if (currentWeatherData) updateUI(currentWeatherData);
  }
});

function updateLiveClock() {
  const clockElement = document.getElementById('liveClockText');
  if (clockElement) {
    const now = new Date();
    clockElement.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
setInterval(updateLiveClock, 1000);

if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) getWeatherByCity(city);
  });
}

if (cityInput) {
  cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const city = cityInput.value.trim();
      if (city) getWeatherByCity(city);
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  safeInitIcons();
  updateLiveClock();
  renderFavorites();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      () => getWeatherByCity('Injibara'),
      { timeout: 5000 }
    );
  } else {
    getWeatherByCity('Injibara');
  }
});