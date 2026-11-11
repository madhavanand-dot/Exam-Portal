// Rules tests against the emulators with the real client SDK: npm test (see README.md).
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, query, where, documentId,
  serverTimestamp, Timestamp, writeBatch, deleteField } from "firebase/firestore";
import { execSync } from "node:child_process";
const seed = JSON.parse(execSync("node seed.mjs 2>/dev/null").toString().trim().split("\n").pop());
let n = 0;
async function as(id, pass, create){
  const app = initializeApp({ apiKey: "x", projectId: "demo-exam" }, "app" + (++n));
  const auth = getAuth(app); connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app); connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const email = `${id}@id.exam.local`;
  const cred = create ? await createUserWithEmailAndPassword(auth, email, pass) : await signInWithEmailAndPassword(auth, email, pass);
  return { db, uid: cred.user.uid, email };
}
let pass = 0, fail = 0;
async function ok(name, p){ try { await p; pass++; console.log("PASS allow  " + name); } catch (e) { fail++; console.log("FAIL (should be allowed) " + name + " :: " + (e.code || e.message)); } }
async function no(name, p){ try { await p; fail++; console.log("FAIL (should be DENIED) " + name); } catch (e) { if (e.code === "permission-denied") { pass++; console.log("PASS deny   " + name); } else { fail++; console.log("FAIL (unexpected error) " + name + " :: " + (e.code || e.message)); } } }

const A = await as("admin1", "admin123"), F = await as("fac1", "fac12345");
const S1 = await as("10000000001", "pass1234"), S2 = await as("10000000002", "pass1234"), S3 = await as("10000000003", "pass1234");
const Q = seed.qids, EX = "Unit Test 1", HELD = "Held Test";

// --- self signup: pending, cannot read anything until approved
const N = await as("10000000009", "pass1234", true);
await no("self-signup without pending flag", setDoc(doc(N.db, "users", N.uid), { name: "X", role: "student", email: N.email, examType: "medical" }));
await no("self-signup as admin", setDoc(doc(N.db, "users", N.uid), { name: "X", role: "admin", email: N.email, pending: true }));
await ok("self-signup pending", setDoc(doc(N.db, "users", N.uid), { name: "New Kid", role: "student", email: N.email, examType: "medical", pending: true, psid: "10000000009" }));
await no("pending student reads a question", getDoc(doc(N.db, "questions", Q[0])));
await no("pending student lists active exams", getDocs(query(collection(N.db, "exams"), where("examType", "==", "medical"), where("isActive", "==", true))));
await no("pending student approves self", updateDoc(doc(N.db, "users", N.uid), { pending: false }));
await ok("admin approves", updateDoc(doc(A.db, "users", N.uid), { pending: false }));
await ok("approved student reads a question", getDoc(doc(N.db, "questions", Q[0])));

// --- sealed keys: admin moves keys; student cannot read them
const kb = writeBatch(A.db);
for (const id of Q) { kb.set(doc(A.db, "questionKeys", id), { correct_answer: "B", solution: "s", createdBy: A.uid }); kb.update(doc(A.db, "questions", id), { correct_answer: deleteField(), solution: deleteField() }); }
await ok("admin seals keys (batch of " + Q.length * 2 + ")", kb.commit());
await ok("faculty reads a key", getDoc(doc(F.db, "questionKeys", Q[0])));
await no("faculty overwrites admin's key doc", updateDoc(doc(F.db, "questionKeys", Q[0]), { correct_answer: "A" }));
await ok("faculty creates own key doc", setDoc(doc(F.db, "questionKeys", "FQ1"), { correct_answer: "A", createdBy: F.uid }));
await no("faculty creates key doc under someone else's name", setDoc(doc(F.db, "questionKeys", "FQ2"), { correct_answer: "A", createdBy: A.uid }));
await ok("student reads question content", getDoc(doc(S1.db, "questions", Q[0])));
// practice is ON for ECAPS in the seed -> switch it off first to test the locked state
await ok("admin switches practice off", setDoc(doc(A.db, "settings", "portal"), { practiceEnabled: false }, { merge: true }));
await no("student reads a sealed key", getDoc(doc(S1.db, "questionKeys", Q[0])));
await no("student lists sealed keys", getDocs(collection(S1.db, "questionKeys")));
await no("student unlocks keys without an attempt", setDoc(doc(S1.db, "keyAccess", S1.uid), { exam: EX, at: serverTimestamp(), q: { [Q[0]]: true } }, { merge: true }));

// --- exams visibility
await ok("student lists active exams of own stream", getDocs(query(collection(S1.db, "exams"), where("examType", "==", "medical"), where("isActive", "==", true))));
await no("student lists ALL exams", getDocs(collection(S1.db, "exams")));
await no("student gets an inactive exam", getDoc(doc(S1.db, "exams", "Inactive Test")));
await ok("staff lists all exams", getDocs(collection(F.db, "exams")));

// --- attempts
const att = (db, uid, ex) => doc(db, "attempts", `${ex}_${uid}`);
const base = (uid, ex) => ({ studentUid: uid, studentName: "x", examId: ex, examTitle: ex, examType: "medical", submitTime: null, responses: {}, score: null });
await no("start with a client-side start time", setDoc(att(S1.db, S1.uid, EX), { ...base(S1.uid, EX), startTime: Timestamp.fromMillis(Date.now() - 3600e3) }));
await no("start an inactive test", setDoc(att(S1.db, S1.uid, "Inactive Test"), { ...base(S1.uid, "Inactive Test"), startTime: serverTimestamp() }));
await no("start a test before it opens", setDoc(att(S1.db, S1.uid, "Future Test"), { ...base(S1.uid, "Future Test"), startTime: serverTimestamp() }));
await no("start a test of another stream", setDoc(att(S1.db, S1.uid, "Eng Test"), { ...base(S1.uid, "Eng Test"), examType: "engineering", startTime: serverTimestamp() }));
await no("start with a score already set", setDoc(att(S1.db, S1.uid, EX), { ...base(S1.uid, EX), score: 48, startTime: serverTimestamp() }));
await no("create an attempt in someone else's name", setDoc(att(S1.db, S2.uid, EX), { ...base(S2.uid, EX), startTime: serverTimestamp() }));
await ok("start a test", setDoc(att(S1.db, S1.uid, EX), { ...base(S1.uid, EX), startTime: serverTimestamp() }));
await ok("save progress", setDoc(att(S1.db, S1.uid, EX), { responses: { [Q[0]]: { answer: "B", timeSec: 5, visitCount: 1 } }, live: { lastSeen: serverTimestamp() }, warnings: 1, violations: [] }, { merge: true }));
await no("push the start time later", setDoc(att(S1.db, S1.uid, EX), { startTime: Timestamp.fromMillis(Date.now() + 600e3) }, { merge: true }));
await no("write a score while writing", setDoc(att(S1.db, S1.uid, EX), { score: 48 }, { merge: true }));
await no("student writes the teacher's note", setDoc(att(S1.db, S1.uid, EX), { integrityNote: { text: "all fine" } }, { merge: true }));
await no("another student reads my attempt", getDoc(att(S2.db, S1.uid, EX)));
await no("another student lists the test's attempts", getDocs(query(collection(S2.db, "attempts"), where("examId", "==", EX))));
await ok("I list my own attempts", getDocs(query(collection(S1.db, "attempts"), where("studentUid", "==", S1.uid))));
await ok("staff lists the test's attempts", getDocs(query(collection(F.db, "attempts"), where("examId", "==", EX))));
await ok("staff sends a live warning", updateDoc(att(F.db, S1.uid, EX), { staffWarning: { msg: "hi", by: "F", at: serverTimestamp() } }));
await no("unlock keys before submitting", setDoc(doc(S1.db, "keyAccess", S1.uid), { exam: EX, at: serverTimestamp(), q: { [Q[0]]: true } }, { merge: true }));
await no("submit with a made-up submit time", setDoc(att(S1.db, S1.uid, EX), { submitTime: Timestamp.fromMillis(Date.now() - 60e3) }, { merge: true }));
await no("submit with a score", setDoc(att(S1.db, S1.uid, EX), { submitTime: serverTimestamp(), score: 48 }, { merge: true }));
await ok("submit", setDoc(att(S1.db, S1.uid, EX), { submitTime: serverTimestamp(), gradeStatus: "pending", responses: { [Q[0]]: { answer: "B", timeSec: 5, visitCount: 1 } } }, { merge: true }));
await no("change answers after submitting", setDoc(att(S1.db, S1.uid, EX), { responses: { [Q[1]]: { answer: "B" } } }, { merge: true }));
await no("unlock a key that is not in the test", setDoc(doc(S1.db, "keyAccess", S1.uid), { exam: EX, at: serverTimestamp(), q: { FQ1: true } }, { merge: true }));
await ok("unlock the test's keys", setDoc(doc(S1.db, "keyAccess", S1.uid), { exam: EX, at: serverTimestamp(), q: Object.fromEntries(Q.map(id => [id, true])) }, { merge: true }));
await ok("read an unlocked key", getDoc(doc(S1.db, "questionKeys", Q[0])));
await no("read a key that was not unlocked", getDoc(doc(S1.db, "questionKeys", "FQ1")));
await no("S2 still cannot read the key", getDoc(doc(S2.db, "questionKeys", Q[0])));
let inq = "?"; try { await getDocs(query(collection(S1.db, "questionKeys"), where(documentId(), "in", Q.slice(0, 5)))); inq = "allowed"; } catch (e) { inq = e.code; }
console.log("INFO  documentId-in query on unlocked keys by a student: " + inq);
await no("in-query that includes a locked key", getDocs(query(collection(S1.db, "questionKeys"), where(documentId(), "in", [Q[0], "FQ1"]))));
await no("list all keys after unlocking some", getDocs(collection(S1.db, "questionKeys")));
await ok("a second student starts the same test", setDoc(att(S2.db, S2.uid, EX), { ...base(S2.uid, EX), startTime: serverTimestamp() }));
await ok("the teacher warns them", updateDoc(att(F.db, S2.uid, EX), { staffWarning: { msg: "eyes on your screen", by: "F", at: serverTimestamp() } }));
await ok("their next save still goes through", setDoc(att(S2.db, S2.uid, EX), { responses: { [Q[2]]: { answer: "A", timeSec: 3, visitCount: 1 } }, live: { lastSeen: serverTimestamp() }, warnings: 0, violations: [] }, { merge: true }));
await no("they cannot erase the teacher's warning", setDoc(att(S2.db, S2.uid, EX), { staffWarning: null }, { merge: true }));
await no("grade with a wrong timestamp", updateDoc(att(S1.db, S1.uid, EX), { score: 4, gradedAt: Timestamp.fromMillis(1) }));
await no("grade and also change answers", updateDoc(att(S1.db, S1.uid, EX), { score: 4, gradedAt: serverTimestamp(), responses: {} }));
await ok("grade once", updateDoc(att(S1.db, S1.uid, EX), { score: 4, subjectScores: { Physics: 4 }, wrongQuestions: [], unansweredQuestions: Q.slice(1), quickAnswers: {}, gradedAt: serverTimestamp(), gradeStatus: "done" }));
await no("grade a second time", updateDoc(att(S1.db, S1.uid, EX), { score: 48, gradedAt: serverTimestamp() }));
await ok("save reasons", updateDoc(att(S1.db, S1.uid, EX), { reasons: { [Q[1]]: { r: "concept" } }, reasonsAt: serverTimestamp() }));
await no("restart while reattempts are off", setDoc(att(S1.db, S1.uid, EX), { ...base(S1.uid, EX), startTime: serverTimestamp() }));
await ok("admin allows reattempts", setDoc(doc(A.db, "settings", "portal"), { allowReattempts: true }, { merge: true }));
await ok("restart when reattempts are on", setDoc(att(S1.db, S1.uid, EX), { ...base(S1.uid, EX), startTime: serverTimestamp() }));
await ok("staff verifies / regrades", updateDoc(att(F.db, S1.uid, EX), { verifiedAt: serverTimestamp() }));

// --- held test: no unlock until released
await ok("S2 starts the held test", setDoc(att(S2.db, S2.uid, HELD), { ...base(S2.uid, HELD), startTime: serverTimestamp() }));
await ok("S2 submits the held test", setDoc(att(S2.db, S2.uid, HELD), { submitTime: serverTimestamp(), gradeStatus: "pending" }, { merge: true }));
await no("unlock keys of a held test", setDoc(doc(S2.db, "keyAccess", S2.uid), { exam: HELD, at: serverTimestamp(), q: { [Q[0]]: true } }, { merge: true }));
await ok("inactive exam readable once I have an attempt", (async () => { await updateDoc(doc(A.db, "exams", HELD), { isActive: false }); await getDoc(doc(S2.db, "exams", HELD)); })());
await ok("staff grades the held attempt", updateDoc(att(A.db, S2.uid, HELD), { score: 12, verifiedAt: serverTimestamp(), gradeStatus: "done" }));
await ok("admin releases the answers", updateDoc(doc(A.db, "exams", HELD), { answersReleased: true }));
await ok("unlock after release", setDoc(doc(S2.db, "keyAccess", S2.uid), { exam: HELD, at: serverTimestamp(), q: { [Q[0]]: true } }, { merge: true }));

// --- examStats
await ok("student adds own score", setDoc(doc(S1.db, "examStats", EX), { scores: { [S1.uid]: { s: 4, b: "TR01" } } }, { merge: true }));
await ok("second student adds own score", setDoc(doc(S2.db, "examStats", EX), { scores: { [S2.uid]: { s: 8, b: "TR01" } } }, { merge: true }));
await no("student changes someone else's score", setDoc(doc(S2.db, "examStats", EX), { scores: { [S1.uid]: { s: 0 } } }, { merge: true }));
await no("student writes class figures", setDoc(doc(S2.db, "examStats", EX), { q: { x: [1] } }, { merge: true }));
await ok("student reads class figures", getDoc(doc(S1.db, "examStats", EX)));
await ok("staff rebuilds class figures", setDoc(doc(F.db, "examStats", EX), { scores: {}, q: {}, n: 0, builtAt: serverTimestamp() }));

// --- practice bank release
await ok("admin switches practice on", setDoc(doc(A.db, "settings", "portal"), { practiceEnabled: true, practiceBanks: { medical: ["ECAPS"], engineering: [] } }, { merge: true }));
await ok("student reads a key of a released practice bank", getDoc(doc(S2.db, "questionKeys", Q[3])));
await no("engineering student: bank not released for that stream", getDoc(doc(S3.db, "questionKeys", "EPHY_1")));

// --- settings & removed collections
await no("faculty reads the GitHub token", getDoc(doc(F.db, "settings", "aiRunner")));
await no("student reads another user's profile", getDoc(doc(S1.db, "users", S2.uid)));
await no("staff reads the old aiDrafts collection", getDocs(collection(F.db, "aiDrafts")));
// --- big batches by faculty (document-access limits in rules)
const fb = writeBatch(F.db);
for (let i = 0; i < 120; i++) { fb.set(doc(F.db, "questions", "FB_" + i), { id: "FB_" + i, subject: "Physics", examType: "medical", createdBy: F.uid, text: "t" }); fb.set(doc(F.db, "questionKeys", "FB_" + i), { correct_answer: "A", createdBy: F.uid }); }
await ok("faculty batch: 120 questions + 120 keys", fb.commit());
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
