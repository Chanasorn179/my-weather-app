const API_KEY = "630fb8805039dced02d253e3e99e7abf"; // แทนที่ด้วยของจริง
const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const currentEl = document.getElementById("current-weather");
const forecastContainer = document.getElementById("forecast-container");
const errorWrapper = document.getElementById("error-wrapper");
const historyWrapper = document.getElementById("history-wrapper");


const STORAGE_KEY = "weatherApp_recentSearches";
const MAX_HISTORY = 6;
const TEMP_HOT = 30;
const TEMP_COLD = 20;

// event
form.addEventListener("submit", e => {
  e.preventDefault();
  const city = input.value.trim();
  if (!city) return;
  fetchWeather(city);
});

function getHistory() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveSearch(city) {
  let history = getHistory();
  city = city.trim();
  history = history.filter(c => c.toLowerCase() !== city.toLowerCase());
  history.unshift(city);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistoryTags();
}

function renderHistoryTags() {
  historyWrapper.innerHTML = "";
  const history = getHistory();
  if (!history.length) return;

  const container = document.createElement("div");
  container.className = "history-tags";

  const label = document.createElement("div");
  label.className = "label";
  label.textContent = "ค้นหาล่าสุด:";
  container.appendChild(label);

  history.forEach(city => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tag";
    btn.innerHTML = `<span class="text">${city}</span><span class="remove-btn" data-city="${city}">&times;</span>`;
    btn.addEventListener("click", e => {
      if (e.target.closest(".remove-btn")) return; // skip if clicked remove
      input.value = city;
      fetchWeather(city);
      // active styling
      document.querySelectorAll(".tag").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
    });
    const remove = btn.querySelector(".remove-btn");
    remove.addEventListener("click", e => {
      e.stopPropagation();
      let hist = getHistory();
      hist = hist.filter(c => c.toLowerCase() !== city.toLowerCase());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hist));
      renderHistoryTags();
    });
    container.appendChild(btn);
  });

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "clear-history";
  clear.textContent = "ล้างทั้งหมด";
  clear.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    renderHistoryTags();
  });
  container.appendChild(clear);

  historyWrapper.appendChild(container);
}

function isDaytime(current) {
  const nowUtcSec = Math.floor(Date.now() / 1000);
  const localNow = nowUtcSec + current.timezone;
  return localNow >= current.sys.sunrise && localNow < current.sys.sunset;
}

// luminance helper
function hexToLuminance(hex) {
  const c = hex.replace("#", "");
  const bigint = parseInt(c, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;

  [r, g, b] = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function adjustTextContrast(mainStops) {
  const root = document.documentElement;
  const cityEl = document.querySelector(".city-name");
  const tempEl = document.querySelector(".temperature");

  const lum1 = hexToLuminance(mainStops[0]);
  const lum2 = hexToLuminance(mainStops[1]);
  const avgLum = (lum1 + lum2) / 2;

  // ถ้าพื้นหลังสว่างมาก ให้ใช้ข้อความเข้ม (remove gradient, ใส่ class)
  if (avgLum > 0.65) {
    root.style.setProperty("--nav-link-color", "#1f2d3a");
    root.style.setProperty("--text-shadow-glow", "0 2px 6px rgba(255,255,255,0.2)");
    cityEl?.classList.remove("gradient");
    tempEl?.classList.remove("gradient");
    document.body.classList.add("high-contrast-dark");
  } else {
    // พื้นหลังมืด/ปานกลาง: ใช้ gradient text (ถ้ามี) หรือสีขาว
    document.body.classList.remove("high-contrast-dark");
    // ถ้าอยากให้กลับไป gradient เสมอ:
    cityEl?.classList.add("gradient");
    tempEl?.classList.add("gradient");
    // ตั้ง fallback สีขาว เผื่อ gradient จมหาย
    root.style.setProperty("--nav-link-color", "#ffffff");
    root.style.setProperty("--text-shadow-glow", "0 3px 12px rgba(0,0,0,0.5)");
  }
}

function updateBackground(current) {
  const body = document.body;
  let gradient;
  let mainStops = [];
  const temp = current.main.temp;
  const day = isDaytime(current);

  if (day && temp >= 35) { 
    gradient = "linear-gradient(135deg, #ffde7a 0%, #ff9f43 60%, #ff5c00 100%)"; //กลางวัน ร้อนจัด//
    mainStops = ["#ffde7a", "#ff5c00"];
  } else if (day && temp >= TEMP_HOT) { 
    gradient = "linear-gradient(135deg, #ffe47a 0%, #ffb347 60%, #ff8c42 100%)"; //กลางวัน ร้อน//
    mainStops = ["#ffe47a", "#ff8c42"];
  } else if (day && temp < TEMP_COLD) { 
    gradient = "linear-gradient(135deg, #a0d8f1 0%, #7ab8e0 60%, #4f9fd1 100%)"; //กลางวัน อากาศเย็น//
    mainStops = ["#a0d8f1", "#4f9fd1"];
  } else if (day) { 
    gradient = "linear-gradient(135deg, #92d8f9 0%, #d7ffc7 70%, #fff5b7 100%)"; //กลางวัน อากาศเย็นมาก//
    mainStops = ["#92d8f9", "#fff5b7"];
  } else if (!day && temp >= 35) { 
    gradient = "linear-gradient(135deg, #d1477c 0%, #a4508b 60%, #ff758c 100%)"; //กลางคืน ร้อนจัด//
    mainStops = ["#d1477c", "#ff758c"];
  } else if (!day && temp >= TEMP_HOT) { 
    gradient = "linear-gradient(135deg, #6f3fae 0%, #9f5fb8 50%, #ff9aac 100%)"; //กลางคืน ร้อน//
    mainStops = ["#6f3fae", "#ff9aac"];
  } else if (!day && temp < TEMP_COLD - 5) { 
    gradient = "linear-gradient(135deg, #0f1e38 0%, #1f3f70 60%, #3f6fae 100%)"; //กลางคืน อากาศเย็นมาก//
    mainStops = ["#0f1e38", "#3f6fae"];
  } else if (!day && temp < TEMP_COLD) { 
    gradient = "linear-gradient(135deg, #0f1e38 0%, #1f3f70 60%, #2e5a9d 100%)"; //กลางคืน อากาศเย็น//
    mainStops = ["#0f1e38", "#2e5a9d"];
  } else { 
    gradient = "linear-gradient(135deg, #1f2d3a 0%, #2f445f 60%, #3f5f8a 100%)"; //กลางคืน อากาศปานกลาง//
    mainStops = ["#1f2d3a", "#3f5f8a"];
  }

  body.style.transition = "background 1s ease";
  body.style.background = gradient;
  adjustTextContrast(mainStops);
}

function showError(message) {
  errorWrapper.innerHTML = `
    <div class="error-message">
      ${message}
    </div>
  `;
}

function clearError() {
  errorWrapper.innerHTML = "";
}

async function fetchWeather(city) {
  clearError();
  currentEl.innerHTML = `<div class="city-name">กำลังโหลด...</div>`;
  forecastContainer.innerHTML = "";
  try {
    if (!API_KEY || API_KEY.startsWith("ใส่_")) {
      throw new Error("กรุณาใส่ API Key ที่ถูกต้อง");
    }

    const currRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&lang=th&appid=${API_KEY}`
    );
    if (!currRes.ok) throw new Error("ไม่พบเมืองหรือชื่อเมืองไม่ถูกต้อง");
    const curr = await currRes.json();

    const foreRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&lang=th&appid=${API_KEY}`
    );
    if (!foreRes.ok) throw new Error("ดึงพยากรณ์ล้มเหลว");
    const fore = await foreRes.json();

    saveSearch(city);
    renderCurrent(curr);
    renderForecast(fore);
    updateBackground(curr);
  } catch (e) {
    currentEl.innerHTML = "";
    showError(`ข้อผิดพลาด: ${e.message}`);
  }
}

function renderCurrent(data) {
  const location = `${data.name}, ${data.sys.country}`;
  const temp = Math.round(data.main.temp);
  const desc = data.weather[0].description;
  const feels = Math.round(data.main.feels_like);
  const humidity = data.main.humidity;
  const wind = data.wind.speed;

  currentEl.innerHTML = `
    <div class="city-name gradient">${location}</div>
    <div class="weather-icon-container">
      <div class="weather-icon-large">🌤️</div>
    </div>
    <div class="temperature gradient">${temp}°C</div>
    <div class="condition">${desc}</div>
    <div class="weather-details">
      <div class="detail-item" style="--i:0;">
        <div class="detail-icon">🌡️</div>
        <div>
          <div><strong>รู้สึกเหมือน:</strong> ${feels}°C</div>
        </div>
      </div>
      <div class="detail-item" style="--i:1;">
        <div class="detail-icon">💧</div>
        <div>
          <div><strong>ความชื้น:</strong> ${humidity}%</div>
        </div>
      </div>
      <div class="detail-item" style="--i:2;">
        <div class="detail-icon">🌬️</div>
        <div>
          <div><strong>ลม:</strong> ${wind} m/s</div>
        </div>
      </div>
    </div>
  `;
}

function groupByDay(list) {
  const map = {};
  list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toISOString().split("T")[0];
    if (!map[dayKey]) map[dayKey] = [];
    map[dayKey].push(item);
  });
  const summary = [];
  Object.keys(map).slice(0,5).forEach(day => {
    const entries = map[day];
    const temps = entries.map(i => i.main.temp);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const freq = {};
    entries.forEach(i => {
      const desc = i.weather[0].description;
      freq[desc] = (freq[desc] || 0) + 1;
    });
    const mainDesc = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0][0];
    const icon = entries[0].weather[0].icon;
    summary.push({
      date: day,
      tempMin: Math.round(min),
      tempMax: Math.round(max),
      description: mainDesc,
      icon
    });
  });
  return summary;
}

function renderForecast(forecast) {
  const days = groupByDay(forecast.list);
  forecastContainer.innerHTML = "";
  days.forEach((d, idx) => {
    const dateObj = new Date(d.date);
    const opts = { weekday: "short", day: "numeric", month: "short" };
    const label = dateObj.toLocaleDateString("th-TH", opts);
    const card = document.createElement("div");
    card.className = "forecast-item";
    card.style.setProperty("--i", idx);
    card.innerHTML = `
      <div class="forecast-day">${label}</div>
      <div class="forecast-icon">🌤️</div>
      <div class="forecast-temp">${d.tempMax}° / ${d.tempMin}°</div>
      <div class="forecast-desc">${d.description}</div>
    `;
    forecastContainer.appendChild(card);
  });
}

// initial load
document.addEventListener("DOMContentLoaded", () => {
  renderHistoryTags();
  const history = getHistory();
  if (history.length) {
    input.value = history[0];
    fetchWeather(history[0]);
  }
});
