function isValidIsoCalendarDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));

  return calendarDate.getUTCFullYear() === year
    && calendarDate.getUTCMonth() === month - 1
    && calendarDate.getUTCDate() === day;
}

export function getBookingScheduleDateForTabs(booking = {}) {
  return booking.type === "交通"
    ? booking.transport?.departureDate || booking.date || ""
    : booking.date || "";
}

export function getAvailableBookingDates(bookings = []) {
  return [
    ...new Set(
      bookings
        .map(getBookingScheduleDateForTabs)
        .filter(isValidIsoCalendarDate),
    ),
  ].sort();
}

export function resolveActiveBookingDate(
  availableDates = [],
  activeDate = "",
  reset = false,
) {
  if (availableDates.length === 0) return "";
  return !reset && availableDates.includes(activeDate)
    ? activeDate
    : availableDates[0];
}

export function splitBookingsByDate(bookings = [], activeDate = "") {
  const scheduled = activeDate
    ? bookings.filter(
        (booking) => getBookingScheduleDateForTabs(booking) === activeDate,
      )
    : [];
  const undated = bookings.filter(
    (booking) => !isValidIsoCalendarDate(getBookingScheduleDateForTabs(booking)),
  );
  return { scheduled, undated };
}

export function renderBookingDateTabs(availableDates = [], activeDate = "") {
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

  return availableDates
    .map((dateString) => {
      const [year, month, day] = dateString.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      const label = `${date.getUTCMonth() + 1}/${date.getUTCDate()}（週${weekdays[date.getUTCDay()]}）`;
      const isActive = dateString === activeDate;

      return `<button class="booking-date-tab${isActive ? " is-active" : ""}" type="button" data-booking-date="${dateString}" aria-pressed="${isActive}">${label}</button>`;
    })
    .join("");
}
