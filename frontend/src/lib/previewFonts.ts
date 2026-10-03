import { Anton, Fraunces } from "next/font/google";

// Extra heading fonts for the "See your website" previews (Elegant and Statement styles).
// Only imported by PreviewSite, so they load on /preview and nowhere else.
export const elegant = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-elegant", display: "swap" });
export const statement = Anton({ subsets: ["latin"], weight: "400", variable: "--font-statement", display: "swap" });
