import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

export type { App } from "firebase-admin/app";
export type { Auth, DecodedIdToken } from "firebase-admin/auth";
export type { Firestore } from "firebase-admin/firestore";
export { FieldValue, Timestamp };

import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";

let _app: App;
let _auth: Auth;
let _db: Firestore;

function getAdminApp(): App {
      if (_app) return _app;

  if (getApps().length) {
          _app = getApps()[0] as App;
          return _app;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (!privateKey || privateKey === "''" || privateKey === "") {
              throw new Error(
                        "FIREBASE_PRIVATE_KEY is not set. Add your Firebase service account credentials to .env.local."
                      );
      }

  _app = initializeApp({
          credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey.replace(/\\n/g, "\n"),
          }),
  }) as App;

  return _app;
}

export function getAdminAuth(): Auth {
      if (!_auth) _auth = getAuth(getAdminApp()) as Auth;
      return _auth;
}

export function getAdminDb(): Firestore {
      if (!_db) _db = getFirestore(getAdminApp()) as Firestore;
      return _db;
}
