import assert from "node:assert/strict";
import { processRequest, run, defaultStudentPassword } from "./password-reset.mjs";
let n = 0; const t = async (name, f) => { await f(); n++; console.log("PASS " + name); };
const nf = () => Object.assign(new Error("nf"), { code: "auth/user-not-found" });
function mk({ users = {}, authUsers = {}, failUpdate = false, failSync = false } = {}){
  const calls = { updateUser: [], revoke: [], stored: [], results: {} };
  const store = {
    getUser: async u => users[u] || null,
    setStoredPassword: async (u, p) => { if (failSync) throw Object.assign(new Error("x"), { code: "unavailable" }); calls.stored.push([u, p]); },
    listPending: async () => Object.entries(users).filter(([, v]) => v._req).map(([id, v]) => ({ id, data: v._req })),
    writeResult: async (id, r) => { calls.results[id] = r; }
  };
  const auth = {
    getUser: async u => { if (authUsers[u]) return { uid: u }; throw nf(); },
    getUserByEmail: async e => { const hit = Object.entries(authUsers).find(([, em]) => em === e); if (hit) return { uid: hit[0] }; throw nf(); },
    updateUser: async (u, p) => { if (failUpdate) throw Object.assign(new Error("x"), { code: "auth/internal-error" }); calls.updateUser.push([u, p]); },
    revokeRefreshTokens: async u => { calls.revoke.push(u); }
  };
  return { store, auth, calls };
}
const admin = { role: "admin" }, stu = { role: "student", name: "Lydia EL Eben", psid: "00015456129", email: "00015456129@id.exam.local" };
const req = { uid: "S1", requestedBy: "A1", status: "pending" };

await t("default pattern: Ly@15456129", () => { assert.equal(defaultStudentPassword("Lydia EL Eben", "00015456129"), "Ly@15456129"); assert.equal(defaultStudentPassword("S.Yuvakrishna", "00008655818"), "Sy@8655818"); assert.equal(defaultStudentPassword("", "0000"), "St@0"); });
await t("happy path: login reset, saved copy synced, account untouched", async () => {
  const { store, auth, calls } = mk({ users: { A1: admin, S1: stu }, authUsers: { S1: "x" } });
  const r = await processRequest({ id: "r1", req, store, auth });
  assert.equal(r.status, "done"); assert.deepEqual(calls.updateUser, [["S1", { password: "Ly@15456129" }]]);
  assert.deepEqual(calls.stored, [["S1", "Ly@15456129"]]); assert.deepEqual(calls.revoke, ["S1"]);
});
await t("non-admin requester is rejected, nothing changed", async () => {
  for (const requester of [{ role: "faculty" }, { role: "student" }, { role: "admin", active: false }, null]) {
    const { store, auth, calls } = mk({ users: { A1: requester, S1: stu }, authUsers: { S1: "x" } });
    const r = await processRequest({ id: "r", req, store, auth });
    assert.equal(r.status, "rejected"); assert.equal(calls.updateUser.length, 0); assert.equal(calls.stored.length, 0);
  }
});
await t("only student profiles can be reset", async () => {
  const { store, auth, calls } = mk({ users: { A1: admin, S1: { ...stu, role: "faculty" } }, authUsers: { S1: "x" } });
  assert.equal((await processRequest({ id: "r", req, store, auth })).status, "rejected"); assert.equal(calls.updateUser.length, 0);
});
await t("login reset ok but saved-copy sync fails → reported as login-reset-sync-failed, not done", async () => {
  const { store, auth, calls } = mk({ users: { A1: admin, S1: stu }, authUsers: { S1: "x" }, failSync: true });
  const r = await processRequest({ id: "r", req, store, auth });
  assert.equal(r.status, "login-reset-sync-failed"); assert.equal(calls.updateUser.length, 1); assert.ok(!/Ly@/.test(r.message));
});
await t("Auth update fails → failed, saved copy NOT touched", async () => {
  const { store, auth, calls } = mk({ users: { A1: admin, S1: stu }, authUsers: { S1: "x" }, failUpdate: true });
  const r = await processRequest({ id: "r", req, store, auth });
  assert.equal(r.status, "failed"); assert.equal(calls.stored.length, 0);
});
await t("orphan Auth account under another uid is never touched", async () => {
  const { store, auth, calls } = mk({ users: { A1: admin, S1: stu }, authUsers: { OTHER: stu.email } });
  const r = await processRequest({ id: "r", req, store, auth });
  assert.equal(r.status, "failed"); assert.match(r.message, /orphan/); assert.equal(calls.updateUser.length, 0);
});
await t("no login account → failed; missing profile → failed; malformed/non-pending → rejected/skipped", async () => {
  let m = mk({ users: { A1: admin, S1: stu }, authUsers: {} }); assert.equal((await processRequest({ id: "r", req, ...m })).status, "failed");
  m = mk({ users: { A1: admin }, authUsers: {} }); assert.equal((await processRequest({ id: "r", req, ...m })).status, "failed");
  m = mk({ users: { A1: admin, S1: stu }, authUsers: { S1: "x" } });
  assert.equal((await processRequest({ id: "r", req: { ...req, uid: "" }, ...m })).status, "rejected");
  assert.equal((await processRequest({ id: "r", req: { ...req, status: "done" }, ...m })).status, "skipped");
});
await t("run(): processes pending, writes results, never logs credentials or ids", async () => {
  const lines = []; const m = mk({ users: { A1: admin, S1: { ...stu, _req: req } }, authUsers: { S1: "x" } });
  const res = await run({ ...m, log: s => lines.push(s) });
  assert.equal(res.done, 1); assert.equal(m.calls.results.S1.status, "done");
  assert.ok(!lines.join(" ").match(/Ly@|S1|00015456129|Lydia/));
});
console.log(`${n} passed`);
