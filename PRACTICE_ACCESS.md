# Practice-bank release policy

Approved by Madhav on 19 October 2026. Stored in the existing `settings/portal` document:

```json
{
  "practiceEnabled": false,
  "practiceBanks": {
    "medical": [],
    "engineering": []
  }
}
```

The lists contain canonical bank names, not source-family names. An empty list releases no bank. A missing/unreadable policy fails closed. Practice must be enabled AND the question's bank must be approved for the student's exam stream. Unassigned questions are excluded. Saving approved banks does not turn on the global switch.

The Practice Access page lists banks from the full bank indexes and is editable by admins. Existing `settings/portal` read/write rules already support this; no rules deployment is required. The existing global practice switch is relocated from Topics to this page.

The lightweight student topic-index entries now include `b`, the canonical bank name as a string. This differs from the full `bankIndex` representation, whose numeric `b` points into its document's `banks` array. Rebuild the index after deployment; older entries without identifiable bank provenance remain out of approved-bank self-practice. Existing question IDs, answer keys and grading are unchanged.

Guards cover the chapter list, mistaken-model suggestions and the shared practice-start path, including mistake-notebook retry. The start path refreshes policy, so a stale list cannot start a newly restricted bank. Existing assigned exams, diagnostics, packages and boosters use their existing audience/publication rules and are not blocked by the self-practice allowlist. This allows old papers to be assigned as tests without releasing their entire source bank.

This policy controls product availability of self-practice. It is not a redesign of question-document read permissions: students still need question reads for assigned exams. A stronger confidentiality boundary between assigned questions and restricted bank content requires a separate access architecture and rules change.

Old papers: retain original question order, review the keys, and title each test with source/year/paper number. Use the existing timed test for simulation or untimed diagnostic for learning. This change does not import or publish any old papers automatically.

Deployment: initialise the empty lists with global practice disabled (completed), reload the app, rebuild indexes once, then verify Practice Access shows zero approved banks. Let Madhav select banks later. No student practice or tests were enabled by this change.
