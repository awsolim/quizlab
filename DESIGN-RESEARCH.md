# QuizLab UI renovation

## Research, 21 October 2026

This is a qualitative review of documented recurring patterns and authored design examples, not a statistical estimate of how often AI produces a feature. No visual style reliably establishes authorship. The goal is to remove a recognizable bundle of defaults and replace it with decisions tied to studying.

Primary sources:

- Anthropic, [Improving frontend design through Skills](https://claude.com/resources/articles/improving-frontend-design-through-skills): documents default convergence around Inter, purple gradients, and standard layouts; shows comparative outputs. It also cautions that attempts to avoid defaults can converge on a new default.
- Anthropic, [current frontend design guidance](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md): explicitly identifies uppercase eyebrows, decorative indices, repeated rounded cards, middle-dot metadata, ubiquitous arrows, cream/terracotta editorial styling, black/acid accents, and newspaper-like layouts as recurring choices. This was read as research evidence; no external skill was installed.
- Pentagram, [MIT Media Lab](https://www.pentagram.com/work/mit-media-lab): an authored system derived from an institution's existing grid, extended across its research groups. The useful lesson is coherent subject-specific structure, not imitation of the graphics.
- [Studio Feixen](https://www.studiofeixen.ch/) and its [type specimen](https://fonts.studiofeixen.ch/wp-content/uploads/downloads/StudioFeixenSans_Specimen.pdf): a reference for giving typography and deliberate color relationships real character. Its display work is not a pattern to apply indiscriminately to a reading interface.

## Audit of the previous UI

The following ten targeted patterns were all present in the original QuizLab. This is a count within this application, not a prevalence claim about other applications.

| Previous treatment | Renovation |
| --- | --- |
| Tracked uppercase captions above headings | Removed; headings and useful state descriptions stand on their own |
| Slogan-led hero about a lightbulb moment | A question that introduces the actual library task |
| Decorative asterisk illustration | Removed |
| Sage-and-off-white wellness palette | Mulberry navigation, lavender work area, apricot actions |
| Equal rounded bank cards | A library index with real subject, question-count and action columns |
| Identical rounding across hierarchy | Tabs, controls and working sheets have different structural treatment |
| Pill labels for generic instructions | Plain instruction text near answer controls |
| Numbered banks implying a sequence | Removed; numbering retained only for actual quiz sequence |
| Arrow suffixes on routine actions | Plain action names throughout |
| Tiny brand captions and motivational footer copy | Simple wordmark and a factual storage note |

## Design decisions

The reference is a university course folder: a persistent spine for navigation, an indexed bank list, a sample filed under a real tab, and spacious worksheets while taking a quiz. This should feel like software used at a desk rather than a product landing page. No gradients, floating cards, ornamental symbols, animation sequences or fake statistics.

Color tokens considered: mulberry `#512b48`, lavender `#f1edf5`, sheet `#fcfaff`, ink `#392839`, apricot `#ffb08d`, and ochre `#edb944`. Ochre is limited to the sample folder tab. The alternate dark theme uses plum/lavender values rather than pure black and neon. Correct/incorrect states have explicit words as well as color.

Typography: self-hosted Anybody for the wordmark and principal headings; Public Sans for reading and controls. Both are open-licensed, with license files alongside the fonts. Body text and math keep comfortable line lengths; headings wrap for long imported course names. No remote font requests are made at runtime.

Composition alternatives considered:

- Black plus acid yellow, oversized mono data: rejected as another documented generator default and too harsh for prolonged study.
- Cream, serif headings and red editorial rules: rejected as another documented default and too close to a magazine rather than a working quiz interface.
- Colored course folder with indexed content: selected because the form supports a multi-bank library, saved sessions, and focused question sheets.

New navigation exposes the existing library and saved results separately. It does not change the stored data format. Bank snapshots, grading, import validation and the two quiz modes retain their existing contracts.

## Verification

- Production TypeScript/Vite build and all five existing behavior tests pass.
- Chrome checks exercised all four question types in practice, exact-set grading, written self-assessment, a 3/4 result, and a fresh incorrect-question retry.
- Exam checks covered skipped questions, answer revisions, refreshing and resuming, final submission, and deferred written-answer assessment.
- Light and dark themes were visually inspected. A phone viewport was checked on both the library and quiz, with equal document/client widths (no horizontal overflow). The temporary viewport was reset afterward.
- Key palette contrast ratios: body text 11.83:1, secondary text 4.73:1, apricot actions 7.75:1, sidebar text 10.62:1, dark-theme secondary text 7.09:1. These are color-pair checks, not a claim of a complete accessibility audit.
- `preview.png` shows the redesigned library; `preview-original.png` preserves the previous UI for comparison.

## Final content cleanup

The sample folder and all sample-loading controls have been removed from the application. The library is now a single full-width index with one import action; it starts with an honest empty state. Saved sessions is the sole destination for all past work, with unfinished sessions shown on the library only when they exist. Duplicate sidebar bank shortcuts and repeated guidance have been removed. Exact legacy-demo fingerprints support retiring the earlier demonstration content without removing modified or unrelated user data.
