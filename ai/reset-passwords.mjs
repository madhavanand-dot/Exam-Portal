// Entry point for GitHub Actions: node ai/reset-passwords.mjs  (manual "Run workflow" only)
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { run } from "./password-reset.mjs";

if (!process.env.FIREBASE_SERVICE_ACCOUNT) { console.error("Missing FIREBASE_SERVICE_ACCOUNT secret."); process.exit(1); }
const app = initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || "default");
const auth = getAuth(app);
const store = {
  async listPending(limit){ const s = await db.collection("passwordResets").where("status", "==", "pending").limit(limit).get(); return s.docs.map(d => ({ id: d.id, data: d.data() })); },
  async getUser(uid){ const s = await db.collection("users").doc(uid).get(); return s.exists ? s.data() : null; },
  async setStoredPassword(uid, password){ await db.collection("users").doc(uid).update({ password, passwordResetAt: FieldValue.serverTimestamp() }); },
  async writeResult(id, r){ await db.collection("passwordResets").doc(id).update({ ...r, processedAt: FieldValue.serverTimestamp() }); }
};
const res = await run({ store, auth });
if (res.failed || res["login-reset-sync-failed"]) process.exitCode = 1;   // job goes red so you notice; details are in the portal
