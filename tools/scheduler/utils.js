export function formatDate(timestamp, timeZone) {
  const rawDate = timestamp ? new Date(timestamp) : new Date();
  const date = rawDate.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', timeZone });
  const time = rawDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone });
  return { date, time };
}
