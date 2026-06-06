const STORAGE_KEY = "trip-notebook-v2";
const LEGACY_STORAGE_KEY = "trip-notebook-v1";
const MAX_BOOKING_ATTACHMENT_SIZE = 4 * 1024 * 1024;
const MAX_IMAGE_ATTACHMENT_SIZE = 950 * 1024;
const IMAGE_COMPRESSION_STEPS = [
  { maxDimension: 1600, quality: 0.72 },
  { maxDimension: 1280, quality: 0.62 },
  { maxDimension: 1024, quality: 0.52 }
];
const SUPABASE_URL = "https://dxkrkhtnusihjukanphe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_CCraWaVPLSPzzE-u7Guvlg_Dfe6q91a";
const SUPABASE_ATTACHMENT_BUCKET = "trip-attachments";
const DEFAULT_EXCHANGE_RATES = {
  TWD: 1,
  JPY: 0.22,
  KRW: 0.024,
  USD: 32,
  EUR: 35,
  CHF: 36
};
const exchangeRateDrafts = new Map();
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
  cloudUser: null,
  cloudReady: false,
  cloudSyncing: false,
  cloudError: "",
  activeTripId: null,
  activeDayIndex: 0,
  activeExpenseDate: null,
  activeExpenseStatsTab: "category",
  activeExpenseMember: null,
  activeTripSection: "itinerary",
  activeBookingGroup: "票券",
  activeTodoGroup: "行前準備",
  editingItemIndex: null,
  editingTripId: null,
  editingBookingId: null,
  editingExpenseId: null,
  expandedItemId: null
};

state.activeTripId = state.library.trips[0]?.id || null;

const landingView = document.querySelector("#landingView");
const homeView = document.querySelector("#homeView");
const tripView = document.querySelector("#tripView");
const tripList = document.querySelector("#tripList");
const cloudAuthForm = document.querySelector("#cloudAuthForm");
const cloudEmailInput = document.querySelector("#cloudEmailInput");
const cloudPasswordInput = document.querySelector("#cloudPasswordInput");
const cloudSignUpButton = document.querySelector("#cloudSignUpButton");
const cloudSignInButton = document.querySelector("#cloudSignInButton");
const cloudSyncButton = document.querySelector("#cloudSyncButton");
const cloudSignOutButton = document.querySelector("#cloudSignOutButton");
const cloudStatus = document.querySelector("#cloudStatus");
const landingTripTitle = document.querySelector("#landingTripTitle");
const landingTripMeta = document.querySelector("#landingTripMeta");
const landingTripCount = document.querySelector("#landingTripCount");
const landingItemCount = document.querySelector("#landingItemCount");
const landingToday = document.querySelector("#landingToday");
const tripTitle = document.querySelector("#tripTitle");
const tripDates = document.querySelector("#tripDates");
const tripSummary = document.querySelector("#tripSummary");
const activeDate = document.querySelector("#activeDate");
const activeDayTitle = document.querySelector("#activeDayTitle");
const dayTabs = document.querySelector("#dayTabs");
const tripSectionTabs = document.querySelector("#tripSectionTabs");
const timeline = document.querySelector("#timeline");
const bookingSubTabs = document.querySelector("#bookingSubTabs");
const bookingSectionTitle = document.querySelector("#bookingSectionTitle");
const bookingList = document.querySelector("#bookingList");
const todoSubTabs = document.querySelector("#todoSubTabs");
const todoSectionTitle = document.querySelector("#todoSectionTitle");
const todoGroups = document.querySelector("#todoGroups");
const expenseList = document.querySelector("#expenseList");
const expenseSummary = document.querySelector("#expenseSummary");
const memberChips = document.querySelector("#memberChips");
const memberForm = document.querySelector("#memberForm");
const memberNameInput = document.querySelector("#memberNameInput");
const exchangeRateList = document.querySelector("#exchangeRateList");
const expenseDashboard = document.querySelector("#expenseDashboard");
const itemDialog = document.querySelector("#itemDialog");
const itemForm = document.querySelector("#itemForm");
const dialogTitle = document.querySelector("#dialogTitle");
const deleteItemButton = document.querySelector("#deleteItemButton");
const tripDialog = document.querySelector("#tripDialog");
const tripForm = document.querySelector("#tripForm");
const tripDialogTitle = document.querySelector("#tripDialogTitle");
const deleteTripButton = document.querySelector("#deleteTripButton");
const timeInput = document.querySelector("#timeInput");
const timeHourInput = document.querySelector("#timeHourInput");
const timeMinuteInput = document.querySelector("#timeMinuteInput");
const placeInput = document.querySelector("#placeInput");
const typeInput = document.querySelector("#typeInput");
const attractionFields = document.querySelector("#attractionFields");
const attractionIntroInput = document.querySelector("#attractionIntroInput");
const itemContentInput = document.querySelector("#itemContentInput");
const noteInput = document.querySelector("#noteInput");
const itemPhotoInput = document.querySelector("#itemPhotoInput");
const itemExistingAttachments = document.querySelector("#itemExistingAttachments");
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
const tripDayTitleEditor = document.querySelector("#tripDayTitleEditor");
const exportButton = document.querySelector("#exportButton");
const importButton = document.querySelector("#importButton");
const importFileInput = document.querySelector("#importFileInput");
const readonlyBanner = document.querySelector("#readonlyBanner");
const bookingDialog = document.querySelector("#bookingDialog");
const bookingForm = document.querySelector("#bookingForm");
const bookingDialogTitle = document.querySelector("#bookingDialogTitle");
const bookingTypeInput = document.querySelector("#bookingTypeInput");
const bookingNameInput = document.querySelector("#bookingNameInput");
const bookingDateLabel = document.querySelector("#bookingDateLabel");
const bookingDateInput = document.querySelector("#bookingDateInput");
const bookingTimeLabel = document.querySelector("#bookingTimeLabel");
const bookingTimeInput = document.querySelector("#bookingTimeInput");
const bookingStayFields = document.querySelector("#bookingStayFields");
const bookingCheckoutDateInput = document.querySelector("#bookingCheckoutDateInput");
const bookingCheckoutTimeInput = document.querySelector("#bookingCheckoutTimeInput");
const bookingBreakfastInput = document.querySelector("#bookingBreakfastInput");
const bookingPlaceInput = document.querySelector("#bookingPlaceInput");
const bookingCodeInput = document.querySelector("#bookingCodeInput");
const bookingNoteInput = document.querySelector("#bookingNoteInput");
const bookingAttachmentInput = document.querySelector("#bookingAttachmentInput");
const bookingExistingAttachments = document.querySelector("#bookingExistingAttachments");
const deleteBookingButton = document.querySelector("#deleteBookingButton");
const todoDialog = document.querySelector("#todoDialog");
const todoForm = document.querySelector("#todoForm");
const todoGroupInput = document.querySelector("#todoGroupInput");
const todoTextInput = document.querySelector("#todoTextInput");
const todoNoteInput = document.querySelector("#todoNoteInput");
const expenseDialog = document.querySelector("#expenseDialog");
const expenseForm = document.querySelector("#expenseForm");
const expenseDialogTitle = document.querySelector("#expenseDialogTitle");
const expenseDateInput = document.querySelector("#expenseDateInput");
const expenseNameInput = document.querySelector("#expenseNameInput");
const expenseAmountInput = document.querySelector("#expenseAmountInput");
const expenseCurrencyInput = document.querySelector("#expenseCurrencyInput");
const expenseCategoryInput = document.querySelector("#expenseCategoryInput");
const expensePayerInput = document.querySelector("#expensePayerInput");
const expenseShareInputs = document.querySelector("#expenseShareInputs");
const expenseNoteInput = document.querySelector("#expenseNoteInput");
const deleteExpenseButton = document.querySelector("#deleteExpenseButton");
const attachmentViewer = document.querySelector("#attachmentViewer");
const attachmentViewerTitle = document.querySelector("#attachmentViewerTitle");
const attachmentViewerBody = document.querySelector("#attachmentViewerBody");
const closeAttachmentViewerButton = document.querySelector("#closeAttachmentViewerButton");
let activeAttachmentUrl = null;
let supabaseClient = null;
let cloudSaveTimer = null;

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
        cloudId: trip.cloudId || null,
        title: trip.title || "未命名旅程",
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        dates: dateRange.label,
        days,
        members: normalizeMembers(trip.members),
        exchangeRates: normalizeExchangeRates(trip.exchangeRates),
        bookings: Array.isArray(trip.bookings) ? trip.bookings.map(normalizeBooking) : [],
        todos: Array.isArray(trip.todos) ? trip.todos.map(normalizeTodo) : [],
        expenses: Array.isArray(trip.expenses) ? trip.expenses.map(normalizeExpense) : []
      };
    })
  };
}

function normalizeMembers(members) {
  const source = Array.isArray(members) ? members : ["我"];
  const names = source.map((member) => String(member || "").trim()).filter(Boolean);
  return [...new Set(names.length ? names : ["我"])];
}

function normalizeExchangeRates(rates) {
  return Object.fromEntries(
    Object.entries(DEFAULT_EXCHANGE_RATES).map(([currency, defaultRate]) => {
      const rate = Number(rates?.[currency]);
      return [currency, Number.isFinite(rate) && rate > 0 ? rate : defaultRate];
    })
  );
}

function normalizeBooking(booking) {
  return {
    id: booking.id || createId(),
    type: booking.type || "其他",
    name: booking.name || "",
    date: booking.date || "",
    time: booking.time || "",
    checkoutDate: booking.checkoutDate || "",
    checkoutTime: booking.checkoutTime || "",
    includesBreakfast: Boolean(booking.includesBreakfast),
    place: booking.place || "",
    code: booking.code || "",
    note: booking.note || "",
    attachments: Array.isArray(booking.attachments) ? booking.attachments.map(normalizeAttachment).filter(Boolean) : []
  };
}

function normalizeAttachment(attachment) {
  if (!attachment || (!attachment.dataUrl && !attachment.publicUrl && !attachment.url)) return null;

  const publicUrl = attachment.publicUrl || attachment.url || "";

  return {
    id: attachment.id || createId(),
    name: attachment.name || "訂單附件",
    type: attachment.type || "",
    size: Number(attachment.size) || 0,
    dataUrl: attachment.dataUrl || "",
    publicUrl,
    storagePath: attachment.storagePath || "",
    uploadedAt: attachment.uploadedAt || ""
  };
}

function normalizeTodo(todo) {
  return {
    id: todo.id || createId(),
    group: todo.group || "行前準備",
    text: todo.text || "",
    note: todo.note || "",
    done: Boolean(todo.done)
  };
}

function normalizeExpense(expense) {
  return {
    id: expense.id || createId(),
    date: expense.date || "",
    name: expense.name || "",
    amount: Number(expense.amount) || 0,
    currency: expense.currency || "JPY",
    category: expense.category || "其他",
    payer: expense.payer || "我",
    shareWith: normalizeMembers(expense.shareWith),
    note: expense.note || ""
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
    content: item.content || "",
    attractionIntro: item.attractionIntro || "",
    note: item.note || "",
    airline: item.airline || "",
    flightCode: item.flightCode || "",
    departureTime: item.departureTime || "",
    departureAirport: item.departureAirport || "",
    departureTerminal: item.departureTerminal || "",
    arrivalTime: item.arrivalTime || "",
    arrivalAirport: item.arrivalAirport || "",
    arrivalTerminal: item.arrivalTerminal || "",
    attachments: Array.isArray(item.attachments) ? item.attachments.map(normalizeAttachment).filter(Boolean) : [],
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
  scheduleCloudSave();
}

function setLibrary(library) {
  const nextLibrary = normalizeLibrary(library);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLibrary));
  state.library = nextLibrary;
  state.activeTripId = nextLibrary.trips[0]?.id || null;
  state.activeDayIndex = 0;
  render();
  showHome();
  scheduleCloudSave();
}

async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return supabaseClient;
}

function renderCloudStatus() {
  if (!cloudStatus) return;

  const email = state.cloudUser?.email || "";
  cloudEmailInput.hidden = Boolean(state.cloudUser);
  cloudPasswordInput.hidden = Boolean(state.cloudUser);
  cloudSignUpButton.hidden = Boolean(state.cloudUser);
  cloudSignInButton.hidden = Boolean(state.cloudUser);
  cloudSyncButton.hidden = !state.cloudUser;
  cloudSignOutButton.hidden = !state.cloudUser;

  if (!state.cloudReady) {
    cloudStatus.textContent = "雲端功能載入中。本機資料仍可正常使用。";
    return;
  }

  if (!state.cloudUser) {
    cloudStatus.textContent = state.cloudError || "尚未登入。登入後會把旅程同步到雲端。";
    return;
  }

  cloudStatus.textContent = state.cloudSyncing
    ? `已登入 ${email}，正在同步...`
    : state.cloudError || `已登入 ${email}，旅程會同步到 Supabase。`;
}

async function initCloudSync() {
  if (isReadonly) return;

  try {
    renderCloudStatus();
    const client = await getSupabaseClient();
    state.cloudReady = true;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    state.cloudUser = data.session?.user || null;

    client.auth.onAuthStateChange((_event, session) => {
      state.cloudUser = session?.user || null;
      renderCloudStatus();
      if (state.cloudUser) loadCloudLibrary();
    });

    renderCloudStatus();
    if (state.cloudUser) await loadCloudLibrary();
  } catch (error) {
    state.cloudReady = false;
    state.cloudError = `雲端功能暫時無法載入：${error.message}`;
    renderCloudStatus();
  }
}

function toCloudTripPayload(trip) {
  const cloudTrip = stripAttachmentsForCloudTrip(trip);

  return {
    owner_id: state.cloudUser.id,
    title: trip.title || "未命名旅程",
    start_date: trip.startDate || null,
    end_date: trip.endDate || null,
    updated_at: new Date().toISOString(),
    data: {
      ...cloudTrip,
      cloudId: trip.cloudId || null
    }
  };
}

function stripAttachmentsForCloudTrip(trip) {
  return {
    ...trip,
    days: (trip.days || []).map((day) => ({
      ...day,
      items: (day.items || []).map((item) => ({
        ...item,
        attachments: (item.attachments || []).map(toCloudAttachment).filter(Boolean)
      }))
    })),
    bookings: (trip.bookings || []).map((booking) => ({
      ...booking,
      attachments: (booking.attachments || []).map(toCloudAttachment).filter(Boolean)
    }))
  };
}

function toCloudAttachment(attachment) {
  if (!attachment?.publicUrl) return null;

  return {
    id: attachment.id || createId(),
    name: attachment.name || "附件",
    type: attachment.type || "",
    size: Number(attachment.size) || 0,
    publicUrl: attachment.publicUrl,
    storagePath: attachment.storagePath || "",
    uploadedAt: attachment.uploadedAt || ""
  };
}

function fromCloudTrip(row) {
  return normalizeLibrary({ trips: [{ ...row.data, cloudId: row.id }] }).trips[0];
}

async function loadCloudLibrary() {
  if (!state.cloudUser) return;

  try {
    state.cloudSyncing = true;
    renderCloudStatus();
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from("trips")
      .select("id,title,start_date,end_date,data,updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;

    if (Array.isArray(data) && data.length > 0) {
      state.library = normalizeLibrary({ trips: data.map(fromCloudTrip) });
      state.activeTripId = state.library.trips[0]?.id || null;
      state.activeDayIndex = 0;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.library));
      render();
      showHome();
    } else {
      state.cloudSyncing = false;
      await saveCloudLibrary();
      state.cloudSyncing = true;
    }

    state.cloudError = "";
  } catch (error) {
    state.cloudError = `雲端讀取失敗：${error.message}`;
  } finally {
    state.cloudSyncing = false;
    renderCloudStatus();
  }
}

function scheduleCloudSave() {
  if (!state.cloudUser || !state.cloudReady) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    saveCloudLibrary();
  }, 500);
}

function attachmentStoragePath(trip, ownerType, ownerId, attachment) {
  const extension = attachment.type?.split("/")[1]?.replace("jpeg", "jpg") || attachment.name.split(".").pop() || "file";
  const fileName = `${attachment.id}-${safeFileName(attachment.name || "attachment")}.${extension}`.replace(/\.+/g, ".");
  return `${state.cloudUser.id}/${trip.id}/${ownerType}/${ownerId}/${fileName}`;
}

async function uploadAttachmentToCloud(client, trip, ownerType, ownerId, attachment) {
  if (attachment.publicUrl || !attachment.dataUrl) return;

  const blob = dataUrlToBlob(attachment.dataUrl);
  const storagePath = attachment.storagePath || attachmentStoragePath(trip, ownerType, ownerId, attachment);
  const { error } = await client.storage.from(SUPABASE_ATTACHMENT_BUCKET).upload(storagePath, blob, {
    cacheControl: "3600",
    contentType: attachment.type || blob.type || "application/octet-stream",
    upsert: true
  });

  if (error) throw error;

  const { data } = client.storage.from(SUPABASE_ATTACHMENT_BUCKET).getPublicUrl(storagePath);
  attachment.storagePath = storagePath;
  attachment.publicUrl = data.publicUrl;
  attachment.uploadedAt = new Date().toISOString();
  attachment.dataUrl = "";
}

async function uploadTripAttachments(client, trip) {
  for (const day of trip.days || []) {
    for (const item of day.items || []) {
      for (const attachment of item.attachments || []) {
        await uploadAttachmentToCloud(client, trip, "item", item.id || "item", attachment);
      }
    }
  }

  for (const booking of trip.bookings || []) {
    for (const attachment of booking.attachments || []) {
      await uploadAttachmentToCloud(client, trip, "booking", booking.id || "booking", attachment);
    }
  }
}

async function deleteAttachmentFromCloud(client, attachment) {
  if (!attachment?.storagePath) return;
  const { error } = await client.storage.from(SUPABASE_ATTACHMENT_BUCKET).remove([attachment.storagePath]);
  if (error) throw error;
}

async function deleteRemovedAttachmentsFromCloud(attachments = []) {
  const cloudAttachments = attachments.filter((attachment) => attachment.storagePath);
  if (!state.cloudUser || !state.cloudReady || cloudAttachments.length === 0) return;

  try {
    const client = await getSupabaseClient();
    for (const attachment of cloudAttachments) {
      await deleteAttachmentFromCloud(client, attachment);
    }
  } catch (error) {
    state.cloudError = `附件已從行程移除，但雲端檔案刪除失敗：${error.message}`;
    renderCloudStatus();
  }
}

async function uploadOwnerAttachmentsBeforeLocalSave(trip, ownerType, ownerId, attachments) {
  if (!state.cloudUser || !state.cloudReady || !attachments?.length) return;

  try {
    state.cloudSyncing = true;
    renderCloudStatus();
    const client = await getSupabaseClient();

    for (const attachment of attachments) {
      await uploadAttachmentToCloud(client, trip, ownerType, ownerId, attachment);
    }

    state.cloudError = "";
  } catch (error) {
    state.cloudError = formatCloudSaveError(error);
    throw error;
  } finally {
    state.cloudSyncing = false;
    renderCloudStatus();
  }
}

function formatCloudSaveError(error) {
  const message = String(error?.message || "");

  if (/bucket|not found/i.test(message)) {
    return "雲端儲存失敗：Supabase 還沒有建立 trip-attachments Storage bucket。";
  }

  if (/row-level security|policy|permission|not allowed|unauthorized/i.test(message)) {
    return "雲端儲存失敗：Supabase Storage 權限尚未開放，請檢查 trip-attachments 的上傳政策。";
  }

  if (/quota|exceeded|too large/i.test(message)) {
    return "雲端儲存失敗：資料太大或 Supabase 額度不足。請確認照片已壓縮，或改用較小的 PDF。";
  }

  return `雲端儲存失敗：${message}`;
}

function formatAttachmentUploadError(error) {
  return formatCloudSaveError(error).replace("雲端儲存失敗：", "附件上傳失敗：");
}

async function saveCloudLibrary() {
  if (!state.cloudUser || !state.cloudReady || state.cloudSyncing) return;

  try {
    state.cloudSyncing = true;
    renderCloudStatus();
    const client = await getSupabaseClient();

    for (const trip of state.library.trips) {
      await uploadTripAttachments(client, trip);
      const payload = toCloudTripPayload(trip);
      const query = trip.cloudId
        ? client.from("trips").update(payload).eq("id", trip.cloudId).select("id").single()
        : client.from("trips").insert(payload).select("id").single();
      const { data, error } = await query;
      if (error) throw error;
      if (!trip.cloudId && data?.id) trip.cloudId = data.id;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.library));
    state.cloudError = "";
  } catch (error) {
    state.cloudError = formatCloudSaveError(error);
  } finally {
    state.cloudSyncing = false;
    renderCloudStatus();
  }
}

async function deleteCloudTrip(cloudId) {
  if (!cloudId || !state.cloudUser || !state.cloudReady) return;

  try {
    const client = await getSupabaseClient();
    const { error } = await client.from("trips").delete().eq("id", cloudId);
    if (error) throw error;
  } catch (error) {
    state.cloudError = `雲端刪除失敗：${error.message}`;
    renderCloudStatus();
  }
}

function currentTrip() {
  return state.library.trips.find((trip) => trip.id === state.activeTripId) || state.library.trips[0];
}

function currentDay() {
  return currentTrip().days[state.activeDayIndex];
}

function render() {
  renderLanding();
  renderHome();
  renderTrip();
}

function renderLanding() {
  const recentTrip = state.library.trips[0];
  const tripCount = state.library.trips.length;
  const itemCount = state.library.trips.reduce((total, trip) => total + countItems(trip), 0);
  const today = new Date();

  landingTripTitle.textContent = recentTrip?.title || "還沒有旅程";
  landingTripMeta.textContent = recentTrip ? `${recentTrip.days.length} 天，${countItems(recentTrip)} 個行程` : "新增第一段旅程";
  landingTripCount.textContent = tripCount;
  landingItemCount.textContent = itemCount;
  landingToday.textContent = `${today.getMonth() + 1}/${today.getDate()}`;
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
    app: "旅．拾光",
    version: 1,
    trips: state.library.trips
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const firstTrip = state.library.trips[0]?.title || "旅．拾光";

  link.href = url;
  link.download = `${safeFileName(firstTrip)}-旅拾光備份.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importLibrary(file) {
  if (!file) return;

  try {
    const text = await file.text();

    if (!text.trim()) {
      window.alert("匯入失敗：這個檔案是空的。請確認手機下載到的是完整的 JSON 備份檔。");
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      window.alert("匯入失敗：這不是有效的 JSON 檔。請確認不是 zip、圖片、PDF，或手機雲端尚未下載完成的檔案。");
      return;
    }

    const trips = Array.isArray(parsed.trips) ? parsed.trips : Array.isArray(parsed) ? parsed : null;

    if (!trips || trips.length === 0) {
      window.alert("這個檔案不是有效的旅．拾光備份。");
      return;
    }

    const confirmed = window.confirm("匯入後會覆蓋這台裝置目前的旅程資料。確定要繼續嗎？");
    if (!confirmed) return;

    setLibrary({ trips });
    window.alert("匯入完成。");
  } catch (error) {
    const isQuotaError = error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
    if (isQuotaError) {
      window.alert("匯入失敗：手機瀏覽器可用儲存空間不足。通常是備份裡的照片或 PDF 附件太多、太大。請先在電腦端減少附件或改用較小檔案後再匯出。");
      return;
    }

    window.alert("匯入失敗：這份備份資料無法讀取。請確認它是由旅．拾光匯出的 JSON 檔，並且手機已完整下載。");
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
  if (tripTitle) tripTitle.textContent = trip.title;
  tripDates.textContent = trip.dates;
  tripSummary.textContent = `${trip.days.length} 天，${countItems(trip)} 個行程`;
  renderTripSectionTabs();

  dayTabs.innerHTML = trip.days
    .map(
      (day, index) => `
        <button class="day-tab ${index === state.activeDayIndex ? "is-active" : ""}" type="button" data-day="${index}">
          ${escapeHtml(day.date)}
        </button>
      `
    )
    .join("");

  const day = currentDay();
  activeDate.textContent = `Day ${state.activeDayIndex + 1} · ${day.date}`;
  activeDayTitle.textContent = day.title;
  renderBookings();
  renderTodos();
  renderExpenses();

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
              ${item.content ? `<span class="item-content-preview">${escapeHtml(item.content)}</span>` : ""}
              <span class="meta">${escapeHtml(item.type)}</span>
            </span>
            <span class="expand-indicator" aria-hidden="true">⌄</span>
          </button>
          <div class="item-details" id="${escapeHtml(detailsId)}" ${isExpanded ? "" : "hidden"}>
            ${renderFlightInfo(item)}
            ${renderTransportInfo(item)}
            ${renderAttractionIntro(item)}
            ${renderAttachmentGallery(item.attachments, "item", item.id)}
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

function renderTripSectionTabs() {
  document.querySelectorAll("[data-trip-section]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tripSection === state.activeTripSection);
  });

  document.querySelectorAll("[data-section-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.sectionPanel !== state.activeTripSection;
  });
}

function renderBookings() {
  const trip = currentTrip();
  const bookings = trip.bookings.filter((booking) => getBookingGroup(booking) === state.activeBookingGroup);
  bookingSectionTitle.textContent = state.activeBookingGroup;
  bookingSubTabs.querySelectorAll("[data-booking-group]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.bookingGroup === state.activeBookingGroup);
  });

  if (bookings.length === 0) {
    bookingList.innerHTML = `<div class="empty-state">這裡還沒有${escapeHtml(state.activeBookingGroup)}預訂。</div>`;
    return;
  }

  bookingList.innerHTML = bookings
    .slice()
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .map((booking) => {
      const coverImage = getPrimaryImageAttachment(booking.attachments);

      return `
        <article class="utility-card booking-card ${coverImage ? "has-cover" : ""}">
          <div class="booking-card-main">
            <header class="booking-card-header">
              <span class="meta">${escapeHtml(booking.type)}</span>
              <h3>${escapeHtml(booking.name)}</h3>
            </header>
            ${renderBookingMeta(booking)}
            ${booking.code ? `<p class="booking-card-line"><span>代碼</span>${escapeHtml(booking.code)}</p>` : ""}
            ${booking.note ? `<p class="booking-card-note">${escapeHtml(booking.note)}</p>` : ""}
            ${renderAttachmentGallery(booking.attachments, "booking", booking.id, coverImage?.id)}
            <div class="card-actions">
              <button class="text-button" type="button" data-edit-booking="${escapeHtml(booking.id)}">編輯</button>
            </div>
          </div>
          ${coverImage ? renderBookingCover(coverImage, booking.id) : ""}
        </article>
      `;
    })
    .join("");
}

function renderBookingMeta(booking) {
  if (booking.type !== "住宿") {
    const details = [
      { label: "日期", value: booking.date },
      { label: "時間", value: booking.time },
      { label: "地點", value: booking.place }
    ].filter((detail) => detail.value);

    if (details.length === 0) return "";

    return `
      <dl class="booking-meta">
        ${details.map((detail) => `<div><dt>${escapeHtml(detail.label)}</dt><dd>${escapeHtml(detail.value)}</dd></div>`).join("")}
      </dl>
    `;
  }

  const details = [
    { label: "入住", value: renderStayTimeValue(booking.date, booking.time, "check-in") },
    { label: "退房", value: renderStayTimeValue(booking.checkoutDate, booking.checkoutTime, "check-out") },
    { label: "地點", value: booking.place ? `<span class="stay-primary">${escapeHtml(booking.place)}</span>` : "" },
    {
      label: "早餐",
      value: `<span class="stay-pill ${booking.includesBreakfast ? "is-included" : "is-muted"}">${booking.includesBreakfast ? "含早餐" : "未含早餐"}</span>`
    }
  ].filter((detail) => detail.value);

  return `
    <dl class="booking-meta stay-meta">
      ${details.map((detail) => `<div><dt>${escapeHtml(detail.label)}</dt><dd>${detail.value}</dd></div>`).join("")}
    </dl>
  `;
}

function getPrimaryImageAttachment(attachments = []) {
  return attachments.find((attachment) => attachment.type.startsWith("image/") && getAttachmentSource(attachment));
}

function renderBookingCover(attachment, bookingId) {
  return `
    <button
      class="booking-cover"
      type="button"
      data-open-attachment="booking"
      data-owner-id="${escapeHtml(bookingId)}"
      data-attachment-id="${escapeHtml(attachment.id)}"
      title="查看 ${escapeHtml(attachment.name)}"
    >
      <img src="${escapeHtml(getAttachmentSource(attachment))}" alt="${escapeHtml(attachment.name)}" loading="lazy" />
    </button>
  `;
}

function renderStayTimeValue(date, time, timeLabel) {
  if (!date && !time) return "";

  return `
    ${date ? `<span class="stay-primary">${escapeHtml(date)}</span>` : ""}
    ${time ? `<span class="stay-secondary">${escapeHtml(timeLabel)} ${escapeHtml(time)}</span>` : ""}
  `;
}

function renderAttachmentGallery(attachments, ownerType, ownerId, excludedAttachmentId = "") {
  if (!attachments?.length) return "";
  const visibleAttachments = attachments.filter((attachment) => attachment.id !== excludedAttachmentId);
  const images = visibleAttachments.filter((attachment) => attachment.type.startsWith("image/"));
  const files = visibleAttachments.filter((attachment) => !attachment.type.startsWith("image/"));

  if (images.length === 0 && files.length === 0) return "";

  return `
    <div class="attachment-gallery" aria-label="附件">
      ${
        images.length
          ? `<div class="photo-grid">
              ${images
                .map(
                  (attachment) => `
                    <button
                      class="photo-thumb"
                      type="button"
                      data-open-attachment="${escapeHtml(ownerType)}"
                      data-owner-id="${escapeHtml(ownerId)}"
                      data-attachment-id="${escapeHtml(attachment.id)}"
                      title="查看 ${escapeHtml(attachment.name)}"
                    >
                      <img src="${escapeHtml(getAttachmentSource(attachment))}" alt="${escapeHtml(attachment.name)}" loading="lazy" />
                    </button>
                  `
                )
                .join("")}
            </div>`
          : ""
      }
      ${
        files.length
          ? `<div class="attachment-list">
              ${files
                .map(
                  (attachment) => `
                    <button
                      class="attachment-link"
                      type="button"
                      data-open-attachment="${escapeHtml(ownerType)}"
                      data-owner-id="${escapeHtml(ownerId)}"
                      data-attachment-id="${escapeHtml(attachment.id)}"
                      title="查看 ${escapeHtml(attachment.name)}"
                    >
                      ${escapeHtml(attachment.name)}
                    </button>
                  `
                )
                .join("")}
            </div>`
          : ""
      }
    </div>
  `;
}

function getAttachmentSource(attachment) {
  return attachment?.dataUrl || attachment?.publicUrl || attachment?.url || "";
}

function getBookingGroup(booking) {
  if (booking.type === "餐廳") return "餐廳";
  if (booking.type === "住宿") return "住宿";
  return "票券";
}

function renderTodos() {
  const trip = currentTrip();
  const todos = trip.todos.filter((todo) => todo.group === state.activeTodoGroup);
  const doneCount = todos.filter((todo) => todo.done).length;
  todoSectionTitle.textContent = state.activeTodoGroup;
  todoSubTabs.querySelectorAll("[data-todo-group]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.todoGroup === state.activeTodoGroup);
  });

  if (todos.length === 0) {
    todoGroups.innerHTML = `<div class="empty-state">這裡還沒有${escapeHtml(state.activeTodoGroup)}項目。</div>`;
    return;
  }

  todoGroups.innerHTML = `
    <section class="todo-group">
      <header>
        <div>
          <p class="eyebrow">${escapeHtml(state.activeTodoGroup)}</p>
          <h3>${doneCount}/${todos.length} 完成</h3>
        </div>
      </header>
      <div class="todo-list">
        ${todos
          .map(
            (todo) => `
              <label class="todo-row">
                <input type="checkbox" data-toggle-todo="${todo.id}" ${todo.done ? "checked" : ""} />
                <span>
                  <strong>${escapeHtml(todo.text)}</strong>
                  ${todo.note ? `<small>${escapeHtml(todo.note)}</small>` : ""}
                </span>
              </label>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderExpenses() {
  const trip = currentTrip();
  renderMembers();
  renderExchangeRates();

  if (trip.expenses.length === 0) {
    expenseSummary.textContent = "尚無支出";
    expenseDashboard.innerHTML = `<div class="empty-state">新增支出後，這裡會自動顯示每個人的分攤與結算狀態。</div>`;
    expenseList.innerHTML = `<div class="empty-state">還沒有支出。可以依日期記錄品項、金額、貨幣和分類。</div>`;
    return;
  }

  const totalTwd = trip.expenses.reduce((total, expense) => total + convertToTwd(expense.amount, expense.currency, trip), 0);
  expenseSummary.textContent = `${trip.expenses.length} 筆支出 · 合計 ${formatTwd(totalTwd)}`;

  expenseDashboard.innerHTML = renderExpenseDashboard(trip);
  expenseList.innerHTML = renderExpenseDayTabs(trip);
}

function groupExpensesByDate(trip) {
  return trip.expenses
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce((result, expense) => {
      const date = expense.date || "未填日期";
      if (!result[date]) result[date] = [];
      result[date].push(expense);
      return result;
    }, {});
}

function renderExpenseDayTabs(trip) {
  const groups = groupExpensesByDate(trip);
  const dates = Object.keys(groups);
  const activeDate = dates.includes(state.activeExpenseDate) ? state.activeExpenseDate : dates[0];
  state.activeExpenseDate = activeDate;
  const expenses = groups[activeDate] || [];

  return `
    <section class="expense-day-tabs-card">
      <nav class="expense-date-tabs" aria-label="每日帳目">
        ${dates
          .map((date) => {
            const dayTotal = groups[date].reduce((total, expense) => total + convertToTwd(expense.amount, expense.currency, trip), 0);
            return `
              <button class="expense-date-tab ${date === activeDate ? "is-active" : ""}" type="button" data-expense-date="${escapeHtml(date)}">
                <strong>${escapeHtml(date)}</strong>
                <span>${escapeHtml(formatTwd(dayTotal))}</span>
              </button>
            `;
          })
          .join("")}
      </nav>
      ${renderExpenseDayCard(activeDate, expenses, trip)}
    </section>
  `;
}

function renderExpenseDayCard(date, expenses, trip) {
  const dayTotals = expenses.reduce((result, expense) => {
    result[expense.currency] = (result[expense.currency] || 0) + expense.amount;
    return result;
  }, {});
  const dayTwd = expenses.reduce((total, expense) => total + convertToTwd(expense.amount, expense.currency, trip), 0);

  return `
    <section class="expense-day-card">
      <header>
        <div>
          <p class="eyebrow">${escapeHtml(date)}</p>
          <h3>${escapeHtml(formatTwd(dayTwd))}</h3>
          <small>${Object.entries(dayTotals)
            .map(([currency, total]) => `${escapeHtml(currency)} ${formatAmount(total)}`)
            .join(" · ")}</small>
        </div>
        <span>${expenses.length} 筆</span>
      </header>
      <div class="expense-entry-list">
        ${expenses
          .map(
            (expense) => `
              <article class="expense-entry">
                <div class="expense-entry-main">
                  <span class="expense-category">${escapeHtml(expense.category)}</span>
                  <strong>${escapeHtml(expense.name)}</strong>
                  <small>${escapeHtml(expense.payer)} 付款 · ${escapeHtml(expense.shareWith.join("、"))} 分攤</small>
                  ${expense.note ? `<small>${escapeHtml(expense.note)}</small>` : ""}
                </div>
                <div class="expense-entry-amount">
                  <strong>${escapeHtml(expense.currency)} ${formatAmount(expense.amount)}</strong>
                  <span data-expense-twd="${escapeHtml(expense.id)}">約 ${escapeHtml(formatTwd(convertToTwd(expense.amount, expense.currency, trip)))}</span>
                  ${
                    isReadonly
                      ? ""
                      : `<button class="text-button expense-edit-button" type="button" data-edit-expense="${escapeHtml(expense.id)}">編輯</button>`
                  }
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderMembers() {
  const trip = currentTrip();
  trip.members = normalizeMembers(trip.members);
  memberChips.innerHTML = trip.members.map((member) => `<span class="member-chip">${escapeHtml(member)}</span>`).join("");
}

function calculateExpenseLedger(trip) {
  const members = normalizeMembers(trip.members);
  const ledger = Object.fromEntries(members.map((member) => [member, { paid: 0, share: 0, balance: 0 }]));

  trip.expenses.forEach((expense) => {
    if (!ledger[expense.payer]) {
      ledger[expense.payer] = { paid: 0, share: 0, balance: 0 };
    }

    const shareWith = normalizeMembers(expense.shareWith).filter((member) => members.includes(member));
    const participants = shareWith.length ? shareWith : members;
    const amount = convertToTwd(expense.amount, expense.currency, trip);
    const shareAmount = participants.length ? amount / participants.length : 0;

    ledger[expense.payer].paid += amount;
    participants.forEach((member) => {
      if (!ledger[member]) ledger[member] = { paid: 0, share: 0, balance: 0 };
      ledger[member].share += shareAmount;
    });
  });

  Object.values(ledger).forEach((entry) => {
    entry.balance = entry.paid - entry.share;
  });

  return ledger;
}

function calculateSettlements(ledger) {
  const debtors = [];
  const creditors = [];

  Object.entries(ledger).forEach(([member, entry]) => {
    const balance = Math.round(entry.balance * 100) / 100;
    if (balance < -0.01) debtors.push({ member, amount: -balance });
    if (balance > 0.01) creditors.push({ member, amount: balance });
  });

  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtors[debtorIndex] && creditors[creditorIndex]) {
    const amount = Math.min(debtors[debtorIndex].amount, creditors[creditorIndex].amount);
    settlements.push({ from: debtors[debtorIndex].member, to: creditors[creditorIndex].member, amount });
    debtors[debtorIndex].amount -= amount;
    creditors[creditorIndex].amount -= amount;
    if (debtors[debtorIndex].amount <= 0.01) debtorIndex += 1;
    if (creditors[creditorIndex].amount <= 0.01) creditorIndex += 1;
  }

  return settlements;
}

function pieColor(index) {
  return ["#0f6b5f", "#d98145", "#334a75", "#d6a83d", "#86b6cf", "#b42318"][index % 6];
}

function renderExpensePie(ledger) {
  const entries = Object.entries(ledger).filter(([, entry]) => entry.share > 0);
  const total = entries.reduce((sum, [, entry]) => sum + entry.share, 0);

  if (total <= 0) {
    return `<div class="ledger-pie-empty">尚無可分攤資料</div>`;
  }

  let cursor = 0;
  const segments = entries.map(([member, entry], index) => {
    const start = cursor;
    const end = cursor + (entry.share / total) * 100;
    cursor = end;
    return `${pieColor(index)} ${start}% ${end}%`;
  });

  return `
    <section class="ledger-visual">
      <div class="ledger-pie" style="background: conic-gradient(${segments.join(", ")});"></div>
      <div class="ledger-legend">
        ${entries
          .map(
            ([member, entry], index) => `
              <span>
                <i style="background: ${pieColor(index)};"></i>
                ${escapeHtml(member)} ${escapeHtml(formatTwd(entry.share))}
              </span>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderMemberLedgerList(ledger) {
  return `
    <section class="member-ledger-list" aria-label="每人成員帳務">
      ${Object.entries(ledger)
        .map(
          ([member, entry]) => `
            <article class="member-ledger-card">
              <header>
                <strong>${escapeHtml(member)}</strong>
                <span class="${entry.balance >= 0 ? "is-positive" : "is-negative"}">${escapeHtml(formatTwd(entry.balance))}</span>
              </header>
              <p>已付 ${escapeHtml(formatTwd(entry.paid))}</p>
              <p>應分攤 ${escapeHtml(formatTwd(entry.share))}</p>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function calculateExpenseCategoryTotals(trip) {
  return trip.expenses.reduce((result, expense) => {
    const category = expense.category || "其他";
    if (!result[category]) {
      result[category] = {
        totalTwd: 0,
        count: 0,
        currencies: {}
      };
    }

    result[category].totalTwd += convertToTwd(expense.amount, expense.currency, trip);
    result[category].count += 1;
    result[category].currencies[expense.currency] = (result[category].currencies[expense.currency] || 0) + expense.amount;
    return result;
  }, {});
}

function renderExpenseCategoryStats(trip) {
  const categories = Object.entries(calculateExpenseCategoryTotals(trip))
    .sort(([, a], [, b]) => b.totalTwd - a.totalTwd);
  const totalTwd = categories.reduce((total, [, category]) => total + category.totalTwd, 0);

  if (totalTwd <= 0) {
    return `<div class="empty-state">新增支出後，這裡會顯示整趟旅程的分類花費。</div>`;
  }

  return `
    <div class="category-stats-pane">
      <header>
        <div>
          <p class="eyebrow">整趟旅程</p>
          <h3>分類花費統計</h3>
        </div>
        <strong>${escapeHtml(formatTwd(totalTwd))}</strong>
      </header>
      <div class="category-stat-list">
        ${categories
          .map(([category, data], index) => {
            const percent = totalTwd > 0 ? (data.totalTwd / totalTwd) * 100 : 0;
            const currencySummary = Object.entries(data.currencies)
              .map(([currency, total]) => `${escapeHtml(currency)} ${formatAmount(total)}`)
              .join(" · ");
            return `
              <article class="category-stat-row">
                <div class="category-stat-heading">
                  <span>
                    <i style="background: ${pieColor(index)};"></i>
                    ${escapeHtml(category)}
                  </span>
                  <strong>${escapeHtml(formatTwd(data.totalTwd))}</strong>
                </div>
                <div class="category-stat-track" aria-hidden="true">
                  <span style="width: ${Math.max(4, percent).toFixed(2)}%; background: ${pieColor(index)};"></span>
                </div>
                <footer>
                  <span>${data.count} 筆</span>
                  <span>${percent.toFixed(1)}%</span>
                  <span>${currencySummary}</span>
                </footer>
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function calculateMemberCategoryTotals(trip) {
  const members = normalizeMembers(trip.members);
  const result = Object.fromEntries(members.map((member) => [member, { totalTwd: 0, categories: {} }]));

  trip.expenses.forEach((expense) => {
    const category = expense.category || "其他";
    const shareWith = normalizeMembers(expense.shareWith).filter((member) => members.includes(member));
    const participants = shareWith.length ? shareWith : members;
    const amount = convertToTwd(expense.amount, expense.currency, trip);
    const shareAmount = participants.length ? amount / participants.length : 0;

    participants.forEach((member) => {
      if (!result[member]) result[member] = { totalTwd: 0, categories: {} };
      if (!result[member].categories[category]) result[member].categories[category] = { totalTwd: 0, count: 0 };
      result[member].totalTwd += shareAmount;
      result[member].categories[category].totalTwd += shareAmount;
      result[member].categories[category].count += 1;
    });
  });

  return result;
}

function renderMemberCategoryStats(trip) {
  const memberStats = calculateMemberCategoryTotals(trip);
  const members = Object.keys(memberStats);
  const activeMember = members.includes(state.activeExpenseMember) ? state.activeExpenseMember : members[0];
  state.activeExpenseMember = activeMember;
  const data = memberStats[activeMember] || { totalTwd: 0, categories: {} };
  const categories = Object.entries(data.categories).sort(([, a], [, b]) => b.totalTwd - a.totalTwd);

  return `
    <div class="member-category-pane">
      <header>
        <p class="eyebrow">整趟旅程</p>
        <h3>每人分類花費</h3>
      </header>
      <nav class="member-category-tabs" aria-label="選擇成員分類花費">
        ${members
          .map((member) => {
            const memberData = memberStats[member];
            return `
              <button class="member-category-tab ${member === activeMember ? "is-active" : ""}" type="button" data-expense-member="${escapeHtml(member)}">
                <strong>${escapeHtml(member)}</strong>
                <span>${escapeHtml(formatTwd(memberData.totalTwd))}</span>
              </button>
            `;
          })
          .join("")}
      </nav>
      <article class="member-category-row">
        <header>
          <strong>${escapeHtml(activeMember)}</strong>
          <span>${escapeHtml(formatTwd(data.totalTwd))}</span>
        </header>
        ${
          categories.length
            ? `<div class="member-category-items">
                ${categories
                  .map(([category, categoryData], index) => {
                    const percent = data.totalTwd > 0 ? (categoryData.totalTwd / data.totalTwd) * 100 : 0;
                    return `
                      <div class="member-category-item">
                        <div>
                          <span>
                            <i style="background: ${pieColor(index)};"></i>
                            ${escapeHtml(category)}
                          </span>
                          <strong>${escapeHtml(formatTwd(categoryData.totalTwd))}</strong>
                        </div>
                        <div class="category-stat-track" aria-hidden="true">
                          <span style="width: ${Math.max(4, percent).toFixed(2)}%; background: ${pieColor(index)};"></span>
                        </div>
                        <small>${categoryData.count} 筆 · ${percent.toFixed(1)}%</small>
                      </div>
                    `;
                  })
                  .join("")}
              </div>`
            : `<p>尚無分攤花費。</p>`
        }
      </article>
    </div>
  `;
}

function renderExpenseStatsTabs(trip) {
  const tabs = [
    { id: "category", label: "分類總覽" },
    { id: "member", label: "每人分類" }
  ];
  const activeTab = tabs.some((tab) => tab.id === state.activeExpenseStatsTab) ? state.activeExpenseStatsTab : "category";
  state.activeExpenseStatsTab = activeTab;

  return `
    <section class="expense-stats-card">
      <nav class="expense-stats-tabs" aria-label="花費統計分頁">
        ${tabs
          .map(
            (tab) => `
              <button class="expense-stats-tab ${tab.id === activeTab ? "is-active" : ""}" type="button" data-expense-stats-tab="${tab.id}">
                ${escapeHtml(tab.label)}
              </button>
            `
          )
          .join("")}
      </nav>
      ${activeTab === "member" ? renderMemberCategoryStats(trip) : renderExpenseCategoryStats(trip)}
    </section>
  `;
}

function renderExpenseDashboard(trip) {
  const ledger = calculateExpenseLedger(trip);
  const settlements = calculateSettlements(ledger);
  const total = Object.values(ledger).reduce((sum, entry) => sum + entry.share, 0);

  return `
    ${renderExpenseStatsTabs(trip)}
    <section class="ledger-card">
      <header>
        <h3>TWD 帳務總表</h3>
        <p>已換算成台幣，總額 ${escapeHtml(formatTwd(total))}</p>
      </header>
      ${renderExpensePie(ledger)}
      ${renderMemberLedgerList(ledger)}
      <div class="ledger-table">
        <div class="ledger-row ledger-head">
          <span>成員</span>
          <span>已付</span>
          <span>應分攤</span>
          <span>差額</span>
        </div>
        ${Object.entries(ledger)
          .map(
            ([member, entry]) => `
              <div class="ledger-row">
                <span>${escapeHtml(member)}</span>
                <span>${escapeHtml(formatTwd(entry.paid))}</span>
                <span>${escapeHtml(formatTwd(entry.share))}</span>
                <strong class="${entry.balance >= 0 ? "is-positive" : "is-negative"}">${escapeHtml(formatTwd(entry.balance))}</strong>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="settlement-list">
        <strong>結算建議</strong>
        ${
          settlements.length
            ? settlements.map((item) => `<p>${escapeHtml(item.from)} 給 ${escapeHtml(item.to)} ${escapeHtml(formatTwd(item.amount))}</p>`).join("")
            : "<p>目前帳務已打平。</p>"
        }
      </div>
    </section>
  `;
}

function renderExpenseFormMembers() {
  const members = normalizeMembers(currentTrip().members);
  expensePayerInput.innerHTML = members.map((member) => `<option value="${escapeHtml(member)}">${escapeHtml(member)}</option>`).join("");
  expenseShareInputs.innerHTML = members
    .map(
      (member) => `
        <label class="checkbox-row compact">
          <input type="checkbox" value="${escapeHtml(member)}" checked />
          <span>${escapeHtml(member)}</span>
        </label>
      `
    )
    .join("");
}

function openExpenseDialog(expenseId = null) {
  if (isReadonly) return;
  const expense = expenseId ? currentTrip().expenses.find((item) => item.id === expenseId) : null;
  state.editingExpenseId = expense?.id || null;
  expenseDialogTitle.textContent = expense ? "編輯支出" : "新增支出";
  deleteExpenseButton.hidden = !expense;
  expenseForm.reset();
  renderExpenseFormMembers();

  expenseDateInput.value = expense?.date || state.activeExpenseDate || currentTrip().startDate;
  expenseNameInput.value = expense?.name || "";
  expenseAmountInput.value = expense?.amount || "";
  expenseCurrencyInput.value = expense?.currency || "JPY";
  expenseCategoryInput.value = expense?.category || "餐飲";
  expensePayerInput.value = expense?.payer || normalizeMembers(currentTrip().members)[0];
  expenseNoteInput.value = expense?.note || "";

  const shareWith = expense ? normalizeMembers(expense.shareWith) : normalizeMembers(currentTrip().members);
  expenseShareInputs.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = shareWith.includes(input.value);
  });

  openModal(expenseDialog);
}

function selectedExpenseShareMembers() {
  return Array.from(expenseShareInputs.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
}

function formatAmount(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatTwd(value) {
  return `TWD ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatExchangeRate(rate, currency = "") {
  const maxDigits = ["USD", "EUR", "CHF"].includes(currency) ? 2 : 3;
  return Number(rate).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
    useGrouping: false
  });
}

function parseExchangeRate(value) {
  const normalized = String(value || "").replace(",", ".").trim();
  const rate = Number(normalized);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function convertToTwd(amount, currency, trip = currentTrip()) {
  const rates = normalizeExchangeRates(trip.exchangeRates);
  return (Number(amount) || 0) * (rates[currency] || 1);
}

function renderExchangeRates() {
  if (exchangeRateList.contains(document.activeElement)) return;
  const trip = currentTrip();
  trip.exchangeRates = normalizeExchangeRates(trip.exchangeRates);
  exchangeRateList.innerHTML = Object.entries(trip.exchangeRates)
    .map(
      ([currency, rate]) => {
        const value = exchangeRateDrafts.get(currency) ?? formatExchangeRate(rate, currency);
        return `
        <label class="exchange-rate-row">
          <span>${escapeHtml(currency)}</span>
          <input type="text" inputmode="decimal" value="${escapeHtml(value)}" data-exchange-currency="${escapeHtml(currency)}" ${currency === "TWD" ? "readonly" : ""} aria-label="1 ${escapeHtml(currency)} 可以換成多少 TWD" />
        </label>
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

function renderAttractionIntro(item) {
  if (item.type !== "景點" || !item.attractionIntro) return "";

  return `
    <button class="attraction-intro-button" type="button" data-open-attraction-intro="${escapeHtml(item.id)}">
      景點介紹
    </button>
  `;
}

function openAttractionIntro(itemId) {
  const item = currentDay().items.find((entry) => entry.id === itemId);
  if (!item?.attractionIntro) return;

  const introImage = (item.attachments || []).find((attachment) => attachment.type.startsWith("image/") && getAttachmentSource(attachment));
  attachmentViewerTitle.textContent = `${item.place || "景點"}介紹`;
  attachmentViewer.classList.add("is-text-viewer");
  attachmentViewerBody.innerHTML = `
    <article class="attraction-intro-view">
      ${
        introImage
          ? `<img class="attraction-intro-image" src="${escapeHtml(getAttachmentSource(introImage))}" alt="${escapeHtml(introImage.name || item.place || "景點照片")}" />`
          : ""
      }
      <p>${escapeHtml(item.attractionIntro)}</p>
    </article>
  `;
  openModal(attachmentViewer);
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
  landingView.hidden = true;
  homeView.hidden = false;
  tripView.hidden = true;
  renderHome();
}

function showLanding() {
  landingView.hidden = false;
  homeView.hidden = true;
  tripView.hidden = true;
  renderLanding();
}

function showTrip(tripId) {
  state.activeTripId = tripId;
  state.activeDayIndex = 0;
  state.activeExpenseDate = null;
  state.activeTripSection = "itinerary";
  landingView.hidden = true;
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

function closeAttachmentViewer() {
  closeModal(attachmentViewer);
  attachmentViewer.classList.remove("is-text-viewer");
  attachmentViewerBody.innerHTML = "";

  if (activeAttachmentUrl) {
    URL.revokeObjectURL(activeAttachmentUrl);
    activeAttachmentUrl = null;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error(`無法讀取「${file.name || "檔案"}」。`)));
    reader.readAsDataURL(file);
  });
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.addEventListener("load", () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    });
    image.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`無法讀取「${file.name}」這張圖片。`));
    });
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("圖片壓縮失敗，請改用較小的圖片。"));
    }, type, quality);
  });
}

async function compressImageAttachment(file) {
  const image = await loadImageFromFile(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error(`無法讀取「${file.name}」這張圖片。`);
  }

  let bestBlob = null;

  for (const step of IMAGE_COMPRESSION_STEPS) {
    const ratio = Math.min(1, step.maxDimension / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * ratio));
    const height = Math.max(1, Math.round(sourceHeight * ratio));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/jpeg", step.quality);
    bestBlob = blob;
    if (blob.size <= MAX_IMAGE_ATTACHMENT_SIZE) break;
  }

  if (!bestBlob) {
    throw new Error("圖片壓縮失敗，請改用較小的圖片。");
  }

  const dataUrl = await readFileAsDataUrl(bestBlob);
  const imageName = file.name.replace(/\.[^.]+$/, "") || "trip-photo";

  return {
    id: createId(),
    name: `${imageName}.jpg`,
    type: "image/jpeg",
    size: bestBlob.size,
    dataUrl
  };
}

async function readBookingAttachment(file) {
  if (file.type.startsWith("image/")) {
    return compressImageAttachment(file);
  }

  if (file.size > MAX_BOOKING_ATTACHMENT_SIZE) {
    throw new Error(`「${file.name}」超過 4 MB，請改用較小的檔案。`);
  }

  return {
    id: createId(),
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    dataUrl: await readFileAsDataUrl(file)
  };
}

function readBookingAttachments() {
  const files = Array.from(bookingAttachmentInput.files || []);
  return Promise.all(files.map(readBookingAttachment));
}

function readItemPhotos() {
  const files = Array.from(itemPhotoInput.files || []);
  return Promise.all(files.map(readBookingAttachment));
}

function dataUrlToBlob(dataUrl) {
  const [header, base64Data] = String(dataUrl || "").split(",");
  const mimeType = header.match(/^data:([^;]+);base64$/)?.[1] || "application/octet-stream";
  const binary = atob(base64Data || "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function findAttachment(ownerType, ownerId, attachmentId) {
  if (ownerType === "booking") {
    const booking = currentTrip().bookings.find((item) => item.id === ownerId);
    return booking?.attachments.find((item) => item.id === attachmentId);
  }

  if (ownerType === "item") {
    const item = currentTrip()
      .days.flatMap((day) => day.items)
      .find((entry) => entry.id === ownerId);
    return item?.attachments.find((attachment) => attachment.id === attachmentId);
  }

  return null;
}

function openAttachment(ownerType, ownerId, attachmentId) {
  const attachment = findAttachment(ownerType, ownerId, attachmentId);
  const attachmentSource = getAttachmentSource(attachment);

  if (!attachmentSource) {
    window.alert("找不到這個附件，可能是資料沒有完整儲存。");
    return;
  }

  try {
    if (activeAttachmentUrl) {
      URL.revokeObjectURL(activeAttachmentUrl);
      activeAttachmentUrl = null;
    }

    if (attachment.dataUrl) {
      const blob = dataUrlToBlob(attachment.dataUrl);
      activeAttachmentUrl = URL.createObjectURL(blob);
    }

    const viewerUrl = activeAttachmentUrl || attachmentSource;
    attachmentViewerTitle.textContent = attachment.name || "附件預覽";

    if (attachment.type.startsWith("image/")) {
      attachmentViewerBody.innerHTML = `<img class="attachment-viewer-image" src="${escapeHtml(viewerUrl)}" alt="${escapeHtml(attachment.name)}" />`;
    } else {
      attachmentViewerBody.innerHTML = `<iframe class="attachment-viewer-frame" src="${escapeHtml(viewerUrl)}" title="${escapeHtml(attachment.name || "附件預覽")}"></iframe>`;
    }

    openModal(attachmentViewer);
  } catch {
    window.alert("附件開啟失敗。請重新上傳一次附件，或改用較小的 PDF。");
  }
}

function syncBookingStayFields() {
  const isStay = bookingTypeInput.value === "住宿";
  bookingDateLabel.firstChild.textContent = isStay ? "入住日期" : "日期";
  bookingTimeLabel.firstChild.textContent = isStay ? "check-in 時間" : "時間";
  bookingStayFields.hidden = !isStay;
  bookingCheckoutDateInput.required = isStay;
  bookingCheckoutTimeInput.required = isStay;

  if (isStay && bookingDateInput.value && !bookingCheckoutDateInput.value) {
    bookingCheckoutDateInput.value = addDays(bookingDateInput.value, 1);
  }
}

function openBookingDialog(bookingId = null) {
  if (isReadonly) return;

  state.editingBookingId = bookingId;
  const booking = bookingId ? currentTrip().bookings.find((item) => item.id === bookingId) : null;

  bookingForm.reset();
  bookingDialogTitle.textContent = booking ? "編輯預訂" : "新增預訂";
  deleteBookingButton.hidden = !booking;
  bookingTypeInput.value = booking?.type || (state.activeBookingGroup === "餐廳" ? "餐廳" : state.activeBookingGroup === "住宿" ? "住宿" : "景點票券");
  bookingNameInput.value = booking?.name || "";
  bookingDateInput.value = booking?.date || currentTrip().startDate;
  bookingTimeInput.value = booking?.time || "";
  bookingCheckoutDateInput.value = booking?.checkoutDate || addDays(bookingDateInput.value, 1);
  bookingCheckoutTimeInput.value = booking?.checkoutTime || "";
  bookingBreakfastInput.checked = Boolean(booking?.includesBreakfast);
  bookingPlaceInput.value = booking?.place || "";
  bookingCodeInput.value = booking?.code || "";
  bookingNoteInput.value = booking?.note || "";
  bookingAttachmentInput.value = "";
  renderExistingAttachmentsEditor(bookingExistingAttachments, booking?.attachments || []);
  syncBookingStayFields();
  openModal(bookingDialog);
}

function openItemDialog(index = null) {
  if (isReadonly) return;
  state.editingItemIndex = index;
  const item = index === null
    ? {
        time: "",
        place: "",
        type: "景點",
        content: "",
        attractionIntro: "",
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
  setTimeSelects(item.time);
  placeInput.value = item.place;
  typeInput.value = [...typeInput.options].some((option) => option.value === item.type) ? item.type : "其他";
  itemContentInput.value = item.content || "";
  attractionIntroInput.value = item.attractionIntro || "";
  noteInput.value = item.note;
  itemPhotoInput.value = "";
  renderExistingAttachmentsEditor(itemExistingAttachments, item.attachments || []);
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
  syncAttractionFields();
  openModal(itemDialog);
}

function renderExistingAttachmentsEditor(container, attachments = []) {
  if (!container) return;
  container.hidden = attachments.length === 0;
  container.innerHTML = attachments.length
    ? `
      <div class="existing-attachments-heading">
        <strong>已加入附件</strong>
        <span>按「移除」後，儲存才會生效</span>
      </div>
      <div class="existing-attachments-list">
        ${attachments
          .map((attachment) => {
            const source = getAttachmentSource(attachment);
            const preview = attachment.type.startsWith("image/") && source
              ? `<img src="${escapeHtml(source)}" alt="${escapeHtml(attachment.name)}" />`
              : `<span class="attachment-file-icon">PDF</span>`;
            return `
              <article class="existing-attachment" data-existing-attachment-id="${escapeHtml(attachment.id)}">
                <div class="existing-attachment-preview">${preview}</div>
                <div>
                  <strong>${escapeHtml(attachment.name || "附件")}</strong>
                  <span>${escapeHtml(formatFileSize(attachment.size))}</span>
                </div>
                <button class="text-button danger-text" type="button" data-remove-existing-attachment="${escapeHtml(attachment.id)}">移除</button>
              </article>
            `;
          })
          .join("")}
      </div>
    `
    : "";
}

function formatFileSize(size) {
  const bytes = Number(size) || 0;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return bytes ? `${bytes} B` : "雲端附件";
}

function getKeptAttachments(container, attachments = []) {
  const keptIds = new Set(
    Array.from(container?.querySelectorAll("[data-existing-attachment-id]") || []).map((element) => element.dataset.existingAttachmentId)
  );
  return attachments.filter((attachment) => keptIds.has(attachment.id));
}

function getRemovedAttachments(originalAttachments = [], keptAttachments = []) {
  const keptIds = new Set(keptAttachments.map((attachment) => attachment.id));
  return originalAttachments.filter((attachment) => !keptIds.has(attachment.id));
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
  timeHourInput.innerHTML = `<option value="">時</option>`;
  timeMinuteInput.innerHTML = `<option value="">分</option>`;

  for (let hour = 0; hour < 24; hour += 1) {
    const value = String(hour).padStart(2, "0");
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    timeHourInput.append(option);
  }

  for (let minute = 0; minute < 60; minute += 1) {
    const value = String(minute).padStart(2, "0");
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    timeMinuteInput.append(option);
  }
}

function setTimeSelects(time) {
  const [hour = "", minute = ""] = String(time || "").split(":");
  timeHourInput.value = hour;
  timeMinuteInput.value = minute;
  syncTimeInput();
}

function syncTimeInput() {
  timeInput.value = timeHourInput.value && timeMinuteInput.value ? `${timeHourInput.value}:${timeMinuteInput.value}` : "";
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
  renderTripDayTitleEditor();
}

function renderTripDayTitleEditor() {
  if (!tripDayTitleEditor || !tripStartInput.value || !tripEndInput.value) return;

  const dayCount = calculateDayCount(tripStartInput.value, tripEndInput.value);
  const editingTrip = state.editingTripId ? state.library.trips.find((item) => item.id === state.editingTripId) : null;
  const existingInputs = Array.from(tripDayTitleEditor.querySelectorAll("[data-trip-day-title]"));
  const draftTitles = new Map(existingInputs.map((input) => [Number(input.dataset.tripDayTitle), input.value]));

  tripDayTitleEditor.innerHTML = `
    <div class="trip-day-title-heading">
      <strong>每日標題</strong>
      <span>會顯示在每天的行程總覽上</span>
    </div>
    ${Array.from({ length: dayCount }, (_, index) => {
      const date = formatShortDate(addDays(tripStartInput.value, index));
      const title = draftTitles.get(index) ?? editingTrip?.days[index]?.title ?? `第 ${index + 1} 天`;
      return `
        <label>
          <span>Day ${index + 1} · ${escapeHtml(date)}</span>
          <input data-trip-day-title="${index}" value="${escapeHtml(title)}" placeholder="例如：琉森與湖邊" />
        </label>
      `;
    }).join("")}
  `;
}

function collectTripDayTitles(dayCount) {
  return Array.from({ length: dayCount }, (_, index) => {
    const input = tripDayTitleEditor?.querySelector(`[data-trip-day-title="${index}"]`);
    return input?.value.trim() || `第 ${index + 1} 天`;
  });
}

document.querySelector("#enterTripsButton").addEventListener("click", showHome);
document.querySelector("#quickAddTripButton").addEventListener("click", () => openTripDialog());
document.querySelector("#openRecentTripButton").addEventListener("click", () => {
  const trip = state.library.trips[0];
  if (trip) showTrip(trip.id);
});
document.querySelector("#backToLandingButton").addEventListener("click", showLanding);
document.querySelector("#addTripButton").addEventListener("click", () => openTripDialog());
document.querySelector("#backToTripsButton").addEventListener("click", showHome);
document.querySelector("#addItemButton").addEventListener("click", () => openItemDialog());
document.querySelector("#editTripButton").addEventListener("click", () => openTripDialog(currentTrip().id));
document.querySelector("#addBookingButton")?.addEventListener("click", () => openBookingDialog());
document.querySelector("[data-trip-section-add]")?.addEventListener("click", () => {
  if (state.activeTripSection === "bookings") openBookingDialog();
  else if (state.activeTripSection === "todos") {
    todoForm.reset();
    todoGroupInput.value = state.activeTodoGroup;
    openModal(todoDialog);
  } else if (state.activeTripSection === "expenses") openExpenseDialog();
  else openItemDialog();
});
document.querySelector("#addTodoButton")?.addEventListener("click", () => {
  if (isReadonly) return;
  todoForm.reset();
  todoGroupInput.value = state.activeTodoGroup;
  openModal(todoDialog);
});
document.querySelector("#addExpenseButton")?.addEventListener("click", () => openExpenseDialog());
exportButton.addEventListener("click", () => {
  if (!isReadonly) exportLibrary();
});
importButton.addEventListener("click", () => {
  if (!isReadonly) importFileInput.click();
});
importFileInput.addEventListener("change", () => {
  if (!isReadonly) importLibrary(importFileInput.files[0]);
});

cloudAuthForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isReadonly) return;

  const email = cloudEmailInput.value.trim();
  const password = cloudPasswordInput.value;
  if (!email || !password) {
    alert("請輸入 Email 和密碼。");
    return;
  }

  try {
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    state.cloudUser = data.user;
    cloudPasswordInput.value = "";
    renderCloudStatus();
    await loadCloudLibrary();
  } catch (error) {
    alert(`登入失敗：${error.message}`);
  }
});

cloudSignUpButton.addEventListener("click", async () => {
  if (isReadonly) return;

  const email = cloudEmailInput.value.trim();
  const password = cloudPasswordInput.value;
  if (!email || !password) {
    alert("請輸入 Email 和密碼。");
    return;
  }

  try {
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    state.cloudUser = data.user;
    cloudPasswordInput.value = "";
    renderCloudStatus();
    if (data.session) {
      await saveCloudLibrary();
      alert("註冊完成，已開始雲端同步。");
    } else {
      alert("註冊完成。請先到信箱確認 Email，再回來登入。");
    }
  } catch (error) {
    alert(`註冊失敗：${error.message}`);
  }
});

cloudSignOutButton.addEventListener("click", async () => {
  if (isReadonly) return;

  try {
    const client = await getSupabaseClient();
    await client.auth.signOut();
  } finally {
    state.cloudUser = null;
    state.cloudError = "";
    renderCloudStatus();
  }
});

cloudSyncButton.addEventListener("click", async () => {
  if (isReadonly) return;
  await saveCloudLibrary();
  if (!state.cloudError) alert("已同步到 Supabase。");
});

tripStartInput.addEventListener("change", updateTripDayPreview);
tripEndInput.addEventListener("change", updateTripDayPreview);
bookingTypeInput.addEventListener("change", syncBookingStayFields);
bookingDateInput.addEventListener("change", syncBookingStayFields);
typeInput.addEventListener("change", () => {
  syncFlightFields();
  syncTransportFields();
  syncAttractionFields();
});
timeHourInput.addEventListener("change", syncTimeInput);
timeMinuteInput.addEventListener("change", syncTimeInput);
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

[itemExistingAttachments, bookingExistingAttachments].forEach((container) => {
  container?.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-existing-attachment]");
    if (!removeButton) return;
    removeButton.closest("[data-existing-attachment-id]")?.remove();
    container.hidden = !container.querySelector("[data-existing-attachment-id]");
  });
});

closeAttachmentViewerButton.addEventListener("click", closeAttachmentViewer);
attachmentViewer.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeAttachmentViewer();
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

tripSectionTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-trip-section]");
  if (!button) return;
  state.activeTripSection = button.dataset.tripSection;
  renderTripSectionTabs();
});

bookingSubTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-booking-group]");
  if (!button) return;
  state.activeBookingGroup = button.dataset.bookingGroup;
  renderBookings();
});

bookingList.addEventListener("click", (event) => {
  const attachmentButton = event.target.closest("[data-open-attachment]");
  if (attachmentButton) {
    openAttachment(attachmentButton.dataset.openAttachment, attachmentButton.dataset.ownerId, attachmentButton.dataset.attachmentId);
    return;
  }

  const button = event.target.closest("[data-edit-booking]");
  if (!button) return;
  if (isReadonly) return;
  openBookingDialog(button.dataset.editBooking);
});

todoSubTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-todo-group]");
  if (!button) return;
  state.activeTodoGroup = button.dataset.todoGroup;
  renderTodos();
});

expenseList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-expense]");
  if (editButton) {
    openExpenseDialog(editButton.dataset.editExpense);
    return;
  }

  const button = event.target.closest("[data-expense-date]");
  if (!button) return;
  state.activeExpenseDate = button.dataset.expenseDate;
  renderExpenses();
});

expenseDashboard.addEventListener("click", (event) => {
  const memberButton = event.target.closest("[data-expense-member]");
  if (memberButton) {
    state.activeExpenseMember = memberButton.dataset.expenseMember;
    renderExpenses();
    return;
  }

  const button = event.target.closest("[data-expense-stats-tab]");
  if (!button) return;
  state.activeExpenseStatsTab = button.dataset.expenseStatsTab;
  renderExpenses();
});

timeline.addEventListener("click", (event) => {
  const attachmentButton = event.target.closest("[data-open-attachment]");
  if (attachmentButton) {
    openAttachment(attachmentButton.dataset.openAttachment, attachmentButton.dataset.ownerId, attachmentButton.dataset.attachmentId);
    return;
  }

  const attractionIntroButton = event.target.closest("[data-open-attraction-intro]");
  if (attractionIntroButton) {
    openAttractionIntro(attractionIntroButton.dataset.openAttractionIntro);
    return;
  }

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

itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isReadonly) return;

  let attachments = [];
  try {
    attachments = await readItemPhotos();
  } catch (error) {
    alert(error.message);
    return;
  }

  const item = {
    time: `${timeHourInput.value}:${timeMinuteInput.value}`,
    place: placeInput.value.trim(),
    type: typeInput.value.trim(),
    content: itemContentInput.value.trim(),
    attractionIntro: typeInput.value === "景點" ? attractionIntroInput.value.trim() : "",
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
    transportSegments: typeInput.value === "交通" ? collectTransportSegments() : [],
    attachments
  };

  if (item.type === "交通") {
    item.place = getTransportTitle(item.transportSegments) || item.place;
  }

  const editingIndex = state.editingItemIndex;
  const existingItem = editingIndex === null ? null : currentDay().items[editingIndex];
  const keptItemAttachments = existingItem ? getKeptAttachments(itemExistingAttachments, existingItem.attachments || []) : [];
  const removedItemAttachments = existingItem ? getRemovedAttachments(existingItem.attachments || [], keptItemAttachments) : [];

  if (editingIndex === null) {
    item.id = createId();
    currentDay().items.push(item);
  } else {
    item.id = existingItem.id || createId();
    item.attachments = [...keptItemAttachments, ...attachments];
    currentDay().items[editingIndex] = item;
  }

  currentDay().items.sort((a, b) => a.time.localeCompare(b.time));
  state.expandedItemId = item.id;
  let itemLocalSaveStarted = false;
  try {
    await uploadOwnerAttachmentsBeforeLocalSave(currentTrip(), "item", item.id, item.attachments);
    itemLocalSaveStarted = true;
    saveLibrary();
    deleteRemovedAttachmentsFromCloud(removedItemAttachments);
  } catch (error) {
    if (editingIndex === null) currentDay().items = currentDay().items.filter((entry) => entry.id !== item.id);
    else {
      const currentIndex = currentDay().items.findIndex((entry) => entry.id === item.id);
      if (currentIndex >= 0) currentDay().items[currentIndex] = existingItem;
    }
    alert(itemLocalSaveStarted ? "圖片容量太大，無法儲存到此裝置。請改用較小的圖片。" : formatAttachmentUploadError(error));
    return;
  }
  closeModal(itemDialog);
  render();
});

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isReadonly) return;

  let attachments = [];
  try {
    attachments = await readBookingAttachments();
  } catch (error) {
    alert(error.message);
    return;
  }

  const editingIndex = state.editingBookingId
    ? currentTrip().bookings.findIndex((booking) => booking.id === state.editingBookingId)
    : -1;
  const existingBooking = editingIndex >= 0 ? currentTrip().bookings[editingIndex] : null;
  const keptBookingAttachments = existingBooking ? getKeptAttachments(bookingExistingAttachments, existingBooking.attachments || []) : [];
  const removedBookingAttachments = existingBooking ? getRemovedAttachments(existingBooking.attachments || [], keptBookingAttachments) : [];
  const booking = normalizeBooking({
    id: existingBooking?.id || createId(),
    type: bookingTypeInput.value,
    name: bookingNameInput.value.trim(),
    date: bookingDateInput.value,
    time: bookingTimeInput.value,
    checkoutDate: bookingTypeInput.value === "住宿" ? bookingCheckoutDateInput.value : "",
    checkoutTime: bookingTypeInput.value === "住宿" ? bookingCheckoutTimeInput.value : "",
    includesBreakfast: bookingTypeInput.value === "住宿" ? bookingBreakfastInput.checked : false,
    place: bookingPlaceInput.value.trim(),
    code: bookingCodeInput.value.trim(),
    note: bookingNoteInput.value.trim(),
    attachments: [...keptBookingAttachments, ...attachments]
  });

  if (existingBooking) {
    currentTrip().bookings[editingIndex] = booking;
  } else {
    currentTrip().bookings.push(booking);
  }

  let bookingLocalSaveStarted = false;
  try {
    await uploadOwnerAttachmentsBeforeLocalSave(currentTrip(), "booking", booking.id, booking.attachments);
    bookingLocalSaveStarted = true;
    saveLibrary();
    deleteRemovedAttachmentsFromCloud(removedBookingAttachments);
  } catch (error) {
    if (existingBooking) currentTrip().bookings[editingIndex] = existingBooking;
    else currentTrip().bookings.pop();
    alert(bookingLocalSaveStarted ? "附件容量太大，無法儲存到此裝置。請改用較小的檔案。" : formatAttachmentUploadError(error));
    return;
  }

  state.editingBookingId = null;
  closeModal(bookingDialog);
  renderBookings();
});

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (isReadonly) return;

  currentTrip().todos.push(normalizeTodo({
    id: createId(),
    group: todoGroupInput.value,
    text: todoTextInput.value.trim(),
    note: todoNoteInput.value.trim(),
    done: false
  }));

  saveLibrary();
  closeModal(todoDialog);
  renderTodos();
});

todoGroups.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-toggle-todo]");
  if (!checkbox || isReadonly) return;
  const todo = currentTrip().todos.find((item) => item.id === checkbox.dataset.toggleTodo);
  if (!todo) return;
  todo.done = checkbox.checked;
  saveLibrary();
  renderTodos();
});

memberForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (isReadonly) return;
  const memberName = memberNameInput.value.trim();
  if (!memberName) return;

  const trip = currentTrip();
  trip.members = normalizeMembers([...(trip.members || []), memberName]);
  memberNameInput.value = "";
  saveLibrary();
  renderExpenses();
});

function applyExchangeRateInput(input) {
  if (!input || isReadonly) return;
  const currency = input.dataset.exchangeCurrency;
  if (currency === "TWD") return;

  const currentRates = normalizeExchangeRates(currentTrip().exchangeRates);
  const rate = parseExchangeRate(input.value) || currentRates[currency];
  exchangeRateDrafts.delete(currency);
  input.value = formatExchangeRate(rate, currency);
  currentTrip().exchangeRates = normalizeExchangeRates({
    ...currentRates,
    [currency]: rate
  });
  saveLibrary();
  renderExpenses();
}

exchangeRateList.addEventListener("input", (event) => {
  const input = event.target.closest("[data-exchange-currency]");
  if (!input || isReadonly) return;
  const currency = input.dataset.exchangeCurrency;
  if (currency === "TWD") return;
  exchangeRateDrafts.set(currency, input.value);
});

exchangeRateList.addEventListener("change", (event) => {
  applyExchangeRateInput(event.target.closest("[data-exchange-currency]"));
});

exchangeRateList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const input = event.target.closest("[data-exchange-currency]");
  if (!input || isReadonly) return;
  event.preventDefault();
  input.blur();
});

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (isReadonly) return;
  const shareWith = selectedExpenseShareMembers();
  if (shareWith.length === 0) {
    alert("請至少選擇一位分攤成員。");
    return;
  }

  const trip = currentTrip();
  const payload = normalizeExpense({
    id: state.editingExpenseId || createId(),
    date: expenseDateInput.value,
    name: expenseNameInput.value.trim(),
    amount: expenseAmountInput.value,
    currency: expenseCurrencyInput.value,
    category: expenseCategoryInput.value,
    payer: expensePayerInput.value,
    shareWith,
    note: expenseNoteInput.value.trim()
  });

  if (state.editingExpenseId) {
    const index = trip.expenses.findIndex((expense) => expense.id === state.editingExpenseId);
    if (index >= 0) {
      trip.expenses[index] = payload;
    } else {
      trip.expenses.push(payload);
    }
  } else {
    trip.expenses.push(payload);
  }

  state.editingExpenseId = null;
  state.activeExpenseDate = payload.date || state.activeExpenseDate;
  saveLibrary();
  closeModal(expenseDialog);
  renderExpenses();
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

function syncAttractionFields() {
  const isAttraction = typeInput.value === "景點";
  attractionFields.hidden = !isAttraction;
  attractionIntroInput.disabled = !isAttraction;
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

deleteBookingButton.addEventListener("click", () => {
  if (isReadonly) return;
  if (!state.editingBookingId) return;
  const booking = currentTrip().bookings.find((item) => item.id === state.editingBookingId);
  const confirmed = window.confirm(`確定刪除「${booking?.name || "這筆預訂"}」？這只會刪除這台裝置瀏覽器裡的資料。`);
  if (!confirmed) return;

  currentTrip().bookings = currentTrip().bookings.filter((item) => item.id !== state.editingBookingId);
  state.editingBookingId = null;
  saveLibrary();
  closeModal(bookingDialog);
  renderBookings();
});

deleteExpenseButton.addEventListener("click", () => {
  if (isReadonly) return;
  if (!state.editingExpenseId) return;
  const trip = currentTrip();
  const expense = trip.expenses.find((item) => item.id === state.editingExpenseId);
  const confirmed = window.confirm(`確定刪除「${expense?.name || "這筆支出"}」？這只會刪除這台裝置瀏覽器裡的資料。`);
  if (!confirmed) return;

  trip.expenses = trip.expenses.filter((item) => item.id !== state.editingExpenseId);
  state.editingExpenseId = null;
  saveLibrary();
  closeModal(expenseDialog);
  renderExpenses();
});

tripForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (isReadonly) return;

  updateTripDayPreview();
  const startDate = tripStartInput.value;
  const endDate = tripEndInput.value;
  const dayCount = calculateDayCount(startDate, endDate);
  const dayTitles = collectTripDayTitles(dayCount);
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
      days: createBlankDays(dayCount, startDate).map((day, index) => ({ ...day, title: dayTitles[index] })),
      members: ["我"],
      exchangeRates: { ...DEFAULT_EXCHANGE_RATES },
      bookings: [],
      todos: [],
      expenses: []
    };
    state.library.trips.unshift(trip);
  } else {
    trip.title = tripNameInput.value.trim();
    trip.startDate = startDate;
    trip.endDate = endDate;
    trip.dates = formatDateRange(startDate, endDate);
    resizeTripDays(trip, dayCount);
    syncTripDayDates(trip);
    trip.days = trip.days.map((day, index) => ({ ...day, title: dayTitles[index] || day.title }));
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
  const confirmed = window.confirm(`確定刪除「${trip.title}」？如果已登入雲端，也會同步刪除 Supabase 裡的這趟旅程。`);
  if (!confirmed) return;

  deleteCloudTrip(trip.cloudId);
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
initCloudSync();
showLanding();
