# Deploy TODO

What is still needed to finish the latest work. PRs #2–#14 are **merged** and the website is live — see [CHANGELOG.md](CHANGELOG.md).
Tick each box as you go.

> **For a browser agent (e.g. Claude in Chrome):** steps marked 🔐 handle secrets. Pause and let the person do those themselves.
> Never paste a secret anywhere except the field named in the step, and never into a chat, issue, commit or comment.

---

## 1. Publish the Firestore rules (2 min) — do this first

Needed for: the exam-list read saving (`settings/examsRev`, 2026-10-15), ▶ Solve now, the mistake notebook, 🔍 AI working, Compare models and the Model scorecard.

- [ ] Open [`firestore.rules`](firestore.rules) on GitHub → copy everything.
- [ ] Firebase Console → project **aakash-exam-portal** → **Firestore Database** → database **default** → **Rules** tab →
      select all, paste → **Publish**.
- [ ] **Check:** the portal → **AI Settings** loads without "has the updated firestore.rules been published?", and the
      **📊 Model scorecard** card says "No data yet" (not "Could not load").

## 2. 🔐 Create a GitHub token for one-click AI runs (3 min)

- [ ] GitHub → your picture (top right) → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** →
      **Generate new token**.
- [ ] Name: `Exam portal – run AI job`. Expiration: 1 year (or what you prefer — set a reminder to renew it).
- [ ] **Repository access:** *Only select repositories* → **Exam-Portal**.
- [ ] **Permissions → Repository permissions → Actions: Read and write.** Leave everything else as *No access*.
- [ ] **Generate token** and copy it (starts with `github_pat_…`; GitHub shows it only once).

## 3. 🔐 Save the token in the portal and test it (2 min)

- [ ] Portal (admin login) → **AI Settings** → card **▶ Run the AI job now (from this website)**.
- [ ] Repository: `madhavanand-dot/Exam-Portal` → paste the token → **Save**.
- [ ] Press **▶ Run AI job now** → it should say **"AI job started"**.
- [ ] **Check:** within about a minute **AI job — live progress** shows **● RUNNING**.

## 4. Re-solve the Fluids test with the new AI (keeps every model's working)

- [ ] Optional: **AI Settings** → **Extra models to compare** → add 1–2 model ids from the suggestions → **Save settings**.
- [ ] **Diagnostic Builder** → **Ctrl+Shift+R** → open **Mechanical Properties of Fluids** → **🤖 Ask AI to solve this test**.
- [ ] Press **▶ Solve now** (or ask Claude to "run the AI job"). Allow 30–60 min; a long test continues on the next run by itself.
- [ ] **↻ Refresh**, then check the questions where the AI disagreed with your key last time:
      **Q3** (AI C, yours D), **Q4** (AI D, yours B), **Q25** (AI D, yours B), and Q5, Q9, Q10, Q12, Q21.
      Open **🔍 AI working** on each: read what the vision model read, each model's steps and **Where the difference comes from**.
- [ ] Set a key for **Q16** (it has none — the test can't be activated without it) → **Save test**; re-grade if offered.
- [ ] **🔍 Compare models on this test** → note which model matched your keys most.
- [ ] After a few tests: **AI Settings → 📊 Model scorecard** → once a model has 20+ graded questions and beats the current
      writer or checker, put it in that box and **Save settings**.

## 5. Try the new analysis features

- [ ] **Item Analysis** → pick a test with 6+ students → **Analyse**. Check the **🔑 Answer-key check**,
      **📐 Question quality** and **👥 Possible copying** cards under the summary, and the **Quality (D)** column.
- [ ] **⚠ At-risk** tab → **Find at-risk students** → open **Progress** for one of them; the mistake notebook appears below.
- [ ] As a student: dashboard → **📒 My Mistake Notebook** → **Show question & answer**, tick **Cleared**, try **🔁 Retry**.
- [ ] Open any result: the **⏱ Where did your time go?** card, the class columns, and (as staff) the **🚩 Speed check** card.

## 6. Try the new test features

- [ ] In the Fluids test, use **Use** / **Use AI keys** / **Use AI ideal times** where you agree with the AI → **Save test**.
- [ ] Multiple correct: tick two boxes in the **Answer** column for a question → it shows **☑ multiple correct**.
- [ ] Numerical: change a row's **Sec** dropdown to **Numerical** and type the answer.
- [ ] **🖼 Replace image** on any row → pick the new picture → **Save test**.
- [ ] Take the test as a student once: the multiple-correct question shows tick boxes; the numerical one shows a typing box.

## 7. Organise and assign your diagnostic tests

- [ ] **Diagnostic Builder** → open each test (or use **Edit** in Assign Tests) → fill **Chapter** and **Subtopic** → **Save test**.
- [ ] **Assign Tests** tab → **Assign** (or **Activate**) → choose all / batch(es) / specific students → **Activate**.
- [ ] Check each test's **Audience** column shows what you expect.

## 8. Student-side test (needs a human — an AI cannot create accounts or enter passwords)

- [ ] Create a throwaway student (Students tab), batch e.g. **RM01**, matching exam type.
- [ ] Assign the **Diagnostic Dummy** test to that batch or student and activate it.
- [ ] Log in as the student in a separate browser window and take the test. Tick the honesty pledge, switch tabs once, submit,
      then fill the **Why did these go wrong?** form.
- [ ] As admin, check **● Live Monitor** (alert appeared), the result's **🛡 Integrity report**, and — after the next AI run —
      **Custom Practice → 🤖 AI follow-up drafts**.

## 10. Set up the features from PRs #13–#14 (10 min)

Do step 1 (publish the rules) first — students now read `settings/portal` (practice switch, programme codes).

- [ ] **Topics → Rebuild practice index** (once). It links pictures that share a key, adds question models and the 🤖 flag,
      and leaves questions without a key out of practice.
- [ ] **Topics → "Students can use practice mode"**: leave ticked to keep practice on, untick to switch it off for everyone.
- [ ] **Study Packages → "Which batches belong to which programme?"**: check TYM = TR, TW · OYM = OR, OW · RM = RM → **Save**.
- [ ] **AI Settings → "Which tests should the AI work on?"**: *All tests* or *Only the tests I choose* → tick the tests →
      **Save settings**. **Check:** after the next AI run, **AI job — live progress** mentions "only N chosen test(s)".
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

- [ ] Publish `firestore.rules` again (step 1) — adds the Model Bank collections.
- [ ] **Topics → Rebuild practice index** (builds the bank index).
- [ ] **Model Bank** tab → upload `Current_Electricity_taxonomy.json` (given to you in the Claude chat) → open the chapter.
- [ ] **👁 Student view access** → tick the students who may view it → **Save access**. Check as one of them that
      **📚 Model Bank** appears on their dashboard.
- [ ] Diagnostic Builder → a Current Electricity question → model box → pick "code · name" from the list → **Save test**;
      rebuild the index; the Model Bank counts it.
- [ ] Questions tab → upload a small JSON twice with **Safe import** ticked: the second time everything is "unchanged".
- [ ] Diagnostic Builder → a question with "🤖 AI-proposed" → **✓ Confirm** → **Save test**.

## 13. Tagged question bank and 🗂 Bank Tests

- [ ] Publish `firestore.rules` again (step 1) — lets faculty read the bank index for Bank Tests.
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

- **Website looks wrong after merging:** on the merged PR click **Revert** and merge the revert PR.
- **Live progress says "Could not read status":** republish `firestore.rules` (staff must be able to read `settings/aiStatus`).
- **Live progress shows "No update for 10+ min":** the run was cancelled or crashed — open the run under Actions for the error.
- **Stop the AI job:** AI Settings → untick **AI job enabled** → **Save settings**.
- **AI run cancelled at ~58 min:** nothing is lost any more — solved questions are saved one by one and the next run continues.
  If a model keeps failing (see 🔍 AI working → "failed", or the scorecard's *Failed replies*), replace it in AI Settings.
- **AI working / scorecard says "Could not load":** the rules from step 1 aren't published yet.

When everything above is ticked, this file can be deleted.
