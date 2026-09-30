// Offline test of the pipeline logic with a fake store and a fake model (no network, no Firebase).
// Runs in CI before the real job: node test.mjs
import assert from "node:assert/strict";
import { run, parseJsonReply, studentNeeds, groupNeeds, makeLlm, CONFIG_DEFAULTS } from "./pipeline.mjs";

let passed = 0;
const ok = (c, m) => { assert.ok(c, m); passed++; console.log("PASS " + m); };

// --- JSON repair
const j = parseJsonReply('<think>hmm {not json}</think>```json\n{"questions":[{"stem":"KE is $\\frac{1}{2}mv^2$ and $\\alpha\\beta$, \\theta","options":["a","b","c","d",],"answer":"B"}]}\n```');
ok(j.questions[0].stem === "KE is $\\frac{1}{2}mv^2$ and $\\alpha\\beta$, \\theta", "LaTeX single backslashes, think-tags, fences, trailing comma repaired");
ok(parseJsonReply('{"a":"x\\\\frac y"}').a === "x\\frac y", "correctly escaped LaTeX left alone");
ok(parseJsonReply('{"a":"$2\\,\\text{kg}$, 50\\% \\{x\\} a\\_b \\\\ \\"q\\""}').a === '$2\\,\\text{kg}$, 50\\% \\{x\\} a\\_b \\ "q"', "LaTeX spacing/symbol escapes (\\, \\% \\{ \\_) repaired; valid escapes kept");

// --- fixtures
const NOW = Date.UTC(2026, 9, 1, 10, 0, 0);
const min = m => NOW - m * 60000;
const exam = { docId: "EX1", title: "Diag LoM", examType: "medical", questionIds: ["Q1","Q2","Q3","Q4","IMG"],
  idealTimes: { Q1: 60, Q2: 60, Q3: 90, Q4: 45, IMG: 60 } };
const Q = (id, topic, diff, ans, extra={}) => ({ docId: id, id, subject: "Physics", section: "A", topic, difficulty: diff,
  text: `${id} text`, options: ["1 N","2 N","3 N","4 N"], correct_answer: ans, examType: "medical", ...extra });
const questions = {
  Q1: Q("Q1","Laws of Motion","Easy","A"), Q2: Q("Q2","Laws of Motion","Medium","B"),
  Q3: Q("Q3","Friction","Hard","C"), Q4: Q("Q4","Friction","Medium","D"),
  IMG: Q("IMG","Circular Motion","Medium","A", { text: "", options: ["","","",""], image: "data:image/png;base64,AAAA" }),
  EX1: Q("EX1","Laws of Motion","Easy","A"), EX2: Q("EX2","Friction","Hard","B")
};
const att = (uid, extra) => ({ studentUid: uid, studentName: uid.toUpperCase(), examId: "EX1", submitTime: min(300), ...extra });
const attempts = {
  // Q1 wrong fast (no reason → accuracy), Q2 wrong + reason "concept", Q3 correct but slow (speed), Q4 skipped + "time", IMG wrong + "calc"
  EX1_s1: att("s1", { reasonsAt: min(200),
    responses: { Q1:{answer:"B"}, Q2:{answer:"A"}, Q3:{answer:"C"}, Q4:{answer:null}, IMG:{answer:"C"} },
    questionTimeSec: { Q1: 20, Q2: 80, Q3: 200, Q4: 5, IMG: 30 },
    reasons: { Q2: { r: "concept", note: "never got Newton's 3rd law" }, Q4: { r: "time" }, IMG: { r: "calc" } } }),
  EX1_s2: att("s2", { submitTime: min(10), responses: { Q1:{answer:"B"} }, questionTimeSec: { Q1: 20, Q2: 1, Q3: 1, Q4: 1, IMG: 1 } }),   // too recent, no reasons → wait
  EX1_s3: att("s3", { responses: { Q1:{answer:"A"},Q2:{answer:"B"},Q3:{answer:"C"},Q4:{answer:"D"},IMG:{answer:"A"} },
    questionTimeSec: { Q1: 10, Q2: 10, Q3: 10, Q4: 10, IMG: 10 } }),                                                            // all correct & fast
  EX1_s4: att("s4", { examId: "GONE", aiTries: 2, responses: {}, questionTimeSec: { Q1: 1 } })                                  // broken → error after 3 tries
};
Object.values(attempts).forEach(a => a.aiStatus = "queued");
const drafts = {};
const store = {
  async listQueuedAttempts(){ return Object.entries(attempts).filter(([,a]) => a.aiStatus === "queued").map(([id, data]) => ({ id, data })); },
  async getExam(id){ return id === "EX1" ? exam : null; },
  async getQuestions(ids){ return Object.fromEntries(ids.filter(i => questions[i]).map(i => [i, structuredClone(questions[i])])); },
  async findExamples(t, s, topic, level, n, excl){ return Object.values(questions).filter(q => q.topic === topic && !excl.has(q.docId)).slice(0, n); },
  async updateAttempt(id, p){ Object.assign(attempts[id], p); },
  async writeDraft(id, d){ drafts[id] = d; }
};

// --- needs logic
const needs = studentNeeds(attempts.EX1_s1, exam, questions);
const g = Object.fromEntries(needs.map(n => [n.q.docId, n.group]));
ok(JSON.stringify(g) === JSON.stringify({ Q1:"accuracy", Q2:"concept", Q3:"speed", Q4:"speed", IMG:"accuracy" }), "reason → group mapping, timing fallback, correct-but-slow → speed");
const groups = groupNeeds(needs, CONFIG_DEFAULTS);
ok(groups[0].group === "concept" && groups.length === 5, "grouped per topic/level/group, concept first");

// --- fake models
const calls = { gen: 0, verify: 0, vision: 0, prompts: [] };
let genCounter = 0;
const llm = { async chat({ model, messages }){
  if (model === CONFIG_DEFAULTS.visionModel) { calls.vision++; return '{"stem":"A car takes a turn of radius $r$ at speed $v$; find \\mu_{min}","options":["v^2/rg","rg/v^2","v/rg","rg"]}'; }
  if (model === CONFIG_DEFAULTS.genModel) {
    calls.gen++; calls.prompts.push(messages[1].content);
    const n = +messages[1].content.match(/Write exactly (\d+) NEW/)[1];
    const qs = Array.from({ length: n }, () => { const k = ++genCounter;
      return `{"stem":"Gen Q${k}: force $\\vec F = m\\vec a$ case ${k}","options":["${k}1 N","${k}2 N","${k}3 N","${k}4 N"],"answer":"${"ABCD"[k % 4]}","solution":"so ${"ABCD"[k % 4]}","level":"Bloom","idealSec":50}`; });
    if (calls.gen === 1) qs.push('{"stem":"bad","options":["x","x","y","z"],"answer":"A"}');      // duplicate options → dropped
    return `<think>planning…</think>{"questions":[${qs.join(",")}]}`;
  }
  if (model === CONFIG_DEFAULTS.verifyModel) {
    calls.verify++; calls.vprompts = (calls.vprompts || []).concat(messages.map(m => m.content).join("\n"));
    const k = +messages[1].content.match(/Gen Q(\d+)/)[1];
    if (k % 5 === 0) return `{"working":"two options work","answer":"A","exactlyOneCorrect":false,"problem":"B and C both correct"}`;
    const right = "ABCD"[k % 4];
    return `{"working":"F=ma so ${right}","answer":"${k % 3 === 0 ? (right === "A" ? "B" : "A") : right}","exactlyOneCorrect":true,"problem":""}`;
  }
  throw new Error("unknown model " + model);
} };

const logs = [];
const s = await run({ store, llm, cfg: { rpm: 1000 }, log: m => logs.push(m), now: () => NOW });
console.log(logs.map(l => "   | " + l).join("\n"));
const d = drafts.EX1_s1;
ok(s.drafted === 1 && s.waiting === 1 && s.nothingToDo === 1 && s.errors === 1, "summary: 1 drafted, 1 waiting for reasons, 1 nothing to do, 1 error");
ok(attempts.EX1_s1.aiStatus === "ready" && attempts.EX1_s2.aiStatus === "queued" && attempts.EX1_s3.aiStatus === "none" && attempts.EX1_s4.aiStatus === "error", "attempt statuses updated");
ok(calls.vision === 1 && calls.prompts.some(p => p.includes("\\mu_{min}")), "image question transcribed and passed to the writer");
ok(calls.prompts.some(p => p.includes("never got Newton's 3rd law") && p.includes("didn't understand the concept")), "student's reason + note reach the writer");
ok(d.items.every(i => i.options.length === 4 && /^[A-D]$/.test(i.key)) && !d.items.some(i => i.stem === "bad"), "malformed generated question dropped");
ok(d.items.length === d.counts.verified + d.counts.disputed + d.counts.rejected && d.counts.verified > 0 && d.counts.disputed > 0 && d.counts.rejected > 0, `verdicts: ${JSON.stringify(d.counts)}`);
ok(d.items.every(i => i.verdict !== "verified" || i.verifierAnswer === i.key), "verified = checker's blind answer equals the key");
ok(d.items.some(i => i.verdict === "rejected" && /both correct/.test(i.problem)), "flawed question rejected with reason");
ok(d.items.length <= CONFIG_DEFAULTS.maxPerStudent && d.items[0].group === "concept", "capped and concept-gap questions first");
ok(d.items[0].stem.includes("\\vec F"), "LaTeX survives the round trip");
ok(calls.vprompts.length === d.items.length && calls.vprompts.every(p => !/Correct answer|"answer":"[A-D]"|solution":"so/.test(p) && !/\bso [A-D]\b/.test(p)), "checker is shown only stem + options (no key, no solution)");

// --- rate pacing
let slept = 0, t = 0;
const fakeFetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "{}" } }] }) });
const realNow = Date.now; Date.now = () => t;
const paced = makeLlm({ baseUrl: "x", apiKey: "k", rpm: 30, fetchImpl: fakeFetch, sleep: async ms => { slept += ms; t += ms; } });
for (let i = 0; i < 4; i++) await paced.chat({ model: "m", messages: [] });
Date.now = realNow;
ok(slept === 3 * 2000, "30 requests/minute pacing (2 s apart)");

// --- settings precedence: defaults < env (GitHub) < Firestore (AI Settings tab)
import { resolveConfig } from "./pipeline.mjs";
{
  const r0 = resolveConfig({}, {}, {});
  ok(r0.cfg.genModel === CONFIG_DEFAULTS.genModel && r0.apiKey === "" && r0.keySource === "none" && r0.cfg.enabled, "defaults with nothing set");
  const r1 = resolveConfig({ AI_API_KEY: "envkey", AI_GEN_MODEL: "env/model", AI_RPM: "20", AI_BASE_URL: "" }, {}, {});
  ok(r1.apiKey === "envkey" && r1.keySource === "GitHub secret" && r1.cfg.genModel === "env/model" && r1.cfg.rpm === 20 && r1.cfg.baseUrl === CONFIG_DEFAULTS.baseUrl, "GitHub vars/secrets override defaults; empty vars ignored");
  const r2 = resolveConfig({ AI_API_KEY: "envkey", AI_GEN_MODEL: "env/model" }, { genModel: "fs/model", rpm: 9999, perNeed: 0, baseUrl: "https://x.ai/v1/", enabled: false }, { apiKey: "fskey" });
  ok(r2.apiKey === "fskey" && r2.keySource === "AI Settings tab" && r2.cfg.genModel === "fs/model" && r2.cfg.rpm === 600 && r2.cfg.perNeed === CONFIG_DEFAULTS.perNeed && r2.cfg.baseUrl === "https://x.ai/v1" && r2.cfg.enabled === false,
     "AI Settings override GitHub; numbers clamped/validated; trailing slash trimmed; switch-off honoured");
}

console.log(`\n${passed} passed`);
