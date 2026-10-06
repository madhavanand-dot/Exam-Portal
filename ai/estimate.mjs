// Fills in answer keys and ideal times for image questions saved by the Diagnostic Builder.
// New image questions are stored with keySrc / idealTimeSrc = "pending-ai". For each one this job:
//   1. transcribes the image (vision model),
//   2. has TWO different text models solve it, blind to each other,
//   3. accepts the key only if both agree (keySrc "ai"); otherwise leaves it blank (keySrc "ai-unsure")
//      for the teacher to set by hand,
//   4. sets the ideal time from the solver's estimate (idealTimeSrc "ai"), clamped to a sane range.
// Anything the teacher set by hand is never touched (a pending flag is re-checked inside a transaction).
import { parseJsonReply, normKey } from "./pipeline.mjs";

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
  const multi = !numeric && normKey(q.correct_answer).length > 1 && /^[A-D]+$/.test(normKey(q.correct_answer));
  return [{ role: "user", content: `You are an expert ${q.subject || "Physics"} teacher for ${EXAM_NAME[q.examType] || "NEET-UG"}. Solve this question carefully.\n\n${tr.stem}\n${opts}\n\n` +
    (numeric ? "This is a numerical-answer question: give the final number only."
      : multi ? "ONE OR MORE options of this question are correct. Give every correct option letter together, e.g. \"AC\"."
      : "Usually exactly one option is correct: give that letter (A, B, C or D). Only if the question says more than one may be correct, or two or more options are genuinely correct, give all of them together, e.g. \"AC\".") +
    "\nAlso estimate how many seconds a well-prepared student needs to solve it in the exam (reading + working), between 20 and 240.\n" +
    "Reply with ONLY JSON: {\"answer\":\"" + (numeric ? "number" : "letter(s)") + "\",\"confidence\":0.0-1.0,\"idealSec\":number}" }];
}

function normAnswer(a, section){
  if (section === "B") { const n = parseFloat(String(a).replace(/[^0-9eE+\-.]/g, "")); return isFinite(n) ? n : null; }
  // a clean key ("C", "AC", "A, C", "1 3", "(A) and (C)") keeps every letter; anything wordier → its first option letter
  const clean = String(a ?? "").toUpperCase().replace(/\bAND\b|OPTIONS?/g, " ");
  if (/^[\s(]*[A-D1-4][\s).]*([,;/&+\s]*[\s(]*[A-D1-4][\s).]*){0,3}$/.test(clean)) { const k = normKey(clean.replace(/[().]/g, " ")); if (/^[A-D]{1,4}$/.test(k)) return k; }
  const up = String(a ?? "").toUpperCase();
  const m = up.match(/(?<![A-Z])[A-D](?![A-Z])/) || up.match(/[1-4]/);
  if (!m) return null;
  return "ABCD"["1234".indexOf(m[0])] || m[0];
}
function sameAnswer(x, y, section){
  if (x == null || y == null) return false;
  if (section === "B") return Math.abs(x - y) <= Math.max(0.01 * Math.abs(x), 1e-9);
  return x === y;
}
export const clampSec = v => { const n = Math.round(Number(v)); return isFinite(n) && n > 0 ? Math.max(MIN_SEC, Math.min(MAX_SEC, n)) : null; };

// One call that must return JSON. A reply that doesn't parse (unescaped quotes, cut-off thinking) is asked for again once.
export async function chatJson(llm, { model, messages, temperature = 0, maxTokens = 4000 }){
  const reply = await llm.chat({ model, messages, temperature, maxTokens });
  try { return parseJsonReply(reply); }
  catch (e) {
    const again = await llm.chat({ model, temperature, maxTokens, messages: [...messages,
      { role: "assistant", content: String(reply || "").slice(-3000) },
      { role: "user", content: "That reply was not valid JSON. Reply again with ONLY the JSON object — no explanation, no code fences; escape any double quotes inside strings." }] });
    return parseJsonReply(again);
  }
}
async function solveWith(llm, model, q, tr){
  // reasoning models think out loud first: leave room so the JSON at the end isn't cut off
  const r = await chatJson(llm, { model, messages: solvePrompt(q, tr), temperature: 0, maxTokens: 8000 });
  return { answer: normAnswer(r.answer, q.section), confidence: Number(r.confidence), idealSec: clampSec(r.idealSec) };
}

export async function estimateQuestions({ store, llm, cfg, log = console.log, max = 40, maxTries = 3, deadline = Infinity, now = Date.now }){
  const out = { checked: 0, keyed: 0, unsure: 0, timed: 0, errors: 0 };
  const pending = (await store.listPendingQuestions(max)).filter(q => q.image);
  log(`Pending image questions: ${pending.length}`);
  for (const q of pending) {
    if (now() > deadline) { log("Time budget reached — the remaining questions continue next run."); break; }
    out.checked++;
    const needKey = q.keySrc === "pending-ai", needTime = q.idealTimeSrc === "pending-ai";
    const tries = (q.aiEstTries || 0) + 1;
    try {
      const tr = await chatJson(llm, { model: cfg.visionModel, messages: transcribePrompt(q), temperature: 0, maxTokens: 1500 });
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

// The record verifyUserQuestions stores on a question (aiVerify), built from two solver results.
function verifyRecord(q, a, b, stem){
  const mine = normAnswer(q.correct_answer, q.section);
  const votes = [a, b].filter(x => !x.error && x.answer != null);
  const agreeN = votes.filter(x => sameAnswer(x.answer, mine, q.section)).length;
  const verdict = votes.length === 0 ? "unsure" : agreeN === votes.length ? (votes.length === 2 ? "agrees" : "agrees-weak") : agreeN === 0 ? "disagrees" : "split";
  const secs = [a.idealSec, b.idealSec].filter(Boolean);
  const aiSec = secs.length ? Math.round(secs.reduce((x, y) => x + y, 0) / secs.length) : null;
  const my = Number(q.idealTimeSec) || null;
  const timeVerdict = !aiSec || !my ? "n/a" : (my / aiSec > 1.8 || aiSec / my > 1.8) ? "far-from-ai" : "ok";
  return { verdict, timeVerdict, aiAnswers: { verifier: a.error ? null : a.answer, writer: b.error ? null : b.answer }, aiIdealSec: aiSec,
           stem: String(stem || "").slice(0, 160), forKey: String(q.correct_answer), forTime: q.idealTimeSec ?? null, at: new Date().toISOString() };
}

// Read-only second opinion on values the teacher typed by hand (keySrc/idealTimeSrc "user").
// Never changes correct_answer or idealTimeSec; only stores a verdict in `aiVerify` on the question.
export async function verifyUserQuestions({ store, llm, cfg, log = console.log, max = 40, deadline = Infinity, now = Date.now }){
  const out = { checked: 0, agree: 0, disagree: 0, unsure: 0, timeOff: 0, errors: 0, details: [] };
  const todo = (await store.listUserKeyQuestions(200)).filter(q => q.image && q.correct_answer !== "" && q.correct_answer != null && !(q.aiVerify && q.aiVerify.forKey === String(q.correct_answer) && (q.aiVerify.forTime ?? null) === (q.idealTimeSec ?? null))).slice(0, max);
  log(`User-keyed image questions to verify: ${todo.length}`);
  for (const q of todo) {
    if (now() > deadline) { log("Time budget reached — the remaining questions continue next run."); break; }
    out.checked++;
    try {
      const tr = await chatJson(llm, { model: cfg.visionModel, messages: transcribePrompt(q), temperature: 0, maxTokens: 1500 });
      tr.stem = String(tr.stem || "").trim();
      if (!tr.stem) throw new Error("could not read the image");
      const [a, b] = await Promise.all([
        solveWith(llm, cfg.verifyModel, q, tr).catch(e => ({ error: e.message })),
        solveWith(llm, cfg.genModel, q, tr).catch(e => ({ error: e.message }))
      ]);
      const rec = verifyRecord(q, a, b, tr.stem);
      const { verdict, timeVerdict, aiIdealSec: aiSec } = rec, my = Number(q.idealTimeSec) || null;
      await store.patchQuestion(q.docId, () => ({ aiVerify: rec }));
      if (verdict.startsWith("agrees")) out.agree++; else if (verdict === "unsure") out.unsure++; else out.disagree++;
      if (timeVerdict === "far-from-ai") out.timeOff++;
      out.details.push({ id: q.docId, key: q.correct_answer, ai: rec.aiAnswers, verdict, mySec: my, aiSec, timeVerdict });
      log(`  ${q.docId}: your key ${q.correct_answer} vs AI ${rec.aiAnswers.verifier}/${rec.aiAnswers.writer} → ${verdict}; your time ${my}s vs AI ${aiSec}s → ${timeVerdict}`);
    } catch (e) { out.errors++; log(`  ${q.docId}: verify failed: ${e.message}`); }
  }
  return out;
}

// "🤖 Ask AI to solve this test" (Diagnostic Builder): exams/{id}.aiSolve.status == "queued".
// Every question of the test (text or image) is solved by TWO models blind to each other; the result per question
// ({ answer, idealSec, agree, note }) is written to exams/{id}.aiSolve.results for the teacher to review and use.
// The teacher's keys and times are never changed — except a BLANK key, which is filled when both models agree.
export async function solveRequestedExams({ store, llm, cfg, log = console.log, maxExams = 3, budgetMs = 30 * 60000, now = Date.now }){
  const out = { exams: 0, questions: 0, agree: 0, unsure: 0, keysFilled: 0, errors: 0, unfinished: 0 };
  const t0 = now();
  const reqs = (await store.listSolveRequests(180)).slice(0, maxExams);
  log(`Tests the AI was asked to solve: ${reqs.length}`);
  for (const ex of reqs) {
    if (now() - t0 > budgetMs) { log("Solve time budget reached — the rest continue next run."); break; }
    const token = ex.aiSolve?.token || String(now());
    // resume: answers already saved for this same request are kept, so a long test is finished over several runs
    const results = ex.aiSolve?.token === token ? { ...(ex.aiSolve.results || {}) } : {};
    const ids = (ex.questionIds || []).slice();
    out.exams++;
    try {
      await store.patchExamSolve(ex.docId, null, { status: "processing", startedAt: now(), token, total: ids.length, done: Object.keys(results).length });
      const qById = await store.getQuestions(ids.filter(id => !results[id]));
      let stopped = false;
      for (const [i, id] of ids.entries()) {
        const q = qById[id]; if (!q || results[id]) continue;
        if (now() - t0 > budgetMs) { stopped = true; break; }
        out.questions++;
        try {
          let stem = String(q.text || "").replace(/<br\s*\/?>/gi, "\n").trim();
          let options = (q.options || []).map(o => String(o || ""));
          if (q.image) {
            const tr = await chatJson(llm, { model: cfg.visionModel, messages: transcribePrompt(q), temperature: 0, maxTokens: 1500 });
            stem = [stem, String(tr.stem || "").trim()].filter(Boolean).join("\n");
            if (!options.some(o => o.trim()) && Array.isArray(tr.options)) options = tr.options.map(o => String(o || ""));
          }
          if (!stem) throw new Error("could not read the question");
          const tr = { stem, options: (q.section || "A") === "A" ? options : [] };
          const [a, b] = await Promise.all([
            solveWith(llm, cfg.verifyModel, q, tr).catch(e => ({ error: e.message })),
            solveWith(llm, cfg.genModel, q, tr).catch(e => ({ error: e.message }))
          ]);
          const agree = !a.error && !b.error && a.answer != null && sameAnswer(a.answer, b.answer, q.section);
          const conf = Math.min(isFinite(a.confidence) ? a.confidence : 0.5, isFinite(b.confidence) ? b.confidence : 0.5);
          const pick = agree ? a.answer : (!a.error && a.answer != null ? a.answer : !b.error && b.answer != null ? b.answer : null);
          const secs = [a.idealSec, b.idealSec].filter(Boolean);
          const idealSec = secs.length ? Math.round(secs.reduce((s, v) => s + v, 0) / secs.length) : null;
          const note = `checker ${a.error ? "failed: " + String(a.error).slice(0, 80) : a.answer ?? "?"} / writer ${b.error ? "failed: " + String(b.error).slice(0, 80) : b.answer ?? "?"}`;
          results[id] = { answer: pick == null ? null : String(pick), agree, confidence: Math.round(conf * 100) / 100, idealSec, note,
                          yourKey: String(q.correct_answer ?? "") };
          if (agree) out.agree++; else out.unsure++;
          // record on the question what the other two steps would otherwise solve again (they skip these)
          let filled = false;
          await store.patchQuestion(id, cur => {
            const p = {};
            const blank = String(cur.correct_answer ?? "").trim() === "";
            if (blank && agree && conf >= 0.5) { p.correct_answer = String(a.answer); p.keySrc = "ai"; p.aiKeyNote = `Both AI models agreed (${note}) — asked to solve "${ex.title || ""}"`; filled = true; }
            else if (blank && cur.keySrc === "pending-ai") { p.keySrc = "ai-unsure"; p.aiKeyNote = `AI models disagreed or were unsure — set the answer yourself (${note})`; }
            if (cur.idealTimeSrc === "pending-ai" && idealSec) { p.idealTimeSec = idealSec; p.idealTimeSrc = "ai"; }
            if (!blank && cur.image) p.aiVerify = verifyRecord({ ...cur, idealTimeSec: p.idealTimeSec ?? cur.idealTimeSec }, a, b, stem);
            return p;
          });
          if (filled) out.keysFilled++;
          log(`  [${i + 1}/${ids.length}] ${q.id || id}: AI ${results[id].answer ?? "?"}${agree ? "" : " (models split)"} vs your key ${q.correct_answer || "—"}; ideal ${idealSec ?? "—"}s${a.error || b.error ? ` (${note})` : ""}`);
        } catch (e) {
          out.errors++;
          results[id] = { answer: null, agree: false, idealSec: null, note: "AI failed: " + String(e.message).slice(0, 200) };
          log(`  [${i + 1}/${ids.length}] ${q.id || id}: failed — ${e.message}`);
        }
        // saved after every question, so a cancelled run loses nothing
        await store.patchExamSolve(ex.docId, token, { results, done: Object.keys(results).length });
      }
      const vals = Object.values(results);
      if (stopped) {
        out.unfinished++;
        await store.patchExamSolve(ex.docId, token, { status: "queued", partial: true });
        log(`${ex.title || ex.docId}: ${vals.length} of ${ids.length} solved so far — the rest continue next run`);
        break;
      }
      await store.patchExamSolve(ex.docId, token, { status: "done", partial: false, doneAt: now(), results,
        counts: { solved: vals.filter(r => r.answer).length, split: vals.filter(r => r.answer && !r.agree).length, failed: vals.filter(r => !r.answer).length },
        models: { checker: cfg.verifyModel, writer: cfg.genModel, vision: cfg.visionModel } });
      log(`${ex.title || ex.docId}: solved ${vals.length} question(s)`);
    } catch (e) {
      out.errors++;
      log(`${ex.title || ex.docId}: solve FAILED — ${e.message}`);
      await store.patchExamSolve(ex.docId, token, { status: "error", error: String(e.message).slice(0, 300), doneAt: now() }).catch(() => {});
    }
  }
  return out;
}
