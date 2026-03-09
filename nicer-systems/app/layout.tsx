import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PostHogProvider from "@/components/ui/PostHogProvider";
import { getSiteSettings } from "@/lib/firestore/site-settings";
import { themeToCSSVariables } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nicer Systems — Tell us the problem. We'll build the system.",
  description:
    "Automation and ops visibility systems for admin-heavy businesses. Preview plans include workflow mapping, KPI recommendations, alerts, and next actions.",
  metadataBase: new URL("https://nicer-systems.web.app"),
  openGraph: {
    title: "Nicer Systems — Tell us the problem. We'll build the system.",
    description:
      "Automation and ops visibility systems for admin-heavy businesses. Preview plans include workflow mapping, KPI recommendations, alerts, and next actions.",
    url: "https://nicer-systems.web.app",
    siteName: "Nicer Systems",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nicer Systems — Tell us the problem. We'll build the system.",
    description:
      "Automation and ops visibility for admin-heavy businesses. Workflow mapping, KPI dashboards, alerts, and next actions.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const themeVars = themeToCSSVariables(settings);

  return (
    <html lang="en" data-scroll-behavior="smooth" style={themeVars as React.CSSProperties}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
