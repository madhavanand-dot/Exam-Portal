# NTA-Style Online Exam Portal

A zero-build, single-page exam portal that replicates the NTA CBT (Computer-Based Test) experience for **NEET-UG (Medical)** and **JEE Mains (Engineering)** patterns. Pure HTML + CSS + vanilla JS, Firebase (Firestore + Auth) for the backend, MathJax for LaTeX, hosted free on GitHub Pages.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire SPA — login, admin dashboard, student dashboard, exam interface, result page. |
| `firestore.rules` | Firestore security rules (admin vs student access). |
| `sample_medical.json` | 20 sample NEET questions (5 per subject). |
| `sample_engineering.json` | 21 sample JEE questions (5 MCQ + 2 Numerical per subject). |
| `README.md` | This file. |

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

## 5. Use the portal

**As admin:**
- **Students** tab → add student accounts (creates the Auth login + `/users` doc in one click).
- **Questions** tab → upload `sample_medical.json` / `sample_engineering.json` (or your own). Browse/delete by subject, or clear a whole subject bank.
- **Exams** tab → *Load Bank*, select questions per subject (use **Select first N** to auto-pick the official count), *Create Exam*, then **Activate** it. Only one exam per exam-type can be active at a time.
- **Reports** tab → all attempts, filter by student/type/date, export CSV.

**As student:**
- Log in → see the active exam for your exam type → **Start Exam**.
- Timer, subject tabs, question palette (NTA colours), Mark for Review, Save & Next, auto-save every 30 s, auto-submit at 0:00.
- On submit: instant score, percentile, rank, subject breakdown, question-by-question table, error log (wrong + unanswered), CSV download.

### Question JSON schema

```json
{
  "id": "PHY_001",
  "subject": "Physics",
  "section": "A",
  "text": "Question stem (LaTeX with $...$ allowed)",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct_answer": "B",
  "topic": "Kinematics",
  "difficulty": "Medium",
  "examType": "medical"
}
```

- `section`: `"A"` = MCQ (4 options, `correct_answer` is `A`/`B`/`C`/`D`), `"B"` = Numerical (omit `options`, `correct_answer` is a number string).
- `examType`: `"medical"` or `"engineering"`. The subject must be valid for that type.
- Upload validates every item and reports rejected rows with reasons.

---

## 6. Deploy on GitHub Pages

1. Create a GitHub repository and push all files to the **root** (or a `/docs` folder).
2. **Settings → Pages → Build and deployment → Source = Deploy from a branch**, branch `main`, folder `/ (root)` (or `/docs`), **Save**.
3. Your portal goes live at `https://<username>.github.io/<repo-name>/`.
4. Back in Firebase: **Authentication → Settings → Authorized domains → Add domain** → add `<username>.github.io` so login works from the hosted site.

No build step, no CLI, no Firebase Hosting config needed. Firebase is used **only** for Firestore + Authentication.

## Notes & limitations

- Deleting a student from the admin UI removes their `/users` profile only; remove the Auth login itself from **Authentication → Users** in the console.
- Rank/percentile are computed client-side from all attempts of the same exam type. If you want attempt scores private, tighten the `attempts` read rule in `firestore.rules` to owner-or-admin (a comment in the file marks where).
- An attempt document id is `{examId}_{uid}`, so a refresh mid-exam resumes the same attempt (responses auto-saved). Shuffled question order is cached in `sessionStorage` for the duration of the exam.
- LaTeX renders via MathJax 3 from CDN; write inline math as `$...$`.
