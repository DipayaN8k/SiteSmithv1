// "See your website" preview library.
// Each business category has its own copy, photos and colour palettes; the designs below decide the layout.
// Kept in the frontend for now; it is plain data, so it can move to a backend table/endpoint later
// without changing the preview components.

export type Palette = { bg: string; surface: string; text: string; muted: string; accent: string; accentText: string };

export type Item = { title: string; text: string; points: [string, string, string] };

export type Category = {
  id: string;
  label: string;
  nav: [string, string, string];
  cta: string;
  heroTitle: string; // "{name}" is replaced with the visitor's business name
  heroText: string; // replaced by the visitor's own "what you do" line when given
  sectionTitle: string;
  items: [Item, Item, Item];
  aboutTitle: string;
  aboutText: string;
  stats: [Stat, Stat, Stat]; // sample numbers, animated in the preview
  story: string; // longer "about us" paragraph
  features: [Pair, Pair, Pair, Pair]; // "why choose us"
  steps: [Pair, Pair, Pair, Pair]; // how it works, in order
  team: [Member, Member, Member]; // roles only: the client's real names go in later
  platforms: string[]; // "find us on" strip
  hours: string;
  photos: { hero: [string, string, string]; items: [string, string, string]; gallery: string[]; about: string };
  palettes: { bold: Palette; clean: Palette; vivid: Palette };
  // "ui": fewer photos, designed product visuals instead (code, dashboards, servers). Used for IT.
  visual?: "ui";
  cases?: [title: string, text: string, tags: string[]][]; // "Selected work" cards, replaces the photo gallery in ui mode
  stack?: string[]; // tools strip, replaces the photo strip in ui mode
};
type Pair = [title: string, text: string];
type Member = [role: string, photo: string];
type Stat = { n: number; suffix: string; label: string };

// Four layouts. Every category gets all four.
export const DESIGNS = [
  { id: "bold", name: "Bold", desc: "Dark, full-screen photos, big moving type", tone: "dark" },
  { id: "clean", name: "Clean", desc: "Bright, airy, photo collage", tone: "light" },
  { id: "luxe", name: "Luxe", desc: "Maison-style: quiet, editorial, luxurious", tone: "light" },
  { id: "complete", name: "Complete", desc: "Packed: booking, gallery, tabs, chat", tone: "light" },
] as const;
export type DesignId = (typeof DESIGNS)[number]["id"];

// Colour themes a visitor can try on any design. "original" keeps each business type's own colours.
export const THEMES: { id: string; name: string; p?: Palette }[] = [
  { id: "original", name: "Original" },
  { id: "beige", name: "Beige", p: { bg: "#f1e9da", surface: "#faf5eb", text: "#2b2118", muted: "#5d5043", accent: "#9a4524", accentText: "#ffffff" } },
  { id: "espresso", name: "Espresso", p: { bg: "#1b1511", surface: "#2a211b", text: "#f3e8d8", muted: "#c9b8a2", accent: "#d9a566", accentText: "#1b1511" } },
  { id: "midnight", name: "Midnight", p: { bg: "#0b0f17", surface: "#151b27", text: "#eef2f8", muted: "#a3adbf", accent: "#8aa4ff", accentText: "#0b0f17" } },
  { id: "forest", name: "Forest", p: { bg: "#0f1f18", surface: "#183026", text: "#eef4ec", muted: "#b3c6b8", accent: "#d2b15e", accentText: "#0f1f18" } },
  { id: "blush", name: "Blush", p: { bg: "#fbefec", surface: "#ffffff", text: "#3a1c22", muted: "#7a5057", accent: "#b0365a", accentText: "#ffffff" } },
];

// Heading font styles. Each design has a default; the visitor can switch.
export const FONTS = [
  { id: "modern", name: "Modern" },
  { id: "elegant", name: "Elegant" },
  { id: "minimal", name: "Minimal" },
  { id: "statement", name: "Statement" },
] as const;
export type FontId = (typeof FONTS)[number]["id"];
export const DEFAULT_FONT: Record<DesignId, FontId> = { bold: "modern", clean: "minimal", luxe: "elegant", complete: "modern" };

// Blend two hex colours (t = share of `a`).
function mix(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, "0")).join("");
}

// WCAG contrast ratio between two hex colours.
function contrast(a: string, b: string) {
  const lum = (h: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// Accent colour safe for small text on the page background: nudged toward the text colour until it reads at 4.5:1.
export function accentInk(p: Palette) {
  for (let t = 1; t >= 0; t -= 0.05) {
    const c = mix(p.accent, p.text, t);
    if (contrast(c, p.bg) >= 4.5) return c;
  }
  return p.text;
}

// Dark-mode version of any palette (used by the Complete design's light/dark switch).
export function darkPalette(p: Palette): Palette {
  const bg = "#101114";
  let accent = p.accent;
  for (let t = 1; t >= 0; t -= 0.05) {
    accent = mix(p.accent, "#ffffff", t);
    if (contrast(accent, bg) >= 4.5) break;
  }
  const accentText = contrast(bg, accent) >= contrast("#ffffff", accent) ? bg : "#ffffff";
  return { bg, surface: "#1b1d22", text: "#f1f1f3", muted: "#a9acb5", accent, accentText };
}

// Colours for any design of any category.
export function paletteFor(cat: Category, design: DesignId, theme = "original"): Palette {
  const picked = THEMES.find((t) => t.id === theme)?.p;
  if (picked) return picked;
  const { bold, clean, vivid } = cat.palettes;
  switch (design) {
    case "bold": return bold;
    case "clean": return clean;
    case "complete": return vivid;
    // Luxury houses keep it monochrome: ivory, black, lots of air.
    case "luxe": return { bg: "#f7f4ef", surface: "#ece7df", text: "#141414", muted: "#5c574f", accent: "#141414", accentText: "#ffffff" };
  }
}

// Photos are free-to-use Unsplash images (unsplash.com/license), served from their CDN at the size we need.
export const photo = (path: string, w: number) => `https://images.unsplash.com/${path}?auto=format&fit=crop&w=${w}&q=70`;

// Cafés get their own look: coffee, bakes and a slower pace. Listed as its own business type,
// because a name alone ("Asian Bistro") can't tell a café from a restaurant.
export const CAFE: Category = {
  id: "cafe", label: "Café & Bakery",
  nav: ["Menu", "Our coffee", "Visit"], cta: "Order ahead",
  heroTitle: "Slow coffee, good company.",
  heroText: "Specialty coffee, fresh bakes and a corner to call your own.",
  sectionTitle: "From the bar",
  items: [
    { title: "Signature coffee", text: "Vietnamese iced coffee, iced lattes and a proper americano.", points: ["Vietnamese phin coffee", "Iced latte with oat or almond milk", "Single-origin americano"] },
    { title: "Fresh bakes", text: "Croissants and cakes, out of the oven every morning.", points: ["Butter croissants", "Banana bread and brownies", "Cakes to order"] },
    { title: "All-day brunch", text: "Eggs, toast and pancakes, made to order.", points: ["Avocado toast and eggs", "Pancakes and waffles", "Vegan options"] },
  ],
  aboutTitle: "A café at its own pace",
  aboutText: "We roast in small batches and pour every cup by hand.",
  stats: [{ n: 12, suffix: "", label: "single-origin coffees" }, { n: 30, suffix: "+", label: "bakes every morning" }, { n: 7, suffix: "am", label: "doors open daily" }],
  story: "We started with one espresso machine and a love for good beans. Today we roast in small batches, bake every morning and still pour every cup by hand.",
  features: [["Specialty beans", "Sourced from Indian estates, roasted in-house."], ["Baked fresh", "Out of the oven every morning."], ["Work-friendly", "Fast Wi-Fi, plugs and quiet corners."], ["Order ahead", "Skip the queue, pick up on your way."]],
  steps: [["Order", "At the counter or ahead on WhatsApp."], ["We brew", "Every cup made by hand, to order."], ["Settle in", "Find a corner, stay as long as you like."], ["Come back", "Your usual, remembered."]],
  team: [["Head barista", "photo-1736813133636-0fa60f1e9dbd"], ["Owner", "photo-1753351052363-53ce102830eb"], ["Pastry chef", "photo-1731576089290-e6230a18dcb4"]],
  platforms: ["Google Maps", "Instagram", "Zomato", "Swiggy", "WhatsApp"],
  hours: "Every day, 7am to 10pm",
  photos: {
    hero: ["photo-1511081692775-05d0f180a065", "photo-1607539068168-21a93fbedad8", "photo-1728761390316-935ffeb3fbcc"],
    items: ["photo-1642647391072-6a2416f048e5", "photo-1620146344904-097a0002d797", "photo-1622532630744-d977c065c094"],
    gallery: ["photo-1671014594641-262cc4b9a16d", "photo-1461023058943-07fcbe16d735", "photo-1629610207316-1f58e0ea19e4", "photo-1607681034540-2c46cc71896d", "photo-1579992357154-faf4bde95b3d", "photo-1718791985055-e1b06ef5961d"],
    about: "photo-1583354608715-177553a4035e",
  },
  palettes: {
    bold: { bg: "#1a1410", surface: "#2a201a", text: "#f5ece2", muted: "#cdbba8", accent: "#d79a5a", accentText: "#1a1410" },
    clean: { bg: "#faf6f0", surface: "#efe5d8", text: "#2b2119", muted: "#6b5b4b", accent: "#8a5a2b", accentText: "#ffffff" },
    vivid: { bg: "#f3ede3", surface: "#ffffff", text: "#231b14", muted: "#5f5346", accent: "#6f4a2a", accentText: "#ffffff" },
  },
};

// Travel agencies: destinations, packages and trip planning, with a premium ocean-and-gold palette.
export const TRAVEL: Category = {
  id: "travel", label: "Travel & Tours",
  nav: ["Destinations", "Journeys", "Contact"], cta: "Plan my journey",
  heroTitle: "Journeys, beautifully planned.",
  heroText: "Private, tailor-made holidays across India and the world, designed around you and looked after from departure to return.",
  sectionTitle: "Curated journeys",
  items: [
    { title: "Luxury escapes", text: "Overwater villas, private islands and five-star cities, every detail arranged.", points: ["Maldives, Bali, Dubai and Europe", "Honeymoons and milestone trips", "Handpicked luxury resorts"] },
    { title: "Signature India journeys", text: "Palace stays, backwater cruises and Himalayan retreats, with private guides.", points: ["Rajasthan heritage palaces", "Kerala houseboats and Kashmir", "Private chauffeurs and expert guides"] },
    { title: "Concierge travel", text: "Flights, stays, visas and experiences, handled for you from start to finish.", points: ["Premium flights and upgrades", "Visas and paperwork handled", "Private transfers and experiences"] },
  ],
  aboutTitle: "Travel, quietly perfected",
  aboutText: "Every journey is designed by hand, checked in person and looked after until you are home.",
  stats: [{ n: 120, suffix: "+", label: "destinations curated" }, { n: 5000, suffix: "+", label: "journeys designed" }, { n: 24, suffix: "/7", label: "concierge on every trip" }],
  story: "We began by planning unforgettable trips for friends and family. Today we design private journeys across India and the world, and we still visit, check and choose every stay ourselves before we recommend it to you.",
  features: [["Tailor-made, never packaged", "Every itinerary built around your dates, pace and style."], ["Handpicked luxury stays", "Resorts and hotels we have stayed in and trust."], ["A concierge on call 24/7", "A real person on WhatsApp, wherever you are."], ["Visas and paperwork handled", "We take care of every document for you."]],
  steps: [["Share your dream", "Where, when and who is travelling."], ["Receive your itinerary", "A day-by-day journey, beautifully planned."], ["We arrange everything", "Flights, stays, transfers and experiences, confirmed."], ["Travel, looked after", "Your concierge is on call until you are home."]],
  team: [["Travel designer", "photo-1655333879254-1fb721db743c"], ["Founder", "photo-1647580427155-0483906cb9de"], ["Travel concierge", "photo-1573497620166-aef748c8c792"]],
  platforms: ["Google Maps", "Instagram", "WhatsApp", "TripAdvisor", "Facebook"],
  hours: "Mon to Sat, 10am to 8pm · 24/7 support on trips",
  photos: {
    hero: ["photo-1514282401047-d79a71a590e8", "photo-1540541338287-41700207dee6", "photo-1524492412937-b28074a5d7da"],
    items: ["photo-1573843981267-be1999ff37cd", "photo-1477587458883-47145ed94245", "photo-1436491865332-7a61a109cc05"],
    gallery: ["photo-1602216056096-3b40cc0c9944", "photo-1537996194471-e657df975ab4", "photo-1528127269322-539801943592", "photo-1502602898657-3e91760cbb34", "photo-1544735716-392fe2489ffa", "photo-1512343879784-a960bf40e7f2"],
    about: "photo-1488646953014-85cb44e25828",
  },
  palettes: {
    bold: { bg: "#06121a", surface: "#0c2230", text: "#f4f1ea", muted: "#b4c2c8", accent: "#d9b26a", accentText: "#06121a" },
    clean: { bg: "#f6fbfc", surface: "#e4f1f4", text: "#0c2a33", muted: "#4f6b73", accent: "#0e7c86", accentText: "#ffffff" },
    vivid: { bg: "#f4efe6", surface: "#ffffff", text: "#13232a", muted: "#55626a", accent: "#0b6e78", accentText: "#ffffff" },
  },
};

export const CATEGORIES: Category[] = [
  {
    id: "restaurant", label: "Restaurant",
    nav: ["Menu", "About", "Visit"], cta: "Reserve a table",
    heroTitle: "Good food, worth the trip.",
    heroText: "Fresh, made-to-order food and coffee. Come hungry, leave happy.",
    sectionTitle: "Popular right now",
    items: [
      { title: "Signature dishes", text: "Our most-loved plates, made fresh every day.", points: ["Slow-cooked biryani and kebabs", "Chef's special changes weekly", "Veg and non-veg favourites"] },
      { title: "Coffee & drinks", text: "Single-origin brews, shakes and coolers.", points: ["Fresh-ground coffee", "Shakes, coolers and mocktails", "Desserts to go with them"] },
      { title: "Catering", text: "Parties, offices and events. We bring the kitchen.", points: ["Birthdays, weddings and offices", "Custom menus for any crowd", "Setup and service included"] },
    ],
    aboutTitle: "A kitchen with a story",
    aboutText: "Started with one recipe and a lot of love. Today we serve the neighbourhood every day.",
    stats: [{ n: 40, suffix: "+", label: "dishes on the menu" }, { n: 7, suffix: "", label: "days a week" }, { n: 30, suffix: " min", label: "average delivery" }],
    story: "What started as a family recipe book is now a neighbourhood favourite. Every dish is cooked fresh, every day, with spices we grind ourselves.",
    features: [["Fresh every day", "Nothing frozen. We cook in small batches from morning."], ["Family recipes", "Dishes passed down and perfected over years."], ["Fast delivery", "Hot food at your door, usually within 30 minutes."], ["Private dining", "Book the space for birthdays and get-togethers."]],
    steps: [["Pick a time", "Reserve online or on WhatsApp in seconds."], ["We set your table", "Your table is ready when you arrive."], ["Eat well", "Fresh food, served hot, at your pace."], ["Come back", "Save your favourites for next time."]],
    team: [["Head chef", "photo-1583394293214-28ded15ee548"], ["Owner", "photo-1496811425508-6d7ebb7ff32c"], ["Head barista", "photo-1736813133636-0fa60f1e9dbd"]],
    platforms: ["Google Maps", "Zomato", "Swiggy", "Instagram", "WhatsApp"],
    hours: "Every day, 11am to 11pm",
    photos: {
      hero: ["photo-1517248135467-4c7edcad34c4", "photo-1631452180539-96aca7d48617", "photo-1709548145082-04d0cde481d4"],
      items: ["photo-1631515243349-e0cb75fb8d3a", "photo-1563311977-d285756282dc", "photo-1555244162-803834f70033"],
      gallery: ["photo-1601050690597-df0568f70950", "photo-1668236543090-82eba5ee5976", "photo-1565557623262-b51c2513a641", "photo-1633945274405-b6c8069047b0", "photo-1695555438641-7ccdace35d78", "photo-1579265898841-79c7890d69cf"],
      about: "photo-1577106263724-2c8e03bfe9cf",
    },
    palettes: {
      bold: { bg: "#1f120c", surface: "#2c1a12", text: "#fff4e8", muted: "#d9c2ae", accent: "#fa7e1e", accentText: "#1f120c" },
      clean: { bg: "#fffaf3", surface: "#f4ead9", text: "#2a1a10", muted: "#6e5a48", accent: "#c2541a", accentText: "#ffffff" },
      vivid: { bg: "#f2efe7", surface: "#ffffff", text: "#1b1b1b", muted: "#5c5c5c", accent: "#2f6b3f", accentText: "#ffffff" },
    },
  },
  CAFE,
  {
    id: "fashion", label: "Fashion & Boutique",
    nav: ["New in", "Shop", "Lookbook"], cta: "Shop the collection",
    heroTitle: "New season. Limited pieces.",
    heroText: "Handpicked styles in small batches. Once they're gone, they're gone.",
    sectionTitle: "Shop by category",
    items: [
      { title: "Dresses", text: "Everyday to occasion wear.", points: ["Fresh drops every week", "Sizes XS to XXL", "Free alterations in store"] },
      { title: "Accessories", text: "Bags, jewellery and the finishing touch.", points: ["Bags and clutches", "Statement jewellery", "Sunglasses and scarves"] },
      { title: "Last pieces", text: "Final sizes at their best price.", points: ["Up to 50% off", "New pieces added daily", "Reserve on WhatsApp"] },
    ],
    aboutTitle: "Made for people who dress with intent",
    aboutText: "Every piece is chosen for fit, fabric and how it makes you feel.",
    stats: [{ n: 120, suffix: "+", label: "new pieces a month" }, { n: 48, suffix: "h", label: "dispatch" }, { n: 7, suffix: "-day", label: "easy returns" }],
    story: "We travel, we hunt, we try everything on. Only the pieces we would wear ourselves make it to the rail, in small runs so you won't see them everywhere.",
    features: [["Small batches", "Limited runs, so your outfit stays yours."], ["Try at home", "Order two sizes, keep the one that fits."], ["Personal styling", "Book a free styling session in store."], ["Easy returns", "Seven days, no awkward questions."]],
    steps: [["Browse", "New drops every week, online and in store."], ["Try it on", "Book a fitting or try at home."], ["Make it yours", "Free alterations on most pieces."], ["Show it off", "Tag us. We love seeing you wear it."]],
    team: [["Founder & stylist", "photo-1506863530036-1efeddceb993"], ["Head of styling", "photo-1676716185389-f351d15fd2aa"], ["Menswear buyer", "photo-1655333879254-1fb721db743c"]],
    platforms: ["Instagram", "Google Maps", "WhatsApp", "Pinterest", "Facebook"],
    hours: "Every day, 11am to 9pm",
    photos: {
      hero: ["photo-1441986300917-64674bd600d8", "photo-1496747611176-843222e1e57c", "photo-1483985988355-763728e1935b"],
      items: ["photo-1520026582657-4daf5bb60adb", "photo-1559563458-527698bf5295", "photo-1489987707025-afc232f7ea0f"],
      gallery: ["photo-1593528625646-d705402054ba", "photo-1537832816519-689ad163238b", "photo-1574271143515-5cddf8da19be", "photo-1569388330338-53ecda03dfa1", "photo-1441984904996-e0b6ba687e04", "photo-1645561305502-63a9ba09ab09"],
      about: "photo-1546213290-e1b492ab3eee",
    },
    palettes: {
      bold: { bg: "#140d14", surface: "#24172a", text: "#ffffff", muted: "#d4bcd8", accent: "#d62976", accentText: "#ffffff" },
      clean: { bg: "#ffffff", surface: "#f6f2ee", text: "#161616", muted: "#6b6560", accent: "#161616", accentText: "#ffffff" },
      vivid: { bg: "#fff1f6", surface: "#ffffff", text: "#3a0d24", muted: "#7a4a60", accent: "#d62976", accentText: "#ffffff" },
    },
  },
  {
    id: "salon", label: "Salon & Beauty",
    nav: ["Services", "Stylists", "Book"], cta: "Book a slot",
    heroTitle: "Walk in. Glow out.",
    heroText: "Hair, skin and nails by people who care about the details.",
    sectionTitle: "Our services",
    items: [
      { title: "Hair", text: "Cuts, colour and treatments for every hair type.", points: ["Cuts and styling", "Colour, highlights and balayage", "Keratin and spa treatments"] },
      { title: "Skin", text: "Facials and rituals that actually work.", points: ["Facials for every skin type", "Clean-ups and de-tan", "Bridal skin prep"] },
      { title: "Nails", text: "Manicures, pedicures and nail art.", points: ["Gel and acrylic", "Custom nail art", "Spa manicure and pedicure"] },
    ],
    aboutTitle: "Your hour off",
    aboutText: "Relax, switch off and leave looking like your best self.",
    stats: [{ n: 15, suffix: "+", label: "expert stylists" }, { n: 60, suffix: "+", label: "services" }, { n: 7, suffix: "", label: "days a week" }],
    story: "We opened to be the salon we always wanted: calm, spotless and honest about what will suit you. No rush, no upselling, just good work.",
    features: [["Expert stylists", "Trained in the latest cuts and colour."], ["Premium products", "Only brands we trust on our own hair."], ["Spotless hygiene", "Fresh tools and towels for every client."], ["On-time slots", "Your appointment starts when it says."]],
    steps: [["Book a slot", "Pick a service and time in seconds."], ["Consult", "We talk about what suits you first."], ["Relax", "Sit back while we do the work."], ["Glow", "Leave with tips to keep it looking great."]],
    team: [["Senior stylist", "photo-1580489944761-15a19d654956"], ["Colour expert", "photo-1633381521050-26bb467d9d5a"], ["Skin specialist", "photo-1563170446-9c3c0622d8a9"]],
    platforms: ["Google Maps", "Instagram", "WhatsApp", "Justdial", "Facebook"],
    hours: "Tue to Sun, 10am to 8pm",
    photos: {
      hero: ["photo-1633681926022-84c23e8cb2d6", "photo-1580618672591-eb180b1a973f", "photo-1570172619644-dfd03ed5d881"],
      items: ["photo-1634449571010-02389ed0f9b0", "photo-1552693673-1bf958298935", "photo-1632345031435-8727f6897d53"],
      gallery: ["photo-1600948836101-f9ffda59d250", "photo-1522335789203-aabd1fc54bc9", "photo-1519014816548-bf5fe059798b", "photo-1562322140-8baeececf3df", "photo-1521590832167-7bcbfaa6381f", "photo-1551392505-f4056032826e"],
      about: "photo-1637777277337-f114350fb088",
    },
    palettes: {
      bold: { bg: "#1d0f2b", surface: "#2c1a40", text: "#f6ecff", muted: "#c9b6dc", accent: "#9b45c9", accentText: "#ffffff" },
      clean: { bg: "#fbf7f4", surface: "#f1e7df", text: "#2b211c", muted: "#76665c", accent: "#9c6646", accentText: "#ffffff" },
      vivid: { bg: "#f4efff", surface: "#ffffff", text: "#241638", muted: "#5f4d78", accent: "#962fbf", accentText: "#ffffff" },
    },
  },
  {
    id: "health", label: "Clinic & Healthcare",
    nav: ["Doctors", "Services", "Contact"], cta: "Book an appointment",
    heroTitle: "Care that runs on time.",
    heroText: "Experienced doctors, clear advice and appointments you can book in a minute.",
    sectionTitle: "How we can help",
    items: [
      { title: "General check-ups", text: "Routine visits for the whole family.", points: ["Same-day appointments", "Child and adult care", "Health packages"] },
      { title: "Specialists", text: "Expert care when you need more.", points: ["Cardiology, ortho and more", "Second opinions", "Follow-ups on WhatsApp"] },
      { title: "Diagnostics", text: "Tests and reports, fast and accurate.", points: ["Blood tests and scans", "Home sample collection", "Reports on your phone"] },
    ],
    aboutTitle: "Trusted by families nearby",
    aboutText: "We take the time to listen, explain and follow up.",
    stats: [{ n: 12, suffix: "+", label: "doctors" }, { n: 20, suffix: "+", label: "specialities" }, { n: 24, suffix: "h", label: "reports" }],
    story: "We started this clinic so families nearby could get unhurried, honest care. Our doctors explain every option and follow up after your visit.",
    features: [["Experienced doctors", "Specialists with years of practice."], ["Short waits", "Book a slot, see the doctor on time."], ["Reports on WhatsApp", "Lab results sent straight to your phone."], ["Family care", "From newborns to grandparents."]],
    steps: [["Book", "Choose a doctor and a time online."], ["Visit", "Short wait, unhurried consultation."], ["Tests", "Samples at the clinic or at home."], ["Follow-up", "Reports and advice on WhatsApp."]],
    team: [["Chief physician", "photo-1637059824899-a441006a6875"], ["Paediatrician", "photo-1659353888906-adb3e0041693"], ["Surgeon", "photo-1622253692010-333f2da6031d"]],
    platforms: ["Google Maps", "Practo", "WhatsApp", "Instagram", "Justdial"],
    hours: "Mon to Sat, 8am to 9pm",
    photos: {
      hero: ["photo-1631217868264-e5b90bb7e133", "photo-1629909614456-6b1c5c94cecc", "photo-1584516150909-c43483ee7932"],
      items: ["photo-1758691462123-8a17ae95d203", "photo-1612349317150-e413f6a5b16d", "photo-1579154204601-01588f351e67"],
      gallery: ["photo-1532938911079-1b06ac7ceec7", "photo-1505751172876-fa1923c5c528", "photo-1630959305790-4c956ce6c0b6", "photo-1581056771107-24ca5f033842", "photo-1504813184591-01572f98c85f", "photo-1584432810601-6c7f27d2362b"],
      about: "photo-1758691461935-202e2ef6b69f",
    },
    palettes: {
      bold: { bg: "#0f2238", surface: "#163150", text: "#f0f6ff", muted: "#a9c1dd", accent: "#38bdf8", accentText: "#0f2238" },
      clean: { bg: "#ffffff", surface: "#eef4f8", text: "#132235", muted: "#5a6b7c", accent: "#1f7a8c", accentText: "#ffffff" },
      vivid: { bg: "#eef1ff", surface: "#ffffff", text: "#141a46", muted: "#4f5680", accent: "#4f5bd5", accentText: "#ffffff" },
    },
  },
  {
    id: "tech", label: "IT & Software",
    nav: ["Solutions", "Work", "Contact"], cta: "Book a call",
    heroTitle: "Software that keeps your business moving.",
    heroText: "We build and run the systems your team relies on: reliable, secure, on time.",
    sectionTitle: "What we do",
    items: [
      { title: "Custom software", text: "Built around how your team actually works.", points: ["Web and mobile apps", "Dashboards and internal tools", "Integrations with what you use"] },
      { title: "Cloud & DevOps", text: "Hosting, scaling and monitoring done right.", points: ["AWS, Azure and GCP", "Automated deployments", "Monitoring and backups"] },
      { title: "Support", text: "A team that answers when things break.", points: ["Fast response times", "Monthly health checks", "One point of contact"] },
    ],
    aboutTitle: "Engineers, not salespeople",
    aboutText: "You talk directly to the people building your product.",
    stats: [{ n: 50, suffix: "+", label: "projects shipped" }, { n: 99.9, suffix: "%", label: "uptime" }, { n: 24, suffix: "/7", label: "support" }],
    story: "We are a team of engineers who like hard problems. We design, build and run software for businesses that cannot afford downtime, and we stay with you after launch.",
    features: [["Senior engineers", "No juniors learning on your project."], ["Security first", "Best practices built in from day one."], ["Clear timelines", "Weekly demos, no surprises."], ["Long-term support", "We run what we build."]],
    steps: [["Discover", "We learn your business and goals."], ["Design", "Architecture and screens you can review."], ["Build", "Weekly releases you can click through."], ["Run", "Monitoring, updates and support."]],
    team: [["Founder & CTO", "photo-1640531005390-38bd92755d6a"], ["Lead engineer", "photo-1573497620166-aef748c8c792"], ["Cloud architect", "photo-1752738372136-2602aaafdcb7"]],
    platforms: ["AWS", "Google Cloud", "Azure", "GitHub", "Clutch"],
    hours: "Mon to Fri, 9am to 7pm · Support 24/7",
    visual: "ui",
    cases: [
      ["Fleet tracking dashboard", "Live tracking for 2,000+ trucks, built in ten weeks.", ["React", "Node.js", "AWS"]],
      ["Clinic booking platform", "Appointments, reports and reminders for 40 clinics.", ["Next.js", "PostgreSQL", "WhatsApp API"]],
      ["Retail inventory sync", "Stock kept in sync across 25 stores in real time.", ["Python", "Kafka", "Google Cloud"]],
    ],
    stack: ["React", "Next.js", "Node.js", "Python", "AWS", "Kubernetes", "PostgreSQL", "Docker"],
    photos: {
      hero: ["photo-1719400471588-575b23e27bd7", "photo-1706074740295-d7a79c079562", "photo-1781914476939-91a41b914899"],
      items: ["photo-1559028012-481c04fa702d", "photo-1561233835-f937539b95b9", "photo-1623479322729-28b25c16b011"],
      gallery: ["photo-1735948055457-8d816fb80a87", "photo-1753715613373-90b1ea010731", "photo-1497366811353-6870744d04b2", "photo-1771922748624-b205cf5d002d", "photo-1680992046626-418f7e910589", "photo-1511376777868-611b54f68947"],
      about: "photo-1643267514395-b36b3f7e8281",
    },
    palettes: {
      bold: { bg: "#0b0f1a", surface: "#141a2b", text: "#eef2ff", muted: "#9aa6c7", accent: "#5560e0", accentText: "#ffffff" },
      clean: { bg: "#ffffff", surface: "#f3f5f9", text: "#0f172a", muted: "#5b6476", accent: "#0f172a", accentText: "#ffffff" },
      vivid: { bg: "#f5f7f2", surface: "#ffffff", text: "#16201a", muted: "#57635a", accent: "#15803d", accentText: "#ffffff" },
    },
  },
  {
    id: "realestate", label: "Real estate",
    nav: ["Properties", "About", "Contact"], cta: "Schedule a visit",
    heroTitle: "Find the place you'll call home.",
    heroText: "Verified homes and plots, honest prices and help at every step.",
    sectionTitle: "Featured properties",
    items: [
      { title: "2 & 3 BHK apartments", text: "Ready-to-move homes in prime locations.", points: ["Ready to move in", "Near schools and metro", "Loan help included"] },
      { title: "Villas & plots", text: "Space to build exactly what you want.", points: ["Clear titles, verified", "Gated communities", "Site visits any day"] },
      { title: "Commercial", text: "Shops and offices on busy streets.", points: ["High footfall locations", "Flexible lease terms", "Fit-out support"] },
    ],
    aboutTitle: "Local experts",
    aboutText: "We know every street, so you don't have to guess.",
    stats: [{ n: 300, suffix: "+", label: "verified listings" }, { n: 15, suffix: "+", label: "neighbourhoods" }, { n: 10, suffix: "+", label: "years local" }],
    story: "We have helped families and investors find the right property for years. Every listing is visited and verified by our team before it reaches you.",
    features: [["Verified listings", "Every property checked in person."], ["Legal help", "Clear titles and paperwork support."], ["Loan assistance", "We work with leading banks."], ["After-sale care", "Help with moving in and registration."]],
    steps: [["Tell us", "Budget, area and must-haves."], ["Shortlist", "Hand-picked, verified options."], ["Visit", "Site visits when it suits you."], ["Move in", "Paperwork, loans and keys handled."]],
    team: [["Founder", "photo-1556474835-b0f3ac40d4d1"], ["Property advisor", "photo-1780733064206-4f200e41daa8"], ["Site manager", "photo-1647580427155-0483906cb9de"]],
    platforms: ["99acres", "MagicBricks", "Housing.com", "Google Maps", "WhatsApp"],
    hours: "Every day, 9am to 8pm",
    photos: {
      hero: ["photo-1600596542815-ffad4c1539a9", "photo-1748063578185-3d68121b11ff", "photo-1724582586529-62622e50c0b3"],
      items: ["photo-1624204386084-dd8c05e32226", "photo-1582610116397-edb318620f90", "photo-1621831337128-35676ca30868"],
      gallery: ["photo-1600210492493-0946911123ea", "photo-1722605090433-41d1183a792d", "photo-1613545325278-f24b0cae1224", "photo-1596178067639-5c6e68aea6dc", "photo-1649083048428-3d8ed23a3ce0", "photo-1706808849777-96e0d7be3bb7"],
      about: "photo-1628744876497-eb30460be9f6",
    },
    palettes: {
      bold: { bg: "#13201b", surface: "#1c2e27", text: "#f1f7f3", muted: "#b3c7bc", accent: "#d4a24c", accentText: "#13201b" },
      clean: { bg: "#fbfaf7", surface: "#efece4", text: "#1f1d18", muted: "#6a665c", accent: "#7d5f28", accentText: "#ffffff" },
      vivid: { bg: "#eef4f1", surface: "#ffffff", text: "#10251c", muted: "#4d6358", accent: "#1f6f50", accentText: "#ffffff" },
    },
  },
  {
    id: "education", label: "Education & Coaching",
    nav: ["Courses", "Teachers", "Enrol"], cta: "Book a free demo class",
    heroTitle: "Learn better. Score higher.",
    heroText: "Small batches, expert teachers and a plan for every student.",
    sectionTitle: "Our courses",
    items: [
      { title: "School tuition", text: "Classes 6–12, all major boards.", points: ["CBSE, ICSE and state boards", "Weekly tests and feedback", "Parent updates every month"] },
      { title: "Competitive exams", text: "Structured prep with regular mock tests.", points: ["JEE, NEET and more", "Full-length mock tests", "Doubt-clearing sessions"] },
      { title: "Skill courses", text: "Spoken English, coding and more.", points: ["Spoken English", "Coding for beginners", "Weekend batches"] },
    ],
    aboutTitle: "Teachers who care",
    aboutText: "Every student gets attention, feedback and a clear path forward.",
    stats: [{ n: 25, suffix: "", label: "students per batch, max" }, { n: 12, suffix: "+", label: "expert teachers" }, { n: 200, suffix: "+", label: "mock tests a year" }],
    story: "We keep batches small so every student is seen and heard. Our teachers track progress every week and keep parents in the loop.",
    features: [["Small batches", "Never more than 25 students."], ["Weekly tests", "Know exactly where you stand."], ["Doubt sessions", "Extra help whenever you are stuck."], ["Parent updates", "Monthly progress reports."]],
    steps: [["Free demo", "Attend a class before you decide."], ["Assessment", "We find strengths and gaps."], ["Learn", "A plan made for the student."], ["Improve", "Regular tests and feedback."]],
    team: [["Maths lead", "photo-1649705433263-5c80d699b5f5"], ["Science lead", "photo-1758685847747-597ce085906e"], ["English & skills", "photo-1573496800808-56566a492b63"]],
    platforms: ["Google Maps", "YouTube", "WhatsApp", "Instagram", "Justdial"],
    hours: "Mon to Sat, 7am to 8pm",
    photos: {
      hero: ["photo-1509062522246-3755977927d7", "photo-1524178232363-1fb2b075b655", "photo-1752747115265-1e4cfb2c1212"],
      items: ["photo-1577896851231-70ef18881754", "photo-1606326608690-4e0281b1e588", "photo-1719159381981-1327b22aff9b"],
      gallery: ["photo-1588072432836-e10032774350", "photo-1514369118554-e20d93546b30", "photo-1718327453695-4d32b94c90a4", "photo-1598981457915-aea220950616", "photo-1518818608552-195ed130cdf4", "photo-1553448539-f6063db586a4"],
      about: "photo-1571260899304-425eee4c7efc",
    },
    palettes: {
      bold: { bg: "#1a1033", surface: "#271a47", text: "#f5f1ff", muted: "#c2b6e3", accent: "#feda75", accentText: "#1a1033" },
      clean: { bg: "#ffffff", surface: "#f4f2fb", text: "#1d1834", muted: "#615b7a", accent: "#5b3fd1", accentText: "#ffffff" },
      vivid: { bg: "#fff8e4", surface: "#ffffff", text: "#3b2400", muted: "#7a6438", accent: "#966300", accentText: "#ffffff" },
    },
  },
  TRAVEL,
  {
    // Generic fallback for any business that doesn't fit the categories above.
    id: "other", label: "Something else",
    nav: ["About", "Services", "Contact"], cta: "Get in touch",
    heroTitle: "Welcome to {name}.",
    heroText: "Quality work, honest prices and a team that picks up the phone.",
    sectionTitle: "What we offer",
    items: [
      { title: "Our services", text: "Everything we do, explained simply.", points: ["Clear pricing upfront", "Done on time", "Quality you can check"] },
      { title: "Why choose us", text: "Experience, care and a track record you can check.", points: ["Years of experience", "Local and trusted", "Real people, real answers"] },
      { title: "Get in touch", text: "Call, WhatsApp or visit. We reply fast.", points: ["WhatsApp replies in minutes", "Open all week", "Easy to find"] },
    ],
    aboutTitle: "About us",
    aboutText: "A local business that cares about getting it right.",
    stats: [{ n: 10, suffix: "+", label: "years in business" }, { n: 1000, suffix: "+", label: "happy customers" }, { n: 7, suffix: "", label: "days a week" }],
    story: "We started small and grew by word of mouth. Today we still answer every call ourselves and treat every customer like a neighbour.",
    features: [["Experienced team", "Years of doing this well."], ["Fair pricing", "Clear quotes, no hidden extras."], ["Quick response", "Replies within the hour."], ["Local and trusted", "Proudly serving the neighbourhood."]],
    steps: [["Get in touch", "Call, WhatsApp or visit."], ["Get a quote", "A clear price before we start."], ["We deliver", "On time, done properly."], ["Stay in touch", "We are here if you need us."]],
    team: [["Founder", "photo-1556474835-b0f3ac40d4d1"], ["Customer care", "photo-1753351056544-7446ea89311c"], ["Head of work", "photo-1611523794717-4d1f87dabf3b"]],
    platforms: ["Google Maps", "WhatsApp", "Instagram", "Justdial", "Facebook"],
    hours: "Mon to Sat, 10am to 7pm",
    photos: {
      hero: ["photo-1687422808191-93810cd07ab0", "photo-1759860002165-f059bfcee759", "photo-1556745753-b2904692b3cd"],
      items: ["photo-1687422808248-f807f4ea2a2e", "photo-1568992688065-536aad8a12f6", "photo-1553775282-20af80779df7"],
      gallery: ["photo-1761783536272-2fb78dd52c76", "photo-1683115099191-51e617fc5ff1", "photo-1734576861113-8dcab61bc59d", "photo-1573612664822-d7d347da7b80", "photo-1571204829887-3b8d69e4094d", "photo-1753164597612-5e71b83fda91"],
      about: "photo-1573164574572-cb89e39749b4",
    },
    palettes: {
      bold: { bg: "#140c1c", surface: "#21152c", text: "#f6f1fb", muted: "#b4a8c4", accent: "#d62976", accentText: "#ffffff" },
      clean: { bg: "#ffffff", surface: "#f5f3f8", text: "#1a1023", muted: "#5f5670", accent: "#1a1023", accentText: "#ffffff" },
      vivid: { bg: "#faf3e5", surface: "#fffcf5", text: "#141414", muted: "#3d362c", accent: "#c2541a", accentText: "#ffffff" },
    },
  },
];

// The category for an id (kept as a function so callers don't depend on the list's shape).
export function resolveCategory(catId: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === catId);
}

// Handover to the booking form when a visitor picks a design.
export const PREVIEW_CHOICE_KEY = "preview-choice-v1";
// Business name typed into the home-page teaser, picked up by /preview.
export const PREVIEW_DRAFT_KEY = "preview-draft-v1";

// What the booking form preselects for each category (must match backend BUSINESS_TYPES).
export const CATEGORY_TO_BUSINESS: Record<string, string> = {
  restaurant: "Hospitality", cafe: "Hospitality", fashion: "Retail", health: "Healthcare",
  tech: "IT/Software", realestate: "Real Estate", education: "Education", travel: "Hospitality",
};
