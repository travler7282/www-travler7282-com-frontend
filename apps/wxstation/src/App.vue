<script setup lang="ts">
import { ref, onMounted } from 'vue';

// --- Interfaces ---
interface LocalSensors {
  temperature: number;
  pressure: number;
  humidity: number;
  light: number;      // Lux
  rainLevel: number;  // mm/hr
  windSpeed: number;  // mph
  windDirection: number; // degrees
  lastUpdate: string;
}

interface NWSData {
  forecast: any[];
  locationName: string;
  alerts: string[];
}

// --- State ---
const localData = ref<LocalSensors>({
  temperature: 0,
  pressure: 0,
  humidity: 0,
  light: 0,
  rainLevel: 0,
  windSpeed: 0,
  windDirection: 0,
  lastUpdate: 'Never'
});

const nwsData = ref<NWSData>({
  forecast: [],
  locationName: 'Loading Forecast...',
  alerts: []
});

const isLoading = ref(true);
const error = ref<string | null>(null);

// --- Helpers ---
const getWindDirectionLabel = (deg: number) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(deg / 45) % 8];
};

// --- Data Fetching ---
const fetchLocalData = async () => {
  try {
    // Mocking the backend call to your lab hardware
    // Replace with: const res = await fetch('/api/weather/sensors');
    localData.value = {
      temperature: 72.4,
      pressure: 1013.2,
      humidity: 45,
      light: 450,
      rainLevel: 0.0,
      windSpeed: 4.2,
      windDirection: 180,
      lastUpdate: new Date().toLocaleTimeString()
    };
  } catch (err) {
    console.error("Failed to fetch local sensor data", err);
  }
};

const fetchNWSForecast = async () => {
  try {
    // NWS API Workflow: Points -> Forecast
    // Hardcoded for a specific point (Lat/Long needed to find grid point)
    const pointsRes = await fetch('https://api.weather.gov/points/39.7456,-97.0892');
    const pointsData = await pointsRes.json();
    
    const forecastRes = await fetch(pointsData.properties.forecast);
    const forecastData = await forecastRes.json();
    
    nwsData.value.forecast = forecastData.properties.periods.slice(0, 5);
    nwsData.value.locationName = pointsData.properties.relativeLocation.properties.city;
  } catch (err) {
    error.value = "Unable to reach National Weather Service API";
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchLocalData();
  fetchNWSForecast();
  // Refresh local sensors every 30 seconds
  setInterval(fetchLocalData, 30000);
});
</script>

<template>
  <div class="wx-container">
    <header class="wx-header">
      <div class="branding">
        <h1>WXStation <span class="v-tag">v2.0</span></h1>
        <p class="subtitle">Lab Hardware + National Weather Service Integration</p>
      </div>
      <div class="status-indicator">
        <div class="pulse-dot"></div>
        <span>Live Telemetry</span>
      </div>
    </header>

    <main class="wx-grid">
      <!-- Local Sensors Column -->
      <section class="panel sensor-panel">
        <h2 class="panel-title">Real-time Lab Sensors</h2>
        <div class="sensor-cards">
          <div class="card main-metric">
            <label>Temperature</label>
            <div class="value">{{ localData.temperature }}°F</div>
          </div>
          
          <div class="card-grid">
            <div class="card small">
              <label>Humidity</label>
              <div class="value">{{ localData.humidity }}%</div>
            </div>
            <div class="card small">
              <label>Pressure</label>
              <div class="value">{{ localData.pressure }} <small>hPa</small></div>
            </div>
            <div class="card small">
              <label>Light</label>
              <div class="value">{{ localData.light }} <small>Lux</small></div>
            </div>
            <div class="card small">
              <label>Rain</label>
              <div class="value">{{ localData.rainLevel }} <small>mm</small></div>
            </div>
          </div>

          <div class="card wind-card">
            <label>Wind Conditions</label>
            <div class="wind-layout">
              <div class="wind-speed">{{ localData.windSpeed }} <span>MPH</span></div>
              <div class="wind-dir">
                <div class="compass" :style="{ transform: `rotate(${localData.windDirection}deg)` }">↑</div>
                <span>{{ getWindDirectionLabel(localData.windDirection) }} ({{ localData.windDirection }}°)</span>
              </div>
            </div>
          </div>
        </div>
        <footer class="update-ts">Last hardware sync: {{ localData.lastUpdate }}</footer>
      </section>

      <!-- NWS Regional Column -->
      <section class="panel forecast-panel">
        <h2 class="panel-title">NWS Regional: {{ nwsData.locationName }}</h2>
        
        <div v-if="isLoading" class="loading">Loading NWS Feed...</div>
        <div v-else-if="error" class="error-msg">{{ error }}</div>
        
        <div v-else class="forecast-list">
          <div v-for="period in nwsData.forecast" :key="period.number" class="forecast-item">
            <div class="item-header">
              <span class="day">{{ period.name }}</span>
              <span class="temp" :class="period.isDaytime ? 'high' : 'low'">{{ period.temperature }}°{{ period.temperatureUnit }}</span>
            </div>
            <p class="description">{{ period.shortForecast }}</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.wx-container {
  background-color: #0c0e14;
  color: #e2e8f0;
  min-height: 100vh;
  padding: 2rem;
  font-family: 'Inter', system-ui, sans-serif;
}

.wx-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  border-bottom: 1px solid #1e293b;
  padding-bottom: 1rem;
}

.v-tag { font-size: 0.8rem; color: #38bdf8; vertical-align: middle; margin-left: 0.5rem; }
.subtitle { color: #64748b; font-size: 0.9rem; margin-top: 0.25rem; }

.wx-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.panel {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 1.5rem;
}

.panel-title { font-size: 1.1rem; margin-bottom: 1.5rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }

.sensor-cards { display: flex; flex-direction: column; gap: 1rem; }

.card { background: #0d1117; padding: 1.25rem; border-radius: 8px; border: 1px solid #21262d; }
.main-metric .value { font-size: 3.5rem; font-weight: 800; color: #f8fafc; }
.card label { display: block; color: #64748b; font-size: 0.8rem; text-transform: uppercase; margin-bottom: 0.5rem; }

.card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.small .value { font-size: 1.5rem; font-weight: 600; color: #38bdf8; }

.wind-layout { display: flex; align-items: center; gap: 2rem; }
.wind-speed { font-size: 2.5rem; font-weight: 700; }
.wind-speed span { font-size: 1rem; color: #64748b; }
.compass { font-size: 2rem; display: inline-block; color: #fbbf24; }

.forecast-list { display: flex; flex-direction: column; gap: 0.75rem; }
.forecast-item { background: #0d1117; padding: 1rem; border-radius: 8px; border-left: 4px solid #38bdf8; }
.item-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
.day { font-weight: 600; }
.high { color: #f87171; }
.low { color: #60a5fa; }
.description { font-size: 0.85rem; color: #94a3b8; margin: 0; }

.update-ts { font-size: 0.7rem; color: #475569; margin-top: 1rem; text-align: right; font-family: monospace; }

.pulse-dot {
  width: 8px; height: 8px; background: #10b981; border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.status-indicator { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #10b981; font-weight: 600; }
</style>