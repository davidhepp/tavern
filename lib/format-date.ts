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

export function formatDate(value: Date | string) {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "Never";

  return dateTimeFormatter.format(new Date(value));
}
