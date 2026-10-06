// The legal pages are one text for the website and the apps. What only concerns buying on the website (Stripe, the
// free first period, the withdrawal of a website purchase) is marked data-web-only; the apps ask for the page with
// ?app=1 and get it without those parts (the stores' rules: nothing in the app about buying outside the store).
export function stripWebOnly(html) {
  return String(html || "").replace(/<(p|li|tr|span)\b[^>]*\bdata-web-only\b[^>]*>[\s\S]*?<\/\1>\s*/g, "");
}
export const asksForAppVersion = (req) => String((req && req.query && req.query.app) || "") === "1";
