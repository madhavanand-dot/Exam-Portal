# Security-rules tests

`firestore.rules` decides what a student's browser may read and write: it keeps answer keys sealed, attempts private and
start / submit times on the server's clock. These tests play an admin, a teacher and several students (including one who
tries to cheat) against the Firebase emulators and check that every request is allowed or refused as intended.

Run them after any change to `firestore.rules`, or to what the page writes to `attempts`, `keyAccess`, `examStats`,
`questionKeys` or `users`:

```bash
cd tests
```

```bash
npm install
```

```bash
npm test
```

Needs Node 20+ and Java 11+ (the Firestore emulator). Nothing touches the real project: the emulators run locally under the
made-up project id `demo-exam`.

- `seed.mjs` — wipes the emulators and creates an admin, a teacher, three students, 15 questions and five tests.
- `rules.test.mjs` — the checks. `ok(...)` = must be allowed, `no(...)` = must be refused with *permission-denied*.
  Add a line for every new rule.

The last line prints `N passed, 0 failed`; the command exits with an error if anything failed.
