# 2026-10-20 — Correct maths and question labels in downloaded PDFs

Fixed escaping across the generated document's two script layers: TeX delimiters are serialized as JSON so backslashes survive. Ordinary parentheses and chapter labels no longer become maths.

PDF formulas now use MathJax SVG output with self-contained glyph paths. Each formula becomes a loaded image with explicit dimensions and baseline alignment before question capture. Question number and chapter/level text use a wrapping flex row. Invalid formula output blocks export with an error instead of saving malformed notation.

Validation uses the actual MathJax 3.2.2 SVG renderer, not a stub: a 30-question polarisation regression fixture with 135 formulas, including fractions, roots, Greek letters, inverse trig, inline and display delimiters, diagrams and answer highlighting. Question and answer exports at desktop and mobile widths are rendered for visual inspection. Direct file downloads and the disabled reattempt policy remain in place.
