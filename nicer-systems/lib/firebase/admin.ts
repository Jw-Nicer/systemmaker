import * as adminApp from "firebase-admin/app";
import * as adminAuth from "firebase-admin/auth";
import * as adminFirestore from "firebase-admin/firestore";

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
    if (!privateKey || privateKey === "''" || privateKey === "") {
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

export const adminFieldValue = adminFirestore.FieldValue;
export const adminTimestamp = adminFirestore.Timestamp;
