# Deploy TODO

What is still needed to finish the latest work. PRs #2–#9 are **merged** and the website is live — see [CHANGELOG.md](CHANGELOG.md).
Tick each box as you go.

> **For a browser agent (e.g. Claude in Chrome):** steps marked 🔐 handle secrets. Pause and let the person do those themselves.
> Never paste a secret anywhere except the field named in the step, and never into a chat, issue, commit or comment.

---

## 1. Publish the Firestore rules (2 min) — needed for ▶ Solve now and the mistake notebook

- [ ] Open [`firestore.rules`](firestore.rules) on GitHub → copy everything.
- [ ] Firebase Console → project **aakash-exam-portal** → **Firestore Database** → database **default** → **Rules** tab →
      select all, paste → **Publish**.
- [ ] **Check:** the portal → **AI Settings** loads without "has the updated firestore.rules been published?".

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

## 4. Try the new analysis features

- [ ] **Item Analysis** → pick a test with 6+ students → **Analyse**. Check the **🔑 Answer-key check**,
      **📐 Question quality** and **👥 Possible copying** cards under the summary, and the **Quality (D)** column.
- [ ] **⚠ At-risk** tab → **Find at-risk students** → open **Progress** for one of them; the mistake notebook appears below.
- [ ] As a student: dashboard → **📒 My Mistake Notebook** → **Show question & answer**, tick **Cleared**, try **🔁 Retry**.
- [ ] Open any result: the **⏱ Where did your time go?** card, the class columns, and (as staff) the **🚩 Speed check** card.

## 5. Try the new test features

- [ ] **Diagnostic Builder** → open **Mechanical Properties of Fluids** → press **Ctrl+Shift+R** once so the new version loads.
- [ ] The **AI solve** box should say **✅ AI solved …** (a run was started on 5 Oct). Check the **🤖 AI:** suggestions in the
      Answer and Ideal-time columns; use **Use** / **Use AI keys** / **Use AI ideal times** where you agree → **Save test**.
      (If it still says waiting, press **▶ Solve now**, wait ~10 min, then **↻ Refresh**.)
- [ ] Multiple correct: tick two boxes in the **Answer** column for a question → it shows **☑ multiple correct**.
- [ ] Numerical: change a row's **Sec** dropdown to **Numerical** and type the answer.
- [ ] **🖼 Replace image** on any row → pick the new picture → **Save test**.
- [ ] Take the test as a student once: the multiple-correct question shows tick boxes; the numerical one shows a typing box.

## 6. Organise and assign your diagnostic tests

- [ ] **Diagnostic Builder** → open each test (or use **Edit** in Assign Tests) → fill **Chapter** and **Subtopic** → **Save test**.
- [ ] **Assign Tests** tab → **Assign** (or **Activate**) → choose all / batch(es) / specific students → **Activate**.
- [ ] Check each test's **Audience** column shows what you expect.

## 7. Student-side test (needs a human — an AI cannot create accounts or enter passwords)

- [ ] Create a throwaway student (Students tab), batch e.g. **RM01**, matching exam type.
- [ ] Assign the **Diagnostic Dummy** test to that batch or student and activate it.
- [ ] Log in as the student in a separate browser window and take the test. Tick the honesty pledge, switch tabs once, submit,
      then fill the **Why did these go wrong?** form.
- [ ] As admin, check **● Live Monitor** (alert appeared), the result's **🛡 Integrity report**, and — after the next AI run —
      **Custom Practice → 🤖 AI follow-up drafts**.

## 8. Clean up after testing

- [ ] Delete the throwaway student and the **Diagnostic Dummy** test.
- [ ] Delete the downloaded Firebase service-account `.json` from your computer if it is still there.
- [ ] Optional housekeeping: **Questions → 🗜 Compress stored images**; **Topics → Rebuild practice index**.

---

### If something goes wrong

- **Website looks wrong after merging:** on the merged PR click **Revert** and merge the revert PR.
- **Live progress says "Could not read status":** republish `firestore.rules` (staff must be able to read `settings/aiStatus`).
- **Live progress shows "No update for 10+ min":** the run was cancelled or crashed — open the run under Actions for the error.
- **Stop the AI job:** AI Settings → untick **AI job enabled** → **Save settings**.

When everything above is ticked, this file can be deleted.
