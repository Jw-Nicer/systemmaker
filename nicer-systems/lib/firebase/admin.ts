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
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const hasServiceAccount =
    !!privateKey &&
    privateKey !== "''" &&
    privateKey !== "" &&
    !!clientEmail &&
    clientEmail !== "''" &&
    clientEmail !== "";

  if (hasServiceAccount) {
    let formattedKey = privateKey;
    if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
      formattedKey = formattedKey.slice(1, -1);
    } else if (formattedKey.startsWith("'") && formattedKey.endsWith("'")) {
      formattedKey = formattedKey.slice(1, -1);
    }
    formattedKey = formattedKey.replace(/\\n/g, "\n");

    _app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
      projectId,
    }) as App;

    return _app;
  }

  // In Firebase-hosted SSR and other GCP runtimes, Admin SDK can use
  // application default credentials from the environment.
  _app = initializeApp({
    projectId,
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
