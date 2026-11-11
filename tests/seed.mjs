// Seeds the emulators: admin, faculty, students, questions, tests. Run by rules.test.mjs (or: node seed.mjs).
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
const app = initializeApp({ projectId: "demo-exam" });
const auth = getAuth(app), db = getFirestore(app);
// wipe
await fetch("http://127.0.0.1:8080/emulator/v1/projects/demo-exam/databases/(default)/documents", { method: "DELETE" });
await fetch("http://127.0.0.1:9099/emulator/v1/projects/demo-exam/accounts", { method: "DELETE" });
const email = id => `${String(id).toLowerCase()}@id.exam.local`;
async function user(id, pass, profile){
  const u = await auth.createUser({ email: email(id), password: pass });
  await db.collection("users").doc(u.uid).set({ email: email(id), createdAt: Timestamp.now(), ...profile });
  return u.uid;
}
const admin = await user("admin1", "admin123", { name: "Admin One", role: "admin", examType: "medical", empId: "admin1" });
const fac = await user("fac1", "fac12345", { name: "Faculty One", role: "faculty", examType: "medical", empId: "fac1" });
const s1 = await user("10000000001", "pass1234", { name: "Asha Rao", role: "student", examType: "medical", batch: "TR01", class: "XI", psid: "10000000001", password: "pass1234" });
const s2 = await user("10000000002", "pass1234", { name: "Vikram S", role: "student", examType: "medical", batch: "TR01", class: "XI", psid: "10000000002", password: "pass1234" });
const s3 = await user("10000000003", "pass1234", { name: "Meena K", role: "student", examType: "engineering", batch: "OR01", class: "XII", psid: "10000000003", password: "pass1234" });
const subs = ["Physics", "Chemistry", "Botany", "Zoology"];
const qids = [];
let n = 0;
for (const sub of subs) for (let i = 1; i <= 3; i++) {
  n++;
  const id = `${sub.slice(0,3).toUpperCase()}_${String(i).padStart(3,"0")}`;
  const key = "ABCD"[n % 4];
  await db.collection("questions").doc(id).set({
    id, subject: sub, section: "A", examType: "medical", text: `${sub} question ${i}: what is $x_${i}$ when the answer is ${key}?`,
    options: ["A) alpha", "B) beta", "C) gamma", "D) delta"], correct_answer: i === 3 && sub === "Physics" ? "AC" : key,
    topic: i < 3 ? `${sub} Chapter One` : `${sub} Chapter Two`, difficulty: ["Easy","Medium","Hard"][i-1], idealTimeSec: 60,
    solution: `Because ${key}.`, bank: "ECAPS", qType: i === 3 && sub === "Physics" ? "multi" : "single", skills: ["concept"],
    createdBy: admin, createdByName: "Admin One", createdAt: Timestamp.now() });
  qids.push(id);
}
// engineering: MCQ + numerical
const eq = [];
for (let i = 1; i <= 3; i++) {
  const id = `EPHY_${i}`;
  await db.collection("questions").doc(id).set({ id, subject: "Physics", section: i === 3 ? "B" : "A", examType: "engineering", text: `Eng physics ${i}`,
    options: i === 3 ? [] : ["one","two","three","four"], correct_answer: i === 3 ? "42" : "B", topic: "Kinematics", difficulty: "Medium",
    createdBy: fac, createdByName: "Faculty One", createdAt: Timestamp.now() });
  eq.push(id);
}
const exam = (id, extra) => db.collection("exams").doc(id).set({ title: id, examType: "medical", questionIds: qids, subjects: subs, durationMin: 30,
  marks: { A: { correct: 4, wrong: -1 }, B: { correct: 4, wrong: 0 } }, maxMarks: qids.length * 4, isActive: true, startAt: null, endAt: null,
  audience: { mode: "all" }, shuffleOptions: false, keepOrder: true, createdBy: admin, createdByName: "Admin One", createdAt: Timestamp.now(), ...extra });
await exam("Unit Test 1", {});
await exam("Held Test", { answerRelease: "manual" });
await exam("Inactive Test", { isActive: false });
await exam("Future Test", { startAt: Timestamp.fromMillis(Date.now() + 86400000) });
await db.collection("exams").doc("Eng Test").set({ title: "Eng Test", examType: "engineering", questionIds: eq, subjects: ["Physics"], durationMin: 20,
  marks: { A: { correct: 4, wrong: -1 }, B: { correct: 4, wrong: 0 } }, maxMarks: 12, isActive: true, startAt: null, endAt: null, audience: { mode: "all" },
  createdBy: fac, createdByName: "Faculty One", createdAt: Timestamp.now() });
await db.collection("settings").doc("portal").set({ allowReattempts: false, practiceEnabled: true, practiceBanks: { medical: ["ECAPS"], engineering: [] } });
console.log(JSON.stringify({ admin, fac, s1, s2, s3, qids, eq }));
process.exit(0);
