// Firestore access for the pipeline (firebase-admin; bypasses security rules — the key stays in GitHub Secrets).
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

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
    async writeDraft(id, draft){ await db.collection("aiDrafts").doc(id).set({ ...draft, createdAt: ts(draft.createdAt) }); }
  };
}
