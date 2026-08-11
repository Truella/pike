/**
 * Shared date-formatting utilities for the content dashboard.
 *
 * All scheduled_at / published_at values from Supabase are UTC ISO strings
 * (timestamptz). Every place we show them to the user must convert to the
 * browser's local timezone so the displayed time is always consistent.
 */

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateOnlyFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

/**
 * Format a UTC ISO timestamp for display in the user's local timezone.
 * e.g. "Aug 11, 2026, 1:10 PM"
 */
export function formatScheduledTime(utcIso: string): string {
  return dateTimeFormatter.format(new Date(utcIso));
}

/**
 * Format a UTC ISO timestamp for display in the user's local timezone (date only).
 * e.g. "Aug 11, 2026"
 */
export function formatDateOnly(utcIso: string): string {
  return dateOnlyFormatter.format(new Date(utcIso));
}

/**
 * Convert a UTC ISO timestamp into the value format expected by
 * <input type="datetime-local"> — which is "YYYY-MM-DDTHH:mm" in LOCAL time.
 *
 * The root of the timezone bug: naive .toISOString().slice(0,16) returns UTC,
 * so an input pre-populated that way shows the wrong (UTC) time to the user.
 * This function correctly shifts to local before slicing.
 */
export function toLocalDatetimeInputValue(utcIso: string): string {
  const d = new Date(utcIso);
  // getTimezoneOffset() returns offset in minutes (positive = behind UTC)
  const offsetMs = d.getTimezoneOffset() * 60 * 1000;
  const localMs = d.getTime() - offsetMs;
  return new Date(localMs).toISOString().slice(0, 16);
}
