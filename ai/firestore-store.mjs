// Firestore access for the pipeline (firebase-admin; bypasses security rules — the key stays in GitHub Secrets).
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, FieldPath, Timestamp } from "firebase-admin/firestore";

export function makeStore({ serviceAccount, databaseId }){
  const app = initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore(app, databaseId);
  const ts = v => typeof v === "number" ? Timestamp.fromMillis(v) : v;
  return {
    async listQueuedAttempts(staleMin){
      const q = await db.collection("attempts").where("aiStatus", "==", "queued").limit(200).get();
      const p = await db.collection("attempts").where("aiStatus", "==", "processing").limit(50).get();
      const stale = p.docs.filter(d => { const c = d.get("aiClaimedAt"); return !c || Date.now() - c.toMillis() > staleMin * 60000; });
      return [...q.docs, ...stale].map(d => ({ id: d.id, data: d.data() }))
        .sort((a, b) => (a.data.submitTime?.toMillis?.() || 0) - (b.data.submitTime?.toMillis?.() || 0));
    },
    async getExam(id){ const s = await db.collection("exams").doc(id).get(); return s.exists ? { docId: s.id, ...s.data() } : null; },
    async getQuestions(ids){
      const out = {};
      for (let i = 0; i < ids.length; i += 100) {
        const snaps = await db.getAll(...ids.slice(i, i + 100).map(id => db.collection("questions").doc(id)));
        snaps.forEach(s => { if (s.exists) out[s.id] = { docId: s.id, ...s.data() }; });
      }
      return out;
    },
    async findExamples(examType, subject, topic, level, n, exclude){
      const s = await db.collection("questions").where("examType", "==", examType).where("subject", "==", subject)
        .where("topic", "==", topic).limit(30).get();
      return s.docs.map(d => ({ docId: d.id, ...d.data() }))
        .filter(q => q.text && !exclude.has(q.docId))
        .sort((a, b) => (a.difficulty === level ? 0 : 1) - (b.difficulty === level ? 0 : 1)).slice(0, n);
    },
    async updateAttempt(id, patch){
      const p = {};
      for (const [k, v] of Object.entries(patch)) p[k] = /At$/.test(k) && typeof v === "number" ? ts(v) : (v === null ? FieldValue.delete() : v);
      await db.collection("attempts").doc(id).update(p);
    },
    async getSettings(){
      const [a, k] = await Promise.all([db.collection("settings").doc("ai").get(), db.collection("settings").doc("aiSecret").get()]);
      return { ai: a.exists ? a.data() : {}, secret: k.exists ? k.data() : {} };
    },
    async listPendingQuestions(limit){
      const byId = new Map();
      for (const field of ["keySrc", "idealTimeSrc"]) {
        const s = await db.collection("questions").where(field, "==", "pending-ai").limit(limit).get();
        s.docs.forEach(d => byId.set(d.id, { docId: d.id, ...d.data() }));
      }
      return [...byId.values()].slice(0, limit);
    },
    async listUserKeyQuestions(limit){
      const byId = new Map();
      const s = await db.collection("questions").where("keySrc", "==", "user").limit(limit).get();
      s.docs.forEach(d => byId.set(d.id, { docId: d.id, ...d.data() }));
      // older Diagnostic Builder questions were saved before keySrc existed: ids start with DG_
      const g = await db.collection("questions").where(FieldPath.documentId(), ">=", "DG_").where(FieldPath.documentId(), "<", "DG`").limit(limit).get();
      g.docs.forEach(d => { if (!byId.has(d.id) && !d.data().keySrc) byId.set(d.id, { docId: d.id, ...d.data() }); });
      return [...byId.values()];
    },
    // read-modify-write inside a transaction so a teacher's edit made meanwhile is never overwritten
    async patchQuestion(id, fn){
      const ref = db.collection("questions").doc(id);
      await db.runTransaction(async t => {
        const s = await t.get(ref);
        if (!s.exists) return;
        const p = fn(s.data());
        if (p && Object.keys(p).length) t.update(ref, p);
      });
    },
    // tests a teacher asked the AI to solve (Diagnostic Builder → "Ask AI to solve this test")
    async listSolveRequests(staleMin){
      const q = await db.collection("exams").where("aiSolve.status", "==", "queued").limit(20).get();
      const p = await db.collection("exams").where("aiSolve.status", "==", "processing").limit(20).get();
      const stale = p.docs.filter(d => { const s = d.get("aiSolve.startedAt"); return !s || Date.now() - s.toMillis() > staleMin * 60000; });
      return [...q.docs, ...stale].map(d => ({ docId: d.id, ...d.data() }));
    },
    // merge into exams/{id}.aiSolve; with a token, only while that request is still the current one
    // (a teacher who asks again meanwhile replaces aiSolve, and the stale result is dropped)
    async patchExamSolve(id, token, patch){
      const ref = db.collection("exams").doc(id);
      const p = {};
      for (const [k, v] of Object.entries(patch)) p["aiSolve." + k] = /At$/.test(k) && typeof v === "number" ? ts(v) : v;
      await db.runTransaction(async t => {
        const s = await t.get(ref);
        if (!s.exists) return;
        if (token && s.get("aiSolve.token") !== token) return;
        t.update(ref, p);
      });
    },
    async writeStatus(st){ await db.collection("settings").doc("aiStatus").set({ ...st, lastRunAt: ts(st.lastRunAt) }, { merge: true }); },
    async writeDraft(id, draft){ await db.collection("aiDrafts").doc(id).set({ ...draft, createdAt: ts(draft.createdAt) }); }
  };
}
