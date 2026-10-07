// Facts used by the Privacy Policy, Terms and Cookie Policy. Change them here, not in the pages.
// ⚠️ Confirm every value marked CONFIRM before launch: these pages are legal statements.
import { brand } from "./site";

export const legal = {
  // CONFIRM: the registered name of the business (e.g. "Sparrowgen" as a proprietorship, or "Sparrowgen LLP").
  businessName: brand.name,
  // CONFIRM: one line on how the business is set up, or "" to leave it out. Only say "MSME registered" if it is.
  businessStatus: "",
  // CONFIRM: postal address for legal notices. City and state at minimum.
  address: "Kolkata, West Bengal, India",
  // Founders are deliberately not listed by name on the legal pages (one can't be named publicly).
  // CONFIRM: an inbox someone actually reads. Privacy and customer complaints go here.
  // phone is Anoranya's number (the second WhatsApp line on the site).
  grievanceOfficer: { name: "Anoranya Dutta", role: "Co-founder and Grievance Officer", email: brand.email, phone: brand.whatsapp2 },
  effectiveDate: "6 October 2026",
  lastUpdated: "6 October 2026",
  courtsCity: "Kolkata, West Bengal",
};

// Browser storage the website uses (shown in the Cookie Policy). Keep in sync with the code:
// THEME_KEY in lib/site.ts, PREVIEW_DRAFT_KEY / PREVIEW_CHOICE_KEY in lib/previews.ts.
export const storageItems = [
  { name: "site-theme-v1", where: "Local storage", purpose: "Remembers the colour theme you picked (for example light or dark).", lasts: "Until you clear your browser data" },
  { name: "preview-draft-v1", where: "Session storage", purpose: "Carries the business name you type on the home page over to the free preview.", lasts: "Until you close the tab (removed as soon as it is used)" },
  { name: "preview-choice-v1", where: "Session storage", purpose: "Carries the design you picked in the free preview over to the booking form.", lasts: "Until you close the tab" },
];

// Kinds of service providers that process personal data for us (Data Processors).
export const processors = [
  { what: "Website hosting and delivery", why: "Serves this website to you. Like every web host, it keeps short technical logs (IP address, browser, page requested) for security." },
  { what: "Server and database hosting", why: "Runs the system that receives the booking form and stores enquiries for our team." },
  { what: "Email, phone and messaging (such as Google mail and WhatsApp)", why: "Used when you write to us or we reply to you." },
  { what: "Image delivery (Unsplash)", why: "Supplies the stock photos shown in the free preview. Your browser loads them directly from Unsplash." },
];
