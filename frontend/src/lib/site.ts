// Single source of truth for brand + copy. Change the name here and it updates everywhere.
export const brand = {
  name: "Sitesmith", // placeholder until the team finalises the name
  tagline: "More customers. Not more templates.",
  email: "hello@sitesmith.studio",
  whatsapp: "+91 62918 45804",
  whatsapp2: "+91 80178 12091", // second WhatsApp line, shown alongside the main one
  instagram: "@sitesmith.studio",
  city: "Kolkata, India",
};

export const nav = [
  { href: "/", label: "Home" },
  { href: "/#services", label: "Services" },
  { href: "/preview", label: "See your website first" },
  { href: "/work", label: "Work" },
  { href: "/why-us", label: "Why us" },
  { href: "/about", label: "About" },
  { href: "/#contact", label: "Contact" },
];

// Footer also links to these.
export const navMore = [
  { href: "/#process", label: "Process" },
];

// Hero hook. Positioning: hand-coded by engineers, AI used as a tool — never a generated template.
export const hero = {
  line1: "More customers.",
  line2: "Not more templates.",
  sub: "Look as good online as you are in person. Our engineers design and build every site around your business, using AI to move faster, never to cut corners. Live in a week.",
};

// Draggable story-bubble stickers around the hero builder (percent of the hero box).
export const stickers = [
  { label: "Hand-coded", x: 88, y: -5, r: 8 },
  { label: "Live in 1 week", x: 90, y: 88, r: -5 },
  { label: "0% templates", x: 30, y: 94, r: -4 },
] as const;

// "See your website in 5 seconds" — the hero builder. Each type is a mini site template.
export type SiteKind = {
  id: string;
  label: string;
  headline: string;
  cta: string;
  nav: [string, string, string];
  colors: { bg: string; text: string; accent: string; card: string };
};

export const siteKinds: SiteKind[] = [
  { id: "cafe", label: "Café", headline: "Coffee worth the detour.", cta: "See the menu", nav: ["Menu", "Visit", "Order"], colors: { bg: "#2a1610", text: "#fff3e6", accent: "#fa7e1e", card: "#4a2a1e" } },
  { id: "boutique", label: "Boutique", headline: "New drop. Limited pieces.", cta: "Shop the drop", nav: ["New in", "Shop", "Lookbook"], colors: { bg: "#fff1f6", text: "#3a0d24", accent: "#d62976", card: "#ffd6e6" } },
  { id: "salon", label: "Salon", headline: "Walk in. Glow out.", cta: "Book a slot", nav: ["Services", "Stylists", "Book"], colors: { bg: "#1d0f2b", text: "#f6ecff", accent: "#b55ce0", card: "#35204a" } },
  { id: "clinic", label: "Clinic", headline: "Care that runs on time.", cta: "Book a visit", nav: ["Doctors", "Services", "Contact"], colors: { bg: "#eef1ff", text: "#141a46", accent: "#4f5bd5", card: "#d9deff" } },
  { id: "bakery", label: "Bakery", headline: "Baked this morning.", cta: "Order today", nav: ["Cakes", "Bakes", "Order"], colors: { bg: "#fff8e4", text: "#3b2400", accent: "#e8a10c", card: "#ffe9a8" } },
  { id: "studio", label: "Studio", headline: "Ideas, made visible.", cta: "See our work", nav: ["Work", "About", "Contact"], colors: { bg: "#111014", text: "#ffffff", accent: "#feda75", card: "#26242c" } },
];

// "Not prompted. Engineered." — what a generated site gives you vs what we do.
export const compare = {
  them: [
    "A layout 10,000 other sites already use",
    "Code nobody on earth can explain",
    "Breaks the first time you need a change",
    "Copy that sounds like everyone else's",
    "Nobody to call when it goes down",
  ],
  us: [
    "Designed around your customers and your brand",
    "Clean code written and reviewed by engineers",
    "Changes done by the people who built it",
    "Words written for the people who buy from you",
    "A real team on WhatsApp, not a chatbot",
  ],
};

export const services = [
  {
    tone: "sun",
    title: "Business websites",
    line: "Look established from day one.",
    points: ["5–15 page sites", "Built-in enquiry forms", "Google-ready SEO"],
  },
  {
    tone: "bloom",
    title: "Online stores",
    line: "Stop taking orders in DMs.",
    points: ["Mobile-first storefront", "Product catalogue", "WhatsApp order alerts"],
  },
  {
    tone: "dusk",
    title: "Landing pages",
    line: "One page. One job. Converts.",
    points: ["Ad campaign pages", "Launch & event pages", "Live in 2 days"],
  },
];

export type Project = {
  slug: string;
  name: string;
  kind: string;
  result: string;
  palette: [string, string, string];
  headline: string;
};

// Placeholder projects until real client work (with testimonials) is ready. Keep this list short.
export const projects: Project[] = [
  { slug: "trailpeak", name: "Trailpeak Treks", kind: "Travel website", result: "3× more enquiries", palette: ["#1d3b5c", "#e9f0f6", "#ffb703"], headline: "Walk where the map ends." },
  { slug: "clayhouse", name: "Clayhouse", kind: "E-commerce", result: "₹4.2L in month one", palette: ["#5a2e1f", "#f4e6d8", "#d77a3d"], headline: "Handmade, slowly." },
];

export const steps = [
  { title: "Say hi", body: "Message us or fill the 3-question form. We call you within a day." },
  { title: "See it first", body: "You get a design to approve before a single line of code is written." },
  { title: "Watch it build", body: "A live preview link updates as we go. Comment on anything." },
  { title: "Go live", body: "Domain and hosting set up, your site goes live. SEO and analytics follow in steps as it grows." },
];

export const faqs = [
  { q: "How long does a website take?", a: "Most sites go live in 1 week. Landing pages can be done in 2 days." },
  { q: "Do I need to write the content?", a: "No. Send us what you have — even voice notes or your Instagram captions — and we'll shape it into copy that sells." },
  { q: "Can I edit the site myself later?", a: "Yes. We can set up an editor so you can change text, images and products without us." },
  { q: "What about domain and hosting?", a: "We set both up for you, so you never have to touch a server." },
  { q: "What if I don't like the design?", a: "You approve the design before we build, and revisions are part of the process." },
];

// Visitor-selectable backgrounds (theme button in the nav). Night is the default; colours live in globals.css.
export const THEMES = [
  { id: "night", label: "Night", mode: "Dark", swatch: "#120a1a" },
  { id: "cream", label: "Cream", mode: "Light", swatch: "#faf3e5" },
  { id: "lavender", label: "Lavender", mode: "Light", swatch: "#f3ecfb" },
] as const;
export type Theme = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: Theme = "night";
export const THEME_KEY = "site-theme-v1";

