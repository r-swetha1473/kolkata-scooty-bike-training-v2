const config = require('../app.config');
const { getDayOfWeek } = require('../utils/dateUtils');

function parseTimeToMinutes(timeValue) {
  const [h, m] = String(timeValue || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
}

function convertISTToUTC(hoursIST, minutesIST) {
  let hoursUTC = hoursIST - 5;
  let minutesUTC = minutesIST - 30;
  if (minutesUTC < 0) {
    minutesUTC += 60;
    hoursUTC -= 1;
  }
  if (hoursUTC < 0) hoursUTC += 24;
  return { hours: hoursUTC, minutes: minutesUTC };
}

/**
 * Generate in-memory slot windows for a branch day (no DB writes).
 */
function generateSlotWindows({ dateString, daySchedule, durationMinutes, slotCapacity = 5 }) {
  if (!daySchedule || daySchedule.is_closed) {
    return [];
  }

  const dayOfWeek = getDayOfWeek(dateString);
  const [year, month, day] = dateString.split('-').map(Number);
  const intervalMinutes = durationMinutes || 30;
  const windows = [];

  const pushWindow = (startMinutes, endMinutes) => {
    const startUTC = convertISTToUTC(Math.floor(startMinutes / 60), startMinutes % 60);
    const endUTC = convertISTToUTC(Math.floor(endMinutes / 60), endMinutes % 60);
    const startTime = new Date(Date.UTC(year, month - 1, day, startUTC.hours, startUTC.minutes, 0, 0));
    const endTime = new Date(Date.UTC(year, month - 1, day, endUTC.hours, endUTC.minutes, 0, 0));
    windows.push({
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      slot_date: dateString,
      capacity: slotCapacity,
      status: 'available',
      is_virtual: true
    });
  };

  const opens = parseTimeToMinutes(daySchedule.opens_at);
  const closes = parseTimeToMinutes(daySchedule.closes_at);

  if (opens < closes) {
    let cursor = opens;
    while (cursor + intervalMinutes <= closes) {
      pushWindow(cursor, cursor + intervalMinutes);
      cursor += intervalMinutes;
    }
    return windows;
  }

  // Legacy Sunday template fallback when branch hours missing
  if (dayOfWeek === 0) {
    const sunday = config.slot.generation.sunday;
    for (const slot of sunday.morning) {
      const start = slot.hour * 60 + slot.minute;
      pushWindow(start, start + intervalMinutes);
    }
    let cursor = sunday.evening.startHour * 60;
    const end = sunday.evening.endHour * 60;
    while (cursor + intervalMinutes <= end) {
      pushWindow(cursor, cursor + intervalMinutes);
      cursor += intervalMinutes;
    }
    return windows;
  }

  const weekday = config.slot.generation.weekday;
  let cursor = weekday.startHour * 60;
  const end = weekday.endHour * 60;
  while (cursor + intervalMinutes <= end) {
    pushWindow(cursor, cursor + intervalMinutes);
    cursor += intervalMinutes;
  }
  return windows;
}

module.exports = {
  generateSlotWindows
};
