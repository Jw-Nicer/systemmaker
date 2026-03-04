/* eslint-disable @typescript-eslint/no-explicit-any */

// Use eval("require") to completely hide firebase-admin imports from Turbopack.
// Turbopack mangles module names (e.g. "firebase-admin" → "firebase-admin-<hash>")
// which breaks in Cloud Functions where the real package name must be used.
const _require = eval("require") as NodeRequire;
const adminApp: any = _require("firebase-admin/app");
const adminAuth: any = _require("firebase-admin/auth");
const adminFirestore: any = _require("firebase-admin/firestore");

// Re-export types only (stripped at compile time, won't trigger Turbopack bundling)
export type { App } from "firebase-admin/app";
export type { Auth, DecodedIdToken } from "firebase-admin/auth";
export type { Firestore } from "firebase-admin/firestore";

import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";

let _app: App;
let _auth: Auth;
let _db: Firestore;

function getAdminApp(): App {
  if (_app) return _app;

  if (adminApp.getApps().length) {
    _app = adminApp.getApps()[0] as App;
    return _app;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey || privateKey === '""' || privateKey === "") {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is not set. Add your Firebase service account credentials to .env.local."
    );
  }

  _app = adminApp.initializeApp({
    credential: adminApp.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  }) as App;

  return _app;
}

export function getAdminAuth(): Auth {
  if (!_auth) _auth = adminAuth.getAuth(getAdminApp()) as Auth;
  return _auth;
}

export function getAdminDb(): Firestore {
  if (!_db) _db = adminFirestore.getFirestore(getAdminApp()) as Firestore;
  return _db;
}

export const FieldValue = adminFirestore.FieldValue;
