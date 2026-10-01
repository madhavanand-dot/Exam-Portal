// Fills in answer keys and ideal times for image questions saved by the Diagnostic Builder.
// New image questions are stored with keySrc / idealTimeSrc = "pending-ai". For each one this job:
//   1. transcribes the image (vision model),
//   2. has TWO different text models solve it, blind to each other,
//   3. accepts the key only if both agree (keySrc "ai"); otherwise leaves it blank (keySrc "ai-unsure")
//      for the teacher to set by hand,
//   4. sets the ideal time from the solver's estimate (idealTimeSrc "ai"), clamped to a sane range.
// Anything the teacher set by hand is never touched (a pending flag is re-checked inside a transaction).
import { parseJsonReply } from "./pipeline.mjs";

const MIN_SEC = 20, MAX_SEC = 240;
const EXAM_NAME = { medical: "NEET-UG", engineering: "JEE Main" };

function transcribePrompt(q){
  return [{ role: "user", content: [
    { type: "text", text: "Transcribe this exam question exactly. Use $...$ for math with doubled backslashes for JSON. If a diagram is essential, describe it in one sentence in square brackets. Reply with ONLY JSON: {\"stem\":\"...\",\"options\":[\"...\",\"...\",\"...\",\"...\"]} (options empty strings if none are printed)." },
    { type: "image_url", image_url: { url: q.image } }
  ] }];
}

function solvePrompt(q, tr){
  const opts = (tr.options || []).map((o, k) => `(${"ABCD"[k]}) ${String(o).replace(/^\s*\(?[A-D1-4][).]\s*/, "")}`).join("\n");
  const numeric = q.section === "B";
  return [{ role: "user", content: `You are an expert ${q.subject || "Physics"} teacher for ${EXAM_NAME[q.examType] || "NEET-UG"}. Solve this question carefully.\n\n${tr.stem}\n${opts}\n\n` +
    (numeric ? "This is a numerical-answer question: give the final number only." : "Give the single correct option letter (A, B, C or D).") +
    "\nAlso estimate how many seconds a well-prepared student needs to solve it in the exam (reading + working), between 20 and 240.\n" +
    "Reply with ONLY JSON: {\"answer\":\"" + (numeric ? "number" : "A|B|C|D") + "\",\"confidence\":0.0-1.0,\"idealSec\":number}" }];
}

function normAnswer(a, section){
  if (section === "B") { const n = parseFloat(String(a).replace(/[^0-9eE+\-.]/g, "")); return isFinite(n) ? n : null; }
  const m = String(a ?? "").toUpperCase().match(/[A-D1-4]/);
  if (!m) return null;
  return "ABCD"["1234".indexOf(m[0])] || m[0];
}
function sameAnswer(x, y, section){
  if (x == null || y == null) return false;
  if (section === "B") return Math.abs(x - y) <= Math.max(0.01 * Math.abs(x), 1e-9);
  return x === y;
}
export const clampSec = v => { const n = Math.round(Number(v)); return isFinite(n) && n > 0 ? Math.max(MIN_SEC, Math.min(MAX_SEC, n)) : null; };

async function solveWith(llm, model, q, tr){
  const r = parseJsonReply(await llm.chat({ model, messages: solvePrompt(q, tr), temperature: 0, maxTokens: 3000 }));
  return { answer: normAnswer(r.answer, q.section), confidence: Number(r.confidence), idealSec: clampSec(r.idealSec) };
}

export async function estimateQuestions({ store, llm, cfg, log = console.log, max = 40, maxTries = 3 }){
  const out = { checked: 0, keyed: 0, unsure: 0, timed: 0, errors: 0 };
  const pending = (await store.listPendingQuestions(max)).filter(q => q.image);
  log(`Pending image questions: ${pending.length}`);
  for (const q of pending) {
    out.checked++;
    const needKey = q.keySrc === "pending-ai", needTime = q.idealTimeSrc === "pending-ai";
    const tries = (q.aiEstTries || 0) + 1;
    try {
      const tr = parseJsonReply(await llm.chat({ model: cfg.visionModel, messages: transcribePrompt(q), temperature: 0, maxTokens: 1200 }));
      tr.stem = String(tr.stem || "").trim();
      if (!tr.stem) throw new Error("could not read the question text from the image");
      const [a, b] = await Promise.all([
        solveWith(llm, cfg.verifyModel, q, tr).catch(e => ({ error: e.message })),
        solveWith(llm, cfg.genModel, q, tr).catch(e => ({ error: e.message }))
      ]);
      const agree = !a.error && !b.error && a.answer != null && sameAnswer(a.answer, b.answer, q.section);
      const conf = Math.min(isFinite(a.confidence) ? a.confidence : 0.5, isFinite(b.confidence) ? b.confidence : 0.5);
      const keyOk = agree && conf >= 0.5;
      const secs = [a.idealSec, b.idealSec].filter(Boolean);
      const idealSec = secs.length ? Math.round(secs.reduce((s, v) => s + v, 0) / secs.length) : null;
      const note = `verifier ${a.error ? "failed" : a.answer ?? "?"} / writer ${b.error ? "failed" : b.answer ?? "?"}`;
      let result = null;
      await store.patchQuestion(q.docId, cur => {
        const p = { aiEstTries: tries };
        if (cur.keySrc === "pending-ai" && needKey) {
          if (keyOk) { p.correct_answer = String(a.answer); p.keySrc = "ai"; p.aiKeyNote = `Both AI models agreed (${note})`; result = "keyed"; }
          else { p.keySrc = "ai-unsure"; p.aiKeyNote = `AI models disagreed or were unsure — set the answer yourself (${note})`; result = "unsure"; }
        }
        if (cur.idealTimeSrc === "pending-ai" && needTime && idealSec) { p.idealTimeSec = idealSec; p.idealTimeSrc = "ai"; out.timed++; }
        return p;
      });
      if (result === "keyed") out.keyed++; else if (result === "unsure") out.unsure++;
      log(`  ${q.docId}: ${result || "time only"} (${note}) ideal ${idealSec ?? "—"}s`);
    } catch (e) {
      out.errors++;
      log(`  ${q.docId}: failed (try ${tries}/${maxTries}): ${e.message}`);
      await store.patchQuestion(q.docId, cur => {
        const p = { aiEstTries: tries };
        if (tries >= maxTries) {   // give up: key goes to the teacher, time falls back to the level default
          if (cur.keySrc === "pending-ai") { p.keySrc = "ai-unsure"; p.aiKeyNote = "The AI could not read this image — set the answer yourself."; }
          if (cur.idealTimeSrc === "pending-ai") p.idealTimeSrc = "default";
        }
        return p;
      }).catch(() => {});
    }
  }
  return out;
}

// Read-only second opinion on values the teacher typed by hand (keySrc/idealTimeSrc "user").
// Never changes correct_answer or idealTimeSec; only stores a verdict in `aiVerify` on the question.
export async function verifyUserQuestions({ store, llm, cfg, log = console.log, max = 40 }){
  const out = { checked: 0, agree: 0, disagree: 0, unsure: 0, timeOff: 0, errors: 0, details: [] };
  const todo = (await store.listUserKeyQuestions(200)).filter(q => q.image && q.correct_answer !== "" && q.correct_answer != null && !(q.aiVerify && q.aiVerify.forKey === String(q.correct_answer) && q.aiVerify.forTime === q.idealTimeSec)).slice(0, max);
  log(`User-keyed image questions to verify: ${todo.length}`);
  for (const q of todo) {
    out.checked++;
    try {
      const tr = parseJsonReply(await llm.chat({ model: cfg.visionModel, messages: transcribePrompt(q), temperature: 0, maxTokens: 1200 }));
      tr.stem = String(tr.stem || "").trim();
      if (!tr.stem) throw new Error("could not read the image");
      const [a, b] = await Promise.all([
        solveWith(llm, cfg.verifyModel, q, tr).catch(e => ({ error: e.message })),
        solveWith(llm, cfg.genModel, q, tr).catch(e => ({ error: e.message }))
      ]);
      const mine = normAnswer(q.correct_answer, q.section);
      const votes = [a, b].filter(x => !x.error && x.answer != null);
      const agreeN = votes.filter(x => sameAnswer(x.answer, mine, q.section)).length;
      const verdict = votes.length === 0 ? "unsure" : agreeN === votes.length && votes.length >= 1 ? (votes.length === 2 ? "agrees" : "agrees-weak") : agreeN === 0 ? "disagrees" : "split";
      const secs = [a.idealSec, b.idealSec].filter(Boolean);
      const aiSec = secs.length ? Math.round(secs.reduce((x, y) => x + y, 0) / secs.length) : null;
      const my = Number(q.idealTimeSec) || null;
      const timeVerdict = !aiSec || !my ? "n/a" : (my / aiSec > 1.8 || aiSec / my > 1.8) ? "far-from-ai" : "ok";
      const rec = { verdict, timeVerdict, aiAnswers: { verifier: a.error ? null : a.answer, writer: b.error ? null : b.answer }, aiIdealSec: aiSec, stem: tr.stem.slice(0, 160), forKey: String(q.correct_answer), forTime: q.idealTimeSec ?? null, at: new Date().toISOString() };
      await store.patchQuestion(q.docId, () => ({ aiVerify: rec }));
      if (verdict.startsWith("agrees")) out.agree++; else if (verdict === "unsure") out.unsure++; else out.disagree++;
      if (timeVerdict === "far-from-ai") out.timeOff++;
      out.details.push({ id: q.docId, key: q.correct_answer, ai: rec.aiAnswers, verdict, mySec: my, aiSec, timeVerdict });
      log(`  ${q.docId}: your key ${q.correct_answer} vs AI ${rec.aiAnswers.verifier}/${rec.aiAnswers.writer} → ${verdict}; your time ${my}s vs AI ${aiSec}s → ${timeVerdict}`);
    } catch (e) { out.errors++; log(`  ${q.docId}: verify failed: ${e.message}`); }
  }
  return out;
}
