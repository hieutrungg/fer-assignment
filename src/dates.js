export const dateTime = (date) => new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short", timeStyle: "short",
}).format(new Date(date));

export function localInput(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
