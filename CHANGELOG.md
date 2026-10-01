# Changelog

All notable changes to the exam portal. Newest first.

Format: each entry says **what changed**, and — where it matters — **what you must do after deploying it**
(publish rules, rebuild an index, etc.). Those follow-up steps are the things that get forgotten.

---

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
