// Entry point for GitHub Actions: node ai/main.mjs
// Reads the admin's AI Settings (Firestore settings/ai + settings/aiSecret), which override GitHub
// variables/secrets, runs the pipeline, and reports back to settings/aiStatus (shown in the portal).
import { run, makeLlm, resolveConfig } from "./pipeline.mjs";
import { makeStore } from "./firestore-store.mjs";
import { estimateQuestions, verifyUserQuestions } from "./estimate.mjs";

const env = process.env;
if (!env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT — add it under Settings → Secrets and variables → Actions.");
  process.exit(1);
}
const store = makeStore({ serviceAccount: JSON.parse(env.FIREBASE_SERVICE_ACCOUNT), databaseId: env.FIRESTORE_DATABASE_ID || "default" });
const { ai, secret } = await store.getSettings();
const { cfg, apiKey, keySource } = resolveConfig(env, ai, secret);
const models = { gen: cfg.genModel, verify: cfg.verifyModel, vision: cfg.visionModel };
const report = (ok, message, extra = {}) => store.writeStatus({ ok, message, models, baseUrl: cfg.baseUrl, keySource, lastRunAt: Date.now(), ...extra });

if (!cfg.enabled) { await report(true, "AI job is switched off in AI Settings — nothing processed."); console.log("Disabled in AI Settings."); process.exit(0); }
if (!apiKey) { await report(false, "No API key: add one in AI Settings (or the GitHub secret AI_API_KEY)."); console.error("No API key."); process.exit(1); }

const llm = makeLlm({ baseUrl: cfg.baseUrl, apiKey, rpm: cfg.rpm });
// preflight: is the key accepted, and do the chosen models exist? (fails loudly, reported in the portal)
let available = [];
try {
  available = await llm.listModels();
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
try { verify = await verifyUserQuestions({ store, llm, cfg }); }
catch (e) { console.warn("Verification failed: " + e.message); verify = { error: e.message }; }
try { estimate = await estimateQuestions({ store, llm, cfg }); }
catch (e) { console.warn("Key/time estimation failed: " + e.message); estimate = { error: e.message }; }
try {
  const s = await run({ store, llm, cfg });
  await report(!(s.errors && !s.drafted), s.errors ? `Finished with ${s.errors} error(s) — see the queue in Custom Practice.` : "Finished normally.",
               { summary: s, estimate, verify, ...(available.length ? { availableModels: available.slice(0, 400) } : {}) });
  if (s.errors && !s.drafted) process.exitCode = 1;
} catch (e) {
  await report(false, "Job crashed: " + e.message);
  throw e;
}
