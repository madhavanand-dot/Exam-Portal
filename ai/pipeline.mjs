// AI follow-up pipeline: for every submitted diagnostic attempt queued by the portal
// (attempts/{id}.aiStatus == "queued"), one model WRITES new practice questions aimed at the
// student's mistakes and a different model SOLVES each one blind to check the key. Results land in
// aiDrafts/{attemptId} for a teacher to review in the portal; nothing reaches a student until the
// teacher saves and activates it.
//
// Runs from .github/workflows/ai-followup.yml (hourly). Everything provider-specific is config:
// any OpenAI-compatible endpoint works (NVIDIA build.nvidia.com by default).

export const CONFIG_DEFAULTS = {
  baseUrl: "https://integrate.api.nvidia.com/v1",
  genModel: "openai/gpt-oss-120b",
  verifyModel: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
  visionModel: "meta/llama-3.2-90b-vision-instruct",
  rpm: 30,                  // stay under the free tier's ~40 requests/minute
  perNeed: 2,               // new questions per wrong/skipped question
  maxPerGroup: 5,           // cap per (topic, level, reason-group) generation call
  maxPerStudent: 20,        // cap per student
  reasonWaitMin: 120,       // wait this long after submit for the student's "why" reasons
  runMinutes: 50,           // stop claiming new attempts after this long (hourly schedule)
  maxTries: 3,              // attempts before an attempt is marked aiStatus "error"
  staleMin: 180             // a "processing" claim older than this is retried
};

// Settings precedence: built-in defaults < GitHub variables/secrets (env) < admin's AI Settings tab (Firestore).
export function resolveConfig(env = {}, ai = {}, secret = {}){
  const pick = (fsVal, envVal, def) => (fsVal !== undefined && fsVal !== null && fsVal !== "") ? fsVal : (envVal ? envVal : def);
  const num = (fsVal, envVal, def, lo, hi) => { const v = Number(pick(fsVal, envVal, def)); return Number.isFinite(v) && v >= lo ? Math.min(v, hi) : def; };
  const D = CONFIG_DEFAULTS;
  const cfg = {
    enabled: ai.enabled !== false,
    baseUrl: String(pick(ai.baseUrl, env.AI_BASE_URL, D.baseUrl)).replace(/\/+$/, ""),
    genModel: pick(ai.genModel, env.AI_GEN_MODEL, D.genModel),
    verifyModel: pick(ai.verifyModel, env.AI_VERIFY_MODEL, D.verifyModel),
    visionModel: pick(ai.visionModel, env.AI_VISION_MODEL, D.visionModel),
    rpm: num(ai.rpm, env.AI_RPM, D.rpm, 1, 600),
    perNeed: num(ai.perNeed, env.AI_PER_NEED, D.perNeed, 1, 5),
    maxPerStudent: num(ai.maxPerStudent, env.AI_MAX_PER_STUDENT, D.maxPerStudent, 3, 60),
    reasonWaitMin: num(ai.reasonWaitMin, env.AI_REASON_WAIT_MIN, D.reasonWaitMin, 0, 1440),
    runMinutes: num(undefined, env.AI_RUN_MINUTES, D.runMinutes, 5, 350)
  };
  const apiKey = secret?.apiKey || env.AI_API_KEY || "";
  return { cfg, apiKey, keySource: secret?.apiKey ? "AI Settings tab" : env.AI_API_KEY ? "GitHub secret" : "none" };
}

const LEVELS = [
  { key: "Easy",   name: "Bloom",        desc: "direct recall or a single-step application of one NCERT idea" },
  { key: "Medium", name: "Intermediate", desc: "two to three steps, applying the concept in a slightly new situation" },
  { key: "Hard",   name: "Advanced",     desc: "multi-step or multi-concept analysis, NEET/JEE top-end difficulty" }
];
const normLevel = v => {
  const t = String(v || "").trim().toLowerCase();
  if (/^(easy|bloom|basic)/.test(t)) return "Easy";
  if (/^(hard|adv|difficult)/.test(t)) return "Hard";
  return "Medium";
};
const lvl = k => LEVELS.find(l => l.key === normLevel(k));
const lvlIdx = k => LEVELS.findIndex(l => l.key === normLevel(k));
const IDEAL_DEFAULTS = { medical: { Easy: 45, Medium: 60, Hard: 90 }, engineering: { Easy: 90, Medium: 120, Hard: 180 } };
const defaultIdeal = (q, examType) => {
  const d = IDEAL_DEFAULTS[examType] || IDEAL_DEFAULTS.medical;
  const s = d[normLevel(q.difficulty)];
  return q.section === "B" ? Math.round(s * 1.5) : s;
};
export const REASON_GROUP = { concept:"concept", formula:"concept", unknown:"concept", guess:"concept", unsure:"concept",
  misread:"accuracy", calc:"accuracy", careless:"accuracy", rushed:"speed", lengthy:"speed", time:"speed" };
const REASON_TEXT = { concept:"didn't understand the concept", formula:"forgot the formula / fact", misread:"misread the question",
  calc:"made a calculation mistake", careless:"made a silly mistake (knew it, marked the wrong option)", guess:"guessed",
  rushed:"rushed because of time pressure", unknown:"didn't know how to solve it", unsure:"was unsure and avoided negative marking",
  lengthy:"found it too lengthy and left it", time:"ran out of time / didn't reach it" };
const ms = t => t == null ? 0 : typeof t === "number" ? t : t.toMillis ? t.toMillis() : t._seconds ? t._seconds * 1000 : new Date(t).getTime();

// ---------- what does this student need? (mirrors the portal's Custom Practice logic) ----------
export function studentNeeds(att, exam, qById){
  const ideal = att.idealTimes || exam.idealTimes || {};
  const needs = [];
  for (const id of Object.keys(att.questionTimeSec || att.responses || {})) {
    const q = qById[id]; if (!q) continue;
    const r = (att.responses || {})[id] || {};
    const ans = r.answer ?? null;
    const verdict = ans == null ? "unanswered" : ((q.section || "A") === "A" ? ans === q.correct_answer
      : Math.abs(parseFloat(ans) - parseFloat(q.correct_answer)) < 1e-6) ? "correct" : "wrong";
    const tm = (att.questionTimeSec || {})[id] ?? r.timeSec ?? 0;
    const idealSec = ideal[id] > 0 ? ideal[id] : (q.idealTimeSec > 0 ? q.idealTimeSec : defaultIdeal(q, exam.examType));
    const slow = tm > idealSec;
    const reason = (att.reasons || {})[id]?.r || null, note = (att.reasons || {})[id]?.note || "";
    let group;
    if (verdict === "correct") { if (!slow) continue; group = "speed"; }
    else group = reason ? REASON_GROUP[reason] || "concept" : (verdict === "wrong" && !slow ? "accuracy" : "concept");
    needs.push({ q, verdict, group, reason, note, timeSec: tm, idealSec, studentAnswer: ans });
  }
  return needs;
}
// one generation call per (subject, topic, level, group)
export function groupNeeds(needs, cfg){
  const m = new Map();
  for (const n of needs) {
    const k = [n.q.subject, (n.q.topic || "").trim().toLowerCase(), normLevel(n.q.difficulty), n.group].join("|");
    if (!m.has(k)) m.set(k, { subject: n.q.subject, topic: n.q.topic || "General", level: normLevel(n.q.difficulty), group: n.group, needs: [] });
    m.get(k).needs.push(n);
  }
  const order = { concept: 0, accuracy: 1, speed: 2 };
  return [...m.values()]
    .map(g => ({ ...g, count: Math.min(cfg.maxPerGroup, cfg.perNeed * g.needs.length) }))
    .sort((a, b) => order[a.group] - order[b.group] || lvlIdx(a.level) - lvlIdx(b.level));
}

// ---------- robust JSON out of an LLM reply ----------
export function parseJsonReply(text){
  let t = String(text || "").replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("no JSON object in reply");
  t = t.slice(a, b + 1);
  // models often write LaTeX with single backslashes (\frac, \theta) — invalid or silently wrong JSON escapes
  t = t.replace(/(?<!\\)\\([a-zA-Z]{2,})/g, "\\\\$1");
  // …and LaTeX spacing/symbols (\, \; \% \{ \_ …) — any backslash that doesn't start a valid JSON escape
  t = t.replace(/(?<!\\)((?:\\\\)*)\\(?!["\\/bfnrtu])/g, "$1\\\\");
  t = t.replace(/,\s*([}\]])/g, "$1");          // trailing commas
  return JSON.parse(t);
}

// ---------- prompts ----------
const EXAM_NAME = { medical: "NEET-UG", engineering: "JEE Main" };
function qText(q){
  const opts = (q.options || []).map((o, k) => `(${"ABCD"[k]}) ${String(o).replace(/^\s*[A-D][).]\s*/, "")}`).join("  ");
  return `${q._text || q.text || "(image question)"}${opts.trim() ? "\nOptions: " + opts : ""}\nCorrect answer: ${q.correct_answer}`;
}
export function genPrompt(g, exam, examples){
  const L = lvl(g.level);
  const purpose = {
    concept: `The student has NOT understood this concept. Write questions that rebuild it step by step: start at the Bloom level and climb to the ${L.name} level. Each question must target the specific idea the student missed.`,
    accuracy: `The student understands the concept but made an accuracy error. Write questions at the ${L.name} level that contain the same kind of trap (careful reading, multi-step arithmetic, sign/unit handling, close distractors) so they practise precision.`,
    speed: `The student is too slow on this topic. Write questions at the ${L.name} level or easier that a well-prepared student solves within the ideal time using a direct method or shortcut.`
  }[g.group];
  const src = g.needs.map((n, i) => `Source question ${i + 1}:\n${qText(n.q)}\nStudent's answer: ${n.studentAnswer ?? "left blank"} | time ${n.timeSec}s (ideal ${n.idealSec}s)` +
    `\nStudent's own reason: ${n.reason ? REASON_TEXT[n.reason] : "not given"}${n.note ? ` — "${n.note}"` : ""}`).join("\n\n");
  const ex = examples.length ? "\n\nStyle examples from our question bank (do NOT copy):\n" + examples.map(q => qText(q)).join("\n\n") : "";
  return [
    { role: "system", content: `You are an expert ${EXAM_NAME[exam.examType] || "NEET"} ${g.subject} question setter for an Indian coaching institute. You write original, syllabus-accurate (NCERT) single-correct MCQs. You reply with JSON only.` },
    { role: "user", content:
`Topic: ${g.topic} (${g.subject})
Target level: ${L.name} — ${L.desc}
Purpose: ${purpose}

${src}${ex}

Write exactly ${g.count} NEW questions.
Rules:
- Exactly 4 options, exactly ONE correct. Distractors must be plausible (common student errors).
- Different numbers/context from the source questions — never copy them.
- Self-contained text; no figure or diagram needed. Use $...$ for math and write every LaTeX backslash doubled for JSON (e.g. "$\\\\frac{1}{2}mv^2$"). No line breaks inside strings; use <br> if needed.
- "level" is one of "Bloom", "Intermediate", "Advanced". "idealSec" = seconds a well-prepared student needs.
- "solution" = a short worked solution ending with the answer letter.

Reply with ONLY this JSON:
{"questions":[{"stem":"...","options":["...","...","...","..."],"answer":"A","solution":"...","level":"Intermediate","idealSec":60}]}` }
  ];
}
export function verifyPrompt(item, exam){
  return [
    { role: "system", content: `You are a meticulous ${EXAM_NAME[exam.examType] || "NEET"} ${item.subject} examiner. Solve the question yourself, carefully and independently. You reply with JSON only.` },
    { role: "user", content:
`Solve this MCQ step by step, then check its quality.

${item.stem}
(A) ${item.options[0]}
(B) ${item.options[1]}
(C) ${item.options[2]}
(D) ${item.options[3]}

Reply with ONLY this JSON:
{"working":"short step-by-step solution","answer":"A|B|C|D|NONE","exactlyOneCorrect":true,"problem":"empty string, or what is wrong (ambiguous, missing data, two correct options, out of syllabus, factual error)"}` }
  ];
}
function visionPrompt(q){
  return [
    { role: "user", content: [
      { type: "text", text: "Transcribe this exam question exactly. Use $...$ for math with doubled backslashes for JSON. If a diagram is essential, describe it in one sentence in square brackets. Reply with ONLY JSON: {\"stem\":\"...\",\"options\":[\"...\",\"...\",\"...\",\"...\"]} (options empty strings if none are printed)." },
      { type: "image_url", image_url: { url: q.image } }
    ] }
  ];
}

// ---------- validation / comparison ----------
function cleanItem(raw, g){
  const opts = Array.isArray(raw?.options) ? raw.options.map(o => String(o ?? "").replace(/^\s*\(?[A-D][).]\s*/, "").trim()) : [];
  const ans = String(raw?.answer || "").trim().toUpperCase().replace(/[^A-D]/g, "").slice(0, 1);
  const stem = String(raw?.stem || "").trim();
  if (!stem || opts.length !== 4 || opts.some(o => !o) || new Set(opts.map(o => o.toLowerCase())).size !== 4 || !ans) return null;
  const level = normLevel(raw.level || g.level);
  return { subject: g.subject, topic: g.topic, level, group: g.group, stem, options: opts, key: ans,
           solution: String(raw.solution || "").trim(),
           idealSec: Math.max(20, Math.min(600, parseInt(raw.idealSec) || 0)) || null };
}

// ---------- the run ----------
export async function run({ store, llm, cfg: cfgIn = {}, log = console.log, now = Date.now }){
  const cfg = { ...CONFIG_DEFAULTS, ...cfgIn };
  const t0 = now();
  const summary = { claimed: 0, drafted: 0, nothingToDo: 0, waiting: 0, errors: 0 };
  const queue = await store.listQueuedAttempts(cfg.staleMin);
  log(`Queue: ${queue.length} attempt(s)`);
  for (const { id, data: att } of queue) {
    if (now() - t0 > cfg.runMinutes * 60000) { log("Run time budget reached — the rest continue next run."); break; }
    const hasReasons = !!att.reasonsAt;
    if (!hasReasons && now() - ms(att.submitTime) < cfg.reasonWaitMin * 60000) { summary.waiting++; continue; }
    summary.claimed++;
    const tries = (att.aiTries || 0) + 1;
    await store.updateAttempt(id, { aiStatus: "processing", aiClaimedAt: now(), aiTries: tries });
    try {
      const exam = await store.getExam(att.examId);
      if (!exam) throw new Error("exam not found: " + att.examId);
      const qById = await store.getQuestions(exam.questionIds || []);
      const needs = studentNeeds(att, exam, qById);
      if (!needs.length) { await store.updateAttempt(id, { aiStatus: "none", aiDoneAt: now() }); summary.nothingToDo++; log(`${att.studentName}: nothing to practise`); continue; }
      // image-only questions: transcribe once so the text models can read them
      for (const n of needs) {
        if (!n.q.text && n.q.image && !n.q._text) {
          try {
            const tr = parseJsonReply(await llm.chat({ model: cfg.visionModel, messages: visionPrompt(n.q), temperature: 0, maxTokens: 1200 }));
            n.q._text = String(tr.stem || "").trim();
            if (Array.isArray(tr.options) && tr.options.some(o => String(o).trim())) n.q.options = tr.options;
          } catch (e) { log(`  vision transcription failed for ${n.q.id || n.q.docId}: ${e.message}`); }
        }
      }
      const groups = groupNeeds(needs, cfg);
      const items = [];
      for (const g of groups) {
        if (items.length >= cfg.maxPerStudent) break;
        g.count = Math.min(g.count, cfg.maxPerStudent - items.length);
        const examples = await store.findExamples(exam.examType, g.subject, g.topic, g.level, 2, new Set(exam.questionIds || []));
        let made = [];
        for (let tryN = 0; tryN < 2 && !made.length; tryN++) {
          try {
            const out = parseJsonReply(await llm.chat({ model: cfg.genModel, messages: genPrompt(g, exam, examples), temperature: 0.7, maxTokens: 6000 }));
            made = (out.questions || []).map(r => cleanItem(r, g)).filter(Boolean).slice(0, g.count);
          } catch (e) { log(`  generation retry (${g.topic}/${g.group}): ${e.message}`); }
        }
        for (const it of made) {
          it.forQuestionIds = g.needs.map(n => n.q.docId);
          it.reasons = [...new Set(g.needs.map(n => n.reason).filter(Boolean))];
          try {
            const v = parseJsonReply(await llm.chat({ model: cfg.verifyModel, messages: verifyPrompt(it, exam), temperature: 0, maxTokens: 4000 }));
            const vAns = String(v.answer || "").toUpperCase().replace(/[^A-DNOE]/g, "");
            it.verifierAnswer = /^[A-D]$/.test(vAns) ? vAns : "NONE";
            it.verifierWorking = String(v.working || "").slice(0, 2000);
            it.problem = String(v.problem || "").trim().slice(0, 500);
            const flawed = v.exactlyOneCorrect === false || it.verifierAnswer === "NONE" || (it.problem && !/^(none|no|n\/a|-)\.?$/i.test(it.problem));
            it.verdict = flawed ? "rejected" : it.verifierAnswer === it.key ? "verified" : "disputed";
          } catch (e) {
            it.verdict = "disputed"; it.verifierAnswer = "?"; it.verifierWorking = ""; it.problem = "verifier failed: " + e.message;
          }
          items.push(it);
        }
      }
      if (!items.length) throw new Error("the generator produced no usable questions");
      const counts = { verified: 0, disputed: 0, rejected: 0 };
      items.forEach(i => counts[i.verdict]++);
      await store.writeDraft(id, {
        attemptId: id, examId: att.examId, examTitle: exam.title || "", examType: exam.examType,
        studentUid: att.studentUid, studentName: att.studentName || "",
        status: "ready", createdAt: now(), counts, items,
        needs: needs.map(n => ({ questionId: n.q.docId, topic: n.q.topic || "", level: normLevel(n.q.difficulty), group: n.group, reason: n.reason, verdict: n.verdict })),
        models: { gen: cfg.genModel, verify: cfg.verifyModel, vision: cfg.visionModel }
      });
      await store.updateAttempt(id, { aiStatus: "ready", aiDoneAt: now(), aiError: null });
      summary.drafted++;
      log(`${att.studentName}: ${items.length} draft question(s) — ${counts.verified} verified, ${counts.disputed} disputed, ${counts.rejected} rejected`);
    } catch (e) {
      summary.errors++;
      log(`${att.studentName || id}: FAILED (try ${tries}/${cfg.maxTries}) — ${e.message}`);
      await store.updateAttempt(id, { aiStatus: tries >= cfg.maxTries ? "error" : "queued", aiError: String(e.message).slice(0, 500) });
    }
  }
  log(`Done: ${JSON.stringify(summary)}`);
  return summary;
}

// ---------- OpenAI-compatible client with pacing + retries ----------
export function makeLlm({ baseUrl, apiKey, rpm, fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)) }){
  let last = -Infinity;
  const gap = Math.ceil(60000 / Math.max(1, rpm));
  async function post(body){
    for (let attempt = 0; attempt < 5; attempt++) {
      const wait = last + gap - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      const res = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) return res.json();
      const txt = await res.text().catch(() => "");
      if (res.status === 429 || res.status >= 500) { await sleep(Math.min(60000, 5000 * 2 ** attempt)); continue; }
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
    }
    throw new Error("API kept failing (rate limit / server errors)");
  }
  return {
    async chat({ model, messages, temperature = 0.3, maxTokens = 4000 }){
      const j = await post({ model, messages, temperature, max_tokens: maxTokens, stream: false });
      const m = j.choices?.[0]?.message || {};
      return m.content || m.reasoning_content || "";
    },
    async listModels(){
      const res = await fetchImpl(`${baseUrl}/models`, { headers: { "Authorization": `Bearer ${apiKey}` } });
      if (!res.ok) { const e = new Error(`HTTP ${res.status} listing models`); e.status = res.status; throw e; }
      return ((await res.json()).data || []).map(m => m.id);
    }
  };
}
