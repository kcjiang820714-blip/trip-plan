const STORAGE_KEY = "trip-notebook-v2";
const LEGACY_STORAGE_KEY = "trip-notebook-v1";
const isReadonly = new URLSearchParams(window.location.search).get("view") === "readonly";

const defaultTrip = {
  id: createId(),
  title: "京都三日散步",
  startDate: "2026-10-12",
  endDate: "2026-10-14",
  dates: "2026/10/12 - 2026/10/14",
  days: [
    {
      title: "抵達京都",
      date: "10/12（一）",
      items: [
        { time: "10:30", place: "京都車站", type: "交通", note: "抵達後先寄放行李，確認 ICOCA 餘額。" },
        { time: "12:00", place: "錦市場", type: "午餐", note: "先吃小份量，下午還有咖啡店。" },
        { time: "15:00", place: "清水寺", type: "景點", note: "從二年坂慢慢走上去，預留拍照時間。" }
      ]
    },
    {
      title: "嵐山與河邊",
      date: "10/13（二）",
      items: [
        { time: "09:00", place: "嵐山竹林", type: "景點", note: "早點到，人會少很多。" },
        { time: "11:30", place: "渡月橋", type: "散步", note: "河邊休息，視天氣調整停留時間。" },
        { time: "18:30", place: "祇園晚餐", type: "餐廳", note: "訂位資訊可以放在這裡。" }
      ]
    },
    {
      title: "伏見稻荷與返程",
      date: "10/14（三）",
      items: [
        { time: "08:30", place: "伏見稻荷大社", type: "景點", note: "只走到中段鳥居，不硬攻山頂。" },
        { time: "13:00", place: "京都車站伴手禮", type: "購物", note: "買完直接拿行李，避免回頭路。" },
        { time: "16:10", place: "前往機場", type: "交通", note: "確認班次，至少提早 2 小時到機場。" }
      ]
    }
  ]
};

const state = {
  library: loadLibrary(),
  activeTripId: null,
  activeDayIndex: 0,
  editingItemIndex: null,
  editingTripId: null,
  expandedItemId: null
};

state.activeTripId = state.library.trips[0]?.id || null;

const homeView = document.querySelector("#homeView");
const tripView = document.querySelector("#tripView");
const tripList = document.querySelector("#tripList");
const tripTitle = document.querySelector("#tripTitle");
const tripDates = document.querySelector("#tripDates");
const tripSummary = document.querySelector("#tripSummary");
const activeDate = document.querySelector("#activeDate");
const activeDayTitle = document.querySelector("#activeDayTitle");
const dayTabs = document.querySelector("#dayTabs");
const timeline = document.querySelector("#timeline");
const itemDialog = document.querySelector("#itemDialog");
const itemForm = document.querySelector("#itemForm");
const dialogTitle = document.querySelector("#dialogTitle");
const deleteItemButton = document.querySelector("#deleteItemButton");
const tripDialog = document.querySelector("#tripDialog");
const tripForm = document.querySelector("#tripForm");
const tripDialogTitle = document.querySelector("#tripDialogTitle");
const deleteTripButton = document.querySelector("#deleteTripButton");
const timeInput = document.querySelector("#timeInput");
const placeInput = document.querySelector("#placeInput");
const typeInput = document.querySelector("#typeInput");
const noteInput = document.querySelector("#noteInput");
const flightFields = document.querySelector("#flightFields");
const airlineInput = document.querySelector("#airlineInput");
const flightCodeInput = document.querySelector("#flightCodeInput");
const departureTimeInput = document.querySelector("#departureTimeInput");
const departureAirportInput = document.querySelector("#departureAirportInput");
const departureTerminalInput = document.querySelector("#departureTerminalInput");
const arrivalTimeInput = document.querySelector("#arrivalTimeInput");
const arrivalAirportInput = document.querySelector("#arrivalAirportInput");
const arrivalTerminalInput = document.querySelector("#arrivalTerminalInput");
const transportFields = document.querySelector("#transportFields");
const transportModeInput = document.querySelector("#transportModeInput");
const transportSegments = document.querySelector("#transportSegments");
const addTransportSegmentButton = document.querySelector("#addTransportSegmentButton");
const tripNameInput = document.querySelector("#tripNameInput");
const tripStartInput = document.querySelector("#tripStartInput");
const tripEndInput = document.querySelector("#tripEndInput");
const tripDaysInput = document.querySelector("#tripDaysInput");
const exportButton = document.querySelector("#exportButton");
const importButton = document.querySelector("#importButton");
const importFileInput = document.querySelector("#importFileInput");
const readonlyBanner = document.querySelector("#readonlyBanner");

function loadLibrary() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.trips) && parsed.trips.length > 0) return normalizeLibrary(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    try {
      const trip = JSON.parse(legacy);
      return normalizeLibrary({ trips: [{ ...trip, id: createId() }] });
    } catch {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }

  return normalizeLibrary({ trips: [structuredClone(defaultTrip)] });
}

function normalizeLibrary(library) {
  return {
    trips: library.trips.map((trip) => {
      const dateRange = normalizeTripDates(trip);
      const days = Array.isArray(trip.days) && trip.days.length > 0 ? trip.days.map(normalizeDay) : createBlankDays(dateRange.dayCount, dateRange.startDate);

      return {
        id: trip.id || createId(),
        title: trip.title || "未命名旅程",
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        dates: dateRange.label,
        days
      };
    })
  };
}

function normalizeDay(day, index) {
  return {
    title: day.title || `Day ${index + 1}`,
    date: day.date || `第 ${index + 1} 天`,
    items: Array.isArray(day.items) ? day.items.map(normalizeItem) : []
  };
}

function normalizeItem(item) {
  return {
    id: item.id || createId(),
    time: item.time || "",
    place: item.place || "",
    type: item.type || "",
    note: item.note || "",
    airline: item.airline || "",
    flightCode: item.flightCode || "",
    departureTime: item.departureTime || "",
    departureAirport: item.departureAirport || "",
    departureTerminal: item.departureTerminal || "",
    arrivalTime: item.arrivalTime || "",
    arrivalAirport: item.arrivalAirport || "",
    arrivalTerminal: item.arrivalTerminal || "",
    transportMode: item.transportMode || "",
    transportSegments: Array.isArray(item.transportSegments) ? item.transportSegments.map(normalizeTransportSegment) : []
  };
}

function normalizeTransportSegment(segment) {
  return {
    mode: segment.mode || "",
    company: segment.company || "",
    departureStation: segment.departureStation || "",
    routeName: segment.routeName || "",
    routeNumber: segment.routeNumber || "",
    departureTime: segment.departureTime || "",
    trainNumber: segment.trainNumber || "",
    arrivalStation: segment.arrivalStation || "",
    arrivalTime: segment.arrivalTime || ""
  };
}

function normalizeTripDates(trip) {
  const parsed = trip.startDate && trip.endDate ? { startDate: trip.startDate, endDate: trip.endDate } : parseDateRange(trip.dates);
  const startDate = parsed?.startDate || todayString();
  const endDate = parsed?.endDate || addDays(startDate, Math.max(0, (trip.days?.length || 3) - 1));

  return {
    startDate,
    endDate,
    dayCount: calculateDayCount(startDate, endDate),
    label: formatDateRange(startDate, endDate)
  };
}

function parseDateRange(value) {
  const matches = String(value || "").match(/\d{4}\/\d{1,2}\/\d{1,2}/g);
  if (!matches || matches.length < 2) return null;

  return {
    startDate: matches[0].replaceAll("/", "-").replace(/-(\d)(?=-|$)/g, "-0$1"),
    endDate: matches[1].replaceAll("/", "-").replace(/-(\d)(?=-|$)/g, "-0$1")
  };
}

function createBlankDays(count, startDate = null) {
  return Array.from({ length: count }, (_, index) => ({
    title: `第 ${index + 1} 天`,
    date: startDate ? formatShortDate(addDays(startDate, index)) : `Day ${index + 1}`,
    items: []
  }));
}

function syncTripDayDates(trip) {
  trip.days = trip.days.map((day, index) => ({
    ...day,
    title: day.title || `第 ${index + 1} 天`,
    date: formatShortDate(addDays(trip.startDate, index))
  }));
}

function todayString() {
  const today = new Date();
  return toDateInputValue(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

function addDays(dateString, days) {
  const date = createUtcDate(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateInputValue(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function calculateDayCount(startDate, endDate) {
  const start = createUtcDate(startDate);
  const end = createUtcDate(endDate);
  const diff = Math.round((end - start) / 86400000) + 1;
  return Math.max(1, Math.min(30, Number.isFinite(diff) ? diff : 1));
}

function formatDateRange(startDate, endDate) {
  return `${startDate.replaceAll("-", "/")} - ${endDate.replaceAll("-", "/")}`;
}

function formatShortDate(dateString) {
  const date = createUtcDate(dateString);
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}（${weekdays[date.getUTCDay()]}）`;
}

function createUtcDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateInputValue(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function safeFileName(value) {
  return String(value || "trip-book")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function createId() {
  return `trip-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveLibrary() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.library));
}

function setLibrary(library) {
  state.library = normalizeLibrary(library);
  state.activeTripId = state.library.trips[0]?.id || null;
  state.activeDayIndex = 0;
  saveLibrary();
  render();
  showHome();
}

function currentTrip() {
  return state.library.trips.find((trip) => trip.id === state.activeTripId) || state.library.trips[0];
}

function currentDay() {
  return currentTrip().days[state.activeDayIndex];
}

function render() {
  renderHome();
  renderTrip();
}

function renderHome() {
  tripList.innerHTML = state.library.trips
    .map((trip) => {
      const itemCount = countItems(trip);
      return `
        <button class="trip-card" type="button" data-open-trip="${trip.id}">
          <span class="trip-card-art" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <div class="trip-card-content">
            <h2>${escapeHtml(trip.title)}</h2>
            <p>${escapeHtml(trip.dates)}</p>
            <div class="trip-card-metrics">
              <span>${trip.days.length} 天</span>
              <span>${itemCount} 個行程</span>
            </div>
          </div>
          <strong>›</strong>
        </button>
      `;
    })
    .join("");
}

function renderReadonlyMode() {
  document.body.classList.toggle("is-readonly", isReadonly);
  readonlyBanner.hidden = !isReadonly;
}

function exportLibrary() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "trip-notebook",
    version: 1,
    trips: state.library.trips
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const firstTrip = state.library.trips[0]?.title || "旅程本";

  link.href = url;
  link.download = `${safeFileName(firstTrip)}-旅程本備份.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importLibrary(file) {
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const trips = Array.isArray(parsed.trips) ? parsed.trips : Array.isArray(parsed) ? parsed : null;

    if (!trips || trips.length === 0) {
      window.alert("這個檔案不是有效的旅程本備份。");
      return;
    }

    const confirmed = window.confirm("匯入後會覆蓋這台裝置目前的旅程資料。確定要繼續嗎？");
    if (!confirmed) return;

    setLibrary({ trips });
    window.alert("匯入完成。");
  } catch {
    window.alert("匯入失敗。請確認你選的是旅程本匯出的 JSON 檔。");
  } finally {
    importFileInput.value = "";
  }
}

function googleMapsUrl(place) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

function renderTrip() {
  const trip = currentTrip();
  if (!trip) return;

  state.activeDayIndex = Math.min(state.activeDayIndex, trip.days.length - 1);
  tripTitle.textContent = trip.title;
  tripDates.textContent = trip.dates;
  tripSummary.textContent = `${trip.days.length} 天，${countItems(trip)} 個行程`;

  dayTabs.innerHTML = trip.days
    .map(
      (day, index) => `
        <button class="day-tab ${index === state.activeDayIndex ? "is-active" : ""}" type="button" data-day="${index}">
          <span>Day ${index + 1}</span>
          ${escapeHtml(day.date)}
        </button>
      `
    )
    .join("");

  const day = currentDay();
  activeDate.textContent = `Day ${state.activeDayIndex + 1} · ${day.date}`;
  activeDayTitle.textContent = day.title;

  if (day.items.length === 0) {
    timeline.innerHTML = `<div class="empty-state">這一天還沒有行程。點「新增行程」開始安排。</div>`;
    return;
  }

  timeline.innerHTML = day.items
    .map(
      (item, index) => {
        const isExpanded = state.expandedItemId === item.id;
        const detailsId = `itemDetails${item.id}`;

        return `
        <article class="item-card" data-type="${escapeHtml(item.type)}">
          <button
            class="item-summary"
            type="button"
            data-toggle-details="${escapeHtml(item.id)}"
            aria-expanded="${isExpanded}"
            aria-controls="${escapeHtml(detailsId)}"
          >
            <span class="time">${escapeHtml(item.time)}</span>
            <span class="item-summary-content">
              <span class="item-title">${escapeHtml(getItemTitle(item))}</span>
              <span class="meta">${escapeHtml(item.type)}</span>
            </span>
            <span class="expand-indicator" aria-hidden="true">⌄</span>
          </button>
          <div class="item-details" id="${escapeHtml(detailsId)}" ${isExpanded ? "" : "hidden"}>
            ${renderFlightInfo(item)}
            ${renderTransportInfo(item)}
            <p class="note">${escapeHtml(item.note || "沒有備註")}</p>
            <div class="card-actions">
              <a class="text-button" href="${googleMapsUrl(getMapQuery(item))}" target="_blank" rel="noopener">地圖</a>
              <button class="text-button" type="button" data-edit="${index}">編輯</button>
            </div>
          </div>
        </article>
      `;
      }
    )
    .join("");
}

function countItems(trip) {
  return trip.days.reduce((total, day) => total + day.items.length, 0);
}

function getItemTitle(item) {
  if (item.type === "交通") {
    const first = item.transportSegments[0];
    const last = item.transportSegments[item.transportSegments.length - 1];
    const start = first?.departureStation;
    const end = last?.arrivalStation;
    if (start && end) return `${start} → ${end}`;
  }

  return item.place;
}

function getMapQuery(item) {
  if (item.type === "交通") {
    return item.transportSegments[0]?.departureStation || getItemTitle(item);
  }

  return item.place;
}

function renderFlightInfo(item) {
  if (item.type !== "飛機") return "";
  const details = [
    { label: "航空公司", value: item.airline },
    { label: "航班代碼", value: item.flightCode },
    { label: "出發", value: [item.departureTime, item.departureAirport].filter(Boolean).join(" · ") },
    { label: "出發航廈", value: item.departureTerminal },
    { label: "抵達", value: [item.arrivalTime, item.arrivalAirport].filter(Boolean).join(" · ") },
    { label: "抵達航廈", value: item.arrivalTerminal }
  ].filter((detail) => detail.value);

  if (details.length === 0) return "";

  return `
    <dl class="flight-info">
      ${details.map((detail) => `<div><dt>${escapeHtml(detail.label)}</dt><dd>${escapeHtml(detail.value)}</dd></div>`).join("")}
    </dl>
  `;
}

function renderTransportInfo(item) {
  if (item.type !== "交通" || item.transportSegments.length === 0) return "";

  return `
    <div class="transport-info">
      ${item.transportSegments
        .map((segment, index) => {
          const chips = [
            segment.company,
            segment.routeName,
            segment.routeNumber,
            segment.trainNumber ? `車次 ${segment.trainNumber}` : ""
          ].filter(Boolean);

          return `
            <section class="transport-segment-card">
              <div class="segment-heading">
                <strong>${index === 0 ? "交通" : `轉乘 ${index}`}</strong>
                <span>${escapeHtml(segment.mode || item.transportMode || "交通")}</span>
              </div>
              ${chips.length ? `<p class="transport-chipline">${escapeHtml(chips.join(" · "))}</p>` : ""}
              <div class="transport-route">
                <span>${escapeHtml([segment.departureTime, segment.departureStation].filter(Boolean).join(" · "))}</span>
                <span>${escapeHtml([segment.arrivalTime, segment.arrivalStation].filter(Boolean).join(" · "))}</span>
              </div>
            </section>
          `;
        })
        .join("")}
    </div>
  `;
}

function showHome() {
  homeView.hidden = false;
  tripView.hidden = true;
  renderHome();
}

function showTrip(tripId) {
  state.activeTripId = tripId;
  state.activeDayIndex = 0;
  homeView.hidden = true;
  tripView.hidden = false;
  renderTrip();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openModal(dialog) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }

  dialog.setAttribute("open", "");
}

function closeModal(dialog) {
  if (typeof dialog.close === "function") {
    dialog.close();
    return;
  }

  dialog.removeAttribute("open");
}

function openItemDialog(index = null) {
  if (isReadonly) return;
  state.editingItemIndex = index;
  const item = index === null
    ? {
        time: "",
        place: "",
        type: "景點",
        note: "",
        airline: "",
        flightCode: "",
        departureTime: "",
        departureAirport: "",
        departureTerminal: "",
        arrivalTime: "",
        arrivalAirport: "",
        arrivalTerminal: "",
        transportMode: "火車",
        transportSegments: [createBlankTransportSegment("火車")]
      }
    : currentDay().items[index];

  dialogTitle.textContent = index === null ? "新增行程" : "編輯行程";
  deleteItemButton.hidden = index === null;
  timeInput.value = item.time;
  placeInput.value = item.place;
  typeInput.value = [...typeInput.options].some((option) => option.value === item.type) ? item.type : "其他";
  noteInput.value = item.note;
  airlineInput.value = item.airline || "";
  flightCodeInput.value = item.flightCode || "";
  departureTimeInput.value = item.departureTime || "";
  departureAirportInput.value = item.departureAirport || "";
  departureTerminalInput.value = item.departureTerminal || "";
  arrivalTimeInput.value = item.arrivalTime || "";
  arrivalAirportInput.value = item.arrivalAirport || "";
  arrivalTerminalInput.value = item.arrivalTerminal || "";
  transportModeInput.value = item.transportMode || item.transportSegments[0]?.mode || "火車";
  const transportSegmentList = item.transportSegments.length
    ? item.transportSegments
    : [{ ...createBlankTransportSegment(transportModeInput.value), departureStation: item.type === "交通" ? item.place : "" }];
  renderTransportSegments(transportSegmentList);
  syncFlightFields();
  syncTransportFields();
  openModal(itemDialog);
}

function createBlankTransportSegment(mode = transportModeInput.value || "火車") {
  return {
    mode,
    company: "",
    departureStation: "",
    routeName: "",
    routeNumber: "",
    departureTime: "",
    trainNumber: "",
    arrivalStation: "",
    arrivalTime: ""
  };
}

function renderTransportSegments(segments) {
  transportSegments.innerHTML = segments.map((segment, index) => renderTransportSegment(segment, index)).join("");
  syncTransportSegmentModeFields();
}

function renderTransportSegment(segment, index) {
  const mode = segment.mode || transportModeInput.value || "火車";
  const isBus = mode === "公車/巴士";
  const isWalk = mode === "步行";
  const routeLabel = isBus ? "路線名稱" : "路線名稱";
  const departureLabel = isBus ? "出發站名" : isWalk ? "出發地點" : "出發車站";
  const arrivalLabel = isBus ? "抵達站名" : isWalk ? "抵達地點" : "抵達車站";

  return `
    <section class="transport-segment-editor" data-transport-segment="${index}">
      <header>
        <strong>${index === 0 ? "第一段" : `轉乘 ${index}`}</strong>
        ${index > 0 ? `<button class="text-button" type="button" data-remove-transport-segment="${index}">移除</button>` : ""}
      </header>

      <label>
        交通方式
        <select data-transport-field="mode">
          <option value="火車" ${mode === "火車" ? "selected" : ""}>火車</option>
          <option value="地鐵" ${mode === "地鐵" ? "selected" : ""}>地鐵</option>
          <option value="JR" ${mode === "JR" ? "selected" : ""}>JR</option>
          <option value="公車/巴士" ${mode === "公車/巴士" ? "selected" : ""}>公車/巴士</option>
          <option value="步行" ${mode === "步行" ? "selected" : ""}>步行</option>
          <option value="其他" ${mode === "其他" ? "selected" : ""}>其他</option>
        </select>
      </label>

      <label data-mode-field="company">
        營運公司
        <input data-transport-field="company" value="${escapeHtml(segment.company)}" placeholder="${isBus ? "京都市巴士" : "京阪電車"}" />
      </label>

      <label>
        ${departureLabel}
        <input data-transport-field="departureStation" value="${escapeHtml(segment.departureStation)}" placeholder="${isBus ? "京都駅前" : "京都車站"}" required />
      </label>

      <label data-mode-field="routeName">
        ${routeLabel}
        <input data-transport-field="routeName" value="${escapeHtml(segment.routeName)}" placeholder="${isBus ? "洛巴士" : "烏丸線"}" />
      </label>

      <label data-mode-field="routeNumber">
        路線編號
        <input data-transport-field="routeNumber" value="${escapeHtml(segment.routeNumber)}" placeholder="206" />
      </label>

      <label>
        出發時間
        <input data-transport-field="departureTime" type="time" value="${escapeHtml(segment.departureTime)}" />
      </label>

      <label data-mode-field="trainNumber">
        車次
        <input data-transport-field="trainNumber" value="${escapeHtml(segment.trainNumber)}" placeholder="123A" />
      </label>

      <label>
        ${arrivalLabel}
        <input data-transport-field="arrivalStation" value="${escapeHtml(segment.arrivalStation)}" placeholder="${isBus ? "清水道" : "四條站"}" required />
      </label>

      <label>
        抵達時間
        <input data-transport-field="arrivalTime" type="time" value="${escapeHtml(segment.arrivalTime)}" />
      </label>
    </section>
  `;
}

function collectTransportSegments() {
  return Array.from(transportSegments.querySelectorAll("[data-transport-segment]")).map((segmentElement) => {
    const valueFor = (field) => segmentElement.querySelector(`[data-transport-field="${field}"]`)?.value.trim() || "";
    return normalizeTransportSegment({
      mode: valueFor("mode"),
      company: valueFor("company"),
      departureStation: valueFor("departureStation"),
      routeName: valueFor("routeName"),
      routeNumber: valueFor("routeNumber"),
      departureTime: valueFor("departureTime"),
      trainNumber: valueFor("trainNumber"),
      arrivalStation: valueFor("arrivalStation"),
      arrivalTime: valueFor("arrivalTime")
    });
  });
}

function syncTransportSegmentModeFields() {
  transportSegments.querySelectorAll("[data-transport-segment]").forEach((segmentElement) => {
    const mode = segmentElement.querySelector('[data-transport-field="mode"]')?.value || transportModeInput.value;
    const isBus = mode === "公車/巴士";
    const isWalk = mode === "步行";
    segmentElement.querySelectorAll('[data-mode-field="company"], [data-mode-field="routeName"]').forEach((field) => {
      field.hidden = isWalk;
    });
    segmentElement.querySelector('[data-mode-field="routeNumber"]').hidden = !isBus;
    segmentElement.querySelector('[data-mode-field="trainNumber"]').hidden = isBus || isWalk;
  });
}

function populateTimeOptions() {
  timeInput.innerHTML = `<option value="">選擇時間</option>`;

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 1) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      timeInput.append(option);
    }
  }
}

function openTripDialog(tripId = null) {
  if (isReadonly) return;
  state.editingTripId = tripId;
  const trip = tripId ? state.library.trips.find((item) => item.id === tripId) : null;

  tripDialogTitle.textContent = trip ? "編輯旅程" : "新增旅程";
  deleteTripButton.hidden = !trip;
  deleteTripButton.disabled = state.library.trips.length <= 1;
  tripNameInput.value = trip?.title || "";
  tripStartInput.value = trip?.startDate || todayString();
  tripEndInput.value = trip?.endDate || addDays(tripStartInput.value, 2);
  tripDaysInput.value = trip?.days.length || 3;
  updateTripDayPreview();
  openModal(tripDialog);
}

function resizeTripDays(trip, dayCount) {
  if (dayCount > trip.days.length) {
    trip.days.push(...createBlankDays(dayCount - trip.days.length, addDays(trip.startDate, trip.days.length)).map((day, index) => ({
      ...day,
      title: `第 ${trip.days.length + index + 1} 天`,
      date: formatShortDate(addDays(trip.startDate, trip.days.length + index))
    })));
  }

  if (dayCount < trip.days.length) {
    trip.days = trip.days.slice(0, dayCount);
  }
}

function updateTripDayPreview() {
  if (!tripStartInput.value) return;

  if (!tripEndInput.value || tripEndInput.value < tripStartInput.value) {
    tripEndInput.value = tripStartInput.value;
  }

  const dayCount = calculateDayCount(tripStartInput.value, tripEndInput.value);
  tripDaysInput.value = `${dayCount} 天`;
}

document.querySelector("#addTripButton").addEventListener("click", () => openTripDialog());
document.querySelector("#backToTripsButton").addEventListener("click", showHome);
document.querySelector("#addItemButton").addEventListener("click", () => openItemDialog());
document.querySelector("#editTripButton").addEventListener("click", () => openTripDialog(currentTrip().id));
exportButton.addEventListener("click", () => {
  if (!isReadonly) exportLibrary();
});
importButton.addEventListener("click", () => {
  if (!isReadonly) importFileInput.click();
});
importFileInput.addEventListener("change", () => {
  if (!isReadonly) importLibrary(importFileInput.files[0]);
});
tripStartInput.addEventListener("change", updateTripDayPreview);
tripEndInput.addEventListener("change", updateTripDayPreview);
typeInput.addEventListener("change", () => {
  syncFlightFields();
  syncTransportFields();
});
transportModeInput.addEventListener("change", () => {
  const segments = collectTransportSegments();
  renderTransportSegments(segments.map((segment) => ({ ...segment, mode: transportModeInput.value })));
});
addTransportSegmentButton.addEventListener("click", () => {
  const segments = collectTransportSegments();
  segments.push(createBlankTransportSegment(transportModeInput.value));
  renderTransportSegments(segments);
});
transportSegments.addEventListener("change", (event) => {
  if (event.target.matches('[data-transport-field="mode"]')) {
    renderTransportSegments(collectTransportSegments());
  }
  if (typeInput.value === "交通") placeInput.value = getTransportTitle(collectTransportSegments());
});
transportSegments.addEventListener("input", () => {
  if (typeInput.value === "交通") placeInput.value = getTransportTitle(collectTransportSegments());
});
transportSegments.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-transport-segment]");
  if (!removeButton) return;
  const removeIndex = Number(removeButton.dataset.removeTransportSegment);
  const segments = collectTransportSegments().filter((_, index) => index !== removeIndex);
  renderTransportSegments(segments.length ? segments : [createBlankTransportSegment(transportModeInput.value)]);
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = document.querySelector(`#${button.dataset.closeDialog}`);
    if (dialog) closeModal(dialog);
  });
});

tripList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-trip]");
  if (!button) return;
  showTrip(button.dataset.openTrip);
});

dayTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-day]");
  if (!button) return;
  state.activeDayIndex = Number(button.dataset.day);
  renderTrip();
});

timeline.addEventListener("click", (event) => {
  const toggleButton = event.target.closest("[data-toggle-details]");
  if (toggleButton) {
    const details = document.querySelector(`#${toggleButton.getAttribute("aria-controls")}`);
    const isExpanded = toggleButton.getAttribute("aria-expanded") === "true";
    state.expandedItemId = isExpanded ? null : toggleButton.dataset.toggleDetails;
    toggleButton.setAttribute("aria-expanded", String(!isExpanded));
    if (details) details.hidden = isExpanded;
    return;
  }

  if (isReadonly) return;
  const button = event.target.closest("[data-edit]");
  if (!button) return;
  openItemDialog(Number(button.dataset.edit));
});

itemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (isReadonly) return;

  const item = {
    time: timeInput.value.trim(),
    place: placeInput.value.trim(),
    type: typeInput.value.trim(),
    note: noteInput.value.trim(),
    airline: typeInput.value === "飛機" ? airlineInput.value.trim() : "",
    flightCode: typeInput.value === "飛機" ? flightCodeInput.value.trim().toUpperCase() : "",
    departureTime: typeInput.value === "飛機" ? departureTimeInput.value.trim() : "",
    departureAirport: typeInput.value === "飛機" ? departureAirportInput.value.trim() : "",
    departureTerminal: typeInput.value === "飛機" ? departureTerminalInput.value.trim() : "",
    arrivalTime: typeInput.value === "飛機" ? arrivalTimeInput.value.trim() : "",
    arrivalAirport: typeInput.value === "飛機" ? arrivalAirportInput.value.trim() : "",
    arrivalTerminal: typeInput.value === "飛機" ? arrivalTerminalInput.value.trim() : "",
    transportMode: typeInput.value === "交通" ? transportModeInput.value : "",
    transportSegments: typeInput.value === "交通" ? collectTransportSegments() : []
  };

  if (item.type === "交通") {
    item.place = getTransportTitle(item.transportSegments) || item.place;
  }

  if (state.editingItemIndex === null) {
    item.id = createId();
    currentDay().items.push(item);
  } else {
    item.id = currentDay().items[state.editingItemIndex].id || createId();
    currentDay().items[state.editingItemIndex] = item;
  }

  currentDay().items.sort((a, b) => a.time.localeCompare(b.time));
  state.expandedItemId = item.id;
  saveLibrary();
  closeModal(itemDialog);
  render();
});

function syncFlightFields() {
  const isFlight = typeInput.value === "飛機";
  flightFields.hidden = !isFlight;
  airlineInput.required = isFlight;
  flightCodeInput.required = isFlight;
  departureTimeInput.required = isFlight;
  departureAirportInput.required = isFlight;
  departureTerminalInput.required = isFlight;
  arrivalTimeInput.required = isFlight;
  arrivalAirportInput.required = isFlight;
  arrivalTerminalInput.required = isFlight;
}

function syncTransportFields() {
  const isTransport = typeInput.value === "交通";
  transportFields.hidden = !isTransport;
  placeInput.readOnly = isTransport;
  placeInput.required = !isTransport;

  if (isTransport) {
    if (transportSegments.children.length === 0) {
      renderTransportSegments([createBlankTransportSegment(transportModeInput.value)]);
    }
    placeInput.value = getTransportTitle(collectTransportSegments()) || placeInput.value;
  }

  transportFields.querySelectorAll("input, select, button").forEach((control) => {
    control.disabled = !isTransport;
  });
}

function getTransportTitle(segments) {
  const first = segments[0];
  const last = segments[segments.length - 1];
  const start = first?.departureStation;
  const end = last?.arrivalStation;
  return start && end ? `${start} → ${end}` : "";
}

deleteItemButton.addEventListener("click", () => {
  if (isReadonly) return;
  if (state.editingItemIndex === null) return;
  const item = currentDay().items[state.editingItemIndex];
  if (item?.id === state.expandedItemId) state.expandedItemId = null;
  currentDay().items.splice(state.editingItemIndex, 1);
  saveLibrary();
  closeModal(itemDialog);
  render();
});

tripForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (isReadonly) return;

  updateTripDayPreview();
  const startDate = tripStartInput.value;
  const endDate = tripEndInput.value;
  const dayCount = calculateDayCount(startDate, endDate);
  let trip = state.editingTripId
    ? state.library.trips.find((item) => item.id === state.editingTripId)
    : null;

  if (!trip) {
    trip = {
      id: createId(),
      title: tripNameInput.value.trim(),
      startDate,
      endDate,
      dates: formatDateRange(startDate, endDate),
      days: createBlankDays(dayCount, startDate)
    };
    state.library.trips.unshift(trip);
  } else {
    trip.title = tripNameInput.value.trim();
    trip.startDate = startDate;
    trip.endDate = endDate;
    trip.dates = formatDateRange(startDate, endDate);
    resizeTripDays(trip, dayCount);
    syncTripDayDates(trip);
  }

  state.activeTripId = trip.id;
  state.activeDayIndex = 0;
  saveLibrary();
  closeModal(tripDialog);
  showTrip(trip.id);
});

deleteTripButton.addEventListener("click", () => {
  if (isReadonly) return;
  if (!state.editingTripId || state.library.trips.length <= 1) return;
  const trip = state.library.trips.find((item) => item.id === state.editingTripId);
  const confirmed = window.confirm(`確定刪除「${trip.title}」？這只會刪除這台手機瀏覽器裡的資料。`);
  if (!confirmed) return;

  state.library.trips = state.library.trips.filter((item) => item.id !== state.editingTripId);
  state.activeTripId = state.library.trips[0].id;
  state.activeDayIndex = 0;
  saveLibrary();
  closeModal(tripDialog);
  showHome();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

populateTimeOptions();
saveLibrary();
render();
renderReadonlyMode();
showHome();
