/**
 * Grant the `admin: true` Firebase Auth custom claim to an existing user.
 *
 * Usage:
 *   npx tsx scripts/set-admin-claim.ts <email>
 *   npx tsx scripts/set-admin-claim.ts --revoke <email>
 *
 * Run BEFORE deploying the tightened Firestore/Storage rules so existing
 * admins do not lock themselves out. After running, the admin must sign
 * out and back in to pick up the claim on a fresh session cookie.
 */
import "dotenv/config";
import { getAdminAuth } from "@/lib/firebase/admin";

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const email = args.find((a) => !a.startsWith("--"));

  if (!email) {
    console.error(
      "Usage: npx tsx scripts/set-admin-claim.ts [--revoke] <email>"
    );
    process.exit(1);
  }

  const auth = getAdminAuth();
  const user = await auth.getUserByEmail(email);
  const existingClaims = user.customClaims ?? {};
  const nextClaims = { ...existingClaims, admin: revoke ? false : true };

  await auth.setCustomUserClaims(user.uid, nextClaims);

  console.log(
    `${revoke ? "Revoked" : "Granted"} admin claim for ${email} (uid=${user.uid}).`
  );
  console.log(
    "Reminder: the user must sign out and back in for the claim to appear in their session cookie."
  );
}

main().catch((err) => {
  console.error("Failed to update admin claim:", err);
  process.exit(1);
});
