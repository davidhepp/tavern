const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "short",
  timeZone: "UTC",
});

export function formatDate(value: Date | string) {
  return dateFormatter.format(new Date(value));
}
