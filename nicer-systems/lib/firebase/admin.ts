import {
  initializeApp,
  getApps,
  cert,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _app: App | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;

function getAdminApp(): App {
  if (_app) return _app;

  if (getApps().length) {
    _app = getApps()[0];
    return _app;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey || privateKey === '""' || privateKey === "") {
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
  });

  return _app;
}

export function getAdminAuth(): Auth {
  if (!_auth) _auth = getAuth(getAdminApp());
  return _auth;
}

export function getAdminDb(): Firestore {
  if (!_db) _db = getFirestore(getAdminApp());
  return _db;
}
