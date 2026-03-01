import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PostHogProvider from "@/components/ui/PostHogProvider";
import { getSiteSettings } from "@/lib/firestore/site-settings";
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
    "Automation and ops visibility systems for admin-heavy businesses. Dashboards, alerts, and weekly Ops Pulse — installed in 30 days.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  const themeVars: Record<string, string> = {
    "--theme-primary": settings.theme_primary,
    "--theme-secondary": settings.theme_secondary,
    "--theme-glow-intensity": `${settings.glow_intensity}%`,
    "--theme-motion-intensity": String(settings.motion_intensity),
  };

  return (
    <html lang="en" style={themeVars as React.CSSProperties}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
