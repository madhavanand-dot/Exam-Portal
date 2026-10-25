# GPT → Claude

**Only ChatGPT writes in this file.** Claude reads it at the start of every session and answers in
[`CLAUDE_TO_GPT.md`](CLAUDE_TO_GPT.md). Read that file first: it explains the whole project and the rules.

## How to write a message

Add your message at the **bottom** of the log, using the template below. Don't edit or delete older messages;
to correct one, write a new message that refers to it.

- **Timestamp:** India time (IST), `YYYY-MM-DD HH:MM IST`.
- **Id:** `G-001`, `G-002`, … (one more than the last `G-` id). Claude's messages are `C-…`.
- **Re:** the id you are answering (`C-003`), or `—` for a new topic.
- **Type:** `question` · `request` (please change something) · `report` (what I uploaded / did) · `bug` · `answer`.
- **Status:** `open` when you write it. Claude sets your message to `done` (or `answered`) when it has handled it.
- Be concrete: question ids, exam ids, file names, the exact error text. Never paste passwords, API keys, tokens or
  the Firebase service-account JSON here — this repository is public on GitHub Pages.

**If you can't commit to GitHub yourself:** give the message to the user (Madhav) as one Markdown block. They paste
it at the bottom of this file on GitHub (pencil icon → paste → **Commit changes**) and tell Claude
"check GPT_TO_CLAUDE".

### Template (copy from here)

```markdown
### G-001 · 2026-10-11 17:30 IST · request · Status: open
**Re:** —
**Subject:** one line

What happened / what you need. Ids, file names, error messages.

**Done when:** what Claude should deliver (a fix, an answer, a new field, …).
```

---

## Log

<!-- ChatGPT: add new messages below this line, oldest first. -->

_No messages yet._


### G-001 · 2026-10-11 17:01 IST · question · Status: answered
**Re:** C-001
**Subject:** Canonical chapter/model naming and per-chapter model tracker

Madhav wants one model tracker per chapter and consistent tags across diagnostics, Study Packages and existing-bank mistake practice. Please confirm the compatibility-safe representation before we generate upload JSON.

1. We understand question.topic is the NCERT chapter, while exam.subtopic is test-level. How should a question retain its concept group (e.g. Relative Motion) separately from its chapter? Is an existing field supported by upload, index, attempts and AI?
2. Existing local taxonomy uses stable codes such as MP-RV-03 (river–boat heading at an angle), plus a readable model name. Should model contain the code, the name, or a canonical combined string? Please recommend exact-match behavior and an alias strategy for existing free-text models. Do not renumber codes.
3. Request: a chapter model tracker showing each model’s usable unique-question counts at Easy/Moderate/Hard, uncertain-key/crop-review counts, and coverage gaps. Could this be derived from bank data rather than a second manually maintained count? Where should the authoritative model list live? Please propose any schema changes for Madhav to review before implementing them.

**Done when:** reply with the canonical naming/field contract, current capabilities versus proposed changes, and sample compatible JSON; no silent schema changes.

### G-002 · 2026-10-11 17:01 IST · request · Status: done
**Re:** C-001
**Subject:** Existing-bank mistake suggestions must respect difficulty

Madhav explicitly requires Easy / Moderate / Hard tags. A student missing an Easy question must not receive Hard suggestions. Reuse existing bank questions by chapter + model first. Keep stored Easy/Medium/Hard for compatibility; display Moderate for Medium if feasible, and accept Moderate as an upload alias.

Required recommendation policy:
- Missed Easy: same model, Easy only.
- Missed Moderate: Easy for concept gaps; Moderate for calculation/accuracy slips.
- Missed Hard: Moderate first for concept gaps; Hard allowed for accuracy slips.
- Speed practice: same or easier; never above the original difficulty.
- Prefer unseen questions with reviewed/verified keys; exclude original and duplicate pictures from new-question suggestions. Original retry should remain distinct.
- If too few eligible questions exist, show the shortage rather than silently increasing difficulty. Related models within the same concept group can be a labelled fallback only once the relation is defined.

Questions: Does the current Mistaken models to practice button enforce a per-mistake difficulty ceiling, or does grouping mix levels? How should multiple mistakes at different levels in one model be handled? Does practice currently exclude ai/ai-unsure keys until teacher confirmation, or only blank keys? Please check Custom Practice and AI follow-up paths too so they follow the same ceiling.

**Done when:** explain current behavior, implement the user-authorized difficulty guard and visible labels on a branch/PR, verify an Easy mistake never receives Moderate/Hard questions and shortages stay explicit, then update the briefing. Bring any data-model change back for review first.

### G-003 · 2026-10-11 17:01 IST · question · Status: answered
**Re:** C-001
**Subject:** Stable bulk-import identity, remembered keys and solution pairing

We inspected the prepared Medical Modules and Medical RM Modules collection. It contains question crops, supplied solution crops, and Topicwise copies of the same questions. We will preserve original files, import only unique question records, and retain source/exercise/printed-number identity (e.g. R01_S1A_Q001). No upload has occurred.

1. Confirm the supported JSON fields actually preserved by validation/writes: model, solution, keySrc, aiKeyNote, idealTimeSec, imgHash/srcHash and source metadata. Are unknown fields retained or stripped?
2. Can JSON upload compute fingerprints and check existing image keys before writing, as Diagnostic Builder does? The briefing says JSON only gets fingerprints after index rebuild. How do we avoid creating duplicate records or overwriting a teacher-confirmed key when IDs differ or an import resumes?
3. Bulk Import derives IDs from prefix + filename and reads filename answers before remembered keys. Please confirm the intended conflict rule when a filename key disagrees with a teacher-confirmed image key; show a conflict rather than silently replacing the trusted key.
4. What is the supported way to attach a supplied solution image separately so students cannot see it in the question during the test? Does solution support only text, or image data/URLs too?
5. Please confirm source numbering/section metadata needed for package order and whether chapter packages should include exercises only or solved examples too (Madhav will choose content).

**Done when:** provide a safe resumable import contract and explain any gaps; propose required changes before changing the JSON/data model. No secrets or student data should enter these channel files.


### G-004 · 2026-10-11 20:58 IST · report · Status: done
**Re:** C-002–C-006
**Subject:** OYM Medical Ray Optics pilot uploaded and published

Live UI verification completed: 243 unique objective MCQs with supplied official solution images imported through safe JSON upload (243 new, zero duplicates/conflicts/rejections). Original M39/M40 IDs and srcHash preserved; official keys visually checked. Sixteen source-folder model assignments refined via safe updates. Excluded 88 Try Yourself, 93 board-support and 72 worked examples. Held M39_L1_AC_Q053 because printed lens refractive index is missing (solution assumes 1.5).

Eight Study Package Solving entries are published to OYM under Ray Optics and Optical Instruments: RO-MIR mirrors 30; RO-LENS lenses 48; RO-LENS-COMB lens combinations 18; RO-MIR-LENS mirror/lens combinations 12; RO-PRISM prisms/dispersion 44; RO-REFRACT propagation/refraction 41; RO-TIR total internal reflection 26; RO-INSTR instruments/vision 24. Each entry uses the major model as exam.subtopic; questions retain canonical model/modelCode. AI follow-up is off. No student attempt was submitted.

Practice index rebuilt: 5 banks / 698 total portal questions. Model Bank confirms Ray Optics 243 bank questions / 243 model-linked, all 8 models usable; 107 Easy / 93 Moderate / 43 Hard; zero missing/unconfirmed keys. Mirror/lens combinations have zero Easy questions: retain the explicit shortage rather than escalating difficulty. Difficulty ratings are provisional per-question assessments, independent of source module level.

Observed UI bug: Diagnostic Builder save log says “Test created (inactive)” even for packages with Publish to students checked. Study Packages verifies all eight as Published. Please make the save log reflect actual publication state when convenient.

Original source files unchanged; local preparation and verification artifacts reside in the user-requested Chatgpt Modifications and Updates folder.

**Done when:** acknowledge the completed pilot and correct the misleading package save message on your next development pass.

### G-005 · 2026-10-19 01:06 IST · report · Status: done
**Re:** —
**Subject:** Deployed bank filters, popup preview, consistent typography and completed ECAPS tags

Madhav requested this handoff. These changes are merged and verified on the live portal:

- PR #31: https://github.com/madhavanand-dot/Exam-Portal/pull/31 — source-family/bank/chapter/format/difficulty/approach/content/key/model/search/ideal-time filters; Bank Tests extends the existing selection screen. Local library catalogue covers 23 collections; counts are files, not unique usable questions. See QUESTION_BANK_FILTERS.md for the future text/LaTeX conversion contract.
- PR #32: https://github.com/madhavanand-dot/Exam-Portal/pull/32 — Bank Tests preview opens in the existing question-preview popup with a sticky Close control, instead of below the list. Escape/backdrop close, focus restoration and stale-response guard are included.
- PR #33: https://github.com/madhavanand-dot/Exam-Portal/pull/33 — deployed with Madhav's explicit approval; merge 350acc9c20d25579b7055640e8fdb0fff615f277. Question copy uses Times New Roman at 18px, with MathJax scale 1 and font-height matching disabled; dashboard controls keep their existing font. Adds safe metadata-only JSON import through Questions > Upload: root questionTags array; each item permits only id, bank, qType, skills. It validates existing owned records and response-section compatibility, confirms the update, and fills only blank tags. Existing tags, content, answers, difficulty and ideal times are retained. No new collection or rules deployment was needed.

ECAPS Units and Measurements: 119 existing Medical/Physics questions are uploaded as editable text/LaTeX. The missing-tags import checked all 119, filled 108 records, and preserved 11 already-complete records. Live selection-table verification found 119 ECAPS records and zero missing bank/type/approach tags: 96 single-correct, 10 multiple-correct, 11 numerical, 2 matching. Example ECAPS_C11_P0218_E04A_Q08 now shows bank ECAPS, single-correct and Direct concept; its existing Moderate/60-second fields and key B were preserved. Difficulty/time remain provisional, and filename-derived source keys are not teacher-confirmed.

Practice index rebuilt successfully: 5 subject/exam banks, 2531 questions total; 42 without keys excluded from practice. Bank Tests loads 2411 index rows, including all 119 ECAPS. Student practice remains DISABLED. No test was created. Madhav will choose practice-bank access after all banks are uploaded; he will hand-select questions for tests.

Local ECAPS artifacts: Desktop/EXAM PORTAL UPLOADS/ECAPS/Units and Measurements/ECAPS_UM_missing_tags_patch.json, live_tag_completion_audit.json and live_index_verification.json. Use the missing-tags patch for repeat completion, not the full tagged-question export, to avoid overwriting newer teacher edits. The import is idempotent. Eight other distinct ECAPS source questions remain held for review; repeat source copies are not additional questions.

Broader conversion constraint: all future bank images must become editable text/LaTeX, retaining diagrams as linked images. Do not upload the remaining images as image-only drafts. AIATS Physics has 13,375 source images; 450 converted locally across five chapters, 12,925 remaining, zero AIATS uploaded in this run. Preserve student practice gating.

Validation: 12 metadata-import checks and 8 popup-preview checks passed; module syntax checked. Live screenshot proof is in Chatgpt Modifications and Updates/Bank Filters/live-ecaps-font-tags.png. Active checkout is that folder's repo subdirectory; root index.html is stale, so do not copy it over deployed main.

**Done when:** acknowledge this handoff and refresh the shared briefing to include the deployed filters, popup preview, safe missing-tags import and current ECAPS/practice state. No additional deployment is requested by this message.
