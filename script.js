// ======================= WEATHER APP LOGIC =======================

const API_KEY = "b3ac606dceaca470eacf60823e6b9660";


const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

// Global state
let lastWeatherData = null;
let isCelsius = true;

// DOM elements
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const toggleUnitBtn = document.getElementById("toggleUnitBtn");
const clearRecentBtn = document.getElementById("clearRecentBtn");
const loadingDiv = document.getElementById("loadingIndicator");
const weatherDisplayDiv = document.getElementById("weatherDisplay");
const cityNameSpan = document.getElementById("cityName");
const weatherIconContainer = document.getElementById("weatherIconContainer");
const tempDisplaySpan = document.getElementById("tempDisplay");
const descriptionSpan = document.getElementById("description");
const humiditySpan = document.getElementById("humidity");
const windSpeedSpan = document.getElementById("windSpeed");
const recentContainer = document.getElementById("recentContainer");

// Helper: loading & error
function setLoading(isLoading, msg = "Fetching weather...") {
  loadingDiv.innerHTML = isLoading ? `<div class="loading">⏳ ${msg}</div>` : "";
}

function showError(msg) {
  const existing = document.querySelector(".error-msg");
  if (existing) existing.remove();
  const errDiv = document.createElement("div");
  errDiv.className = "error-msg";
  errDiv.innerText = `⚠️ ${msg}`;
  weatherDisplayDiv.insertBefore(errDiv, weatherDisplayDiv.firstChild);
  setTimeout(() => errDiv.remove(), 3800);
}

function clearErrors() {
  const err = document.querySelector(".error-msg");
  if (err) err.remove();
}

// UI update based on current unit
function refreshUI() {
  if (!lastWeatherData) return;
  const data = lastWeatherData;
  cityNameSpan.innerText = `${data.cityName}${data.country ? `, ${data.country}` : ""}`;
  let temp = data.celsiusTemp;
  let unit = "°C";
  if (!isCelsius) {
    temp = (data.celsiusTemp * 9/5) + 32;
    unit = "°F";
  }
  tempDisplaySpan.innerHTML = `${Math.round(temp * 10) / 10}<span>${unit}</span>`;
  descriptionSpan.innerText = data.description;
  humiditySpan.innerText = `${data.humidity}%`;
  windSpeedSpan.innerText = `${data.windSpeed} m/s`;
  const iconUrl = `https://openweathermap.org/img/wn/${data.iconCode}@2x.png`;
  weatherIconContainer.innerHTML = `<img src="${iconUrl}" alt="${data.description}" class="weather-icon">`;
}

// Save weather data after API success
function processWeatherData(apiData) {
  lastWeatherData = {
    cityName: apiData.name,
    country: apiData.sys?.country || "",
    celsiusTemp: apiData.main.temp,
    description: apiData.weather[0]?.description || "Clear",
    iconCode: apiData.weather[0]?.icon,
    humidity: apiData.main.humidity,
    windSpeed: apiData.wind.speed
  };
  refreshUI();
  addCityToRecent(apiData.name);
}

// Generic fetch wrapper
async function fetchWeather(url) {
  setLoading(true);
  clearErrors();
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) throw new Error("City not found. Check spelling.");
      if (res.status === 401) throw new Error("Invalid API key. Get a free key from OpenWeatherMap.");
      throw new Error(`Server error (${res.status})`);
    }
    const data = await res.json();
    processWeatherData(data);
    setLoading(false);
    return true;
  } catch (err) {
    showError(err.message);
    setLoading(false);
    return false;
  }
}

// Search by city name
async function searchByCity(city) {
  if (!city.trim()) return showError("Enter a city name.");
  if (API_KEY === "YOUR_API_KEY_HERE") {
    return showError("🔑 Replace 'YOUR_API_KEY_HERE' with your OpenWeatherMap API key in script.js");
  }
  const url = `${BASE_URL}?q=${encodeURIComponent(city.trim())}&appid=${API_KEY}&units=metric`;
  await fetchWeather(url);
}

// Search by coordinates
async function searchByCoords(lat, lon) {
  if (API_KEY === "YOUR_API_KEY_HERE") {
    return showError("API key missing. Add your key to script.js");
  }
  const url = `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  await fetchWeather(url);
}

// Geolocation
function handleLocation() {
  if (!navigator.geolocation) return showError("Geolocation not supported.");
  setLoading(true, "Getting your location...");
  navigator.geolocation.getCurrentPosition(
    pos => searchByCoords(pos.coords.latitude, pos.coords.longitude),
    err => {
      setLoading(false);
      showError("Location denied or unavailable.");
    }
  );
}

// Unit toggle
function toggleUnit() {
  isCelsius = !isCelsius;
  toggleUnitBtn.innerHTML = isCelsius ? "🌡️ Switch to °F" : "🌡️ Switch to °C";
  if (lastWeatherData) refreshUI();
}

// ========== RECENT SEARCHES (localStorage) ==========
const RECENT_KEY = "weatherApp_recentCities";
const MAX_RECENT = 5;

function getRecent() {
  const stored = localStorage.getItem(RECENT_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveRecent(list) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

function addCityToRecent(city) {
  let recent = getRecent().filter(c => c.toLowerCase() !== city.toLowerCase());
  recent.unshift(city);
  if (recent.length > MAX_RECENT) recent.pop();
  saveRecent(recent);
  renderRecent();
}

function clearRecent() {
  localStorage.removeItem(RECENT_KEY);
  renderRecent();
  showError("Recent cities cleared");
  setTimeout(clearErrors, 1500);
}

function renderRecent() {
  const recent = getRecent();
  recentContainer.innerHTML = "";
  if (recent.length === 0) {
    recentContainer.innerHTML = `<span style="color:#eef4ff80;">— no recent cities —</span>`;
    return;
  }
  recent.forEach(city => {
    const chip = document.createElement("div");
    chip.className = "recent-chip";
    chip.innerText = city;
    chip.onclick = () => {
      cityInput.value = city;
      searchByCity(city);
    };
    recentContainer.appendChild(chip);
  });
}

// ========== Initialization ==========
function init() {
  renderRecent();
  toggleUnitBtn.innerText = "🌡️ Switch to °F";
  searchBtn.onclick = () => searchByCity(cityInput.value);
  locationBtn.onclick = handleLocation;
  toggleUnitBtn.onclick = toggleUnit;
  clearRecentBtn.onclick = clearRecent;
  cityInput.onkeypress = (e) => {
    if (e.key === "Enter") searchByCity(cityInput.value);
  };
  if (API_KEY !== "YOUR_API_KEY_HERE") {
    searchByCity("London"); // demo default
  } else {
    showError("🔧 Add your OpenWeatherMap API key in script.js (line with const API_KEY)");
  }
}

init();