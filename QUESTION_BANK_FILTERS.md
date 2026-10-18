# Question-bank filters and future JSON conversion

Source inventory: 19 October 2026. File totals are not unique-question counts: question crops, topic copies, solutions, keys and compiled PDFs may overlap. Original sources are unchanged.

## Source library

| Collection | Source family | Image files | PDFs |
|---|---|---:|---:|
| AIATS PAPERS | Test papers | 0 | 234 |
| AIATS Papers by Syllabus - 2026-27 | Compiled papers | 0 | 2,299 |
| AIM 720 & FTS Question Bank 2026 | Test papers | 14,220 | 0 |
| Day Wise Question Papers | Daily practice | 0 | 10 |
| ECAPS | Practice sheets | 4,651 | 0 |
| Engineering AIATS Question Bank | Test papers | 4,964 | 1 |
| Engineering FTS Phases 1-3 2025-26 | Test papers | 2,056 | 0 |
| Engineering Modules | Study packages | 6,831 | 0 |
| Engineering PT, TE and UT 2025-26 | Test papers | 3,580 | 0 |
| INVICTUS Modules | Study packages | 4,877 | 0 |
| INVICTUS Tests Question Bank 2025-26 | Test papers | 7,027 | 0 |
| JEE Score Book 2024 | Enrichment banks | 1,338 | 0 |
| JEE Score Individual PDFs | Enrichment banks | 1,206 | 0 |
| Medical AIATS Chapterwise - All Streams | Test papers | 13,375 | 501 |
| Medical Modules | Study packages | 26,682 | 24 |
| Medical Old Papers Question Bank | Test papers | 3,043 | 0 |
| Medical RM Modules | Study packages | 9,718 | 0 |
| Momentum Booster | Practice sheets | 19,532 | 0 |
| N2 and AIATS Plus Sheets | Practice sheets | 1,837 | 0 |
| NSEP Question Bank | Enrichment banks | 2,103 | 0 |
| Success Achiever | Enrichment banks | 2,746 | 0 |
| Success Magnet | Enrichment banks | 2,892 | 0 |
| Toppers Question Bank (JEE TE UT FTS) | Compiled papers | 0 | 277 |

## Filter design

Questions: exam and subject → source family → data bank → chapter → question format. Further filters: difficulty, approach, text/diagram/full-image content, key status, model, search and ideal time. Only banks loaded from Firestore appear as available choices. The expandable source catalogue is a conversion roadmap.

Bank Tests retains its multi-select bank, chapter, level, format and approach chips. Choices within a row are OR; different rows and the new source-family/content/search/time fields combine with AND. Filtering preserves picked questions. Bank Tests uses the small index, not full question images.

## Formats evidenced by source indexes

- Single-correct and multiple-correct objective questions.
- Numerical values and integer answers.
- Assertion–reason and statement questions.
- Matching and matrix-match questions.
- Paragraph, linked comprehension and case studies.
- Subjective, very short, short and long answers.
- Worked examples / solved problems, exercises, assignments and homework references.

The current scored response engine supports existing qType values `single`, `multi`, `numerical`, `integer`, `assertion`, `statement`, `match`, `comprehension`. Matching with four answer combinations is supported. Open matrix responses, written subjective answers and independent worked-example activities need a future response UI. Preserve them in staging instead of forcing them into MCQs.

## Future image-to-JSON contract

- Convert stems, equations, tables and options to editable text/LaTeX; use images only for diagrams, graphs and picture options. Preserve originals and crop mapping as audit evidence.
- Retain stable `id`, `examType`, `subject`, `topic`, original source paper/item/section, image hash and diagram mapping. Repeat the complete passage with every related question; link worked solutions without duplicating the question.
- Use existing `bank` for the canonical collection name above and `bankRef` for paper, exercise and original question. Custom names are retained, not silently merged.
- Keep `qType` separate from `skills`. Format describes the response/presentation. Approach describes concept, substitution, calculus, multi-concept, graph/diagram, factual or experimental work. A diagram is not a response type.
- Retain `modelCode` and readable `model`; never renumber established models. Difficulty, key, approach and ideal time require review, not invented values to pass validation.
- Current tagged-bank import requires key, difficulty, ideal time, qType and skills. Incomplete conversions remain staged until a compatible draft workflow is deployed. PR #29 remains separate from this filter update.
- Existing bank-file shape: `{ "bank": "ECAPS", "questions": [...] }`. Plain arrays remain supported. See `sample_bank_questions.json` and current importer validation.
- No new saved question fields are required for filtering. Index rebuild derives legacy bank/format and adds optional `vf` representation to existing bankIndex rows. Old rows lacking representation stay unknown.

## Student access

Inventory, conversion, upload and student release are separate steps. Keep practice disabled until the teacher selects permitted banks. Filtering does not enable practice, create tests or change assignments.
