# Changelog

All notable changes to the exam portal. Newest first.

Format: each entry says **what changed**, and — where it matters — **what you must do after deploying it**
(publish rules, rebuild an index, etc.). Those follow-up steps are the things that get forgotten.

---

## 2026-10-12 — Install as a phone app (PWA)

- The portal can now be **installed like an app** on phones (and on desktop Chrome / Edge): its own icon on the
  home screen, opens full screen without the browser bar.
- New files: `manifest.webmanifest` (app name, colours, icons), `sw.js` (service worker) and `icons/`.
- **📲 Install app** button on the login page and in the Admin / Student dashboard top bars. On Android Chrome it
  opens the browser's install prompt; on iPhone / iPad it shows the Safari steps (Share → Add to Home Screen) in the
  page. The button hides itself when the app is already installed or the browser can't install.
- The service worker is **network-first** for the site's own files, so a new deploy shows up the next time the app
  opens; the stored copy is only used when the phone is offline. Firebase / Google / CDN requests are never cached,
  so tests, answers and results always go straight to Firebase.
- **After deploying:** nothing to publish. Open the site once on a phone (GitHub Pages is HTTPS, which installing
  needs) and try the button. If a phone ever seems stuck on an old version, close and reopen the app once.

 visible to staff

- **Reports**: new **Started** and **Submitted** columns (date + time) with the start→submit duration under it
  (clock time, includes breaks; "Time (min)" stays the time on the test screen). Also in the Reports **CSV**
  (Started, Submitted, StartToSubmit).
- **Leaderboard** and its CSV: Started / Submitted.
- **Result page**: "🕒 Started … · Submitted … (N min from start to submit)" under the score tiles.
- **Study Package tracker**: hover a cell for started / submitted; the submit date shows under ✅; the CSV includes both.
- **Live Monitor**: "started 10:05" under each student's time.
- The times were already saved on every attempt (`startTime` = first opened, kept on resume; `submitTime` = server
  time). Nothing to do after deploying. `CLAUDE_TO_GPT.md` C-010 summarises every change so far for ChatGPT.

---

## 2026-10-11 — Turn "3 warnings → auto-submit" on or off; silent tab-switch tracking; phones

- **Live Monitor → ⚠ 3 warnings → auto-submit** (admin): portal-wide switch. A test can override it — **3 warnings →
  auto-submit** in the Diagnostic Builder and the Exams form (Portal setting / On / Off — track silently).
- **Off = silent tracking**: no warning pop-up, no auto-submit, no "you left the screen" notice to the student — but
  every tab switch, window switch, fullscreen exit and window shrink is still recorded, shown live (🚨 column, "silent"
  badge) and in the result's 🛡 Integrity report for staff (students don't see the count in silent mode).
- **Phones**: attempts record whether they were written on a phone/tablet (📱 on the Live Monitor, note on the
  integrity report). Some phones run Chrome in split screen / a floating window / picture-in-picture **without a tab
  switch** while in fullscreen; the portal now also flags the test window **suddenly shrinking** (ignored while typing),
  but such use cannot always be detected — a note on the Live Monitor says so.
- Students see "⚠ 3 warnings → auto-submit as malpractice" only on tests where it is on. Nothing to do after deploying.

---

## 2026-10-11 — New look; diagnostic tests by chapter → topic → level

- **New visual design across the portal** (Inter font, softer cards and tables, pill-style tab bar, clearer buttons,
  inputs with focus rings, sticky top bar, styled file pickers). Layouts are unchanged; the exam screen keeps its NTA look.
- **Students: Diagnostic tests** open as **chapter cards → topic cards → tests** (breadcrumbs to go back); tests without
  a chapter/topic are listed under "Other tests". Other tests stay a plain list below.
- **Diagnostic tests per level**: new **Test level** (Mixed / Easy / Moderate / Hard) in the Diagnostic Builder, and
  **✂ Split into Easy / Moderate / Hard tests** — one inactive test per level from the open test's questions (by their
  level), same chapter / topic / audience / settings, titled "… — Easy / Moderate / Hard". Activate them one by one in
  Assign Tests; students see them in Easy → Moderate → Hard order with a level badge. Assign Tests shows the level and
  sorts by it.
- **Diagnostic Builder: chapter first, then topic** — Chapter suggests existing chapters (tests, bank, Model Bank);
  Topic then suggests that chapter's topics (tests, taxonomy groups, question models) and the tests that already exist
  for it, linked to open. "Question chapter (for new questions)" fills from Chapter. Nothing to do after deploying.

---

## 2026-10-11 — Delete a test completely

- **Delete** now removes a test **completely**: the test, **every student attempt of it** (results leave Reports, ranks,
  notebooks and progress), and — if you say yes to the second question — **the questions no other test uses**
  (questions shared with other tests are always kept). Questions owned by another teacher are kept and counted.
- Available in **Exams** (the existing Delete), **Assign Tests** (new Delete per test), **Study Packages** (new Delete per
  chapter) and the **Diagnostic Builder** (🗑 Delete this test, for the open test). Only the test's creator or an
  admin can delete. Both questions use the in-page dialog. After deleting questions, rebuild the practice index.

---

## 2026-10-11 — No browser pop-ups; package save message

- **All browser pop-ups (alert / confirm / prompt) are replaced by an in-page dialog** — they froze the tab and blocked
  browser agents (ChatGPT bridge). The dialog is ordinary page content (OK / "Yes, continue" / Cancel, Enter / Esc).
- **No question at all** where the button already says it: **Save test** (the summary is written in the save log),
  **re-grading after a key change** (now automatic, logged), Ask AI to solve, Confirm all AI keys, Rebuild practice
  index. Deletes, overwrites, imports and password resets still ask — in the page.
- Question builder (`question-builder.html`): "Reset all" asks for a second click instead of a pop-up.
- Diagnostic Builder save log for study-package chapters now says whether the chapter was **published** or hidden
  (it said "Test created (inactive)" even when published). Answers ChatGPT's G-004. Nothing to do after deploying.

---

## 2026-10-11 — Students: change batch, temporarily deactivate accounts

**After deploying: publish the updated `firestore.rules`** (deactivated students' test/practice writes are refused).

- **Change batch**: ✎ next to a student's batch, or tick several students → **Move to batch…** (existing batches
  listed; a new code is allowed and is checked against the TYM / OYM / RM prefixes). Earlier results keep the batch
  they were written in; from then on the student gets the new batch's tests and study package.
- **Deactivate / Reactivate** (per student, or for the ticked ones, optional reason): a deactivated student cannot
  sign in, is signed out at once if online (a running test is saved, not submitted), and Firestore refuses their
  attempt / practice writes. Nothing is deleted. Deactivated students are greyed out with a badge, have a **Status**
  filter, and are left out of Attendance absentees and the Study Package tracker.
- **Select** students with the new tick-box column (header box = all listed).

---

## 2026-10-11 — Students tab: batch dropdown, default passwords, bulk reset

- **Filter by batch** is now a drop-down of the existing batches (with counts, plus "No batch"); it filters at once.
- **Default password** = first two letters of the name (first capital, second small) + `@` + PS-ID without its leading
  zeros — "Lydia EL Eben", 00015456129 → `Ly@15456129`. Used when the password is left blank in Add Student or in the
  CSV import.
- **🔑 Reset passwords to default** (admin): resets every student currently listed (all, or the chosen batch) to that
  pattern. Firebase only allows a password change while signed in as the student, so each one is signed in on a
  separate connection with the stored password (about a second per student; keep the tab open). Students without a
  stored password, or whose stored password is out of date, are skipped and listed — use "Change PW" for them.
  Nothing to do after deploying.

---

## 2026-10-11 — Model Bank, Safe import, ✓ Confirm keys, solution images, Easy / Moderate / Hard

**After deploying: publish the updated `firestore.rules`** (new `taxonomy`, `bankIndex`, `settings/taxonomyAccess`),
then **Topics → Rebuild practice index** (builds the bank index the Model Bank counts from).

- **📚 Model Bank** (admin-only tab): upload one question-model taxonomy per chapter as JSON (groups → numbered models
  with exam level NEET / JEE MAIN / JEE ADV and the failure mechanism). Click a chapter → a table of every model with
  its **usable questions at Easy / Moderate / Hard** (teacher-confirmed keys, each picture once), AI-proposed / missing
  keys, red gaps; click a model → its questions in three columns. Questions not linked to any model are listed.
  **👁 Student view access**: pick students who may view it (read-only, answers behind "Show answer") on their dashboard.
- **`modelCode`** on questions links them to a taxonomy model (within the chapter); used by the notebook, Mistaken
  models to practice, Custom Practice and the AI writer. The Diagnostic Builder's model box offers the chapter's
  models as "code · name".
- **Safe import** (Questions tab, on by default): fingerprints pictures, checks the bank first, skips unchanged rows
  and duplicate pictures, never overwrites a teacher-confirmed key (conflict), asks before writing, downloads a report.
  Bulk Import flags file-name keys that disagree with a teacher-confirmed key of the same picture.
- **✓ Confirm** AI-proposed keys (per question, or all at once). Post-mistake suggestions use confirmed keys only.
- **Solution images** (`solutionImage`): attach in the builder or upload in JSON; shown only after the test
  (notebook, practice feedback, result review, Model Bank).
- **Levels are shown as Easy / Moderate / Hard** everywhere (stored values unchanged).

---

## 2026-10-11 — Difficulty ceiling for questions suggested after a mistake

Rule (same in the portal and the AI job): a **concept gap** gets questions one level below the missed one (an Easy
miss stays Easy, a Hard miss gets Moderate then Easy), an **accuracy slip** the same level, **speed** the same level
or easier — **never harder**.

- **🎯 Mistaken models to practice**: one row per chapter + model + allowed level (shown as "Level: …"), so an Easy
  mistake never sits in a row offering harder questions; "⚠ only N at this level" instead of topping up with harder
  ones; the student's other open mistakes are never suggested; teacher-confirmed keys first.
- **Custom Practice**: same ceiling (accuracy slips used to have none); ranked by closest level, same model, confirmed
  key; shortages shown ("⚠ N short", listed in View).
- **AI follow-up**: prompt targets the ceiling level; a question the model labels harder is clamped down.
- Practice index marks AI-proposed, unconfirmed keys (`u`) so they are offered last.

**After deploying:** Topics → **Rebuild practice index** (for the new key flag). Answers ChatGPT's G-002 (see
`CLAUDE_TO_GPT.md` C-002 – C-004 for G-001 and G-003).

---

## 2026-10-11 — Claude ↔ ChatGPT channel in the repository

- **`GPT_TO_CLAUDE.md`** — ChatGPT writes here (or gives Madhav a block to paste); template with id, IST timestamp,
  type, status.
- **`CLAUDE_TO_GPT.md`** — Claude writes here: how to communicate, a full project briefing (features, Firestore data
  model, the exact question-JSON upload format and answer-key honesty rules, the AI job, current status) and Claude's
  timestamped messages.
- **`CLAUDE.md`** — tells every Claude session to read `GPT_TO_CLAUDE.md` first, answer in `CLAUDE_TO_GPT.md` and keep
  the briefing current. Nothing to do after deploying.

---

## 2026-10-11 — New test type: Study Package Solving (+ Momentum Booster), tracked per student

**After deploying:** make sure `firestore.rules` from the earlier entry is published (students read `settings/portal`),
then open **Study Packages → Which batches belong to which programme?** and check the batch codes
(defaults: TYM = TR…, TW… · OYM = OR…, OW… · RM = RM…). Save once if you change them.

- **Diagnostic Builder → Test type**: *Diagnostic test* · *Study Package Solving* (pick the programme TYM / OYM / RM) ·
  *Momentum Booster* (everyone). Upload the module's questions exactly like a diagnostic (images, keys, ideal times,
  question models, AI help). Use one test per chapter (fill in Chapter).
- **One package per programme**: a Study Package reaches every batch of its programme — batches added later included —
  and the Momentum Booster reaches everyone of that exam type. (New audience type "a whole programme" is also
  available for ordinary diagnostic tests.)
- **Students** get a **📘 Study Package / 🚀 Momentum Booster** section on their dashboard: chapters by subject, each
  *Not started / In progress (answered / total) / Completed (score)*, with Start / Continue / View result / Solve again,
  and an overall progress bar. Packages are homework: **no time limit, no fullscreen or tab-switch proctoring**,
  progress saved, not shown on the Live Monitor.
- **Staff → Study Packages tab**: choose package + programme (+ batch) → the package's chapters (publish / hide, edit
  questions & key, + New chapter) and a **tracker**: every student × every chapter (✅ score % · ◐ answered · —),
  completion per chapter and per student, totals, and CSV export.

---

## 2026-10-11 — Mistake notebook: chapter cards, then that chapter's questions

The notebook used to list every chapter's mistakes in one long page. Now it opens on **chapter cards** — subject,
chapter, how many questions, wrong / skipped / repeated, and a bar of how many are cleared — with **subject tabs**
(showing open mistakes per subject) and the Show / Type / "missed 2+" filters. **Tap a chapter** to see only its
questions (grouped by question model when set), with "← All chapters" to go back. Retry works on the chapter you
opened, or on everything from the card view. Same view for staff (read-only). Nothing to do after deploying.

---

## 2026-10-11 — AI works only on the tests you choose; "Mistaken models to practice" for students

**After deploying:** click **Topics → Rebuild practice index** (the index now carries each question's model and
whether it was AI-written). No rules change.

- **AI Settings → "Which tests should the AI work on?"**: *All tests* (as before) or *Only the tests I choose*, with a
  drop-down checklist of every test (questions, follow-up on/off, solve status). In "chosen" mode every step of the
  hourly job — solving, proposing keys / ideal times, double-checking your keys, follow-up practice — touches only those
  tests. Follow-ups queued from other tests are marked "notSelected" and skipped.
- **Question model**: an optional "model" (the question type / pattern inside a chapter, e.g. "Pulley — two blocks") per
  question, typed under the topic in the Diagnostic Builder. Saved on attempts, carried into the practice index, and
  the AI writer now writes follow-up questions per chapter + model ("same model, new numbers").
- **🎯 Mistaken models to practice** (student dashboard, above the mistake notebook): the student's open mistakes grouped
  by chapter → model (or by level when no model is set), how many similar questions exist (bank + 🤖 AI-written ones
  teachers approved), and a **Practise** button that builds a set of up to 15 new questions of that model — unseen
  first, bank and AI questions mixed. Hidden when practice mode is switched off.

---

## 2026-10-11 — Keys remembered per picture, practice on/off, batch + overall rank, per-question correct/wrong/left

**After deploying: publish the updated `firestore.rules`** (new `settings/portal` doc that students read for the practice switch).
Then click **Topics → Rebuild practice index** once, so existing repeated pictures share their keys.

- **A key set once is remembered for that picture everywhere.** Every picture question now gets a fingerprint.
  - Diagnostic Builder: adding a picture that is already in the bank reuses that bank question with its key, ideal time
    and AI checks ("♻ already in bank" in the table). The same picture added twice to one test is skipped.
  - Saving a key (Diagnostic Builder or Answer Key tab) copies it to every other question with the same picture.
    Questions owned by another teacher can only be changed by an admin; the log says which.
  - Bulk image import fills the saved key for pictures already in the bank.
  - Rebuild practice index: fingerprints older pictures, copies the best key (teacher > filename > AI) onto copies
    with no/weaker key, **leaves questions with no key out of practice** and offers a repeated picture only once.
  - Practice / Retry my mistakes skip any question that still has no key.
- **Practice mode on/off** (Topics tab, admin only): turns off Practice by Chapter and Retry my mistakes for every
  student. On by default.
- **Two rankings per test**: overall (everyone who wrote that test) and batch-wise (same batch). Shown on the result
  page, in the student's attempts list and in the Leaderboard (+ CSV). Equal scores share a rank. Previously the
  student's rank and percentile were against *all tests* of that exam type, not the test itself — fixed.
  The batch is now saved on each attempt; opening the Leaderboard fills it in on older attempts.
- **Per-question comparison**: the result page shows, for each question, % of the class correct / wrong / left
  (with a small bar). Item Analysis "% Correct" is now out of everyone who wrote the test, so correct + wrong + left
  = 100% (it used to be out of those who answered); accuracy among those who answered is shown beneath.

---

## 2026-10-11 (fix) — Diagnostic tests are no longer auto-submitted when the time runs out

Diagnostic tests were still timed like a full exam: the countdown used the test's duration (often "total ideal time + 10%")
and the test was auto-submitted when it reached zero. The ideal times are only there to *measure* how long a student takes.

- **No time limit** on diagnostic tests and on the practice tests made from them (Custom Practice, AI follow-up practice).
  The top-bar clock now counts **up** (time spent so far); the per-question "spent / ideal" badge is unchanged.
- The test ends only when the student submits it (or a teacher stops it for malpractice / 3 warnings, as before).
- Total time saved on the attempt is the real time taken (no longer capped at the duration); the result page no longer
  shows "time left unused" for these tests.
- The student's test list says "no time limit (about N min)"; the Live Monitor shows time spent instead of time left.
- In the Diagnostic Builder the field is now "Expected duration (min) — not enforced".

Nothing to do after deploying. Already-saved diagnostic tests pick this up automatically.

---

## 2026-10-06 (fix) — AI job: never lose solved answers, no duplicate solving, fewer failures; compare models

Found in the GitHub logs: the AI takes 1–3 min per image question. A 25-question "solve this test" run took the whole hour,
and the job was stopped by GitHub's 58-minute limit. The results survived only because they were written in time.

- **Saved after every question.** A long test is solved over several runs: when the solve step's 30-minute share
  is used up, the test goes back to the queue with its progress kept. The next run continues where it stopped.
  The builder shows "**x of y** solved so far", and the suggestions already made show straight away.
- **No duplicate work.** Solving a test now also sets the AI ideal time / "unsure" mark on questions waiting for one, and stores
  the key review on teacher-keyed image questions. The review and proposal steps skip those (they were solving the same
  25 questions twice more, about 45 minutes).
- **Every step has a time budget** inside the 58-minute limit (solve 30 min, review until 40 min, proposals until 50 min) and
  stops cleanly instead of being killed.
- **Fewer failures.** A reply that isn't valid JSON is asked for again once (this is what failed on Q15). Solvers get more room to
  think, so their answer isn't cut off. A failed solver's error now shows in the log.

### Added — see every AI model's working, and which model to trust
- Every AI solve now keeps **what each model did**, in a new staff-only `aiSolutions` collection:
  - what the vision model **read from the image**
  - each model's **answer, confidence, suggested time, reply time and step-by-step working** (or its error)
- **🔎 Where the difference comes from:** when the models disagree, or all disagree with your key, one extra call compares their workings. It names the step where they diverge, gives a verdict, and says whether the question looks **misread** from the image.
- **Diagnostic Builder:**
  - **🔍 AI working** on each question opens all of the above side by side.
  - **🔍 Compare models on this test** shows each model's answers next to your key, with % matching for each model.
- **AI Settings:**
  - **Extra models to compare** (up to 3): they solve every question too, but never decide a key.
  - **📊 Model scorecard**, refreshed by every AI run, compares models **against the keys you set yourself**. It shows accuracy, failed replies, confidence when right vs wrong, suggested times, reply speed, and accuracy by subject.
- Solvers are now asked for their working (at most 8 steps).

> **After merging — publish the rules:** `firestore.rules` adds `aiSolutions` (staff read) and lets staff read `settings/aiScorecard`.
> Workings are saved from the next AI run on; earlier solves only have the answers.

---

## 2026-10-06 (later) — Mistake notebook, progress across tests, at-risk list, key / copying / quality checks

### Added — 📒 Mistake notebook (students; faculty can view)
- Every question a student got **wrong or left blank** in a graded test, grouped by **chapter**. It shows:
  - the test and date, their answer, the time taken, and the "why" reason they gave
  - **missed 2+ times** marking for repeated mistakes
- Filters: subject, chapter, open / cleared, wrong / skipped, missed 2+ times.
- **Show question & answer** loads the question with the correct option highlighted (and the solution if one is saved).
- Students can add a **note** and tick **Cleared**.
- **🔁 Retry open mistakes:** untimed practice of up to 40 open mistakes. Each one answered right is **cleared automatically**.
- A mistake answered correctly in a later test is cleared automatically.
- **Faculty:** Progress tab → choose the student → their notebook appears below the progress charts (read-only).

### Added — progress across tests (student dashboard + Progress tab)
- New trend charts: **Accuracy %** and **Dead time %**.
- The table gains accuracy, dead time and average time per attempted question.
- **Chapter-wise progress:** % correct per chapter in each of the last 8 tests, weakest first, with the change from the first to the latest test.

### Added — ⚠ At-risk tab (staff)
- Looks at each student's last 3 tests. Each warning sign adds points:
  - low scores
  - a falling trend (−10 points or more)
  - skipping 40%+ of questions
  - 40%+ dead time
  - missed tests
  - malpractice, tab switches or too-quick answers
  - no test in 14+ days
- **4+ points = High risk**, **2–3 = Watch**. Filter by exam type and batch; **Progress** button for each student; CSV export.

### Added — Item Analysis: answer-key check, question quality, copying
- **🔑 Answer-key check:** flags a question when the top 27% of scorers mostly chose a different answer than the key, or when weak students beat strong ones and one wrong option dominates.
- **📐 Question quality:** discrimination D = % correct in the top 27% − bottom 27%.
  - Good ≥ 0.30 · Fair · Poor · Bad < 0
  - Options nobody picked, plus a suggestion for each weak question
  - New **Quality (D)** column in the question table, with a 🔑 badge where the key looks wrong
- **👥 Possible copying:** pairs who chose the **same wrong answers** on 3+ questions (60%+ of the questions both got wrong), or shared 2+ **rare** wrong answers.
  - Shows the questions, overall match %, how far apart they submitted, tab switches, and **Open** buttons for both results.
- These checks need at least 6 students to judge a test.

### Changed
- New attempts store `qMeta` (subject / chapter / level per question), so progress and the notebook need no extra reads. Older attempts use the practice index.

> **After merging — publish the rules:** `firestore.rules` adds `notebooks/{uid}` (the student writes their own; staff can read it).
> Until they are published, ticking **Cleared**, notes and retry-clearing can't save; everything else works.

---

## 2026-10-06 — ⏱ "Where did your time go?" on every result

- New card at the top of every result, for students and staff. It splits the test time into:
  - correct within ideal time
  - correct but over ideal time
  - **wrong answers**
  - **dead time on questions opened but left blank**
  - moving between questions
  - time **left unused** at submit
- Shown as a coloured bar, with totals for productive time vs **dead time** (time that earned no marks).
- **What this tells you:** plain-language advice drawn from the attempt:
  - how many more questions the dead time could have paid for
  - questions you got stuck on for more than twice their ideal time
  - marks lost to negative marking, and the score you would have had by leaving those blank
  - questions never opened
  - questions revisited 3+ times
  - submitting early with blanks
- **Biggest time sinks:** the questions that took the longest and earned nothing, with time vs ideal and the number of visits.
- Attempts now store `examDurationSec`, so unused time is exact. Older attempts take the length from the exam.

### Added — compare with the class, and 🚩 suspiciously fast answers

- **Question-by-question** on every result (students and staff) has four new columns:
  - **Class correct** — how many got it right out of everyone who had the question
  - **Class avg time**
  - **Avg time (correct)** — average time of those who got it right
  - **You vs class** — e.g. "37% faster" or "2.1× slower"
- **Item Analysis** shows an **Avg time (correct)** column for each question.
- **🚩 Speed check** (staff only, on each result) and **🚩 Suspiciously fast correct answers** (Item Analysis, whole test or batch) flag a correct answer when either:
  - it was far quicker than the ideal time on a tough question (same rule as the Live Monitor), or
  - it took under **40%** of the average time of the *other* students who got it right (needs 3+ of them and a gap of 15 s+).
- Item Analysis lists the flagged students with the count (e.g. "6 of 10"), each question's time vs the class average, tab switches, and an **Open result** button. A flag is a reason to look closer, not proof.

> **After merging:** nothing to publish.

---

## 2026-10-05 (later) — ▶ Run the AI job from the website

- **Diagnostic Builder:** while an AI solve is waiting, the box has a **▶ Solve now** button, so you no longer wait for the hourly run.
- **AI Settings → ▶ Run the AI job now:** an admin saves a GitHub **fine-grained token** once (this repo only, *Actions: Read and write*, nothing else). After that, any staff member can start the job with one click. Progress shows in **AI job — live progress**.
- If no token is saved, the button says so and links to the GitHub Actions page instead.

> **After merging — publish the rules:** copy [`firestore.rules`](firestore.rules) into Firebase → Firestore → **default** → Rules → **Publish**
> (new: staff may read `settings/aiRunner`). Then in **AI Settings**, paste the token and press **Save**, then **▶ Run AI job now** to test.

---

## 2026-10-05 — Multiple-correct MCQs, replace a question's image, AI solves a saved test

### Added — multiple correct options

- An MCQ key can now be **several letters** (e.g. `AC`). Diagnostic Builder: the Answer column is four tick boxes (A–D) — tick one for single correct, several for multiple correct. Bulk Import / Answer Key / paste-a-key accept `1-AC`, `1-A,C`, `1-A/C`; JSON upload accepts `"correct_answer": "AC"`; the local question builder has the combinations too.
- Students see **tick boxes** and a "one or more options are correct — tick all that apply" note on those questions (in tests and in chapter practice); single-key questions keep radio buttons.
- Marking is **all-or-nothing**: full marks only when the ticked set equals the key exactly; anything else counts as wrong (negative marking applies). Answers are stored as sorted letters (`"AC"`). Reports, item analysis, re-grade, custom practice and the AI follow-up job all grade the same way.

### Added — switch a question between MCQ and Numerical

- Diagnostic Builder: the **Sec** column is now a **MCQ / Numerical** dropdown on every row. Numerical = the student **types the answer** (the key is a number). Switching clears a key that doesn't fit the new type; Save writes the new type, and if students already submitted you are offered a re-grade. The "add images" Section picker is relabelled *MCQ (tick options)* / *Numerical (student types the answer)*.

### Added — 🖼 Replace image

- Diagnostic Builder: **Replace image** on every question row (pick a file or paste a screenshot with Ctrl+V), saved with **Save test**. Questions tab: **Replace image** next to Preview saves straight away. Only the picture changes — key, topic, level and times stay. Tests that share the question show the new image (you are told which). The AI's old second opinion on that question is cleared so it is re-checked.

### Added — 🤖 Ask AI to solve this test (key + ideal time)

- Diagnostic Builder, after saving a test: **Ask AI to solve this test**. On its next run the AI job transcribes image questions, solves every question with **two models** independently and stores, per question, its answer (several letters for multi-correct), whether the two models agreed, and an ideal time.
- The builder shows the AI's answer and time next to yours (green ✓ = same, red = differs, with a **Use** button), plus **Use AI keys (where both models agree)** and **Use AI ideal times**. Nothing changes until you Save. A **blank** key is filled automatically only when both models agree (`keySrc: "ai"`).
- AI Settings → live progress shows the new "Solving tests teachers asked the AI to solve" step and a summary.

> **After merging:** nothing to publish (no new Firestore rules — the request is a field `aiSolve` on the exam, written by its creator or an admin).
> Results arrive on the next AI job run (hourly at :17) — or start it right away from GitHub → Actions → **AI follow-up practice** → Run workflow.

## 2026-10-01 (later) — Assign Tests tab, batch dropdowns, AI answer-key review, live AI progress

### Added — 📚 Assign Tests tab (admin + faculty)

- All your diagnostic tests in one place, **grouped by chapter, then subtopic**, each chapter collapsible. Filter by exam type and active / inactive.
- Per test: **Preview**, **Edit** (opens it in the Diagnostic Builder), **Assign** (choose who gets it) and **Activate / Deactivate**.
- Diagnostic tests no longer clutter the **Exams** tab (that tab is for ordinary tests only).
- New optional exam fields **`chapter`** and **`subtopic`**, set in the Diagnostic Builder. Older tests fall back to their first topic as the chapter and "General" as the subtopic.

### Added — batch and student assignment

- **Batch dropdown** (tick several) wherever a batch is chosen — Diagnostic Builder, Activate popup, Exams form. Lists `TR01, TW01, OR01, OW01, RM01, RM02, RM03` plus any other batch your students already have. Matching is case-insensitive.
- The Diagnostic Builder has a **Who can take this test?** control (all students / specific batches / specific students) saved with the test.
- Fixed the **student picker** layout (checkbox and name were stretched apart because every input was forced to full width).

### Added — AI reviews the answer keys and ideal times you enter

- For image questions you keyed yourself, the AI job solves each one with two models and records `aiVerify` (agrees / agrees-weak / disagrees / split / unsure) and whether your ideal time is far from its estimate. It never changes your key or time.
- When you leave a key or time blank, the AI proposes one (`keySrc` / `idealTimeSrc` record where each value came from). A test cannot go live while a question still has no key.
- Older questions without `keySrc` (ids starting `DG_`) are now included in the review.

### Added — live AI progress in the website

- **AI Settings → AI job — live progress**: shows RUNNING / Idle, the current step, and the job's log lines as they happen (the job writes them to `settings/aiStatus`). No more checking GitHub Actions for progress.

### Changed

- Admin accounts are exempt from the one-device login rule (faculty and students still sign in on one device at a time).

> **After merging:** nothing to publish (no new Firestore rules). The live-progress box fills in on the **next AI job run** — start the
> **AI follow-up practice** workflow once from GitHub → Actions → Run workflow, or wait for the hourly run.

---

## 2026-10-01 — Live Monitor, honesty & consequences, AI Settings

### Added — ● Live Monitor (admin + faculty)

- Real-time list of students writing each active test: progress, current question, time left, live/idle heartbeat.
- **Tab switches / fullscreen exits** reported the moment they happen (previously only saved at submit).
- **⚡ Too-quick answers** on tough questions: Advanced under 25% of ideal time (min 8 s), Intermediate under 15% (min 5 s). Bloom never flagged.
- Alerts feed with optional sound; "submitted in the last 3 hours" with clean / flagged / malpractice.
- Teacher actions: **📢 Warn** (message pops up on the student's screen) and **Stop** (submits immediately, flagged malpractice, reason shown).

### Added — honesty & consequences for students

- **Honesty pledge** checkbox before Start; recorded on the attempt.
- Warnings now tell the student the teacher was notified live; the proctoring notice says what the teacher sees.
- **🛡 Integrity report** on every result: tab switches with times, too-quick answers, pledge, teacher's note (staff write it on the result
  page; the student sees it) — or a "✅ Honest attempt" recognition when clean.
- Reports table shows flagged attempts with 🚨 switch and ⚡ quick counts. Attempts store `quickAnswers`.

### Added — AI Settings tab (admin only)

API key, base URL, writer / checker / vision models and limits for the AI job, stored in Firestore (`settings/ai`, `settings/aiSecret`) and
overriding GitHub variables/secrets. The key is shown only as its last 4 characters. The job reports each run to `settings/aiStatus`
(key accepted, models found, summary, provider's model list — offered as suggestions). `AI_API_KEY` in GitHub is now optional.

> **Publish `firestore.rules`** (new `settings` rule: admins only; `aiStatus` readable by staff).

Note: students can still edit their own attempt document (existing rule), so a determined student could tamper with recorded flags via
developer tools; the live alerts the teacher already saw can't be undone. Anti-cheat remains client-side (see README → Notes).

---

## 2026-10-01 — AI follow-up practice (write → blind-check → teacher publishes)

### Added

- **🤖 AI follow-up practice** option on tests (Diagnostic Builder; default on for new diagnostic tests). Each submission is queued.
- **Hourly job** (`ai/`, `.github/workflows/ai-followup.yml`): waits up to 2 h for the student's reasons, one model writes new questions aimed at
  each mistake, a different model solves each blind → ✅ Verified / ⚠ Disputed / ❌ Rejected. Image-only questions are transcribed first.
  Results go to the new `aiDrafts` collection. Offline tests (`node ai/test.mjs`) run before every job.
- **Custom Practice → AI follow-up drafts**: queue status, drafts to review, Review / Dismiss. Review opens the draft in the Diagnostic Builder
  with each question's verdict, both solutions, and inline editing of stem/options/solution.
- Saving creates the test for **that student only**; nothing is visible until you confirm **Publish**. Saved questions carry `aiGenerated`
  (verdict, models, original AI key).

### Setup required

> **Publish `firestore.rules`** (new `aiDrafts` rule), add secrets `AI_API_KEY` and `FIREBASE_SERVICE_ACCOUNT`, then run the workflow once
> from the Actions tab. See README → "AI follow-up practice". Existing tests: open in the Diagnostic Builder, tick AI follow-up, Save.

---

## 2026-09-30 — Levels, faster images, "why wrong" reflection, custom practice

### Changed — levels renamed

Difficulty is now the diagnostic **Level**: **Bloom Level → Intermediate Level → Advanced Level** everywhere
(builder, bank, practice, reports, CSVs). Stored values are unchanged (`Easy`/`Medium`/`Hard`), so existing
questions, JSON files and the practice index keep working; JSON uploads also accept the new names.
Item Analysis flags "Hard"/"Easy" became "Low accuracy"/"High accuracy" to avoid clashing with levels.

### Changed — image compression (faster exams)

- Every uploaded image is re-encoded to ≤1000 px wide and ~180 KB — the smallest of WebP / PNG / JPEG
  (option images ≤600 px, ~60 KB). Previously up to ~700 KB each. JSON uploads are compressed too.
- **Questions → 🗜 Compress stored images** re-encodes images already in the bank (only replaced when clearly smaller).
  Run it once after deploying. (WebP needs Safari 14+; set `IMG_ALLOW_WEBP = false` for very old iPads.)

### Added — student report: concept understood?

- Per topic: **Concept** verdict (✅ Understood / 🟡 Understood — slow / 🟠 Partly / ❌ Not understood yet) and
  **Level reached** (highest level cleared at ≥60%, climbing from Bloom), time taken vs ideal.
- **Level-wise** table: accuracy, time taken and ideal time per level, cleared / not cleared.
- Question table gains Level and "Why (student)" columns.

### Added — "Why did these go wrong?" (after the test)

On the result page the student picks a reason (and optional note) for each wrong or skipped question.
Saved on the attempt as `reasons`; shown to staff in the result, Item Analysis ("Why (students)") and CSVs.

### Added — Item Analysis: concept understanding by student

Student × topic grid of concept verdicts and level reached, plus how many reasons each student gave.

### Added — Custom Practice tab

Per-student follow-up tests from wrong/skipped questions, chosen by reason (concept gap → Bloom upward;
accuracy slip → same level; speed → same or easier level; no reason → inferred from timing), optional re-test of
the originals and speed practice. Each is an exam assigned only to that student, ideal time shown, easiest first.

No Firestore rules change needed — students already may update their own attempt.

---

## 2026-09-30 — Diagnostic Builder, editable tests, ideal time per question

### Added — Diagnostic Builder tab (admin + faculty)

Build topic-wise diagnostic tests without writing JSON.

- **Images in**: pick files, drag & drop, or **paste a screenshot (Ctrl+V)** — each image becomes one question
  (compressed to fit Firestore's 1 MB limit), tagged with the chosen subject/topic/difficulty. Answers are read
  from filenames where possible, same as Bulk Import.
- **Bank in**: find existing questions by topic and add the ones you want.
- Per question: answer, topic, difficulty, **ideal time**, reorder (↑/↓), remove (✕). Paste a key in row order
  (`1-A 2-C`, `ABCD…`, or option numbers `1 3 2 4`).
- Test options: **keep question order** (no shuffling), **show ideal time to students**, duration = total ideal time +10%.
- New image questions are written to the bank on save with IDs `DG_<TITLE>_<stamp>_NNN`.

### Added — edit any existing test

- **Edit** button in the Exams tab opens the test in the builder: **change the key, add or remove questions**,
  change ideal times / scoring / duration. Audience and active state are left alone.
- The key is stored on the question, so a change also applies to other tests using that question — the builder
  shows "also in N other test(s)" and repeats it in the save confirmation.
- **Re-grade submitted attempts**: offered automatically after a key change or question add/remove, or by button.
  Recomputes score, subject scores and wrong/unanswered lists. Removed questions drop out; questions added after a
  student sat the test are not counted against them. The previous score is kept as `scoreBeforeRegrade`.
- Faculty can only change the key on questions they uploaded; a denied change is named in the log and stays highlighted.

### Added — ideal time per question

- New optional `idealTimeSec` on questions; exams can override per question (`idealTimes`). Defaults by difficulty:
  NEET 45/60/90 s, JEE 90/120/180 s (numericals ×1.5).
- In the exam (when the test enables it): a live "⏱ time on this question / ideal" chip, amber once over.
- Result page: **Ideal** and **Diagnosis** columns per question, ideal time per topic, and a new
  **Diagnosis — speed × accuracy** section (Mastered / Correct but slow / Wrong & fast / Wrong & slow / Skipped)
  with a "what to do next" line per topic. CSV gains `IdealSec` and `Diagnosis`.
- Item Analysis: **Ideal** column, avg time shown amber when over it, and an **Over ideal time** flag (avg > 1.5× ideal).
- Each attempt stores the ideal times it was held to (`idealTimes`), so later edits don't rewrite old reports.

No Firestore rules change needed — this uses the existing exam/question/attempt write permissions.

---

## 2026-08-23 — Bulk Import: auto answer key from filename, "Option N" display

### Changed — Bulk Import (admin)

- Correct answer is now **guessed straight from each image's filename** as soon as it's loaded —
  recognises trailing forms like `Q12_B.jpg`, `Q12-Ans-B.png`, `Q12(2).png`, `Q12_key3.jpg`.
  Letter suffixes (A–D) are preferred over bare digits, since a lone trailing digit is ambiguous
  with the question number already read from the filename.
- Rows the guesser couldn't read are **highlighted red** in the review table so they're easy to spot;
  pasting a key in step 2 still works as a fallback/override, same as before.
- Loading message now reports how many keys were auto-read vs. still need one.

### Changed — how image-only questions display to students

Bulk-imported questions (options drawn inside the picture, none typed separately) now show
**"Option 1 / Option 2 / Option 3 / Option 4"** instead of blank `(A)(B)(C)(D)` buttons, in the
live exam, Practice by Chapter, and both admin preview screens. Grading is unaffected — answers are
still stored/graded as A/B/C/D internally, mapped 1↔A, 2↔B, 3↔C, 4↔D; only the label students see changed.
Ordinary questions with real option text still show `(A)`–`(D)` as before.

---

## 2026-07-28

### Added — Practice by Chapter (student self-study)

Students can build their own practice set from the question bank, aimed at school exams that
don't line up with the Aakash schedule.

- Student dashboard card: pick **subject**, tick **multiple chapters**, choose **question count**
  (10/25/50/75) and **difficulty**, and optionally **skip questions already practised**.
- Relaxed session — **no fullscreen lock, no tab-switch warnings, no malpractice flagging**.
- **Instant feedback after each question**: correct option highlighted green, their wrong pick red,
  plus time spent on that question (with a nudge if over 2 minutes).
- Summary: accuracy, chapter-wise breakdown (weakest first), and a review list of everything wrong.
- **My Practice History** table on the dashboard.
- Stored in a **separate `practiceAttempts` collection** — practice never affects Reports,
  Leaderboard, Item Analysis, Attendance, rank or percentile.

### Added — Topics tab (admin): chapter name manager

- Lists every distinct `topic` in the bank with question counts, per exam type / subject.
- Flags questions that have **no topic** (they can't appear in any student chapter list).
- **Rename** one chapter, or tick several and **merge** them under a single name.
- **Rebuild practice index** button — see below.

### Added — `topicIndex` collection (practice index)

One small document per `examType__subject` holding only `{id, topic, difficulty, section}` per question.
Students read this to browse chapters instead of downloading the whole image-heavy bank; only the
questions actually served in a set are fetched in full.

> **After importing questions or renaming topics, click Topics → Rebuild practice index.**
> Students see chapters only from this index, so until it is rebuilt, new questions are invisible to practice.

### Changed — Firestore rules

Added `topicIndex` (read: signed in, write: staff) and `practiceAttempts` (read: own or staff,
create: own only, delete: staff).

> **Publish `firestore.rules` in the Firebase console after deploying.**
> Until then the catch-all deny rule blocks both collections and practice will fail to save.

---

## 2026-07-28 — Timing analytics for students

Per-question timing was previously staff-only. Students now see, on their own result page:

- **Time Spent** column in the question-by-question table
- **Pace Analysis** — per subject: attempted, total time, avg per attempted question, count of slow
  questions (over 2 min)
- **Questions you spent the most time on** — their 5 slowest, each marked correct/wrong/unanswered
- Timing columns in the CSV download and the printed scorecard

No new data was recorded — `questionTimeSec` was already saved on every attempt; this only unhid it.

---

## 2026-07-28 — Bulk Import and Answer Key tabs

### Added — Bulk Import (admin)

Turn a folder of cropped question images into bank questions without hand-writing JSON.

- **Folder picker** (`webkitdirectory`) — subject and topic are read from the folder path
  (`Physics/Laws of Motion/q012.png`), with an editable review table to correct any of it.
- **Answer key paste** in any common format — `1-A 2-C`, `1. A` per line, `1,A`, or a bare `ABCDACBD…`
  run. Matched by the number in each filename, falling back to listed order.
- **Client-side image compression** — resize to 1200px, PNG first, then a JPEG quality ladder, then
  further downscaling, targeting ~700 KB so the document stays under Firestore's 1 MiB cap.
- Commits **8 documents at a time** to stay under the request size limit.
- **Download JSON instead** button if you'd rather keep a file.
- Re-importing an existing question `id` overwrites it, so a batch can safely be redone.

Imported questions are **image-only**: the options live in the picture, so the student sees the image
with blank (A)(B)(C)(D) buttons.

### Added — Answer Key (admin)

Patch `correct_answer` on questions already in the bank — scoped to one exam or a whole subject bank,
with a **preview of current → new** before applying. This is the tool for filling placeholder answers.

---

## 2026-07-28 — Item Analysis tab

Cumulative question-level analysis across every submitted attempt for a test, optionally filtered by batch.
**Admin + faculty only** (faculty scoped to exams they created); never visible to students.

- Summary: candidates, average score, average accuracy, attempt rate
- Quick panels: struggled most, left blank most, biggest time sinks
- Chapter/topic rollup, heat-coloured, weakest first
- Per-question table: % correct, wrong, blank, **most-picked wrong option** (distractor analysis),
  average time, average revisits, sortable
- Auto flags: `Hard`, `Trap → C`, `Often skipped`, `Time sink`, `Easy`
- Drill-down per question naming **which students** got it wrong, left it blank, and who was slowest
- CSV export

---

## Earlier (June – July 2026)

Reconstructed from project notes rather than a contemporaneous log, so treat dates within this section
as approximate.

- **PS-ID login** — students log in with an 11-digit PS-ID, mapped to a synthetic
  `<psid>@id.exam.local` address for Firebase Auth. Staff use an Employee ID. No real email collected.
- **Single active session per account** — a new sign-in kicks the old device. Mid-exam this now *saves*
  progress rather than submitting, so the new device resumes the same attempt with the timer running on
  wall-clock (no reset, no extra time).
- **Admin password management** — student passwords stored alongside the profile, with a masked
  Password column and a Change PW action (re-auths on a secondary Firebase app; no Admin SDK).
- **Attendance / Absentees tab** — assigned-vs-attempted per exam, absentee CSV export.
- **Leaderboard** with batch filter, and **student progress trend charts**.
- **Bulk student CSV import**.
- **Targeted exam audience** (all / batch / specific students) and scheduled open/close windows.
- **Biology** added as a medical subject, so a test can use Botany+Zoology or a single Biology subject.
- **Question bank browse** with preview modal, upload date, and "used in test(s)".
- Fullscreen anti-cheat with 3 warnings → auto-submit flagged `malpractice`.

---

## Conventions

- **Deploy** = upload changed files to GitHub (repo root, `main`) and commit. GitHub Pages rebuilds in
  1–2 minutes; cache-bust with `?v=N` and a hard refresh when verifying.
- **Firestore is a named database `default`**, not the built-in `(default)` — `getFirestore(app, "default")`,
  and the same in rules `get()` paths.
- `index.html` is the whole SPA. There is no build step.
- Add an entry here in the same commit as the change.
