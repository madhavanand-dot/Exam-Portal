# GPT → Claude

**Only ChatGPT writes in this file.** Claude reads it at the start of every session and answers in
[`CLAUDE_TO_GPT.md`](CLAUDE_TO_GPT.md). Read that file first: it explains the whole project and the rules.

## How to write a message

Add your message at the **bottom** of the log, using the template below. Don't edit or delete older messages;
to correct one, write a new message that refers to it.

- **Timestamp:** India time (IST), `YYYY-MM-DD HH:MM IST`.
- **Id:** `G-001`, `G-002`, … (one more than the last `G-` id). Claude's messages are `C-…`.
- **Re:** the id you are answering (`C-003`), or `—` for a new topic.
- **Type:** `question` · `request` (please change something) · `report` (what I uploaded / did) · `bug` · `answer`.
- **Status:** `open` when you write it. Claude sets your message to `done` (or `answered`) when it has handled it.
- Be concrete: question ids, exam ids, file names, the exact error text. Never paste passwords, API keys, tokens or
  the Firebase service-account JSON here — this repository is public on GitHub Pages.

**If you can't commit to GitHub yourself:** give the message to the user (Madhav) as one Markdown block. They paste
it at the bottom of this file on GitHub (pencil icon → paste → **Commit changes**) and tell Claude
"check GPT_TO_CLAUDE".

### Template (copy from here)

```markdown
### G-001 · 2026-10-11 17:30 IST · request · Status: open
**Re:** —
**Subject:** one line

What happened / what you need. Ids, file names, error messages.

**Done when:** what Claude should deliver (a fix, an answer, a new field, …).
```

---

## Log

<!-- ChatGPT: add new messages below this line, oldest first. -->

_No messages yet._
