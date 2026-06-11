# NTA-Style Online Exam Portal

A zero-build, single-page exam portal that replicates the NTA CBT (Computer-Based Test) experience for **NEET-UG (Medical)** and **JEE Mains (Engineering)** patterns. Pure HTML + CSS + vanilla JS, Firebase (Firestore + Auth) for the backend, MathJax for LaTeX, hosted free on GitHub Pages.

Includes: custom-size exams (any subjects/counts/duration/scoring), image & cropped-image questions, fullscreen anti-cheat with malpractice auto-submit, per-question time tracking, randomized option order, on-screen calculator, topic-wise analytics, PDF scorecards, scoped **faculty** accounts, and **targeted exam assignment** (all / batch / specific students).

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire SPA — login, admin/faculty dashboard, student dashboard, exam interface, result page. |
| `question-builder.html` | Standalone local tool to crop images from screenshots/PDFs and export an exam JSON (base64 images embedded). Nothing is uploaded — runs in your browser. |
| `firestore.rules` | Firestore security rules (super-admin / faculty / student, with ownership). |
| `sample_medical.json` | 20 sample NEET questions (5 per subject). |
| `sample_engineering.json` | 21 sample JEE questions (5 MCQ + 2 Numerical per subject). |
| `README.md` | This file. |

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

In the Firebase console: **Firestore Database → Rules**, paste the contents of `firestore.rules`, and **Publish**.

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
- **Students** tab *(admin only for add/delete)* → add students with name, email, password, exam type, and optional **batch**.
- **Faculty** tab *(admin only)* → manage faculty/admins.
- **Questions** tab → upload a question JSON (`sample_*.json`, your own, or one made with `question-builder.html`). Browse/delete by subject. Faculty can delete only their own questions; only admins can clear a whole subject bank.
- **Exams** tab → set title, **duration**, **scoring** (type default / no-negative / custom), optional **shuffle option order**, choose **who can take it** (all of that type / specific batches / specific students), *Load Bank*, tick any questions (any subjects, any count — "First N" buttons help), *Create Exam*, then **Activate**. Multiple exams can be active at once for different audiences.
- **Reports** tab → attempts table (admins see all; faculty see their own exams' attempts), filter by student/type/date, malpractice flag, click a row to open the full result, export CSV.

**As student:**
- Log in → **Available Exams** lists every active exam targeted to you (by type, batch, or direct assignment) → **Start Exam (Fullscreen)**.
- Timer (red under 5 min), subject tabs, NTA-colour palette, Mark for Review, Save & Next, **on-screen calculator**, auto-save every 30 s, auto-submit at 0:00.
- **Proctoring:** exam runs in fullscreen; switching tabs / leaving fullscreen / leaving the window is recorded. After **3 warnings** the test auto-submits and is flagged **malpractice** (with a logged reason + timestamps).
- On submit: instant score, percentile, rank, subject breakdown, **topic-wise weak-area analysis**, per-question table with time spent, error log (wrong + unanswered with images), CSV download, and **Print / Save as PDF** scorecard.

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
  "difficulty": "Medium",
  "examType": "medical"
}
```

- `section`: `"A"` = MCQ (4 `options` text **and/or** 4 `optionImages`, `correct_answer` is `A`/`B`/`C`/`D`), `"B"` = Numerical (omit options, `correct_answer` is a number string).
- A question needs **`text` or `image`** (or both). Images are base64 data URIs and are zoomable in-exam and in the review.
- `examType`: `"medical"` or `"engineering"`. The subject must be valid for that type.
- Easiest way to build image/cropped-question papers: open **`question-builder.html`**, load a screenshot, drag to crop each question/option, fill the answer, and **Download JSON** — then upload it in the Questions tab.
- Upload validates every item and reports rejected rows with reasons; each question records who created it.

---

## 7. Deploy on GitHub Pages

1. Create a GitHub repository and push all files to the **root** (or a `/docs` folder).
2. **Settings → Pages → Build and deployment → Source = Deploy from a branch**, branch `main`, folder `/ (root)` (or `/docs`), **Save**.
3. Your portal goes live at `https://<username>.github.io/<repo-name>/`.
4. Back in Firebase: **Authentication → Settings → Authorized domains → Add domain** → add `<username>.github.io` so login works from the hosted site.

No build step, no CLI, no Firebase Hosting config needed. Firebase is used **only** for Firestore + Authentication.

## Notes & limitations

- Deleting a student or faculty from the UI removes their `/users` profile only; remove the Auth login itself from **Authentication → Users** in the console.
- **Anti-cheat is client-side.** It deters casual cheating (tab-switching, copy/paste, leaving fullscreen) but cannot stop a determined student on a second device or with JavaScript disabled. True lockdown needs a dedicated exam browser or webcam proctoring.
- Rank/percentile are computed client-side from all attempts of the same exam type. To keep scores private, tighten the `attempts` read rule in `firestore.rules` to owner-or-staff (a comment marks where).
- An attempt document id is `{examId}_{uid}`, so a refresh mid-exam resumes the same attempt (responses auto-saved). Shuffled question/option order is cached in `sessionStorage` for the duration of the exam; answers are always stored against the original option letters so reviews stay correct.
- Base64 images live inside each question document (Firestore's 1 MB/doc limit applies — fine for normal cropped questions). For very large image sets, switch to Firebase Storage URLs.
- LaTeX renders via MathJax 3 from CDN; write inline math as `$...$`.
