// Input:  A codebase using Moment.js with timezone and relative time
// Output: The same functionality using Day.js with required plugins

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import 'dayjs/locale/de';

// Register plugins (one-time setup, typically in app entry point)
dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

// Parse (identical to Moment.js)
const date = dayjs('2026-02-17');
const custom = dayjs('02/17/2026', 'MM/DD/YYYY'); // requires customParseFormat

// Format (identical tokens to Moment.js)
const formatted = date.format('MMMM Do, YYYY'); // "February 17th, 2026" (requires advancedFormat)

// Add/subtract (identical to Moment.js, but returns new instance)
const nextWeek = dayjs().add(7, 'day');
const lastMonth = dayjs().subtract(1, 'month');

// Difference (note: singular unit name)
const daysUntil = dayjs('2026-12-31').diff(dayjs(), 'day');

// Comparison (identical to Moment.js)
const isPast = dayjs('2025-01-01').isBefore(dayjs());
const inRange = dayjs().isBetween('2026-01-01', '2026-12-31'); // requires isBetween

// Relative time (requires relativeTime plugin)
const relative = dayjs('2026-01-01').fromNow(); // "2 months ago"

// Timezone (requires utc + timezone plugins)
const nyTime = dayjs().tz('America/New_York').format('YYYY-MM-DD HH:mm z');

// Locale
const german = dayjs().locale('de').format('dddd, D. MMMM YYYY');
