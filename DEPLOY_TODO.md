# Deploy TODO

What is still needed to finish the latest work. PRs #2–#11 are **merged** and the website is live — see [CHANGELOG.md](CHANGELOG.md).
Tick each box as you go.

> **For a browser agent (e.g. Claude in Chrome):** steps marked 🔐 handle secrets. Pause and let the person do those themselves.
> Never paste a secret anywhere except the field named in the step, and never into a chat, issue, commit or comment.

---

## 1. Publish the Firestore rules (2 min) — do this first

Needed for: ▶ Solve now, the mistake notebook, 🔍 AI working, Compare models and the Model scorecard.

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
