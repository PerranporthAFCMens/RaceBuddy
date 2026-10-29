# Brand guide for developers

The app looks like a race-day poster: black, white and one gold accent, square
corners, capital-letter headings. This file says how to build screens that keep
that look. The full visual guide (with examples) is the published brand guide;
this file is the rulebook the code follows.

**The product name is not final.** Never type it into a component. Use
`brand.name` / `brand.wordmark` from `src/design/brand.ts` and the `<Logo />`
component, so a rename is a one-file change.

## Where things live

| What | File |
| --- | --- |
| Design tokens (single source of truth) | `src/design/tokens.ts` |
| Name, wordmark, tagline | `src/design/brand.ts` |
| Tailwind theme (generated, don't edit) | `src/app/tokens.css` |
| Component classes (`btn-gold`, `input`, `flag-gold`…) | `src/app/globals.css` |
| Every building block on one page | `/styleguide` (hidden on the live site) |
| Lint rule | `eslint-rules/brand.mjs` |
| Contrast and stylesheet tests | `src/design/tokens.test.ts` |
| Screen tests and screenshots | `e2e/brand.spec.ts`, `e2e/__screenshots__/` |

To change a token: edit `tokens.ts`, run `npm run tokens`, commit both files.

## Colour

| Token | Hex | Use |
| --- | --- | --- |
| `bg` | `#000000` | Page background, everywhere |
| `panel` | `#111111` | Inputs, sheets |
| `soft` | `#1a1a1a` | Hover fill, other people's chat bubbles |
| `edge` | `#4d4d4d` | Decorative dividers and card outlines only |
| `line` | `#808080` | Edges of controls: inputs, chips, checkboxes |
| `muted` | `#a6a6a6` | Secondary text: labels, hints, timestamps |
| `hint` | `#8c8c8c` | Placeholder text |
| `fg` | `#ffffff` | Main text, white buttons, section rules |
| `accent` | `#c09b2f` | Gold: primary action, active tab, ticket flags |
| `accent-ink` | `#000000` | Text and icons on gold |
| `ok` | `#5fb36a` | Matched, saved, success |
| `danger` | `#e5484d` | Errors, destructive actions |

Rules:

- Use classes like `bg-panel`, `text-muted`, `border-line`. Tailwind's default
  palette (`text-white`, `bg-gray-800`…) is switched off and the linter rejects it.
- Tints of a token are fine: `bg-accent/10`, `from-bg/90`.
- One gold thing should lead each screen: the main button or the active state.
  Gold is not decoration.
- Anything on gold uses `accent-ink` (black). Never put green or white on gold
  (green on gold is 1:1, invisible).
- `edge` is too faint (2.2:1) to be the only outline of something people must
  find or tap. Use `line` for controls.
- Outside CSS (emails, `global-error.tsx`, metadata), import `colors` from
  `src/design/tokens.ts`. Never paste a hex value.

Contrast (WCAG 2.2 AA), checked by `npm test`:

| Pair | Ratio | Target |
| --- | --- | --- |
| fg on bg | 21:1 | 4.5 |
| muted on bg / panel | 8.6 / 7.8:1 | 4.5 |
| hint on panel | 5.6:1 | 4.5 |
| accent on bg | 8.0:1 | 4.5 |
| accent-ink on accent | 8.0:1 | 4.5 |
| ok on bg | 8.1:1 | 4.5 |
| danger on bg / panel | 5.4 / 4.8:1 | 4.5 |
| line on panel | 4.8:1 | 3 (control edge) |

## Type

- **Open Sans** (`font-sans`, default) for everything.
- **Anton** (`font-display`) for big numbers, profile names and the wordmark
  accent. Always uppercase. Never for sentences.
- Weights: `font-normal` (400), `font-semibold` (600, buttons, labels),
  `font-bold` (700, names, flags). Nothing else exists.
- Headings, buttons, labels, flags and nav are UPPERCASE via the `uppercase`
  class. Write the text itself in sentence case, so screen readers and copy
  edits stay sane.

| Class | Size / line height | Use |
| --- | --- | --- |
| `text-2xs` | 11 / 11px | Counters, tiny nav labels |
| `text-xs` | 12 / 16px | Flags, field labels, captions |
| `text-sm` | 14 / 20px | Secondary copy, buttons, lists |
| `text-base` | 16 / 24px | Body, inputs (16px stops iOS zoom) |
| `text-lg` | 18 / 28px | Lead paragraph, step titles |
| `text-xl` | 20 / 28px | Section headings (`heading`) |
| `text-2xl` | 24 / 32px | Page titles |
| `text-3xl` | 30 / 36px | Hero title, step numbers |
| `text-4xl` | 36px, tight | Profile names (display) |
| `text-6xl` | 60px, tight | Hero wordmark, Oops |

Letter spacing: `tracking-wide` (buttons, headings), `tracking-wider` (labels,
nav), `tracking-widest` (flags), `tracking-brand` (wordmark and tagline only).

## Layout and spacing

- Mobile first. Screens are one centred column: `max-w-xl` for the app,
  `max-w-sm` for sign-in, `px-4` side gutter.
- Spacing is Tailwind's 4px grid (`p-1` = 4px). Common steps: 2 (8px) inside
  small things, 3–4 (12–16px) inside cards, 6–8 between sections.
- Respect safe areas: `pb-[env(safe-area-inset-bottom)]` is the one kind of
  arbitrary value that is always fine.
- Tap targets are at least 44px tall (`min-h-11`). Chips may be 40px.

## Shape, depth and motion

- **Square corners.** No radius scale exists. `rounded-full` is only for small
  status dots (16px or less).
- **No shadows or blur.** Separate surfaces with a 1px border (`card`) or a
  background step (`bg` → `panel` → `soft`). Full-width white rules
  (`border-fg`) split big bands, like the KeltX site.
- Motion is short (150ms) and only for state changes (hover, toggle). Everything
  is switched off for people who ask for reduced motion.

## Components

Use these classes from `globals.css` instead of re-creating them:

| Class | What |
| --- | --- |
| `btn-gold` | Primary action. One per screen. |
| `btn-white` | Strong secondary (Sign in). |
| `btn-line` | Secondary / Back. |
| `btn-ghost` | Low-key (Skip). |
| `btn-danger` | Destructive (Block, Leave team). |
| `field-label` + `input` | Every form field. Add `aria-invalid` for errors. |
| `chip` / `chip-on` | Filter and choice chips. |
| `card` | Listing rows and panels. |
| `heading` | Centred, caps, underlined section heading. |
| `flag-gold` / `flag-line` / `flag-ok` | Status flags (ticket, team, matched). |
| `badge` | Gold count bubble. |

Ticket flags always come from `<TicketFlag />` and `<MatchedFlag />`:
gold = has ticket, gold with black dot = verified ticket, white outline = no
ticket, green outline = matched. Don't invent new flag colours.

States: hover = `opacity-90` on filled buttons or `bg-soft` on outlined ones;
focus = 2px gold outline, 2px offset (global, don't remove it); disabled = 50%
opacity; error = `danger` border and text, with a message, never colour alone.

## Icons and images

- Icons: 24px grid, 1.8px stroke, no fill, `stroke-current` so they take the
  text colour. Always next to a text label in navigation.
- Photos: real people, square crops, no filters or rounded frames. If there's
  no photo, show initials on the `edge` → `panel` gradient (`<Avatar />`).
- App icon and wordmark are placeholders until the name is decided.

## Words

- Short, punchy, friendly. Talk to one athlete: "Find your partner", not
  "Users can find partners".
- Say what happens next: "Chat opens once they accept."
- British English (colour, organiser), 24-hour times, "5km".
- Buttons are verbs: "Send request", "Lock in", "Show my matches".
- No blame in errors: say what went wrong and how to fix it.
- Never "simply", "just", or jargon like "entry", "listing ID", "RLS".

## What fails CI

| Check | Command | Catches |
| --- | --- | --- |
| Brand lint | `npm run lint` | Raw hex / `rgb()` colours, default Tailwind colours, `rounded-*`, `shadow-*`, extra font weights, arbitrary colour/type/size values like `text-[13px]` |
| Token sync | `npm run tokens:check` | `tokens.css` edited by hand or not rebuilt |
| Brand unit tests | `npm test` | Colour pairs below contrast target, raw colours in CSS, off-palette SVGs |
| Screen tests | `npm run test:brand` | On public screens and `/styleguide`: any off-palette colour, wrong font or weight, rounded corners, shadows, axe accessibility failures (incl. contrast), tap targets under 44px, and screenshot changes over 1% |

When you change the design on purpose, run `npm run build` then
`npm run test:brand:update`, look at the new images in `e2e/__screenshots__/`,
and commit them with your change. Screenshots are made on Linux Chromium; if
CI disagrees with yours, take the "actual" images from the failed run's
`brand-report` artifact.

If you really need an exception (a third-party widget, say), add a
`// eslint-disable-next-line brand/no-off-brand-styles -- reason` with the reason.
