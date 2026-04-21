import { cookies } from "next/headers";
import { getAdminAuth } from "./admin";

const SESSION_COOKIE_NAME = "__session";
const SESSION_EXPIRY = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function createSessionCookie(idToken: string) {
  const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRY,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_EXPIRY / 1000,
    path: "/",
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Require an admin session. An admin is a user whose Firebase custom claim
 * `admin` is `true`. As a transition fallback — until `scripts/set-admin-claim.ts`
 * has been run against every existing admin — we also accept sessions whose
 * email matches `ADMIN_EMAIL` (defaults to the project owner). Once all admin
 * accounts carry the claim, the fallback branch can be removed.
 */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return null;

  if (user.admin === true) return user;

  const fallbackEmail = (
    process.env.ADMIN_EMAIL || "johnwilnicer@gmail.com"
  ).toLowerCase();
  if (typeof user.email === "string" && user.email.toLowerCase() === fallbackEmail) {
    return user;
  }

  return null;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
