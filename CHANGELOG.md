# Changelog

All notable changes to the exam portal. Newest first.

Format: each entry says **what changed**, and — where it matters — **what you must do after deploying it**
(publish rules, rebuild an index, etc.). Those follow-up steps are the things that get forgotten.

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
