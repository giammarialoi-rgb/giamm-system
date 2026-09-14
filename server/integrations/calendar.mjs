export const CALENDAR_SCOPES = Object.freeze({
  readAvailability: "https://www.googleapis.com/auth/calendar.events.freebusy",
  manageEvents: "https://www.googleapis.com/auth/calendar.events"
});

// Calendar API compatibility is configured server-side; private event data is
// never requested unless the user has opted into a scope that permits it.
export function calendarPublicConfig(env = process.env) {
  const mode = String(env.CALENDAR_ACCESS_MODE || "availability").toLowerCase();
  return {
    enabled: Boolean(env.GOOGLE_CALENDAR_CLIENT_ID),
    accessMode: mode === "write" ? "write" : "availability",
    scopes: mode === "write" ? [CALENDAR_SCOPES.manageEvents] : [CALENDAR_SCOPES.readAvailability],
    writerWithoutPrivateAccess: String(env.CALENDAR_WRITER_WITHOUT_PRIVATE_ACCESS || "false") === "true"
  };
}
