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
        .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
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
    (booking) => !getBookingScheduleDateForTabs(booking),
  );
  return { scheduled, undated };
}
