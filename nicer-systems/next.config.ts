import type { NextConfig } from "next";

// CSP directives — joined into a single header value below.
// 'unsafe-eval' is required by the Firebase JS SDK (grpc, auth) at runtime.
const cspDirectives = [
  "default-src 'self'",
  // Scripts: self + Firebase + PostHog + inline (Next.js hydration).
  // 'unsafe-eval' is needed by the Firebase JS SDK and PostHog in prod.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseio.com https://*.googleapis.com https://us.i.posthog.com https://us-assets.i.posthog.com",
  // Styles: self + Google Fonts + inline (Tailwind / framer-motion).
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Images: self + Firebase Storage + GCS + Unsplash + PostHog + data URIs.
  "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://images.unsplash.com https://us.i.posthog.com",
  // Fonts: self + Google Fonts CDN.
  "font-src 'self' https://fonts.gstatic.com",
  // Connect: self + Firebase + Firestore + PostHog + Resend.
  "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://us.i.posthog.com https://us-assets.i.posthog.com https://api.resend.com",
  // Frames: self + Firebase Auth helpers.
  "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

const cspHeader = cspDirectives.join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "firebase-admin",
    "firebase-admin/app",
    "firebase-admin/auth",
    "firebase-admin/firestore",
  ],
  turbopack: {
    root: process.cwd(),
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/privacy-policy",
        destination: "/privacy",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
