import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Nicer Systems",
  description:
    "Book a scoping call or send us your workflow details. We'll reply within one business day with a clear next step.",
  openGraph: {
    title: "Contact | Nicer Systems",
    description:
      "Book a scoping call or send us your workflow details. We'll reply within one business day.",
    type: "website",
    siteName: "Nicer Systems",
  },
  twitter: {
    card: "summary",
    title: "Contact | Nicer Systems",
    description:
      "Book a scoping call or get a Preview Plan first.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
