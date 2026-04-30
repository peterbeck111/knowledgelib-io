// Input:  A utility module that wraps all common Moment.js operations
// Output: The same module rewritten with date-fns v4

import {
  format, parseISO, parse,
  addDays, addMonths, addYears,
  subDays, subMonths,
  differenceInDays, differenceInMonths, differenceInYears,
  isBefore, isAfter, isSameDay, isValid,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  formatDistance, formatRelative
} from 'date-fns';

// Parse an ISO string (replaces moment('2026-02-17'))
const date = parseISO('2026-02-17');

// Parse custom format (replaces moment('02/17/2026', 'MM/DD/YYYY'))
const customParsed = parse('02/17/2026', 'MM/dd/yyyy', new Date());

// Format (replaces moment().format('MMMM Do, YYYY'))
const formatted = format(new Date(), 'MMMM do, yyyy'); // "February 17th, 2026"

// Add/subtract (replaces moment().add(7, 'days'))
const nextWeek = addDays(new Date(), 7);
const lastMonth = subMonths(new Date(), 1);
const nextYear = addYears(new Date(), 1);

// Difference (replaces moment(a).diff(b, 'days'))
const daysUntil = differenceInDays(parseISO('2026-12-31'), new Date());

// Comparison (replaces moment(a).isBefore(b))
const isPast = isBefore(parseISO('2025-01-01'), new Date()); // true

// Range boundaries (replaces moment().startOf('month'))
const monthStart = startOfMonth(new Date());
const monthEnd = endOfMonth(new Date());

// Relative time (replaces moment().fromNow())
const relative = formatDistance(parseISO('2026-01-01'), new Date(), {
  addSuffix: true
}); // "about 2 months ago"

// Validation (replaces moment(str).isValid())
const valid = isValid(parseISO('2026-02-30')); // false
