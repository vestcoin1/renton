import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "renton-ui/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap", weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: {
    default: "renton â€” Rent Diaspora-Owned Homes, No Landlord Wahala",
    template: "%s Â· renton",
  },
  description:
    "Rent verified apartments owned by Nigerians abroad, managed on the ground by renton across Lagos, Abuja, Port Harcourt, Enugu, Uyo and Benin City. No landlord wahala, no inspection fees.",
  keywords: ["Nigeria rent", "Lagos apartments", "Abuja houses for rent", "diaspora landlords", "managed rentals Nigeria", "no landlord wahala"],
  openGraph: {
    title: "renton â€” Rent Diaspora-Owned Homes, No Landlord Wahala",
    description: "Rent apartments owned by Nigerians abroad, verified and managed on the ground by renton.",
    type: "website",
    locale: "en_NG",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#080e17" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" suppressHydrationWarning className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


