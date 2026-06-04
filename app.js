const STORAGE_KEY = "trip-notebook-v2";
const LEGACY_STORAGE_KEY = "trip-notebook-v1";

const defaultTrip = {
  id: createId(),
  title: "京都三日散步",
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
  editingTripId: null
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
const tripNameInput = document.querySelector("#tripNameInput");
const tripDatesInput = document.querySelector("#tripDatesInput");
const tripDaysInput = document.querySelector("#tripDaysInput");

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
    trips: library.trips.map((trip) => ({
      id: trip.id || createId(),
      title: trip.title || "未命名旅程",
      dates: trip.dates || "日期未設定",
      days: Array.isArray(trip.days) && trip.days.length > 0 ? trip.days.map(normalizeDay) : createBlankDays(3)
    }))
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
    time: item.time || "",
    place: item.place || "",
    type: item.type || "",
    note: item.note || ""
  };
}

function createBlankDays(count) {
  return Array.from({ length: count }, (_, index) => ({
    title: `第 ${index + 1} 天`,
    date: `Day ${index + 1}`,
    items: []
  }));
}

function createId() {
  return `trip-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveLibrary() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.library));
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
          <div>
            <h2>${escapeHtml(trip.title)}</h2>
            <p>${escapeHtml(trip.dates)}</p>
            <p>${trip.days.length} 天，${itemCount} 個行程</p>
          </div>
          <strong>›</strong>
        </button>
      `;
    })
    .join("");
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
      (item, index) => `
        <article class="item-card">
          <div class="time">${escapeHtml(item.time)}</div>
          <div>
            <h3>${escapeHtml(item.place)}</h3>
            <span class="meta">${escapeHtml(item.type)}</span>
            <p class="note">${escapeHtml(item.note || "沒有備註")}</p>
            <div class="card-actions">
              <button class="text-button" type="button" data-edit="${index}">編輯</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function countItems(trip) {
  return trip.days.reduce((total, day) => total + day.items.length, 0);
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
  state.editingItemIndex = index;
  const item = index === null ? { time: "", place: "", type: "", note: "" } : currentDay().items[index];

  dialogTitle.textContent = index === null ? "新增行程" : "編輯行程";
  deleteItemButton.hidden = index === null;
  timeInput.value = item.time;
  placeInput.value = item.place;
  typeInput.value = item.type;
  noteInput.value = item.note;
  openModal(itemDialog);
}

function openTripDialog(tripId = null) {
  state.editingTripId = tripId;
  const trip = tripId ? state.library.trips.find((item) => item.id === tripId) : null;

  tripDialogTitle.textContent = trip ? "編輯旅程" : "新增旅程";
  deleteTripButton.hidden = !trip;
  deleteTripButton.disabled = state.library.trips.length <= 1;
  tripNameInput.value = trip?.title || "";
  tripDatesInput.value = trip?.dates || "";
  tripDaysInput.value = trip?.days.length || 3;
  openModal(tripDialog);
}

function resizeTripDays(trip, dayCount) {
  if (dayCount > trip.days.length) {
    trip.days.push(...createBlankDays(dayCount - trip.days.length).map((day, index) => ({
      ...day,
      title: `第 ${trip.days.length + index + 1} 天`,
      date: `Day ${trip.days.length + index + 1}`
    })));
  }

  if (dayCount < trip.days.length) {
    trip.days = trip.days.slice(0, dayCount);
  }
}

document.querySelector("#addTripButton").addEventListener("click", () => openTripDialog());
document.querySelector("#backToTripsButton").addEventListener("click", showHome);
document.querySelector("#addItemButton").addEventListener("click", () => openItemDialog());
document.querySelector("#editTripButton").addEventListener("click", () => openTripDialog(currentTrip().id));

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
  const button = event.target.closest("[data-edit]");
  if (!button) return;
  openItemDialog(Number(button.dataset.edit));
});

itemForm.addEventListener("submit", (event) => {
  if (itemForm.returnValue === "cancel") return;
  event.preventDefault();

  const item = {
    time: timeInput.value.trim(),
    place: placeInput.value.trim(),
    type: typeInput.value.trim(),
    note: noteInput.value.trim()
  };

  if (state.editingItemIndex === null) {
    currentDay().items.push(item);
  } else {
    currentDay().items[state.editingItemIndex] = item;
  }

  currentDay().items.sort((a, b) => a.time.localeCompare(b.time));
  saveLibrary();
  closeModal(itemDialog);
  render();
});

deleteItemButton.addEventListener("click", () => {
  if (state.editingItemIndex === null) return;
  currentDay().items.splice(state.editingItemIndex, 1);
  saveLibrary();
  closeModal(itemDialog);
  render();
});

tripForm.addEventListener("submit", (event) => {
  if (tripForm.returnValue === "cancel") return;
  event.preventDefault();

  const dayCount = Math.max(1, Math.min(30, Number(tripDaysInput.value) || 1));
  let trip = state.editingTripId
    ? state.library.trips.find((item) => item.id === state.editingTripId)
    : null;

  if (!trip) {
    trip = {
      id: createId(),
      title: tripNameInput.value.trim(),
      dates: tripDatesInput.value.trim(),
      days: createBlankDays(dayCount)
    };
    state.library.trips.unshift(trip);
  } else {
    trip.title = tripNameInput.value.trim();
    trip.dates = tripDatesInput.value.trim();
    resizeTripDays(trip, dayCount);
  }

  state.activeTripId = trip.id;
  state.activeDayIndex = 0;
  saveLibrary();
  closeModal(tripDialog);
  showTrip(trip.id);
});

deleteTripButton.addEventListener("click", () => {
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

saveLibrary();
render();
showHome();
