// "See your website" preview library.
// Each business category has its own copy and three colour palettes, one per design layout.
// Kept in the frontend for now; it is plain data, so it can move to a backend table/endpoint later
// without changing the preview components.

export type Palette = { bg: string; surface: string; text: string; muted: string; accent: string; accentText: string };

export type Category = {
  id: string;
  label: string;
  nav: [string, string, string];
  cta: string;
  heroTitle: string; // "{name}" is replaced with the visitor's business name
  heroText: string; // replaced by the visitor's own "what you do" line when given
  sectionTitle: string;
  items: { title: string; text: string }[];
  aboutTitle: string;
  aboutText: string;
  palettes: { bold: Palette; clean: Palette; editorial: Palette };
};

export const DESIGNS = [
  { id: "bold", name: "Bold", desc: "Dark, confident, big type" },
  { id: "clean", name: "Clean", desc: "Light, simple, lots of space" },
  { id: "editorial", name: "Editorial", desc: "Magazine-style, strong grid" },
] as const;
export type DesignId = (typeof DESIGNS)[number]["id"];

export const CATEGORIES: Category[] = [
  {
    id: "restaurant", label: "Restaurant & Café",
    nav: ["Menu", "About", "Visit"], cta: "See the menu",
    heroTitle: "Good food, worth the trip.",
    heroText: "Fresh, made-to-order food and coffee. Come hungry, leave happy.",
    sectionTitle: "Popular right now",
    items: [
      { title: "Signature dishes", text: "Our most-loved plates, made fresh every day." },
      { title: "Coffee & drinks", text: "Single-origin brews, shakes and coolers." },
      { title: "Catering", text: "Parties, offices and events. We bring the kitchen." },
    ],
    aboutTitle: "A kitchen with a story",
    aboutText: "Started with one recipe and a lot of love. Today we serve the neighbourhood every day.",
    palettes: {
      bold: { bg: "#1f120c", surface: "#2c1a12", text: "#fff4e8", muted: "#d9c2ae", accent: "#fa7e1e", accentText: "#1f120c" },
      clean: { bg: "#fffaf3", surface: "#f4ead9", text: "#2a1a10", muted: "#6e5a48", accent: "#c2541a", accentText: "#ffffff" },
      editorial: { bg: "#f2efe7", surface: "#ffffff", text: "#1b1b1b", muted: "#5c5c5c", accent: "#2f6b3f", accentText: "#ffffff" },
    },
  },
  {
    id: "fashion", label: "Fashion & Boutique",
    nav: ["New in", "Shop", "Lookbook"], cta: "Shop the collection",
    heroTitle: "New season. Limited pieces.",
    heroText: "Handpicked styles in small batches. Once they're gone, they're gone.",
    sectionTitle: "Shop by category",
    items: [
      { title: "Dresses", text: "Everyday to occasion wear." },
      { title: "Accessories", text: "Bags, jewellery and the finishing touch." },
      { title: "Last pieces", text: "Final sizes at their best price." },
    ],
    aboutTitle: "Made for people who dress with intent",
    aboutText: "Every piece is chosen for fit, fabric and how it makes you feel.",
    palettes: {
      bold: { bg: "#140d14", surface: "#24172a", text: "#ffffff", muted: "#d4bcd8", accent: "#d62976", accentText: "#ffffff" },
      clean: { bg: "#ffffff", surface: "#f6f2ee", text: "#161616", muted: "#6b6560", accent: "#161616", accentText: "#ffffff" },
      editorial: { bg: "#fff1f6", surface: "#ffffff", text: "#3a0d24", muted: "#7a4a60", accent: "#d62976", accentText: "#ffffff" },
    },
  },
  {
    id: "salon", label: "Salon & Beauty",
    nav: ["Services", "Stylists", "Book"], cta: "Book a slot",
    heroTitle: "Walk in. Glow out.",
    heroText: "Hair, skin and nails by people who care about the details.",
    sectionTitle: "Our services",
    items: [
      { title: "Hair", text: "Cuts, colour and treatments for every hair type." },
      { title: "Skin", text: "Facials and rituals that actually work." },
      { title: "Nails", text: "Manicures, pedicures and nail art." },
    ],
    aboutTitle: "Your hour off",
    aboutText: "Relax, switch off and leave looking like your best self.",
    palettes: {
      bold: { bg: "#1d0f2b", surface: "#2c1a40", text: "#f6ecff", muted: "#c9b6dc", accent: "#b55ce0", accentText: "#ffffff" },
      clean: { bg: "#fbf7f4", surface: "#f1e7df", text: "#2b211c", muted: "#76665c", accent: "#9c6646", accentText: "#ffffff" },
      editorial: { bg: "#f4efff", surface: "#ffffff", text: "#241638", muted: "#5f4d78", accent: "#962fbf", accentText: "#ffffff" },
    },
  },
  {
    id: "health", label: "Clinic & Healthcare",
    nav: ["Doctors", "Services", "Contact"], cta: "Book an appointment",
    heroTitle: "Care that runs on time.",
    heroText: "Experienced doctors, clear advice and appointments you can book in a minute.",
    sectionTitle: "How we can help",
    items: [
      { title: "General check-ups", text: "Routine visits for the whole family." },
      { title: "Specialists", text: "Expert care when you need more." },
      { title: "Diagnostics", text: "Tests and reports, fast and accurate." },
    ],
    aboutTitle: "Trusted by families nearby",
    aboutText: "We take the time to listen, explain and follow up.",
    palettes: {
      bold: { bg: "#0f2238", surface: "#163150", text: "#f0f6ff", muted: "#a9c1dd", accent: "#38bdf8", accentText: "#0f2238" },
      clean: { bg: "#ffffff", surface: "#eef4f8", text: "#132235", muted: "#5a6b7c", accent: "#1f7a8c", accentText: "#ffffff" },
      editorial: { bg: "#eef1ff", surface: "#ffffff", text: "#141a46", muted: "#4f5680", accent: "#4f5bd5", accentText: "#ffffff" },
    },
  },
  {
    id: "tech", label: "IT & Software",
    nav: ["Solutions", "Work", "Contact"], cta: "Talk to us",
    heroTitle: "Software that keeps your business moving.",
    heroText: "We build and run the systems your team relies on: reliable, secure, on time.",
    sectionTitle: "What we do",
    items: [
      { title: "Custom software", text: "Built around how your team actually works." },
      { title: "Cloud & DevOps", text: "Hosting, scaling and monitoring done right." },
      { title: "Support", text: "A team that answers when things break." },
    ],
    aboutTitle: "Engineers, not salespeople",
    aboutText: "You talk directly to the people building your product.",
    palettes: {
      bold: { bg: "#0b0f1a", surface: "#141a2b", text: "#eef2ff", muted: "#9aa6c7", accent: "#6d78f0", accentText: "#ffffff" },
      clean: { bg: "#ffffff", surface: "#f3f5f9", text: "#0f172a", muted: "#5b6476", accent: "#0f172a", accentText: "#ffffff" },
      editorial: { bg: "#f5f7f2", surface: "#ffffff", text: "#16201a", muted: "#57635a", accent: "#15803d", accentText: "#ffffff" },
    },
  },
  {
    id: "realestate", label: "Real estate",
    nav: ["Properties", "About", "Contact"], cta: "View properties",
    heroTitle: "Find the place you'll call home.",
    heroText: "Verified homes and plots, honest prices and help at every step.",
    sectionTitle: "Featured properties",
    items: [
      { title: "2 & 3 BHK apartments", text: "Ready-to-move homes in prime locations." },
      { title: "Villas & plots", text: "Space to build exactly what you want." },
      { title: "Commercial", text: "Shops and offices on busy streets." },
    ],
    aboutTitle: "Local experts",
    aboutText: "We know every street, so you don't have to guess.",
    palettes: {
      bold: { bg: "#13201b", surface: "#1c2e27", text: "#f1f7f3", muted: "#b3c7bc", accent: "#d4a24c", accentText: "#13201b" },
      clean: { bg: "#fbfaf7", surface: "#efece4", text: "#1f1d18", muted: "#6a665c", accent: "#7d5f28", accentText: "#ffffff" },
      editorial: { bg: "#eef4f1", surface: "#ffffff", text: "#10251c", muted: "#4d6358", accent: "#1f6f50", accentText: "#ffffff" },
    },
  },
  {
    id: "education", label: "Education & Coaching",
    nav: ["Courses", "Teachers", "Enrol"], cta: "Book a free demo class",
    heroTitle: "Learn better. Score higher.",
    heroText: "Small batches, expert teachers and a plan for every student.",
    sectionTitle: "Our courses",
    items: [
      { title: "School tuition", text: "Classes 6–12, all major boards." },
      { title: "Competitive exams", text: "Structured prep with regular mock tests." },
      { title: "Skill courses", text: "Spoken English, coding and more." },
    ],
    aboutTitle: "Teachers who care",
    aboutText: "Every student gets attention, feedback and a clear path forward.",
    palettes: {
      bold: { bg: "#1a1033", surface: "#271a47", text: "#f5f1ff", muted: "#c2b6e3", accent: "#feda75", accentText: "#1a1033" },
      clean: { bg: "#ffffff", surface: "#f4f2fb", text: "#1d1834", muted: "#615b7a", accent: "#5b3fd1", accentText: "#ffffff" },
      editorial: { bg: "#fff8e4", surface: "#ffffff", text: "#3b2400", muted: "#7a6438", accent: "#b97d00", accentText: "#ffffff" },
    },
  },
  {
    // Generic fallback for any business that doesn't fit the categories above.
    id: "other", label: "Something else",
    nav: ["About", "Services", "Contact"], cta: "Get in touch",
    heroTitle: "Welcome to {name}.",
    heroText: "Quality work, honest prices and a team that picks up the phone.",
    sectionTitle: "What we offer",
    items: [
      { title: "Our services", text: "Everything we do, explained simply." },
      { title: "Why choose us", text: "Experience, care and a track record you can check." },
      { title: "Get in touch", text: "Call, WhatsApp or visit. We reply fast." },
    ],
    aboutTitle: "About us",
    aboutText: "A local business that cares about getting it right.",
    palettes: {
      bold: { bg: "#140c1c", surface: "#21152c", text: "#f6f1fb", muted: "#b4a8c4", accent: "#d62976", accentText: "#ffffff" },
      clean: { bg: "#ffffff", surface: "#f5f3f8", text: "#1a1023", muted: "#5f5670", accent: "#1a1023", accentText: "#ffffff" },
      editorial: { bg: "#faf3e5", surface: "#fffcf5", text: "#141414", muted: "#3d362c", accent: "#c2541a", accentText: "#ffffff" },
    },
  },
];

// Handover to the booking form when a visitor picks a design.
export const PREVIEW_CHOICE_KEY = "preview-choice-v1";
// Business name typed into the home-page teaser, picked up by /preview.
export const PREVIEW_DRAFT_KEY = "preview-draft-v1";

// What the booking form preselects for each category (must match backend BUSINESS_TYPES).
export const CATEGORY_TO_BUSINESS: Record<string, string> = {
  restaurant: "Hospitality", fashion: "Retail", health: "Healthcare",
  tech: "IT/Software", realestate: "Real Estate", education: "Education",
};
