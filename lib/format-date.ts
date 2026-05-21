export const appTimeZone = "Europe/Berlin";
export const appLocale = "de-DE";

const dateFormatter = new Intl.DateTimeFormat(appLocale, {
  dateStyle: "short",
  timeZone: appTimeZone,
});

const dateTimeFormatter = new Intl.DateTimeFormat(appLocale, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: appTimeZone,
});

function appDate(value: Date | string) {
  if (value instanceof Date) return value;

  const hasExplicitTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  const normalized = hasExplicitTimeZone ? value : `${value}Z`;

  return new Date(normalized);
}

export function formatDate(value: Date | string) {
  return dateFormatter.format(appDate(value));
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "Never";

  return dateTimeFormatter.format(appDate(value));
}
