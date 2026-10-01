# Deploy TODO — ship PR #2 live

Checklist for shipping the AI follow-up practice, Live Monitor, integrity report and AI Settings work
([PR #2](https://github.com/madhavanand-dot/Exam-Portal/pull/2)). Do the steps in order and tick each box as you go.
Each step says where to click and how to check that it worked.

> **For a browser agent (e.g. Claude in Chrome):** steps marked 🔐 handle secrets (the Firebase admin key and the
> AI API key). Pause and let the person do those themselves, or confirm with them before each one. Never paste
> a secret anywhere except the field named in the step, and never into a chat, issue, commit or comment.

---

## 1. Merge the pull request (ships the website)

- [ ] Open <https://github.com/madhavanand-dot/Exam-Portal/pull/2>.
- [ ] Click **Merge pull request** → **Confirm merge**.
- [ ] Open <https://github.com/madhavanand-dot/Exam-Portal/actions> and wait for **pages build and deployment** to show a green tick
      (about 1 minute).
- [ ] **Check:** open the live portal (normally <https://madhavanand-dot.github.io/Exam-Portal/>), press **Ctrl+Shift+R**,
      log in as admin. The tabs should include **● Live Monitor**, **Custom Practice** and **AI Settings**.

## 2. Publish the Firestore security rules (required — new features fail without it)

- [ ] In the repo, open [`firestore.rules`](firestore.rules) on the `main` branch and copy the **whole** file.
- [ ] Open <https://console.firebase.google.com/project/aakash-exam-portal/firestore/databases/default/rules>
      (Firestore → database **default** → **Rules**).
- [ ] Select all the text in the editor, replace it with the copied file, and click **Publish**.
- [ ] **Check:** the editor contains the rules `match /aiDrafts/{attemptId}` and `match /settings/{id}`.

## 3. 🔐 Give the AI job access to Firestore (secret — the person should do this)

- [ ] Open <https://console.firebase.google.com/project/aakash-exam-portal/settings/serviceaccounts/adminsdk>
      → **Generate new private key** → **Generate key**. A `.json` file downloads.
- [ ] Open <https://github.com/madhavanand-dot/Exam-Portal/settings/secrets/actions/new>.
      - **Name:** `FIREBASE_SERVICE_ACCOUNT`
      - **Secret:** the **entire contents** of the downloaded `.json` file (open it in a text editor and copy everything).
      - Click **Add secret**.
- [ ] Delete the downloaded `.json` file from the computer. It gives full admin access to the database.

## 4. 🔐 Add the AI key (secret — the person should do this)

- [ ] Create an API key at <https://build.nvidia.com> (sign in → any model page → **Get API Key**).
- [ ] In the live portal: **AI Settings** tab → paste the key in **API key** → click **NVIDIA defaults** → **Save settings**.
- [ ] **Check:** the label next to API key shows `stored key …xxxx` (only the last 4 characters).

## 5. Run the AI job once

- [ ] Open <https://github.com/madhavanand-dot/Exam-Portal/actions/workflows/ai-followup.yml> → **Run workflow** → **Run workflow**.
- [ ] Wait for it to finish (a few minutes).
- [ ] **Check:** in the portal, **AI Settings** → **Last run of the AI job** shows **✓ OK**.
  - If it says a **model id is not offered**, pick a model from the suggestions in the model boxes, then **Save settings**
    and run the workflow again.
  - If it says the **key was rejected**, paste a new key and save.
- [ ] After this it runs by itself every hour.

## 6. One-time housekeeping in the portal (admin)

- [ ] **Questions** tab → **🗜 Compress stored images**. Keep the tab open until it says **Done**; this makes tests load faster.
- [ ] **Topics** tab → **Rebuild practice index**. Custom Practice and student practice need it.
- [ ] For any **existing** diagnostic test that should get AI follow-up: **Exams** → **Edit** → tick
      **🤖 AI follow-up practice after each submission** → **Save test**. New diagnostic tests have it on by default.

## 7. Smoke test before students use it

- [ ] Log in as a test student and take a short test. The **Start** button should stay disabled until the **honesty pledge** is ticked.
- [ ] Meanwhile, in another browser window as admin, open **● Live Monitor**. The student should appear as **● live**.
      Switch tabs once in the student window; within a few seconds an **🚨** alert should appear on the monitor.
- [ ] From the monitor click **📢 Warn**. The message should pop up on the student's screen.
- [ ] Submit as the student. The result should show the **🛡 Integrity report** and the **Why did these go wrong?** form;
      fill in the reasons.
- [ ] About 2 hours later (or after the next hourly run), **Custom Practice** → **🤖 AI follow-up drafts** should list a draft.
      Click **Review**, check the questions, **Save**, and confirm **Publish** only if you want the student to see it.

---

### If something goes wrong

- **The website looks wrong after merging:** on the merged PR click **Revert** and merge the revert PR. The site goes back
  to the previous version within a minute.
- **AI Settings or AI drafts say "has the updated firestore.rules been published?":** redo step 2.
- **No AI drafts appear:** open the latest run under Actions → **AI follow-up practice** and read its log. Also check
  **Custom Practice → queue** for failed items.
- **Stop the AI job:** AI Settings → untick **AI job enabled** → **Save settings**.

When everything above is ticked, this file can be deleted.
