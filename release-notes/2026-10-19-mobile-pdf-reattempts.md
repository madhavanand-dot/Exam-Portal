## 2026-10-19 — Mobile PDF printing and reattempt control

- Question-paper downloads open a visible preview tab. Print / Save as PDF is enabled only after images, formulas and fonts are ready; failed images show an error instead of printing a blank or incomplete paper. Tall questions are fitted within a column.
- Live Monitor has an admin-only “Allow students to reattempt completed tests and chapters” switch. Missing/false means disabled. Completed cards offer View result; unfinished attempts can resume. The start runner checks the current policy before loading questions or replacing results.
- Firestore rules preserve completed attempts while reattempts are disabled, including old browser sessions. Students may still save their mistake reasons and integrity note. New attempts use the canonical exam/student ID.
- Deployment: publish the updated Firestore rules for database `default`; leave `settings/portal.allowReattempts` false (or absent). Students should reload the portal. Download buttons open a preview; tap Print / Save as PDF there and choose the phone's Save as PDF option.
- Validation: syntax checks; isolated start-policy checks; Chromium 390px and 1440px previews with all 45 questions / 15 images retained; PDF exports and broken-image blocking. Formula rendering is stubbed in the isolated browser tests; physical Android/iOS print dialogs still need a device check.

