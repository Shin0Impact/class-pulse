// A random id. crypto.randomUUID only exists on secure origins (https or localhost), not on a
// laptop's LAN address during a local demo, so fall back to something random enough.
export const newId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
