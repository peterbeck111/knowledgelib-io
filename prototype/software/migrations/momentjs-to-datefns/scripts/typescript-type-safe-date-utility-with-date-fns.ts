// Input:  Need a type-safe date utility layer for a TypeScript project
// Output: Strongly typed wrapper around date-fns functions

import {
  format, parseISO, addDays, subDays,
  differenceInDays, isBefore, isAfter, isValid
} from 'date-fns';

type DateInput = Date | string;

function toDate(input: DateInput): Date {
  if (typeof input === 'string') {
    const parsed = parseISO(input);
    if (!isValid(parsed)) {
      throw new Error(`Invalid date string: ${input}`);
    }
    return parsed;
  }
  return input;
}

// Type-safe formatting
function formatDate(input: DateInput, pattern: string = 'yyyy-MM-dd'): string {
  return format(toDate(input), pattern);
}

// Type-safe arithmetic
function addDaysTo(input: DateInput, days: number): Date {
  return addDays(toDate(input), days);
}

function daysBetween(a: DateInput, b: DateInput): number {
  return differenceInDays(toDate(a), toDate(b));
}

// Type-safe comparison
function isDateBefore(a: DateInput, b: DateInput): boolean {
  return isBefore(toDate(a), toDate(b));
}

// Usage:
const result = formatDate('2026-02-17', 'MMMM do, yyyy'); // "February 17th, 2026"
const diff = daysBetween('2026-12-31', '2026-02-17');       // 317
const past = isDateBefore('2025-01-01', new Date());         // true
