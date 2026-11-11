# NTA-Style Online Exam Portal

A zero-build, single-page exam portal that replicates the NTA CBT (Computer-Based Test) experience for **NEET-UG (Medical)** and **JEE Mains (Engineering)** patterns. Pure HTML + CSS + vanilla JS, Firebase (Firestore + Auth) for the backend, MathJax for LaTeX, hosted free on GitHub Pages.

Includes: custom-size exams (any subjects/counts/duration/scoring), image & cropped-image questions, **answer keys sealed away from students** and server-checked attempts (see [Security model](#security-model)), fullscreen anti-cheat with malpractice auto-submit, per-question time tracking, randomized option order, topic-wise analytics, PDF scorecards, scoped **faculty** accounts, **targeted exam assignment** (all / batch / specific students), **cumulative item analysis** for staff, **bulk image import** straight from a folder of cropped questions, and **student self-study practice** by chapter.

See [`CHANGELOG.md`](CHANGELOG.md) for what changed and when — including the follow-up steps some changes need (publishing rules, rebuilding the practice index).

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire SPA — login, admin/faculty dashboard, student dashboard, exam interface, result page. |
| `manifest.webmanifest`, `sw.js`, `icons/` | Make the portal installable as a phone app (PWA). `sw.js` is network-first and never caches Firebase calls. |
| `question-builder.html` | Standalone local tool to crop images from screenshots/PDFs and export an exam JSON (base64 images embedded). Nothing is uploaded — runs in your browser. |
| `firestore.rules` | Firestore security rules (super-admin / faculty / student, with ownership; sealed keys, private attempts). |
| `jobs/`, `.github/workflows/password-reset.yml` | The one server-side job: admin password reset without the old password (Firebase Admin SDK, started by hand). |
| `tests/` | Security-rules tests that run against the Firebase emulator (`tests/README.md`). |
| `sample_medical.json` | 20 sample NEET questions (5 per subject). |
| `sample_engineering.json` | 21 sample JEE questions (5 MCQ + 2 Numerical per subject). |
| `README.md` | This file. |
| `CHANGELOG.md` | Dated record of features and changes, with any post-deploy steps they require. |
| `CLAUDE_TO_GPT.md` / `GPT_TO_CLAUDE.md` | Message channel between Claude and ChatGPT (timestamped). `CLAUDE_TO_GPT.md` also briefs ChatGPT on the whole project and the question-upload format. |
| `CLAUDE.md` | Notes Claude reads at the start of every session (check the ChatGPT channel first; project conventions). |

## Roles

- **admin (super-admin)** — full control: manage students and faculty, all questions/exams, all reports.
- **faculty (exam creator)** — upload questions and create/activate/run their own exams; see reports for their own exams. Cannot manage students/faculty or touch other people's questions & exams. Enforced by `firestore.rules`.
- **student** — take exams targeted to them, see their own results.

## Exam patterns

**Medical (NEET-UG):** Physics, Chemistry, Botany, Zoology — 45 MCQ each (180 total). 180 min. +4 / −1 / 0. Max 720.

**Engineering (JEE Mains):** Physics, Chemistry, Mathematics. Per subject: Section A = 20 single-correct MCQ (+4 / −1 / 0), Section B = 5 Numerical (+4 / 0 / 0). 75 total. 180 min. Max 300.

---

## 1. Create a Firebase project

1. Go to <https://console.firebase.google.com> → **Add project**.
2. Once created, open **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
3. Open **Build → Firestore Database → Create database** → start in **production mode** → pick a region.

## 2. Paste your Firebase config

1. In the Firebase console: **Project settings (gear) → General → Your apps → Web app (`</>`)**. Register an app (no Hosting needed).
2. Copy the `firebaseConfig` object.
3. In `index.html`, find the block marked `// PASTE FIREBASE CONFIG HERE` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
```

## 3. Apply the security rules

In the Firebase console: **Firestore Database → Rules**, paste the contents of `firestore.rules`, and **Publish**. Then, as admin, open
**Security & setup** in the portal and run **Seal answer keys** (on a new project there is nothing to move; it just switches sealing on).

## 4. Create the first admin (bootstrap)

Security rules only let an **existing admin** create users, so the first admin must be made by hand:

1. **Authentication → Users → Add user** — enter an email + password. Copy the generated **User UID**.
2. **Firestore Database → Start collection** → collection id `users` → **Document ID = that UID**, with fields:
   - `name` (string) — e.g. `Admin`
   - `email` (string) — the same email
   - `role` (string) — `admin`
   - `examType` (string) — `medical` (ignored for admins)
   - `createdAt` (timestamp) — current time
3. Save. You can now log in as admin and create everything else from the UI.

## 5. Add faculty (optional)

As super-admin, open the **Faculty** tab → *Add Faculty* (name, email, password). They log in at the same URL and get a Faculty Dashboard. You can also promote a faculty → admin, or demote/remove them. (Removing here deletes their profile; also delete their login in **Authentication → Users** to free the email.)

## 6. Use the portal

**As admin / faculty:**
- **Students** tab *(admin only for add/delete)* → add students with name, **11-digit PS-ID**, password, exam type, class, and optional **batch**. Bulk CSV import available; admins can view/change stored passwords.
- **Faculty** tab *(admin only)* → manage faculty/admins.
- **Questions** tab → upload a question JSON (`sample_*.json`, your own, or one made with `question-builder.html`). Browse/delete by subject. Faculty can delete only their own questions; only admins can clear a whole subject bank.
- **Bulk Import** tab → point at a **folder of cropped question images** and import them straight into the bank, no JSON needed. Subject and topic are read from the folder path (`Physics/Laws of Motion/q012.png`) with an editable review table; paste the answer key in any common format (`1-A 2-C`, `1. A` per line, or a bare `ABCDACBD…` run). Images are compressed in-browser to stay under Firestore's 1 MB per-document limit. Re-importing an existing `id` overwrites it.
- **Answer Key** tab → patch `correct_answer` on questions **already uploaded**, scoped to one exam or a whole subject bank, with a preview of current → new before applying. Use this when a test went up with placeholder answers.
- **Topics** tab → every distinct chapter name in the bank with question counts, and how many questions have **no topic**. Rename a chapter or merge several into one name. Also holds **Rebuild practice index** (see below).
- **Exams** tab → set title, **duration**, **scoring** (type default / no-negative / custom), optional **shuffle option order**, choose **who can take it** (all of that type / specific batches / specific students), *Load Bank*, tick any questions (any subjects, any count — "First N" buttons help), *Create Exam*, then **Activate**. The Activate window also sets an optional **opening / closing time** and **when students see their marks, the answers and the solutions**: right after submitting, after the test closes, or only when you press **Release results**. Multiple exams can be active at once for different audiences.
- **Diagnostic Builder** tab → build a **topic-wise diagnostic test** straight from question **images** (pick files, drag & drop, or paste a screenshot with Ctrl+V) and/or matching bank questions filtered by topic. Per question: set the **answer** (dropdown, or paste a key in row order — `1-A 2-C`, `ABCD…`, or option numbers `1 3 2 4`), **topic**, **difficulty** and **ideal time**; reorder with ↑/↓ and remove with ✕. Options: keep question order (no shuffling, e.g. easy → hard), show ideal time to students, duration = total ideal time. **Edit** on any exam in the Exams tab opens it here to **change the key or add/remove questions**; if students already submitted, it offers to **re-grade** their attempts (old score kept as `scoreBeforeRegrade`). The key lives on the question, so the builder warns when a question is also used in other tests. Faculty can only change the key on questions they uploaded. The **Answer** column has A–D tick boxes: tick several for a **multiple-correct** question. **🖼 Replace image** swaps only the picture of a saved question (key, topic and times stay; also on the Questions tab).
- **Custom Practice** tab → pick a test (and batch): for every student who took it, builds a **follow-up test from what they got wrong or skipped, driven by the reason they gave** — *concept gap* (didn't understand / forgot formula / didn't know / guessed) → same topic, one level below the question (Easy stays Easy); *accuracy slip* (misread / calculation / silly) → same topic, same level; *speed* (rushed / too lengthy / ran out of time) → same topic, same or easier level. Optionally re-tests the original questions and adds speed practice for "correct but slow". Preview each plan, then create — each test is assigned only to its student (inactive by default). Uses the practice index, so **Rebuild practice index** after adding questions.
- **● Live Monitor** tab → real-time view of every active test: who is **writing now** (progress, question, time left, live/idle heartbeat),
  **tab switches / fullscreen exits** as they happen, and **⚡ too-quick answers** on tough questions (Hard under 25% of ideal time, min 8 s;
  Moderate under 15%, min 5 s). An **Alerts** feed (optional sound) lists starts, switches, quick answers and submissions. Per student:
  **📢 Warn** pops a message on their screen, **Stop** submits their test at once as malpractice with your reason. A "submitted in the last
  3 hours" list shows clean / flagged / malpractice. Faculty see only their own tests.
- **Security & setup** tab *(admin only)* → the three one-time steps (publish the rules → **Seal answer keys** → prepare ranks for
  past tests), the list of sign-ups waiting for approval, and the GitHub token that lets the Students tab start the password-reset job.
- **⚠ At-risk** tab → students showing warning signs over their last 3 tests (low or falling scores, skipping, dead time, missed tests, integrity problems, inactivity), scored **High risk / Watch**, with a link to each student's progress and mistake notebook.
- **Item Analysis** also runs an **answer-key check** (top scorers disagree with the key), **question quality** (discrimination index, unused options) and a **copying check** (shared wrong answers).
- **Students** get a **📒 Mistake notebook** (wrong + skipped questions by chapter, notes, cleared flags, untimed retry) and chapter-wise **progress across tests**. Staff see both in the **Progress** tab.
- **Reports** tab → attempts table (admins see all; faculty see their own exams' attempts), filter by student/type/date, malpractice flag, click a row to open the full result, export CSV.
- **Model Bank** tab (admin) → one question-model taxonomy per chapter (JSON upload); per model, the bank's usable questions at Easy / Moderate / Hard, gaps, and the questions themselves. Selected students can be given view access.
- **Leaderboard** tab → ranks for one exam, optional batch filter, subject-wise columns, CSV export.
- **Item Analysis** tab → **cumulative question-level analysis** across every submitted attempt for a test (optionally one batch). Shows % correct / wrong / blank per question, the **most-picked wrong option** (distractor analysis), average time, average revisits, and auto flags (`Hard`, `Trap → C`, `Often skipped`, `Time sink`, `Easy`), plus a chapter rollup and a drill-down naming which students got each question wrong, left it blank, or were slowest on. **Staff only — never shown to students.** Faculty see only their own exams.
- **Attendance** tab → assigned-vs-attempted per exam; absentee CSV.
- **Progress** tab → a student's score trend across attempts.

**As student:**
- Log in → **Available Exams** lists every active exam targeted to you; **Start** unlocks after ticking the **honesty pledge** (by type, batch, or direct assignment) → **Start Exam (Fullscreen)**.
- Timer (red under 5 min), subject tabs, NTA-colour palette, Mark for Review, Save & Next, auto-save every 30 s, auto-submit at 0:00.
- **Proctoring:** the teacher sees the attempt **live** (heartbeat every 30 s, tab switches instantly, too-quick answers), can send a warning that pops up on screen, or stop the test. Exam runs in fullscreen; switching tabs / leaving fullscreen / leaving the window is recorded. After **3 warnings** the test auto-submits and is flagged **malpractice** (with a logged reason + timestamps).
- On submit: a summary (score ring, percentile, overall and batch rank, time) and tabs — **Overview** (a **"Why did these go wrong?" form**: reason + optional note for each wrong/skipped question, saved on the attempt, feeds Custom Practice; and **"Where did your time go?"**), **Chapters** (topic-wise weak areas, a **concept verdict** per topic with the **level reached**, a **level-wise** table, a **speed × accuracy diagnosis** against each question's ideal time), **Time** (pace, slowest questions), **Questions** (every question with time, class comparison and diagnosis) and **Mistakes** (wrong + skipped with solutions). CSV download, test PDF and **Print / save this report**. If the test holds its results back, the student sees only "Test submitted" until they are released.
- The **🛡 Integrity report** (tab switches with times, page reloads, device-clock changes, time over the limit, a corrected score, tough questions answered too quickly, a staff note) is a tab on the result **for staff only**; students never see it.

**Practice by Chapter (student self-study):**

For school exams that don't line up with the Aakash schedule, a student can build their own set from the question bank:

- Pick a **subject**, tick **several chapters**, choose **question count** and **difficulty**, and optionally **skip questions already practised**.
- The session is **relaxed** — no fullscreen lock, no tab-switch warnings, no malpractice flagging.
- **The answer is revealed after each question** (correct option in green, their wrong pick in red) along with time spent on it.
- Summary gives accuracy, a chapter-wise weakest-first table, and a review list of everything wrong. A **My Practice History** table keeps the last 20 sets.
- Practice is stored in a **separate `practiceAttempts` collection** and **never affects** Reports, Leaderboard, Item Analysis, Attendance, rank or percentile.

> Chapters come from the **practice index**, not the live bank. After importing questions or renaming topics, go to **Topics → Rebuild practice index** or students won't see the new material.

### Question JSON schema

```json
{
  "id": "PHY_001",
  "subject": "Physics",
  "section": "A",
  "text": "Question stem (LaTeX with $...$ allowed) — optional if 'image' is given",
  "image": "data:image/png;base64,...",          // optional: stem/diagram or a fully cropped question
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "optionImages": ["data:image/png;base64,...", "...", "...", "..."],  // optional: image options
  "correct_answer": "B",
  "topic": "Kinematics",
  "difficulty": "Medium",                          // level: Easy, Medium (shown as Moderate), Hard
  "idealTimeSec": 60,                              // optional: target time to solve; default by difficulty
  "examType": "medical"
}
```

- `section`: `"A"` = MCQ (4 `options` text **and/or** 4 `optionImages`, `correct_answer` is `A`/`B`/`C`/`D`, or several letters such as `"AC"` when more than one option is correct — students then get tick boxes and must tick exactly that set; all-or-nothing marking), `"B"` = Numerical (omit options, `correct_answer` is a number string).
- A question needs **`text` or `image`** (or both). Images are base64 data URIs and are zoomable in-exam and in the review.
- `examType`: `"medical"` or `"engineering"`. The subject must be valid for that type.
- `difficulty` is the diagnostic **level**. Stored values stay `Easy` / `Medium` / `Hard`; the portal shows them as **Easy / Moderate / Hard**. JSON uploads also accept `"Moderate"` (and the older `"Bloom"`, `"Intermediate"`, `"Advanced"`).
- `idealTimeSec` (optional): the time a well-prepared student should need. If absent it defaults by difficulty — NEET 45/60/90 s, JEE 90/120/180 s for Easy/Medium/Hard (numericals ×1.5). A test can override it per question (Diagnostic Builder), and each attempt stores the ideal times it was held to.
- Easiest way to build image/cropped-question papers: open **`question-builder.html`**, load a screenshot, drag to crop each question/option, fill the answer, and **Download JSON** — then upload it in the Questions tab.
- Upload validates every item and reports rejected rows with reasons; each question records who created it.

---

## Security model

What a student's browser is allowed to do is decided by `firestore.rules`, not by the page:

- **Answer keys are sealed.** After **Security & setup → Seal answer keys**, a question is two documents: `questions/{id}` (text,
  picture, options — what a test downloads) and `questionKeys/{id}` (answer, solution — staff only). A student can read a key only
  after **submitting** a test that contains the question, once that test's results are released (their page records it in
  `keyAccess/{uid}`, and the rules check the attempt), or when the question's data bank is released for self-practice.
- **Attempts.** A test starts only if it is active, inside its opening / closing time and of the student's stream. The start time
  and the submit time are the **server's**. While writing, a student cannot set a score or touch a teacher's fields; after
  submitting, the answers cannot change. The marks are then one write from the student's page — and every staff screen
  (Leaderboard, Item Analysis, Reports, Live Monitor, Release results) re-marks from the saved answers, corrects a different
  figure and keeps the device's as `scoreClient`.
- **Privacy.** A student reads only their own attempts. Rank, percentile and class columns come from `examStats/{examId}`.
- **Sign-up.** An account created from the login page is `pending` and sees no test or question until an admin approves it.
- **The timer** follows the server's clock (re-synced with every saved answer); setting the device clock back is ignored and recorded.

What the rules cannot do: stop a student photographing the screen or using a second phone, or mark a paper on the server
without the student's page or a teacher's screen being open (there is no server process — only the manual password-reset job).

## 7. Deploy on GitHub Pages

1. Create a GitHub repository and push all files to the **root** (or a `/docs` folder).
2. **Settings → Pages → Build and deployment → Source = Deploy from a branch**, branch `main`, folder `/ (root)` (or `/docs`), **Save**.
3. Your portal goes live at `https://<username>.github.io/<repo-name>/`.
4. Back in Firebase: **Authentication → Settings → Authorized domains → Add domain** → add `<username>.github.io` so login works from the hosted site.

No build step, no CLI, no Firebase Hosting config needed. Firebase is used **only** for Firestore + Authentication.

## Notes & limitations

- Deleting a student or faculty from the UI removes their `/users` profile only; remove the Auth login itself from **Authentication → Users** in the console.
- **Proctoring (fullscreen, tab-switch warnings) is client-side.** It deters casual cheating but cannot stop a determined student on a second device. What is enforced on the server is listed under [Security model](#security-model). True lockdown needs a dedicated exam browser or webcam proctoring.
- Rank/percentile per test: overall (everyone who wrote it) and batch-wise (same batch; the batch is saved on each attempt). Students get them from `examStats/{examId}`, which each submission adds to and staff screens rebuild.
- **Free Firestore plan (50,000 reads / 20,000 writes a day).** A student's dashboard reads only their own active tests (each test carries audience tokens in `exams.aud`), sections below the test list load when scrolled to, and during a test the answers are kept on the device at once and sent to the server at most once per save interval (**Settings → Usage → Staying inside the free plan**; default 60 s). That tab also estimates how many students a day fit the free plan and counts this browser's own reads and writes.
- An attempt document id is `{examId}_{uid}`, so a refresh mid-exam resumes the same attempt (responses auto-saved). Shuffled question/option order is cached in `sessionStorage` for the duration of the exam; answers are always stored against the original option letters so reviews stay correct.
- Base64 images live inside each question document (Firestore's 1 MB/doc limit applies — fine for normal cropped questions). All image uploads (Bulk Import, Diagnostic Builder, JSON upload) are re-encoded to ≤1000 px wide and ~180 KB (WebP/PNG/JPEG, whichever is smallest; option images ~60 KB) so exams load fast; **Questions → 🗜 Compress stored images** shrinks images already in the bank. Previously Bulk Import compresses to ~700 KB per image to stay inside it. **For a whole coaching package** (thousands of image questions) this approach runs into the free tier's 1 GiB storage ceiling — at that scale move images to Firebase Storage and keep only URLs in Firestore.
- **Collections used:** `users`, `questions`, `questionKeys`, `keyAccess`, `exams`, `attempts`, `examStats`, `sessions`, `settings`, `notebooks`, plus `topicIndex` / `bankIndex` (small per-subject indexes), `taxonomy`, `topicReports`, `passwordResets` and `practiceAttempts` (student self-study, deliberately separate from graded `attempts`). All are covered by `firestore.rules`; the catch-all rule denies anything else, so a new collection needs a rules change **published in the console** before it will work.
- LaTeX renders via MathJax 3 from CDN; write inline math as `$...$`.
