# ColdCase — Design System

This document defines the visual language of ColdCase. It is a premium product spec, not a wireframe. The reference for the aesthetic is a modern, restrained AI workspace interface: generous whitespace, one primary display headline, soft diffused depth, warm gradients used as atmosphere rather than decoration, and card-based actions that feel considered rather than crowded. That reference is a structural inspiration, not a palette. ColdCase keeps its own identity — a dark, forensic, editorial surface with one accent — and borrows the reference's calm, its hierarchy, and its material quality.

The goal is simple to state and hard to achieve: a first-time visitor should feel that this is a real product made by people who care, before they read a single word of copy. Premium here does not mean ornate. It means every pixel is intentional, every shadow is soft, every corner is rounded for a reason, and nothing is loud except the thing that should be.

---

## 1. Design philosophy

Five principles drive every decision. When two options are plausible, the one that better satisfies a higher principle wins.

**Calm before clever.** The interface does not compete with the code. Motion is subtle, color is restrained, and the chrome recedes so the content — a strange line, an evidence quote — stands forward.

**One focal point per screen.** The hero headline on the landing page. The selected line in the code viewer. The highlighted quote in the evidence drawer. Everything else supports that one thing.

**Depth by atmosphere, not by shadow.** The reference uses a warm radial gradient to give the page a sense of room. ColdCase does the same, in its own palette: a slow amber glow behind the hero, a faint vignette at the edges, nothing that draws attention to itself.

**Material consistency.** Rounded corners, soft borders, and diffused shadows use one scale across the whole product. A drawer, a card, and a badge feel like they were cut from the same material.

**Premium is restraint.** No gradients on buttons, no drop shadows on text, no illustration, no emoji, no emoji-adjacent icons. What is present is polished until it disappears.

---

## 2. What we take from the reference

The reference is a modern AI workspace with a light, warm palette. ColdCase is a forensic code tool with a dark, cool palette. The structural lessons transfer even though the palette does not.

| Reference trait | What we take | What we adapt |
|---|---|---|
| Centered display headline ("Good afternoon, Lukas") | A single large headline anchors the hero | ColdCase: "Every line has a reason. Find it." |
| Large, rounded input field | A prominent, inviting primary input | ColdCase: the repo URL field, same rounded geometry |
| Warm gradient background | Atmosphere via a soft radial glow | ColdCase: amber radial glow on a dark base |
| Quick-start cards in a 2×2 grid | Card-based actions for first-time users | ColdCase: "Try an example case" cards |
| Sidebar with sections and recents | Structured navigation with clear grouping | ColdCase: case library, recent cases, filters |
| Segmented top tabs | Lightweight view switching | ColdCase: Code / Story tabs on mobile |
| Small pill badges | Inline status without weight | ColdCase: `stated` / `inferred` labels, confidence chips |
| Generous whitespace | Breathing room around content | Applied everywhere |
| Rounded 16–24 px corners on major surfaces | Soft, material feel | Applied to cards, drawers, modals |
| Diffused, low-opacity shadows | Depth without harshness | Applied to drawers, modals, elevated cards |
| Small circular icon containers | Icons feel contained, not floating | Applied to quick-action cards, evidence type icons |
| User profile anchored at the bottom of the sidebar | Persistent identity | ColdCase: repo identity ("owner/repo" + analyzed SHA) |

The palette is the one thing we do not borrow. ColdCase is dark. This is a deliberate choice: the product shows code, and code reads better on a dark surface. The warmth of the reference translates into the single amber accent and the amber-tinted radial glow behind the hero.

---

## 3. Color system

The palette is small and intentional. Every color has a job. Nothing is decorative.

### 3.1 Base surfaces

| Token | Value | Used for |
|---|---|---|
| `--bg-base` | `#0a0a0b` | The page. The deepest layer. |
| `--bg-elevated` | `#141416` | Panels, cards, drawers. One step up from the page. |
| `--bg-raised` | `#1c1c1f` | Hover states, selected rows, small controls. |
| `--bg-overlay` | `rgba(10, 10, 11, 0.72)` | The dim behind modals and sheets. |

The four surfaces form a clear depth ladder. A card sits on the page. A drawer sits on the card. A tooltip sits on the drawer. Nothing skips a step.

### 3.2 Atmospheric gradient

The landing page and the case overview carry a radial gradient behind the hero. It is the only large-scale color effect in the product.

| Token | Value | Used for |
|---|---|---|
| `--glow-accent` | `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245, 158, 11, 0.12), transparent 70%)` | The warm glow behind hero sections |
| `--glow-subtle` | `radial-gradient(ellipse 60% 50% at 20% 100%, rgba(245, 158, 11, 0.06), transparent 60%)` | A faint secondary glow in lower corners |

The glow is never animated. It never moves. It sits behind content, at a low opacity, so it reads as light rather than as a graphic. On the case file view, the glow is absent — the code viewer and story panel need a flat surface.

### 3.3 Text

| Token | Value | Used for |
|---|---|---|
| `--fg-primary` | `#fafafa` | Headlines, claim text, code |
| `--fg-secondary` | `#a1a1aa` | Body, metadata, descriptions |
| `--fg-tertiary` | `#71717a` | Line numbers, timestamps, subtle hints |
| `--fg-disabled` | `#52525b` | Disabled controls |

### 3.4 Accent

One accent. Used sparingly.

| Token | Value | Used for |
|---|---|---|
| `--accent` | `#f59e0b` | Active gutter markers, focus rings, primary CTAs, the hero glow |
| `--accent-hover` | `#fbbf24` | Hover on accent elements |
| `--accent-muted` | `rgba(245, 158, 11, 0.12)` | Accent-tinted backgrounds for selected rows |

If a screen has more than three accent-colored elements, one of them is wrong.

### 3.5 Borders and dividers

| Token | Value | Used for |
|---|---|---|
| `--border-default` | `#27272a` | Panel edges, card outlines |
| `--border-subtle` | `#1f1f23` | Internal dividers, section separators |
| `--border-accent` | `rgba(245, 158, 11, 0.4)` | Focus rings, active states |

### 3.6 Confidence tiers

Confidence is the product's most important signal. It uses text and icon first, color second.

| Tier | Icon | Text color | Background |
|---|---|---|---|
| HIGH | `●` | `#22c55e` | `rgba(34, 197, 94, 0.10)` |
| MEDIUM | `◐` | `#eab308` | `rgba(234, 179, 8, 0.10)` |
| LOW | `○` | `#f97316` | `rgba(249, 115, 22, 0.10)` |
| NONE | `—` | `#71717a` | `rgba(113, 113, 122, 0.10)` |

Every badge shows the icon, the label, and the tier name. A grayscale screenshot must be readable.

### 3.7 Semantic states

| State | Color | Used for |
|---|---|---|
| Success | `#22c55e` | Same as HIGH; used for confirmations |
| Warning | `#eab308` | Same as MEDIUM; used for honesty banners that need attention |
| Danger | `#ef4444` | Errors, destructive actions (rare) |

Honesty banners use `--bg-raised` with `--fg-secondary`, never danger red. They are not errors. They are honesty.

---

## 4. Typography

Two fonts. One display, one mono. Nothing else.

### 4.1 Families

| Token | Value | Fallback stack |
|---|---|---|
| `--font-display` | `Inter` | `Inter, system-ui, -apple-system, sans-serif` |
| `--font-mono` | `JetBrains Mono` | `JetBrains Mono, ui-monospace, SFMono-Regular, monospace` |

Fonts are loaded from a self-hosted source with `font-display: swap`. No third-party font CDNs on the demo path.

### 4.2 Scale

| Style | Size | Weight | Line height | Letter spacing | Used for |
|---|---|---|---|---|---|
| Display | 56 px | 500 | 1.05 | -0.02em | Landing hero headline |
| Display-small | 40 px | 500 | 1.10 | -0.015em | Case overview headline |
| H1 | 32 px | 600 | 1.20 | -0.01em | Page titles |
| H2 | 24 px | 600 | 1.30 | -0.005em | Section headings |
| H3 | 18 px | 600 | 1.40 | 0 | Panel headings, claim cards |
| Body-large | 17 px | 400 | 1.60 | 0 | Landing body copy |
| Body | 15 px | 400 | 1.60 | 0 | Default body text |
| Small | 13 px | 400 | 1.50 | 0 | Metadata, secondary |
| Caption | 11 px | 500 | 1.40 | 0.02em | Badges, labels, table headers |
| Mono | 13 px | 400 | 1.55 | 0 | Code, SHAs, evidence IDs |

The reference uses a light-weight, tightly-tracked display headline. ColdCase adopts the same restraint: 500 weight, negative tracking, generous size. It reads as confident, not loud.

### 4.3 Rules

- Never use more than two weights on one screen.
- Never use a size below 11 px.
- Never use italic for emphasis. Use weight or color.
- Never use ALL CAPS except for caption labels (`STATED`, `INFERRED`).
- Line length caps at 72 characters for body text.

---

## 5. Spacing and layout

### 5.1 Spacing scale

A single scale, used everywhere. No arbitrary values.

| Token | Value |
|---|---|
| `space-1` | 4 px |
| `space-2` | 8 px |
| `space-3` | 12 px |
| `space-4` | 16 px |
| `space-5` | 20 px |
| `space-6` | 24 px |
| `space-8` | 32 px |
| `space-10` | 40 px |
| `space-12` | 48 px |
| `space-16` | 64 px |
| `space-20` | 80 px |
| `space-24` | 96 px |

The reference uses generous vertical rhythm: sections are separated by 80–120 px, and the hero has 160+ px of space above it. ColdCase adopts the same rhythm on the landing page and the case overview. Dense views (code viewer, story panel) use tighter spacing: 8–16 px between rows.

### 5.2 Layout grid

| Breakpoint | Container max-width | Columns | Gutter |
|---|---|---|---|
| `< 640 px` | 100% | 1 | 16 px |
| `640–1023 px` | 100% | 1 | 24 px |
| `1024–1439 px` | 1200 px | 12 | 32 px |
| `>= 1440 px` | 1280 px | 12 | 32 px |

The landing page and the case overview use a centered container. The case file view breaks out of the container and uses the full viewport width, split into a 55/45 code/story layout.

### 5.3 Radius scale

Rounded corners are a core part of the premium feel. The reference uses large radii on major surfaces.

| Token | Value | Used for |
|---|---|---|
| `--radius-xs` | 4 px | Badges, small chips |
| `--radius-sm` | 6 px | Buttons, small controls |
| `--radius-md` | 10 px | Input fields, small cards |
| `--radius-lg` | 16 px | Cards, panels, drawers |
| `--radius-xl` | 20 px | The primary input field, large modals |
| `--radius-full` | 9999 px | Pills, avatars, circular icons |

The primary URL input on the landing page uses `--radius-xl`. It is the largest element on the page and its softness signals invitation.

### 5.4 Elevation

Depth is created by a combination of surface color and diffused shadow. Shadows are always low-opacity and large-radius.

| Token | Value | Used for |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle elevation, hover on cards |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.35)` | Elevated cards, tooltips |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.40)` | Drawers, sheets |
| `--shadow-xl` | `0 16px 48px rgba(0,0,0,0.50)` | Modals |

Never use a shadow with a spread or a colored shadow. Shadows are neutral black with low opacity.

---

## 6. Motion

Motion is subtle and purposeful. The reference uses gentle fade-and-rise transitions. ColdCase does the same.

### 6.1 Tokens

| Token | Value | Used for |
|---|---|---|
| `--motion-instant` | 80 ms | Hover, focus |
| `--motion-fast` | 140 ms | Small transitions |
| `--motion-base` | 220 ms | Panel open, drawer slide |
| `--motion-slow` | 320 ms | Page-level transitions |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Everything |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Sheet close |

### 6.2 Patterns

- **Fade-and-rise.** Elements entering the viewport fade in and rise 8 px. Used on the landing page's section reveals.
- **Slide-in.** The evidence drawer slides from the right. The Line Why panel slides from the bottom on mobile, fades in on desktop.
- **Micro-scale.** Buttons scale to 0.98 on press. No bounce, no overshoot.
- **Highlight pulse.** When a claim is selected, its border pulses once, then settles. Used to connect a receipt link click to its target.

### 6.3 Rules

- Never animate on the critical path. The code viewer and the story panel render instantly.
- Never animate more than two properties at once.
- Never use spring physics. Easing is always `--ease-out`.
- Respect `prefers-reduced-motion: reduce`. Every animation is wrapped in `motion-safe:`. When reduced motion is on, transitions become instant and reveals become immediate.

---

## 7. Components

### 7.1 Buttons

Three variants. No more.

| Variant | Background | Text | Border | Used for |
|---|---|---|---|---|
| Primary | `--accent` | `#0a0a0b` | none | The one action on a screen |
| Secondary | transparent | `--fg-primary` | `--border-default` | Supporting actions |
| Ghost | transparent | `--fg-secondary` | none | Inline actions, icon buttons |

Sizes: `sm` (28 px height), `md` (36 px), `lg` (44 px). Padding is `space-3` horizontal at `sm`, `space-4` at `md`, `space-5` at `lg`.

Rounded to `--radius-sm` for `sm`/`md`, `--radius-md` for `lg`. Icon-only buttons are square.

Focus rings are 2 px solid `--accent` with a 2 px offset. Never remove the focus ring.

### 7.2 Input fields

The primary URL input on the landing page is the largest input in the product.

| Property | Value |
|---|---|
| Height | 64 px |
| Radius | `--radius-xl` |
| Background | `--bg-elevated` |
| Border | 1 px `--border-default` |
| Focus border | 1 px `--border-accent`, plus a 3 px `--accent-muted` outer ring |
| Placeholder | `--fg-tertiary` |
| Inner padding | `space-5` |
| Icon | A small GitHub icon on the left, `--fg-tertiary` |

The reference's input is a soft, rounded, elevated surface with an icon row beneath. ColdCase mirrors that: the URL field carries a small icon, and beneath it, a row of example chips and the "Analyze" button.

### 7.3 Cards

Cards are used for: example cases, quick actions, and the trust sample.

| Property | Value |
|---|---|
| Background | `--bg-elevated` |
| Border | 1 px `--border-subtle` |
| Radius | `--radius-lg` |
| Padding | `space-6` |
| Shadow | `--shadow-sm` at rest |
| Hover shadow | `--shadow-md` |
| Hover border | `--border-default` |
| Transition | `--motion-fast` on border and shadow |

Cards never have a colored left border. They never have a gradient. They are flat and quiet.

The reference's quick-action cards use a small circular icon container in the top-left. ColdCase does the same: a 40 px circle with a `--bg-raised` background and an accent-tinted icon.

### 7.4 Sidebar

The landing page and the case library use a left sidebar. It is 240 px wide on desktop, collapsible on tablet, hidden behind a menu on mobile.

Structure, from top to bottom:

1. **Primary action.** A single "New analysis" button (P1) or "Case library" link (P0).
2. **Quick links.** Search, Filters.
3. **Sections.** Cases, Files, Evidence.
4. **Recent items.** A list of recently opened cases, each with the repo name and the analyzed date.
5. **Footer.** Repo identity or a link to the evaluation results.

The reference's sidebar uses muted icons, soft dividers, and a clear visual hierarchy between sections and items. ColdCase adopts the same: section headers use caption styling, items use small styling with a subtle hover state.

### 7.5 Top bar

The case file view and the case overview have a top bar with:

- A breadcrumb: `Case library / owner/repo / path`
- A segmented control (Code / Story) on mobile
- A "Share" ghost button that copies the current URL

The segmented control uses `--bg-raised` for the track and `--bg-elevated` for the active pill, with a `--shadow-sm` on the active pill. This mirrors the reference's top tabs.

### 7.6 Badges and chips

| Type | Radius | Padding | Font | Used for |
|---|---|---|---|---|
| Confidence badge | `--radius-xs` | `space-1` / `space-2` | Caption | Confidence tier |
| Stated label | `--radius-xs` | `space-1` / `space-2` | Caption, uppercase | `STATED` / `INFERRED` |
| Chip | `--radius-full` | `space-2` / `space-3` | Small | Sampled history, low evidence |
| Evidence ID | `--radius-xs` | `space-1` / `space-2` | Mono | Receipt links |

The reference uses small pill badges for status ("Pro Plan"). ColdCase uses them for confidence and evidence type. Same geometry, different content.

### 7.7 Drawers and sheets

The evidence drawer and the Line Why panel are the two largest overlays.

| Property | Value |
|---|---|
| Background | `--bg-elevated` |
| Radius | `--radius-lg` on the visible corners |
| Shadow | `--shadow-lg` |
| Backdrop | `--bg-overlay` with `backdrop-filter: blur(8px)` |
| Slide duration | `--motion-base` |
| Close on | Escape, backdrop click, close button |

On desktop, the drawer slides from the right at 480 px wide. The Line Why panel slides from the right at 380 px wide. On mobile, both become bottom sheets at full height with a grab handle.

### 7.8 The primary input (hero)

The hero input is the most important interactive element on the landing page. It is modeled on the reference's large, rounded, elevated input field.

```
┌─────────────────────────────────────────────────────────┐
│  [gh]  Paste a GitHub repository URL                    │
│                                                          │
│  [chip: axios/axios] [chip: flask/flask] [chip: ...]    │
└─────────────────────────────────────────────────────────┘
```

The input is 64 px tall, uses `--radius-xl`, and has a soft focus state. Example chips sit inside the same container, below the field, so the whole block reads as one surface. This is directly inspired by the reference.

---

## 8. Screen compositions

### 8.1 Landing page

The landing page is the premium surface. It should feel like a product from a company that has been shipping for years.

```
┌─────────────────────────────────────────────────────────┐
│  [glow: amber radial, centered, top]                    │
│                                                          │
│                    ColdCase                              │
│                                                          │
│         Every line has a reason. Find it.                │
│                                                          │
│   ColdCase reads a repository's commits, pull            │
│   requests, and issues to explain why code looks         │
│   the way it does, and links every claim to its          │
│   source.                                                │
│                                                          │
│   ┌───────────────────────────────────────────────┐     │
│   │  [gh]  Paste a GitHub repository URL          │     │
│   │                                                │     │
│   │  [Try axios/axios] [Try flask/flask] [More]   │     │
│   └───────────────────────────────────────────────┘     │
│                                                          │
│                                                          │
│              [mini-demo: click a line]                   │
│                                                          │
│                                                          │
│              How it works                                │
│         (four steps, horizontal, quiet)                  │
│                                                          │
│                                                          │
│              Why you can trust it                        │
│         (sample claim card, receipts)                    │
│                                                          │
│                                                          │
│              Honest limits                               │
│                                                          │
│                                                          │
│              Example cases                               │
│         (2×2 grid of case cards)                         │
│                                                          │
│                                                          │
│              Accuracy panel                              │
│                                                          │
│                                                          │
│              FAQ                                         │
│                                                          │
│              Footer                                      │
└─────────────────────────────────────────────────────────┘
```

Key premium signals:

- The hero is centered, with at least 160 px of space above the headline.
- The headline is 56 px, weight 500, tracking -0.02em.
- The subhead is 17 px, `--fg-secondary`, max-width 640 px, centered.
- The input is the largest element after the headline. It is 64 px tall.
- The amber glow sits behind the hero at 12% opacity. It is the only large-scale color.
- Sections are separated by 96–120 px of vertical space.
- Section headings are 24 px, weight 600, left-aligned within the container.
- Every section has one clear focal point.

### 8.2 Case overview

```
┌─────────────────────────────────────────────────────────┐
│  [top bar: breadcrumb]                    [Share]       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  axios/axios                                             │
│  Analyzed at commit a3f9c2b1 on September 19, 2026       │
│                                                          │
│  [10 files] [42 claims] [Confidence: ●60% ◐33% ○7%]     │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                          │                              │
│  Eras                    │  Hotspot files               │
│  ────────────────        │  ───────────────             │
│                          │                              │
│  2019–2020               │  1. lib/adapters/http.js     │
│  Initial extraction      │     27 changes · 4 authors   │
│  Summary paragraph...    │                              │
│  [claims: 3]             │  2. lib/core/transform.js    │
│                          │     19 changes · 3 authors   │
│  2021–2023               │                              │
│  Retry rewrite           │  3. ...                      │
│  Summary paragraph...    │                              │
│                          │                              │
│  Key decisions           │                              │
│  ────────────────        │                              │
│                          │                              │
│  Retries capped at 3     │                              │
│  [claims: 1]             │                              │
│                          │                              │
└─────────────────────────────────────────────────────────┘
```

Key premium signals:

- The case header sits in its own band with generous vertical padding (48 px).
- The confidence mix is presented as a small horizontal bar with text labels, never as a chart.
- The two-column layout gives the synthesis 2/3 of the width and the hotspot list 1/3.
- The hotspot list is a quiet, dense list. No cards. Rows separated by `--border-subtle`.
- The whole page sits inside the 1200 px container.

### 8.3 Case file view

The case file view breaks out of the container. It is the only dense screen in the product.

```
┌─────────────────────────────────────────────────────────┐
│  [top bar: breadcrumb]     [Code | Story]      [Share]  │
├──────────────────────────────┬──────────────────────────┤
│                              │                          │
│  src/util.js                 │  Story                   │
│                              │                          │
│  1  import ...               │  ┌────────────────────┐  │
│  2                           │  │ STATED      ● High │  │
│  3  function flush() {       │  │                    │  │
│  4    // ...                 │  │ The delay was      │  │
│  5    await sleep(200)  ●    │  │ added to work      │  │
│  6    // ...                 │  │ around a race.     │  │
│  7  }                        │  │                    │  │
│                              │  │ [pr:1234] [issue:567]│
│                              │  └────────────────────┘  │
│                              │                          │
│                              │  ┌────────────────────┐  │
│                              │  │ INFERRED     ○ Low │  │
│                              │  │                    │  │
│                              │  │ The function was   │  │
│                              │  │ duplicated during  │  │
│                              │  │ a refactor.        │  │
│                              │  └────────────────────┘  │
│                              │                          │
└──────────────────────────────┴──────────────────────────┘
```

Key premium signals:

- The code viewer uses monospace 13 px with 24 px line height. Gutter is 32 px.
- Gutter markers are small filled circles in `--accent`. They are the only accent-colored elements in the pane.
- The story panel is a vertical list of cards, each with generous padding (24 px).
- Each claim card shows: `stated`/`inferred` label, confidence badge, claim text, receipt links.
- The selected line's row has a subtle accent-tinted background (`--accent-muted`).
- The two panes scroll independently. The top bar stays fixed.

---

## 9. Premium details

These are the small things that separate a good product from a premium one. They cost almost nothing and they compound.

### 9.1 Soft focus rings

Every focus ring is 2 px solid `--accent` with a 2 px offset and a 3 px `--accent-muted` outer glow. This is the same treatment used on the primary input. Focus never feels jarring.

### 9.2 Border that brightens on hover

Cards and rows have a `--border-subtle` at rest and `--border-default` on hover. The transition is `--motion-fast`. The effect is a subtle lift.

### 9.3 Shadows that stay soft

Every shadow is a large-radius, low-opacity black. No colored shadows, no hard edges. A drawer's shadow reaches 48 px but stays under 50% opacity.

### 9.4 Round numbers

Every radius and spacing value comes from the scale. Nothing is a one-off. This is what makes a UI feel designed rather than assembled.

### 9.5 Mono for machine things

SHAs, evidence IDs, line numbers, and code all use `--font-mono`. Everything else uses `--font-display`. This is a small rule that pays off everywhere.

### 9.6 Empty states with copy

Every empty state has a short, plain sentence and a next step. "No claims for this file. The history may be all junk commits." Never "No data."

### 9.7 Honesty as a design element

The `NONE` confidence badge and the "No recorded reason found" placeholder are not styled as failures. They are styled the same as any other claim. This is a design choice: honesty is a feature, not an error.

### 9.8 The amber glow

The single amber radial glow on the landing page is the only decorative element in the product. It is used once and it is used quietly. It gives the page a sense of warmth without drawing attention.

### 9.9 Generous vertical rhythm

The landing page uses 96–120 px between sections. The reference uses the same rhythm. It is the single easiest way to make a page feel premium.

### 9.10 No illustration, no emoji, no decorative icons

Every icon has a job. Icons are 16 px or 20 px, single-weight, monochrome. There is no illustration and no emoji anywhere in the product.

---

## 10. Accessibility in the design

The design is accessible by construction, not by retrofit.

- Every text color meets 4.5:1 contrast against its background.
- Every UI element (borders, focus rings, icons) meets 3:1.
- Confidence is conveyed by icon, label, and text, never by color alone.
- Focus rings are visible on every interactive element.
- All animations respect `prefers-reduced-motion: reduce`.
- All interactive elements are reachable and operable with a keyboard.
- The evidence drawer and Line Why panel trap focus and restore it on close.
- The code viewer's gutter buttons are real `<button>` elements.

Accessibility is not a section in the design system. It is a constraint on every decision in every other section.

---

## 11. Design tokens file

All tokens live in `apps/web/src/styles/index.css` as CSS variables, mapped into the Tailwind theme in `tailwind.config.ts`. Nothing in a component references a raw value.

```css
:root {
  /* Surfaces */
  --bg-base: #0a0a0b;
  --bg-elevated: #141416;
  --bg-raised: #1c1c1f;
  --bg-overlay: rgba(10, 10, 11, 0.72);

  /* Atmosphere */
  --glow-accent: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245, 158, 11, 0.12), transparent 70%);
  --glow-subtle: radial-gradient(ellipse 60% 50% at 20% 100%, rgba(245, 158, 11, 0.06), transparent 60%);

  /* Text */
  --fg-primary: #fafafa;
  --fg-secondary: #a1a1aa;
  --fg-tertiary: #71717a;
  --fg-disabled: #52525b;

  /* Accent */
  --accent: #f59e0b;
  --accent-hover: #fbbf24;
  --accent-muted: rgba(245, 158, 11, 0.12);

  /* Borders */
  --border-default: #27272a;
  --border-subtle: #1f1f23;
  --border-accent: rgba(245, 158, 11, 0.4);

  /* Confidence */
  --conf-high: #22c55e;
  --conf-high-bg: rgba(34, 197, 94, 0.10);
  --conf-medium: #eab308;
  --conf-medium-bg: rgba(234, 179, 8, 0.10);
  --conf-low: #f97316;
  --conf-low-bg: rgba(249, 115, 22, 0.10);
  --conf-none: #71717a;
  --conf-none-bg: rgba(113, 113, 122, 0.10);

  /* Semantic */
  --danger: #ef4444;

  /* Radius */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* Elevation */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.40);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.50);

  /* Motion */
  --motion-instant: 80ms;
  --motion-fast: 140ms;
  --motion-base: 220ms;
  --motion-slow: 320ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

  /* Typography */
  --font-display: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
}
```

---

## 12. What this design system refuses

A premium product is defined as much by what it omits as by what it includes.

- No gradients on buttons or cards.
- No drop shadows on text.
- No illustration.
- No emoji.
- No decorative icons.
- No animation on the critical path.
- No more than one accent-colored element per screen region.
- No more than two font weights per screen.
- No arbitrary spacing or radius values.
- No charts, graphs, or dashboards.
- No card grids with more than four items above the fold.
- No scroll-jacking, parallax, or autoplay.
- No popups, no toasts, no snackbars.
- No dark mode toggle (the product is dark).
- No empty states without a next step.
- No error state without a plain message.
- No claim without a receipt.

---

**End of Design System**