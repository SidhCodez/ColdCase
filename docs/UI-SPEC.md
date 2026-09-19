# ColdCase — UI Specification

ColdCase's interface has one job: make it obvious, in under a minute, whether a strange line of code is intentional and where the answer came from. Everything else on the screen is in service of that. The design is restrained and editorial — a dark theme, one accent color, strong typographic hierarchy, no card-grid clutter. This document is the reference for every screen, component, state, and interaction. It is the boundary between the design intent in the PRD and the component tree in the codebase.

---

## 1. Design principles

Five principles govern every decision. When two designs are both plausible, the one that better satisfies a higher principle wins.

**Evidence first.** The screen's most important element is the receipt. Every claim is one click away from its source. Nothing competes with that.

**Honest by default.** The UI says "I don't know" loudly and proudly. A `NONE` confidence badge is not a failure state; it is a feature.

**Quiet interface, loud data.** The chrome is muted so the code and the evidence stand out. No gradients, no drop shadows beyond a single subtle elevation, no decorative animation.

**Keyboard is a first-class citizen.** Every interactive element is reachable and operable with a keyboard. The demo path works without a mouse.

**One accent, used sparingly.** A warm amber marks the thing the user should look at next. It is never decoration.

---

## 2. Design tokens

Tokens live as CSS variables in `apps/web/src/styles/index.css` and are mapped into the Tailwind theme. Nothing in a component references a raw hex value.

### 2.1 Color

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#0a0a0b` | Page background |
| `--bg-elevated` | `#141416` | Panels, drawers, modals |
| `--bg-subtle` | `#1c1c1f` | Hover states, selected rows |
| `--fg` | `#fafafa` | Primary text |
| `--fg-muted` | `#a1a1aa` | Secondary text, metadata |
| `--fg-subtle` | `#71717a` | Tertiary text, line numbers |
| `--accent` | `#f59e0b` | Active gutter markers, focus rings, primary buttons |
| `--accent-hover` | `#fbbf24` | Hover state for accent elements |
| `--border` | `#27272a` | Dividers, panel edges |
| `--border-subtle` | `#1f1f23` | Subtle internal dividers |
| `--conf-high` | `#22c55e` | HIGH badge icon and label |
| `--conf-medium` | `#eab308` | MEDIUM badge icon and label |
| `--conf-low` | `#f97316` | LOW badge icon and label |
| `--conf-none` | `#71717a` | NONE badge icon and label |
| `--danger` | `#ef4444` | Error banners, destructive actions (rare) |

Every color pair (text on background) is checked against WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text and UI elements.

### 2.2 Typography

| Token | Value | Used for |
|---|---|---|
| `--font-display` | `'Inter', system-ui, sans-serif` | Headings, body |
| `--font-mono` | `'JetBrains Mono', ui-monospace, monospace` | Code, SHAs, evidence IDs |

| Style | Size / weight / line-height | Used for |
|---|---|---|
| Display | 48 / 600 / 1.1 | Landing hero headline |
| H1 | 32 / 600 / 1.2 | Page titles |
| H2 | 24 / 600 / 1.3 | Section headings |
| H3 | 18 / 600 / 1.4 | Panel headings, claim cards |
| Body | 16 / 400 / 1.6 | Paragraphs |
| Small | 14 / 400 / 1.5 | Metadata, secondary text |
| Caption | 12 / 500 / 1.4 | Badges, labels, table headers |
| Mono | 13 / 400 / 1.5 | Code, SHAs, evidence IDs |

### 2.3 Spacing

A single scale, used everywhere. No arbitrary values.

| Token | Value |
|---|---|
| `space-1` | 4 px |
| `space-2` | 8 px |
| `space-3` | 12 px |
| `space-4` | 16 px |
| `space-6` | 24 px |
| `space-8` | 32 px |
| `space-12` | 48 px |
| `space-16` | 64 px |
| `space-24` | 96 px |

### 2.4 Radius, elevation, motion

| Token | Value | Used for |
|---|---|---|
| `--radius-sm` | 4 px | Badges, small controls |
| `--radius-md` | 8 px | Panels, cards |
| `--radius-lg` | 12 px | Modals, drawers |
| `--shadow-elevated` | `0 8px 24px rgba(0,0,0,0.4)` | Drawers, modals |
| `--motion-fast` | 120 ms ease-out | Hover, focus |
| `--motion-base` | 200 ms ease-out | Drawer open, panel swap |

All motion is wrapped in `motion-safe:` Tailwind variants. `prefers-reduced-motion: reduce` disables every animation and transition.

---

## 3. Routes and screens

The app is a single-page app with four routes. Selected line and open evidence live in the URL as query parameters, so links are shareable and the back button works.

| URL | Screen | Priority |
|---|---|---|
| `/` | Landing page | P0 |
| `/c/:owner/:repo` | Case overview | P0 |
| `/c/:owner/:repo/f/*` | Case file view | P0 |
| `/analyze` | Live analysis (P1) | P1 |

Query parameters:

| Parameter | Meaning | Example |
|---|---|---|
| `line` | Selected line number in the code viewer | `?line=42` |
| `evidence` | Open evidence ID in the drawer | `?evidence=pr:1234` |

Both parameters are optional. Both are preserved when navigating within a file. Neither is required.

---

## 4. Landing page (`/`)

The landing page is the first thing a visitor sees. It has one job: explain the product in under 30 seconds and let the visitor open an example case without any setup.

### 4.1 Section order

1. **Hero**
2. **Mini-demo** (interactive, offline)
3. **How it works** (four steps)
4. **Why you can trust it** (trust card)
5. **What it can't do** (honest limits)
6. **Who it's for** (personas)
7. **Example cases** (gallery)
8. **Accuracy panel**
9. **FAQ**
10. **Footer**

### 4.2 Hero

| Element | Content |
|---|---|
| Headline | "Every line has a reason. Find it." |
| Subhead | "ColdCase reads a repository's commits, pull requests, and issues to explain why code looks the way it does, and links every claim to its source." |
| Primary input | Text field: "Paste a GitHub repository URL" |
| Primary button | "Analyze" (P1; disabled with a tooltip on P0) |
| Secondary CTA | "Try an example" chips, one per pre-computed case |

The input is disabled in P0 with the tooltip "Live analysis is coming soon. Try an example case." The example chips are the primary action.

### 4.3 Mini-demo

A short code sample from the fixture repo containing something odd (a delay, a null check). Clicking the odd line reveals the receipts chain inline: commit → PR → issue quote → confidence badge.

- Data: bundled fixture JSON. No network calls.
- Interaction: a real `<button>` on the odd line. Keyboard-operable.
- Animation: the chain unfolds with a subtle reveal. Disabled under `prefers-reduced-motion`.
- Copy beneath: "This is real data from a real repository. Click the line to see why it exists."

### 4.4 How it works

Four steps, one line each, with a simple inline diagram (SVG or CSS, no image assets).

1. **Collect history.** Clone the repo and read its commits, PRs, and issues.
2. **Focus on hotspots.** Rank files by change activity and analyze the top ones.
3. **Reason with evidence.** Generate a story where every claim cites its source.
4. **Verify and grade.** Check every quote against the evidence and compute confidence.

### 4.5 Trust card

A single sample claim card, showing:

- The claim text
- A `stated` label
- A HIGH confidence badge (text + icon)
- Two receipt links (commit and PR)
- A "Verified against source" indicator

Beneath the card: "Where there's no evidence, it says so instead of guessing."

### 4.6 Honest limits

Three short paragraphs. No euphemisms.

- "Sparse or squash-merged history gives lower confidence. ColdCase flags it."
- "Very large repositories are analyzed by hotspot, not exhaustively."
- "ColdCase recovers *documented* reasoning. It cannot recover what was never written down."

### 4.7 Personas

Four short lines, each with a one-sentence description.

- **New hire** — Understand a module before touching it.
- **Open-source contributor** — Find out if odd behavior is intentional.
- **Inheriting maintainer** — Reconstruct institutional knowledge.
- **Refactorer** — Know what a piece of code was protecting against.

### 4.8 Example cases

A grid of case cards. Each card shows:

- Repo name (`owner/repo`)
- Files analyzed
- A confidence mix bar (small, text-labeled, not color-only)
- A "Open case" button

### 4.9 Accuracy panel

A small table of measured results from `eval/RESULTS.md`. It shows:

- Quote-check pass rate
- Precision (with sample size)
- Removal rate
- Coverage

Beneath the table: "Measured on N claims across M repositories. See the full evaluation." Link to `eval/RESULTS.md`.

### 4.10 FAQ

Eight questions with short answers. Each is a disclosure (`<details>` styled). Keyboard-accessible.

- Does it change my repository?
- Do you store my token?
- How accurate is it?
- What languages does it support?
- What if there's no evidence?
- Can I analyze a private repo?
- How long does an analysis take?
- Where do the accuracy numbers come from?

### 4.11 Footer

Four columns:

- Product: landing, case library, live analysis (P1)
- Resources: evaluation results, known limits, source code
- Trust: how confidence is computed, evidence model
- Credits: team names, hackathon, license

---

## 5. Case overview (`/c/:owner/:repo`)

The case overview orients the user: what the repo is, which files matter, and how much evidence there is.

### 5.1 Layout

Two columns on desktop. One column on mobile.

| Column | Width | Content |
|---|---|---|
| Left | 2/3 | Synthesis (eras + key decisions) |
| Right | 1/3 | Hotspot list + stats |

### 5.2 Header

| Element | Content |
|---|---|
| Title | `owner/repo` |
| Subtitle | "Analyzed at commit `<short sha>` on `<date>`" |
| Stats | Files analyzed, confidence mix, evidence count |

### 5.3 Synthesis

Eras are listed in chronological order. Each era shows:

- Name
- Date range
- Summary paragraph
- A list of supporting claim IDs as small links

Key decisions are listed after the eras. Each shows:

- One-sentence description
- Supporting claim links

### 5.4 Hotspot list

A ranked list of analyzed files. Each row shows:

- Rank number
- Path
- Change count
- Hotspot reasons ("changed 27 times", "4 authors", "has linked PRs")
- A confidence mix mini-bar

Clicking a row opens the case file view for that file.

### 5.5 Limits banner

If `stats.files_analyzed < stats.files_total`, a banner shows: "This case covers the top {{N}} of {{M}} files."

If the synthesis is empty, a banner shows: "The pipeline could not identify eras for this repository. This usually means the history is sparse."

---

## 6. Case file view (`/c/:owner/:repo/f/*`)

The case file view is the core experience: the code on the left, the story on the right.

### 6.1 Layout

Split view. On desktop, two panes side by side. On mobile, stacked with a tab switcher at the top ("Code" / "Story").

| Pane | Width (desktop) | Content |
|---|---|---|
| Code viewer | 55% | File text with gutter markers |
| Story panel | 45% | Chronological claims |

Both panes scroll independently. The line-why panel and evidence drawer overlay on top of the right pane.

### 6.2 Code viewer

Each line is a row with three cells:

```
[gutter button] [line number] [code]
```

| Cell | Width | Behavior |
|---|---|---|
| Gutter | 32 px | A `<button>` only if the line has linked history; otherwise empty |
| Line number | 48 px | Right-aligned, muted, non-selectable |
| Code | flexible | `pre` with `whitespace-pre-wrap`, monospace 13 px |

- Gutter buttons show a small filled circle in the accent color.
- The selected line's row gets a subtle accent-tinted background.
- Clicking a gutter button sets `?line=N` and opens the Line Why panel.
- No syntax highlighting in the MVP. Optional Shiki integration if time allows.
- No code editing. The viewer is read-only.

### 6.3 Story panel

A chronological list of claim cards. Each claim card shows:

| Element | Notes |
|---|---|
| Claim text | Body size, `--fg` |
| `stated` / `inferred` label | Small caps, `--fg-muted` |
| Confidence badge | Text + icon + tooltip |
| Receipt links | One per evidence ID, opens the evidence drawer |
| Line reference | If `line_range` is present, a "Go to line" link |

Claims with `confidence_tier === "NONE"` show the text "No recorded reason found" and no receipt links. They are styled the same as other claims; the honesty is in the text, not in a warning color.

The story panel header shows:

- File path
- A "Sampled history" chip if `sampled_history` is true
- A "Low evidence" chip if the file has no HIGH or MEDIUM claims

### 6.4 Honesty banners

Banners appear at the top of the story panel, above the claims.

| Banner | Trigger | Copy |
|---|---|---|
| Sampled history | `sampled_history === true` | "This story is based on a sample of the file's history." |
| Low evidence | No HIGH or MEDIUM claims | "This file has little recorded reasoning. ColdCase is showing what it found, not guessing." |

---

## 7. Line Why panel

The Line Why panel answers one question: why does this line exist?

### 7.1 Trigger

Clicking a gutter button in the code viewer.

### 7.2 Position

A panel that overlays the right side of the screen on desktop. A full-height sheet from the bottom on mobile.

### 7.3 Content

| Element | Source |
|---|---|
| Introducing commit (SHA, author, date, subject) | `blame[].sha` → `evidence[]` |
| Linked PR or issue, if any | `blame[].evidence_ids` → `evidence[]` |
| The claim whose evidence overlaps the line | `findClaimsForLine()` |
| Confidence badge | Claim's `confidence_tier` |
| Receipt links | Claim's `evidence_ids` |
| "Open on GitHub" link | Evidence URL |

If no claim overlaps, the panel shows:

- The introducing commit
- A "No recorded reason found" message
- A LOW or NONE badge
- A note: "Consider asking a teammate who worked on this file."

### 7.4 Accessibility

- The panel is a `<section>` with `aria-live="polite"`.
- Focus moves to the panel heading when it opens.
- Escape closes the panel and returns focus to the gutter button.
- The panel is fully keyboard-navigable.

---

## 8. Evidence drawer

The evidence drawer shows the full text of one evidence item with the claim's quote highlighted.

### 8.1 Trigger

Clicking a receipt link on a claim card, or clicking an evidence ID in the Line Why panel.

### 8.2 Position

A right-side sheet, 480 px wide on desktop, full-width on mobile.

### 8.3 Content

| Section | Content |
|---|---|
| Header | Type ("Pull request #1234"), title, close button |
| Metadata | Author, timestamp, evidence ID (monospace) |
| Body | Full text, `whitespace-pre-wrap`, with the quote highlighted |
| Footer | "Open on GitHub" button |

The highlight is computed by the same `normalizeWhitespace()` function used by the pipeline's quote check, so the highlighted span is guaranteed to match what was verified.

### 8.4 Accessibility

- Built on Radix Dialog.
- Focus trap while open.
- Escape closes.
- Focus returns to the triggering receipt link on close.
- The highlight uses `<mark>` for screen-reader semantics.

---

## 9. Component inventory

A complete list of components. Every component lives in `apps/web/src/components/`.

### 9.1 Landing

| Component | Purpose |
|---|---|
| `Hero` | Headline, subhead, URL input, example chips |
| `MiniDemo` | Interactive offline demo using fixture data |
| `HowItWorks` | Four-step diagram |
| `TrustCard` | Sample claim card with receipts |
| `LimitsSection` | Honest limits copy |
| `Personas` | Four persona lines |
| `CaseGallery` | Example case grid |
| `AccuracyPanel` | Measured results table |
| `FAQ` | Eight disclosure items |
| `Footer` | Four-column footer |

### 9.2 Case

| Component | Purpose |
|---|---|
| `CaseHeader` | Title, subtitle, stats |
| `SynthesisPanel` | Eras and key decisions |
| `HotspotList` | Ranked files with reasons |
| `LimitsBanner` | Sampled history, low evidence, or case-limited banner |
| `ConfidenceMixBar` | Small distribution bar with text labels |

### 9.3 File

| Component | Purpose |
|---|---|
| `CodeView` | Line-rendered read-only code |
| `GutterButton` | Clickable line marker |
| `StoryPanel` | Chronological claim list |
| `ClaimCard` | One claim with label, badge, receipts |
| `LineWhyPanel` | Line-why overlay |
| `EvidenceDrawer` | Evidence sheet with highlight |

### 9.4 Shared

| Component | Purpose |
|---|---|
| `ConfidenceBadge` | Text + icon + tooltip |
| `StatedLabel` | `stated` / `inferred` label |
| `ReceiptLink` | Evidence link that opens the drawer |
| `HonestyBanner` | One of three honesty messages |
| `SkipLink` | Skip to content |
| `Button` | Primary, secondary, ghost variants |
| `Chip` | Small label for sampled history, low evidence |
| `Tooltip` | Radix tooltip for badges |

---

## 10. Component specifications

### 10.1 `ConfidenceBadge`

The badge shows the tier as text and icon. It never relies on color alone.

| Tier | Icon | Label | Color |
|---|---|---|---|
| HIGH | `●` (filled circle) | "High" | `--conf-high` |
| MEDIUM | `◐` (half circle) | "Medium" | `--conf-medium` |
| LOW | `○` (hollow circle) | "Low" | `--conf-low` |
| NONE | `—` (em dash) | "None" | `--conf-none` |

The badge has an `aria-label` of "Confidence: High" (or the relevant tier). The tooltip shows the criteria for that tier.

A grayscale screenshot of the badge must be readable. The icon and the label carry the meaning; the color is reinforcement.

### 10.2 `StatedLabel`

A small uppercase label next to the claim text.

| Value | Label | Tooltip |
|---|---|---|
| `stated` | "STATED" | "The evidence directly says this." |
| `inferred` | "INFERRED" | "Reasoned from the diff or context." |

### 10.3 `ReceiptLink`

A small link showing the evidence ID, with a chain-link icon.

- Opens the evidence drawer for that ID.
- Has an `aria-label` of "Open evidence: Pull request #1234".
- Keyboard-focusable.

### 10.4 `HonestyBanner`

A single-line banner with a small icon and a short message. Three variants:

| Variant | Icon | Message |
|---|---|---|
| `sampled` | `~` | "This story is based on a sample of the file's history." |
| `low-evidence` | `?` | "This file has little recorded reasoning." |
| `case-limited` | `#` | "This case covers the top {{N}} of {{M}} files." |

Banners use `--bg-subtle` with `--fg-muted` text. They are never red; they are not errors.

### 10.5 `CodeView`

Props:

```typescript
interface CodeViewProps {
  content: string;
  blame: BlameRange[];
  onLineClick: (lineNumber: number) => void;
  selectedLine?: number;
}
```

Behavior:

- Splits `content` on `\n`.
- Renders each line as a row.
- Only lines covered by a blame range get a gutter button.
- The selected line's row is tinted with `--accent` at 20% opacity.
- Real `<button>` elements in the gutter. No `div` with `onClick`.

### 10.6 `LineWhyPanel`

Props:

```typescript
interface LineWhyPanelProps {
  lineNumber: number;
  blame: BlameRange;
  claims: Claim[];
  evidence: Evidence[];
  onClose: () => void;
  onOpenEvidence: (id: string) => void;
}
```

Behavior:

- Shows the commit, linked PR/issue, and any overlapping claims.
- If no claims overlap, shows the "No recorded reason found" message.
- Uses `aria-live="polite"` so screen readers announce the update.
- Escape closes.

### 10.7 `EvidenceDrawer`

Props:

```typescript
interface EvidenceDrawerProps {
  evidence: Evidence | null;
  quote?: string;
  onClose: () => void;
}
```

Behavior:

- Built on Radix Dialog.
- Focus trap.
- Highlight the quote within `evidence.body` using `<mark>`.
- "Open on GitHub" link with `target="_blank"` and `rel="noopener noreferrer"`.

---

## 11. State and URL

The app has no global state library. All state that matters lives in the URL.

| State | Where | Notes |
|---|---|---|
| Current case | Path segment (`/c/:owner/:repo`) | |
| Current file | Path segment (`/c/:owner/:repo/f/*`) | |
| Selected line | Query param (`?line=42`) | Set by gutter click, cleared by panel close |
| Open evidence | Query param (`?evidence=pr:1234`) | Set by receipt click, cleared by drawer close |
| Current tab on mobile | Query param (`?tab=story`) | Defaults to `code` |

React Router loaders fetch data before the route renders. This means the "loading" state is a route-level concern, not a component-level one.

---

## 12. Loading, empty, and error states

Every screen has four states: loading, empty, error, and populated. None of them is a blank page.

### 12.1 Loading

A skeleton with the same layout as the populated screen. No spinners. Skeletons use `--bg-subtle` blocks with a subtle pulse, disabled under `prefers-reduced-motion`.

### 12.2 Empty

| Screen | Empty state |
|---|---|
| Case overview | "This case has no synthesis. The history may be too sparse." |
| Story panel | "No claims for this file. The history may be all junk commits." |
| Evidence drawer | Never empty (only opened with an evidence item) |
| Case file | "This file is not part of the analyzed set." |

### 12.3 Error

Error states are covered in `ERROR_HANDLING.md` §5. The UI shows a plain panel with a short message and a next step. No stack traces.

### 12.4 Populated

The normal state. No special styling.

---

## 13. Responsive behavior

The app is responsive down to 375 px.

| Breakpoint | Layout |
|---|---|
| `>= 1024 px` | Two-column case file view; side drawer for evidence |
| `768–1023 px` | Two-column with narrower code pane; side drawer |
| `< 768 px` | Stacked view with a tab switcher; bottom sheet for evidence |

On mobile, the gutter buttons are larger (44 px minimum tap target) and the code pane is horizontally scrollable rather than wrapping.

---

## 14. Accessibility requirements

The app targets WCAG 2.2 AA. These are the specific requirements that matter for the demo.

### 14.1 Structure

- Semantic landmarks: `<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>`.
- Heading order is correct: one `<h1>` per page, no skipped levels.
- A "Skip to content" link is the first focusable element on every page.

### 14.2 Keyboard

- Every interactive element is reachable with Tab.
- Every button is operable with Enter and Space.
- The evidence drawer and Line Why panel trap focus while open and return focus on close.
- Escape closes every overlay.
- The code viewer's gutter buttons are keyboard-focusable in document order.

### 14.3 Screen readers

- Gutter buttons have `aria-label="Show why for line 42"`.
- The Line Why panel uses `aria-live="polite"`.
- Confidence badges have `aria-label="Confidence: High"`.
- The evidence drawer's highlight uses `<mark>`.
- Receipt links have `aria-label="Open evidence: Pull request #1234"`.

### 14.4 Visual

- Focus rings are visible on every interactive element (2 px solid `--accent`, 2 px offset).
- Contrast meets 4.5:1 for body text and 3:1 for large text and UI elements.
- Confidence is never conveyed by color alone.
- `prefers-reduced-motion: reduce` disables all animation and transition.

### 14.5 Testing

- Run axe or Lighthouse on the landing page and the case file page. Target: accessibility score ≥ 90.
- Do a full keyboard-only walkthrough of the demo path.
- Take a grayscale screenshot of a page with confidence badges and confirm they are readable.

---

## 15. Copy and tone

### 15.1 Voice

Plain, confident, non-hype. No "AI magic" language. No exclamation points. No emojis.

### 15.2 Rules

- Say what the product does and does not do.
- Never say "nobody does this" or "the first of its kind."
- Never claim a feature that is not built.
- Prefer specific numbers over vague adjectives.
- Say "we don't know" when we don't know.

### 15.3 Fixed strings

These strings appear in multiple places and must match exactly.

| String | Where |
|---|---|
| "No recorded reason found" | NONE claims, Line Why panel |
| "Every line has a reason. Find it." | Hero headline |
| "git blame tells you who. ColdCase tells you why, with receipts." | Tagline |
| "This story is based on a sample of the file's history." | Sampled history banner |
| "This file has little recorded reasoning. ColdCase is showing what it found, not guessing." | Low evidence banner |
| "This case covers the top {{N}} of {{M}} files." | Case-limited banner |

Do not paraphrase these. The UI and the eval harness match on them.

---

## 16. What the UI does not do

- It does not show a claim without a receipt.
- It does not show a confidence tier without its label and icon.
- It does not render third-party text as HTML.
- It does not use color alone to convey meaning.
- It does not animate on the critical path.
- It does not use a code editor library.
- It does not have a chat interface.
- It does not have a timeline chart.
- It does not have a settings screen.
- It does not have a login.
- It does not fetch data at display time on the demo path.

---

## 17. Component file layout

```
apps/web/src/
├─ pages/
│  ├─ LandingPage.tsx
│  ├─ CasePage.tsx
│  ├─ FilePage.tsx
│  └─ AnalyzePage.tsx          # P1
├─ components/
│  ├─ landing/
│  │  ├─ Hero.tsx
│  │  ├─ MiniDemo.tsx
│  │  ├─ HowItWorks.tsx
│  │  ├─ TrustCard.tsx
│  │  ├─ LimitsSection.tsx
│  │  ├─ Personas.tsx
│  │  ├─ CaseGallery.tsx
│  │  ├─ AccuracyPanel.tsx
│  │  ├─ FAQ.tsx
│  │  └─ Footer.tsx
│  ├─ case/
│  │  ├─ CaseHeader.tsx
│  │  ├─ SynthesisPanel.tsx
│  │  ├─ HotspotList.tsx
│  │  └─ ConfidenceMixBar.tsx
│  ├─ file/
│  │  ├─ CodeView.tsx
│  │  ├─ GutterButton.tsx
│  │  ├─ StoryPanel.tsx
│  │  ├─ ClaimCard.tsx
│  │  ├─ LineWhyPanel.tsx
│  │  └─ EvidenceDrawer.tsx
│  ├─ shared/
│  │  ├─ ConfidenceBadge.tsx
│  │  ├─ StatedLabel.tsx
│  │  ├─ ReceiptLink.tsx
│  │  ├─ HonestyBanner.tsx
│  │  ├─ SkipLink.tsx
│  │  ├─ Button.tsx
│  │  ├─ Chip.tsx
│  │  └─ Tooltip.tsx
│  └─ ui/                       # shadcn/ui pieces
│     ├─ sheet.tsx
│     ├─ badge.tsx
│     ├─ tooltip.tsx
│     └─ tabs.tsx
├─ lib/
│  ├─ data.ts
│  ├─ snapshots.ts
│  └─ lineLookup.ts
├─ styles/
│  └─ index.css                 # Tokens + Tailwind
└─ router.tsx
```

---

## 18. Checklist before the demo

- [ ] Every screen has loading, empty, error, and populated states.
- [ ] The demo path works with the network off.
- [ ] Every interactive element is keyboard-reachable.
- [ ] Escape closes the drawer and the Line Why panel.
- [ ] Confidence badges pass the grayscale test.
- [ ] Honesty banners appear where expected.
- [ ] The hero headline and the tagline match the fixed strings.
- [ ] The mini-demo works with no network calls.
- [ ] The evidence drawer highlights the quote correctly.
- [ ] Line click to Line Why panel is under 200 ms.
- [ ] Case page load is under 2 s.
- [ ] Axe or Lighthouse accessibility score is ≥ 90 on the landing and case file pages.

---

**End of UI Specification**