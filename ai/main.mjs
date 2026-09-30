// Entry point for GitHub Actions: node ai/main.mjs
import { run, makeLlm, CONFIG_DEFAULTS } from "./pipeline.mjs";
import { makeStore } from "./firestore-store.mjs";

const env = process.env;
const need = k => { if (!env[k]) { console.error(`Missing ${k} — add it under Settings → Secrets and variables → Actions.`); process.exit(1); } return env[k]; };
const num = (k, d) => env[k] ? Number(env[k]) : d;
const cfg = {
  baseUrl: env.AI_BASE_URL || CONFIG_DEFAULTS.baseUrl,
  genModel: env.AI_GEN_MODEL || CONFIG_DEFAULTS.genModel,
  verifyModel: env.AI_VERIFY_MODEL || CONFIG_DEFAULTS.verifyModel,
  visionModel: env.AI_VISION_MODEL || CONFIG_DEFAULTS.visionModel,
  rpm: num("AI_RPM", CONFIG_DEFAULTS.rpm),
  perNeed: num("AI_PER_NEED", CONFIG_DEFAULTS.perNeed),
  maxPerStudent: num("AI_MAX_PER_STUDENT", CONFIG_DEFAULTS.maxPerStudent),
  reasonWaitMin: num("AI_REASON_WAIT_MIN", CONFIG_DEFAULTS.reasonWaitMin),
  runMinutes: num("AI_RUN_MINUTES", CONFIG_DEFAULTS.runMinutes)
};
const llm = makeLlm({ baseUrl: cfg.baseUrl, apiKey: need("AI_API_KEY"), rpm: cfg.rpm });
// fail loudly (red run in the Actions tab) if a configured model id doesn't exist at the provider
try {
  const ids = await llm.listModels();
  const missing = [cfg.genModel, cfg.verifyModel, cfg.visionModel].filter(m => !ids.includes(m));
  if (missing.length) {
    console.error(`Model id(s) not offered by ${cfg.baseUrl}: ${missing.join(", ")}`);
    console.error("Available (filtered): " + ids.filter(i => /gpt-oss|nemotron|llama|qwen|deepseek|minimax|vision|vl/i.test(i)).join(", "));
    process.exit(1);
  }
} catch (e) { console.warn("Could not list models (continuing): " + e.message); }
const store = makeStore({ serviceAccount: JSON.parse(need("FIREBASE_SERVICE_ACCOUNT")), databaseId: env.FIRESTORE_DATABASE_ID || "default" });
const s = await run({ store, llm, cfg });
if (s.errors && !s.drafted) process.exitCode = 1;
