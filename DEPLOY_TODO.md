# Deploy TODO

What is still needed to finish the latest work. Tick each box as you go. See [CHANGELOG.md](CHANGELOG.md) for what each
change is.

> **For a browser agent (e.g. Claude in Chrome):** steps marked 🔐 handle secrets. Pause and let the person do those themselves.
> Never paste a secret anywhere except the field named in the step, and never into a chat, issue, commit or comment.

---

## 0. Security release of 2026-11-11 — do these in this order

**Pick a time when no student is writing a test** (the whole thing takes about 10 minutes). Until step 0.3 is done the
portal works exactly as before — and answer keys are still inside the questions students download.

### 0.1 Merge and reload

- [x] Merge the pull request into `main` — done: PR #45, live since 2026-11-11 11:44 IST.
- [ ] Open the portal and press **Ctrl+Shift+R**. **Check:** the login page is dark blue with an orange **A** mark.
      Ask students who had the portal open to reload it as well (a page loaded before the merge cannot submit once
      the rules in 0.2 are live).

### 0.2 Publish the security rules

- [ ] Open [`firestore.rules`](firestore.rules) on GitHub → copy everything.
- [ ] Firebase Console → project **aakash-exam-portal** → **Firestore Database** → database **default** → **Rules** tab →
      select all, paste → **Publish**.
- [ ] Portal (admin) → **Settings → Security & setup** → **Check again**. **Check:** step 1 shows a green ✓.

### 0.3 Seal the answer keys

- [ ] **Security & setup** → **Seal answer keys now** → confirm. Keep the tab open until the log says **Done**
      (it reads the whole question bank once; for a few thousand questions this takes a minute or two).
      If it stops with an error, press the button again — it continues where it stopped.
- [ ] **Check:** Questions tab → Load a subject → the keys are shown as before. Diagnostic Builder → open any test →
      the ticked answers are there.
- [ ] **Check (optional, in the Firebase console):** open any document in `questions` — it has no `correct_answer`
      field; the same id in `questionKeys` has it.

### 0.4 Prepare ranks for past tests

- [ ] **Security & setup** → **Prepare now** (step 3). It marks anything unmarked and writes the class figures of every
      test. **Check:** as a student, **Past Attempts** shows overall and batch rank for old tests.

### 0.5 Approve waiting sign-ups (from now on)

- [ ] Students who use **Create Account** on the login page now wait for you: **Students** tab → Status **Waiting for
      approval** → **Approve** (or tick several → **Approve sign-ups**). Accounts you add yourself or import by CSV
      need no approval.

### 0.6 Try it once as a student

- [ ] With a throwaway student: start a test, switch tabs once, **reload the page**, start again — the warning count is
      still 1. Submit. **Check:** the result opens with the score ring and tabs; there is **no** Integrity tab.
- [ ] As admin, open the same result from Reports. **Check:** the **🛡 Integrity** tab lists the tab switch and
      "closed or reloaded the test page".
- [ ] Activate a test with **Students see their marks…** = **Only when I press “Release results”**; submit it as the
      student (they see "Test submitted"); press **Release results** in the Exams / Assign Tests list; the student's
      **Check again** now shows the full result.

### 0.7 Housekeeping on GitHub (the AI job is gone)

- [ ] Repo → **Settings → Secrets and variables → Actions**: delete the secret `AI_API_KEY` and the variables
      `AI_BASE_URL`, `AI_GEN_MODEL`, `AI_VERIFY_MODEL`, `AI_VISION_MODEL`, `AI_RPM` if they exist.
      **Keep `FIREBASE_SERVICE_ACCOUNT`** — the password-reset job needs it.
- [ ] Optional, Firebase console → Firestore: delete the collections `aiDrafts` and `aiSolutions` and the documents
      `settings/ai`, `settings/aiSecret`, `settings/aiStatus`, `settings/aiScorecard`. Nothing reads them any more.
      (`settings/aiRunner` holds the GitHub token for the password-reset button — keep it.)
- [ ] 🔐 If you never set it up: **Security & setup → One-click password reset job** → paste a fine-grained GitHub token
      (this repository only, **Actions: Read and write**) → **Save**.

---

# Earlier checklists (tick what is still open)

## 5. Try the new analysis features

- [ ] **Item Analysis** → pick a test with 6+ students → **Analyse**. Check the **🔑 Answer-key check**,
      **📐 Question quality** and **👥 Possible copying** cards under the summary, and the **Quality (D)** column.
- [ ] **⚠ At-risk** tab → **Find at-risk students** → open **Progress** for one of them; the mistake notebook appears below.
- [ ] As a student: dashboard → **📒 My Mistake Notebook** → **Show question & answer**, tick **Cleared**, try **🔁 Retry**.
- [ ] Open any result: the **⏱ Where did your time go?** card, the class columns, and (as staff) the **🚩 Speed check** card.

## 6. Try the new test features

- [ ] Multiple correct: tick two boxes in the **Answer** column for a question → it shows **☑ multiple correct**.
- [ ] Numerical: change a row's **Sec** dropdown to **Numerical** and type the answer.
- [ ] **🖼 Replace image** on any row → pick the new picture → **Save test**.
- [ ] Take the test as a student once: the multiple-correct question shows tick boxes; the numerical one shows a typing box.

## 7. Organise and assign your diagnostic tests

- [ ] **Diagnostic Builder** → open each test (or use **Edit** in Assign Tests) → fill **Chapter** and **Subtopic** → **Save test**.
- [ ] **Assign Tests** tab → **Assign** (or **Activate**) → choose all / batch(es) / specific students → **Activate**.
- [ ] Check each test's **Audience** column shows what you expect.

## 8. Student-side test (needs a human — an assistant cannot create accounts or enter passwords)

- [ ] Create a throwaway student (Students tab), batch e.g. **RM01**, matching exam type.
- [ ] Assign the **Diagnostic Dummy** test to that batch or student and activate it.
- [ ] Log in as the student in a separate browser window and take the test. Tick the honesty pledge, switch tabs once, submit,
      then fill the **Why did these go wrong?** form.
- [ ] As admin, check **● Live Monitor** (alert appeared) and the result's **🛡 Integrity** tab (staff only).

## 10. Set up the features from PRs #13–#14 (10 min)

Publish the rules first (§0) — students read `settings/portal` (practice switch, programme codes).

- [ ] **Topics → Rebuild practice index** (once). It links pictures that share a key, adds question models,
      and leaves questions without a key out of practice.
- [ ] **Topics → "Students can use practice mode"**: leave ticked to keep practice on, untick to switch it off for everyone.
- [ ] **Study Packages → "Which batches belong to which programme?"**: check TYM = TR, TW · OYM = OR, OW · RM = RM → **Save**.
- [ ] **Diagnostic Builder**: fill the **question model** (under Topic) for the questions of your diagnostic tests → **Save test**,
      then rebuild the practice index again so students see the models.
- [ ] **Study Packages → + New chapter**: upload one chapter of a module (Test type = Study Package Solving, programme TYM) → **Save test**.

## 11. Check the new features as a student (needs the throwaway student from step 8)

- [ ] Diagnostic test: let the expected time pass — it must **not** auto-submit; the clock counts up.
- [ ] Result page: **Overall rank** and **Batch rank**, and the ✓ / ✗ / – split for each question.
- [ ] **📒 Mistake Notebook** opens on chapter cards; tapping one shows only that chapter's questions.
- [ ] **🎯 Mistaken models to practice** lists the open mistakes by chapter / model; **Practise** starts a set.
- [ ] A TYM student sees the **📘 Study Package** chapter (Start → answer a few → leave → **Continue** resumes); the staff
      **Study Packages** tracker shows ◐ then ✅ after submitting.
- [ ] In the Diagnostic Builder, add a picture you already keyed in another test → it shows **♻ already in bank** with the key.

## 12. Model Bank and the new upload checks (PR #17)

- [ ] **Topics → Rebuild practice index** (builds the bank index).
- [ ] **Model Bank** tab → upload `Current_Electricity_taxonomy.json` (given to you in the Claude chat) → open the chapter.
- [ ] **👁 Student view access** → tick the students who may view it → **Save access**. Check as one of them that
      **📚 Model Bank** appears on their dashboard.
- [ ] Diagnostic Builder → a Current Electricity question → model box → pick "code · name" from the list → **Save test**;
      rebuild the index; the Model Bank counts it.
- [ ] Questions tab → upload a small JSON twice with **Safe import** ticked: the second time everything is "unchanged".
- [ ] Diagnostic Builder → a question with "Unconfirmed key" → **✓ Confirm** → **Save test**.

## 13. Tagged question bank and 🗂 Bank Tests

- [ ] Give ChatGPT the go-ahead to send **bank files** (`CLAUDE_TO_GPT.md` §4d; sample `sample_bank_questions.json`).
- [ ] Questions → upload a bank file → **Topics → Rebuild practice index**.
- [ ] 🗂 Bank Tests → Load question bank → pick a chapter + one data bank → **⚡ Whole chapter as a diagnostic** →
      tick "Split into Easy / Moderate / Hard" → **Create test** → activate the Easy one in Assign Tests.
- [ ] 🏆 Toppers quick filter → Auto-pick 30 → Timed test → **Create test** → choose the Toppers group in the dialog.
- [ ] After a student writes it: result page shows **By approach / By question type**; Item Analysis shows the class split.

## 9. Clean up after testing

- [ ] Delete the throwaway student and the **Diagnostic Dummy** test.
- [ ] Delete the downloaded Firebase service-account `.json` from your computer if it is still there.
- [ ] Optional housekeeping: **Questions → 🗜 Compress stored images**; **Topics → Rebuild practice index**.

---

### If something goes wrong

- **Website looks wrong after merging:** before step 0.2, click **Revert** on the merged PR and merge the revert PR.
  After 0.2 a revert also needs the previous rules re-published (Firebase console → Rules → history), and after 0.3
  the keys must first be moved back into the questions — ask Claude before reverting at that point.
- **Students cannot start or submit after 0.2:** they have an old copy of the page open → they reload it. If it
  persists, re-publish the previous rules from the Firebase console's rules **history** and tell Claude.
- **"Seal answer keys" says the rules refused it:** step 0.2 is not done (or was published to the wrong database —
  it must be the database named **default**).
- **A student sees "results pending" on a test that should show marks:** open that test's **Leaderboard** once
  (it marks every submitted attempt), or press **Release results** if the test holds its results back.

When everything above is ticked, this file can be deleted.
