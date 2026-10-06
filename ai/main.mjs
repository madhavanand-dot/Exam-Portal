// Entry point for GitHub Actions: node ai/main.mjs
// Reads the admin's AI Settings (Firestore settings/ai + settings/aiSecret), which override GitHub
// variables/secrets, runs the pipeline, and reports back to settings/aiStatus (shown in the portal).
import { run, makeLlm, resolveConfig } from "./pipeline.mjs";
import { makeStore } from "./firestore-store.mjs";
import { estimateQuestions, verifyUserQuestions, solveRequestedExams, buildScorecard } from "./estimate.mjs";

const env = process.env;
if (!env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT — add it under Settings → Secrets and variables → Actions.");
  process.exit(1);
}
const store = makeStore({ serviceAccount: JSON.parse(env.FIREBASE_SERVICE_ACCOUNT), databaseId: env.FIRESTORE_DATABASE_ID || "default" });
const { ai, secret } = await store.getSettings();
const { cfg, apiKey, keySource } = resolveConfig(env, ai, secret);
const models = { gen: cfg.genModel, verify: cfg.verifyModel, vision: cfg.visionModel };
// live progress: mirrored to settings/aiStatus so the portal (AI Settings tab) can show it as it happens
const logBuf = []; const startedAt = Date.now(); let phase = "Starting", lastFlush = 0, done = false;
const flush = async (force) => {
  if (done || (!force && Date.now() - lastFlush < 4000)) return;
  lastFlush = Date.now();
  try { await store.writeStatus({ running: true, phase, startedAt, progress: logBuf.slice(-80), progressAt: Date.now(), lastRunAt: startedAt }); } catch (e) { console.warn("live status write failed: " + e.message); }
};
const log = (msg) => { console.log(msg); logBuf.push(new Date().toISOString().slice(11, 19) + " " + msg); flush(false); };
const setPhase = async (p) => { phase = p; log("== " + p); await flush(true); };
const report = (ok, message, extra = {}) => (done = true, store.writeStatus({ ok, message, models, baseUrl: cfg.baseUrl, keySource, lastRunAt: Date.now(), running: false, phase: "Idle", startedAt, finishedAt: Date.now(), progress: logBuf.slice(-80), ...extra }));
await setPhase("Checking settings");

if (!cfg.enabled) { await report(true, "AI job is switched off in AI Settings — nothing processed."); console.log("Disabled in AI Settings."); process.exit(0); }
if (!apiKey) { await report(false, "No API key: add one in AI Settings (or the GitHub secret AI_API_KEY)."); console.error("No API key."); process.exit(1); }

const llm = makeLlm({ baseUrl: cfg.baseUrl, apiKey, rpm: cfg.rpm });
await setPhase("Checking the API key and models");
// preflight: is the key accepted, and do the chosen models exist? (fails loudly, reported in the portal)
let available = [];
try {
  available = await llm.listModels();
  const gone = cfg.compareModels.filter(m => !available.includes(m));
  if (gone.length) { log("Comparison model(s) not offered by the provider, skipped: " + gone.join(", ")); cfg.compareModels = cfg.compareModels.filter(m => available.includes(m)); }
  const missing = Object.values(models).filter(m => !available.includes(m));
  if (missing.length) {
    await report(false, `Model id(s) not offered by ${cfg.baseUrl}: ${missing.join(", ")}. Pick from the suggestions in AI Settings.`, { availableModels: available.slice(0, 400) });
    console.error("Missing models: " + missing.join(", "));
    process.exit(1);
  }
} catch (e) {
  if (e.status === 401 || e.status === 403) {
    await report(false, `The API key was rejected by ${cfg.baseUrl} (HTTP ${e.status}). Check or replace it in AI Settings.`);
    console.error("API key rejected."); process.exit(1);
  }
  console.warn("Could not list models (continuing): " + e.message);
}
// 1) AI-proposed answer keys + ideal times for new image questions (never blocks the follow-up run below)
let estimate = null;
let verify = null;
let solve = null;
await setPhase("Solving tests teachers asked the AI to solve (key + ideal time)");
// the GitHub job is stopped at 58 min: every step gets a share and stops cleanly, continuing next run
const deadline = startedAt + 50 * 60000;
try { solve = await solveRequestedExams({ store, llm, cfg, log, budgetMs: 30 * 60000 }); }
catch (e) { console.warn("Solving requested tests failed: " + e.message); solve = { error: e.message }; }
await setPhase("Reviewing the answer keys and ideal times you entered");
try { verify = await verifyUserQuestions({ store, llm, cfg, log, deadline: startedAt + 40 * 60000 }); }
catch (e) { console.warn("Verification failed: " + e.message); verify = { error: e.message }; }
await setPhase("Proposing keys and ideal times for new image questions");
try { estimate = await estimateQuestions({ store, llm, cfg, log, deadline }); }
catch (e) { console.warn("Key/time estimation failed: " + e.message); estimate = { error: e.message }; }
let scorecard = null;
try { await setPhase("Updating the model scorecard"); const c = await buildScorecard({ store, log }); scorecard = c ? { questions: c.questions, graded: c.gradedQuestions } : null; }
catch (e) { console.warn("Scorecard failed: " + e.message); }
try {
  await setPhase("Writing follow-up practice for students");
  const s = await run({ store, llm, cfg, log });
  await report(!(s.errors && !s.drafted), s.errors ? `Finished with ${s.errors} error(s) — see the queue in Custom Practice.` : "Finished normally.",
               { summary: s, estimate, verify, solve, scorecard, ...(available.length ? { availableModels: available.slice(0, 400) } : {}) });
  if (s.errors && !s.drafted) process.exitCode = 1;
} catch (e) {
  await report(false, "Job crashed: " + e.message);
  throw e;
}
