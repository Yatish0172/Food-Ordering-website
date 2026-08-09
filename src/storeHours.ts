export const BUSINESS = {
  name: 'The Karaoke Kitchen',
  address: '2 km from UPES, Upper Kandoli, next to PeopleTree Hostel, Bidholi, Dehradun, Uttarakhand 248007',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=30.3963709%2C77.9689023',
  timeZone: 'Asia/Kolkata',
} as const;

export const STORE_HOURS = {
  sun: [[690, 840], [1110, 1260]],
  mon: [[690, 840], [1110, 1260]],
  tue: [[690, 840], [1110, 1260]],
  wed: [[690, 840], [1110, 1260]],
  thu: [[690, 840], [1110, 1260]],
  fri: [[690, 840], [1110, 1260]],
  sat: [[690, 840], [1110, 1260]],
} as const;

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
type DayKey = typeof DAYS[number];

export type StoreStatus = {
  open: boolean;
  state: 'open' | 'closed';
  timeZone: string;
  todayHours: string;
  weeklyHours: string;
  nextChange: string;
  message: string;
};

function localClock(at: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS.timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const dayIndex = DAYS.indexOf(values.weekday.toLowerCase() as DayKey);
  return { dayIndex, minute: Number(values.hour) * 60 + Number(values.minute) };
}

function timeLabel(minute: number) {
  const hour = Math.floor(minute / 60);
  const mins = minute % 60;
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

function hoursLabel(dayIndex: number) {
  return STORE_HOURS[DAYS[dayIndex]].map(([opens, closes]) => `${timeLabel(opens)}–${timeLabel(closes)}`).join(' and ');
}

export function getStoreStatus(at = new Date()): StoreStatus {
  const { dayIndex, minute } = localClock(at);
  const today = STORE_HOURS[DAYS[dayIndex]];
  const active = today.find(([opens, closes]) => minute >= opens && minute < closes);

  if (active) {
    const nextChange = `Closes at ${timeLabel(active[1])}`;
    return {
      open: true,
      state: 'open',
      timeZone: BUSINESS.timeZone,
      todayHours: hoursLabel(dayIndex),
      weeklyHours: 'Daily, 11:30 AM–2:00 PM and 6:30 PM–9:00 PM',
      nextChange,
      message: `Kitchen open · ${nextChange}`,
    };
  }

  for (let offset = 0; offset < 8; offset += 1) {
    const candidateDay = (dayIndex + offset) % 7;
    for (const [opens] of STORE_HOURS[DAYS[candidateDay]]) {
      if (offset === 0 && opens <= minute) continue;
      const dayLabel = offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : `on ${DAY_NAMES[candidateDay]}`;
      const nextChange = `Opens ${dayLabel} at ${timeLabel(opens)}`;
      return {
        open: false,
        state: 'closed',
        timeZone: BUSINESS.timeZone,
        todayHours: hoursLabel(dayIndex),
        weeklyHours: 'Daily, 11:30 AM–2:00 PM and 6:30 PM–9:00 PM',
        nextChange,
        message: `Kitchen closed · ${nextChange}`,
      };
    }
  }

  return {
    open: false,
    state: 'closed',
    timeZone: BUSINESS.timeZone,
    todayHours: hoursLabel(dayIndex),
    weeklyHours: 'Daily, 11:30 AM–2:00 PM and 6:30 PM–9:00 PM',
    nextChange: 'Opening time unavailable',
    message: 'Kitchen closed',
  };
}
