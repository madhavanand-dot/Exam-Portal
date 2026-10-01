# Deploy TODO

What is still needed to ship the latest work. Earlier items (PRs #2–#6: AI follow-up, Live Monitor, integrity report, AI Settings,
answer-key proposals and review) are **done** — see [CHANGELOG.md](CHANGELOG.md). Tick each box as you go.

> **For a browser agent (e.g. Claude in Chrome):** steps marked 🔐 handle secrets. Pause and let the person do those themselves.
> Never paste a secret anywhere except the field named in the step, and never into a chat, issue, commit or comment.

---

## 1. Merge PR #7 (ships the website and the AI job change)

- [ ] Open <https://github.com/madhavanand-dot/Exam-Portal/pull/7> → **Merge pull request** → **Confirm merge**.
- [ ] Wait for **pages build and deployment** to turn green under <https://github.com/madhavanand-dot/Exam-Portal/actions> (about 1 minute).
- [ ] **Check:** open the live portal, press **Ctrl+Shift+R**, log in as admin. The tabs now include **Assign Tests**.
- [ ] **Check:** Activate popup → *Specific batch(es)* shows a **dropdown** (TR01 … RM03); *Specific students* shows one student per row.

## 2. Firestore rules

- [ ] Nothing new to publish for this release. (If **AI Settings** ever says "has the updated firestore.rules been published?",
      copy [`firestore.rules`](firestore.rules) into Firebase → Firestore → **default** → Rules → **Publish**.)

## 3. Run the AI job once (to see live progress)

- [ ] <https://github.com/madhavanand-dot/Exam-Portal/actions/workflows/ai-followup.yml> → **Run workflow** → **Run workflow**.
- [ ] Open the portal → **AI Settings** → **AI job — live progress**. It should show **● RUNNING**, the current step and log lines,
      then **○ Idle** with the counts when it finishes. (One image question takes about 1.5 min, so a run can last several minutes.)
- [ ] After this it runs by itself every hour.

## 4. Organise and assign your diagnostic tests

- [ ] **Diagnostic Builder** → open each test (or use **Edit** in Assign Tests) → fill **Chapter** and **Subtopic** → **Save test**.
- [ ] **Assign Tests** tab → **Assign** (or **Activate**) → choose all / batch(es) / specific students → **Activate**.
- [ ] Check each test's **Audience** column shows what you expect.

## 5. Student-side test (needs a human — an AI cannot create accounts or enter passwords)

- [ ] Create a throwaway student (Students tab), batch e.g. **RM01**, matching exam type.
- [ ] Assign the **Diagnostic Dummy** test to that batch or student and activate it.
- [ ] Log in as the student in a separate browser window and take the test. Tick the honesty pledge, switch tabs once, submit,
      then fill the **Why did these go wrong?** form.
- [ ] As admin, check **● Live Monitor** (alert appeared), the result's **🛡 Integrity report**, and — after the next AI run —
      **Custom Practice → 🤖 AI follow-up drafts**.

## 6. Clean up after testing

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
