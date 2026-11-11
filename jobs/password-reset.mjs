// Admin password reset WITHOUT the old password (Firebase Admin SDK, runs in GitHub Actions — see
// .github/workflows/password-reset.yml). Pure logic lives here so it can be tested with fakes (reset.test.mjs).
//
// Flow: an admin in the portal queues requests in `passwordResets` (security rules: only super-admins may create them).
// This job reads the PENDING ones, re-checks on the SERVER that the requester is an active admin, sets the student's
// login password to the default pattern and mirrors it into users/{uid}.password, then records the outcome.
// The repository is public: never log names, PS-IDs, uids or passwords. Outcomes are written to the request document only.

export const MIN_PASSWORD = 6;

// Default pattern: first letter capital + second letter small + "@" + PS-ID without leading zeros (e.g. Ly@15456129).
// MUST stay identical to defaultStudentPassword() in index.html.
export function defaultStudentPassword(name, psid){
  const letters = String(name || "").replace(/[^A-Za-z]/g, "");
  const pre = (letters.charAt(0).toUpperCase() + letters.charAt(1).toLowerCase()) || "St";
  const num = String(psid || "").replace(/\D/g, "").replace(/^0+/, "") || "0";
  return `${pre}@${num}`;
}

export const ID_DOMAIN = "id.exam.local";
export const psidEmail = psid => `${String(psid || "").trim().toLowerCase()}@${ID_DOMAIN}`;

// Statuses written back to the request document.
//  done                     login password changed AND the portal's saved copy updated
//  login-reset-sync-failed  login password changed, but users/{uid}.password could NOT be updated (stored copy is stale)
//  failed                   nothing changed (reason in `message`; never contains a credential)
//  rejected                 not authorised / invalid request; nothing changed
export async function processRequest({ id, req, store, auth, now = () => Date.now() }){
  const out = (status, message, extra = {}) => ({ id, status, message, ...extra });
  try {
    if (!req || req.status !== "pending") return out("skipped", "not pending");
    if (typeof req.uid !== "string" || !req.uid || typeof req.requestedBy !== "string" || !req.requestedBy)
      return out("rejected", "Malformed request.");

    // 1) authorisation on the server (the request document alone is never trusted)
    const requester = await store.getUser(req.requestedBy);
    if (!requester || requester.role !== "admin" || requester.active === false)
      return out("rejected", "Requester is not an active administrator.");

    // 2) the target must be an existing STUDENT profile
    const target = await store.getUser(req.uid);
    if (!target) return out("failed", "No student profile with that id.");
    if (target.role !== "student") return out("rejected", "Only student passwords can be reset here.");
    if (!target.psid) return out("failed", "The student profile has no PS-ID.");

    // 3) the login account must exist and be the SAME uid (otherwise resetting would touch the wrong/orphan account)
    let user = await auth.getUser(req.uid).catch(e => (e?.code === "auth/user-not-found" ? null : Promise.reject(e)));
    if (!user) {
      const byEmail = await auth.getUserByEmail(target.email || psidEmail(target.psid)).catch(e => (e?.code === "auth/user-not-found" ? null : Promise.reject(e)));
      if (byEmail) return out("failed", "A login account exists for this PS-ID under a different id (orphan). Delete that Authentication account in the Firebase console, then re-add the student.");
      return out("failed", "This student has no login account. Re-add the student.");
    }

    // 4) set the login password (the account, its uid and the exam history are untouched)
    const password = defaultStudentPassword(target.name, target.psid);
    if (password.length < MIN_PASSWORD) return out("failed", "The default password would be too short.");
    try { await auth.updateUser(req.uid, { password }); }
    catch (e) { return out("failed", "Login password NOT changed: " + (e?.code || "error")); }

    // 5) sign other devices out, best effort
    try { await auth.revokeRefreshTokens(req.uid); } catch {}

    // 6) mirror into the portal's saved copy; a failure here must be reported honestly
    try { await store.setStoredPassword(req.uid, password); }
    catch (e) { return out("login-reset-sync-failed", "Login password WAS changed, but the portal's saved copy could not be updated (" + (e?.code || "error") + "). The Password column will show the old value."); }
    return out("done", "Login password reset to the default pattern and the saved copy updated.");
  } catch (e) {
    return out("failed", "Unexpected error: " + (e?.code || e?.name || "error"));
  }
}

export async function run({ store, auth, log = console.log, limit = 200 }){
  const pending = await store.listPending(limit);
  const counts = { done: 0, "login-reset-sync-failed": 0, failed: 0, rejected: 0, skipped: 0 };
  for (const { id, data } of pending) {
    const r = await processRequest({ id, req: data, store, auth });
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (r.status !== "skipped") await store.writeResult(id, { status: r.status, message: r.message });
  }
  log(`Password reset requests: ${pending.length} pending → ${counts.done} done, ${counts["login-reset-sync-failed"]} login-reset/sync-failed, ${counts.failed} failed, ${counts.rejected} rejected.`);
  return { total: pending.length, ...counts };
}
