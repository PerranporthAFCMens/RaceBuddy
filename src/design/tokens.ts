/**
 * Design tokens: the single source of truth for the app's look.
 *
 * Change a value here, then run `npm run tokens` to rebuild src/app/tokens.css
 * (Tailwind reads that file). CI fails if the two drift apart, if a colour pair
 * below drops under its contrast target, or if code uses a raw colour or size.
 * See BRAND.md for how and when to use each token.
 */

/** Colour palette. Every colour on screen must come from this list. */
export const colors = {
  /** Page background. Black, everywhere. */
  bg: "#000000",
  /** Raised surfaces: inputs, sheets. */
  panel: "#111111",
  /** Hover fills, other people's chat bubbles. */
  soft: "#1a1a1a",
  /** Decorative dividers and card outlines only. Never the only edge of a control. */
  edge: "#4d4d4d",
  /** Edges of controls people must find: inputs, checkboxes, outline buttons (3:1+). */
  line: "#808080",
  /** Secondary text: labels, hints, timestamps. */
  muted: "#a6a6a6",
  /** Placeholder text inside inputs. */
  hint: "#8c8c8c",
  /** Main text, white buttons, section rules. */
  fg: "#ffffff",
  /** Brand gold. Primary actions, active states, ticket flags. One gold thing per view where possible. */
  accent: "#c09b2f",
  /** Text and icons placed on gold. */
  "accent-ink": "#000000",
  /** Success: matched, saved, verified. */
  ok: "#5fb36a",
  /** Errors and destructive actions. */
  danger: "#e5484d",
} as const;

export type ColorToken = keyof typeof colors;

/**
 * Colour pairs the app uses for text or controls, with the WCAG 2.2 contrast
 * each must reach: 4.5 for body text, 3 for large text (24px, or 18.7px bold)
 * and for control edges, icons and focus rings. Tested in tokens.test.ts.
 */
export const contrastPairs: { fg: ColorToken; bg: ColorToken; min: 3 | 4.5; use: string }[] = [
  { fg: "fg", bg: "bg", min: 4.5, use: "Body text" },
  { fg: "fg", bg: "panel", min: 4.5, use: "Text in inputs" },
  { fg: "fg", bg: "soft", min: 4.5, use: "Chat bubble text" },
  { fg: "muted", bg: "bg", min: 4.5, use: "Secondary text" },
  { fg: "muted", bg: "panel", min: 4.5, use: "Labels on panels" },
  { fg: "muted", bg: "soft", min: 4.5, use: "Secondary text on hover fill" },
  { fg: "hint", bg: "panel", min: 4.5, use: "Placeholder text" },
  { fg: "accent", bg: "bg", min: 4.5, use: "Gold links and active tabs" },
  { fg: "accent", bg: "panel", min: 4.5, use: "Gold text on panels" },
  { fg: "accent-ink", bg: "accent", min: 4.5, use: "Gold buttons, ticket flags, my chat bubbles" },
  { fg: "bg", bg: "fg", min: 4.5, use: "White buttons" },
  { fg: "ok", bg: "bg", min: 4.5, use: "Success text, Matched flag" },
  { fg: "danger", bg: "bg", min: 4.5, use: "Error text" },
  { fg: "danger", bg: "panel", min: 4.5, use: "Error text on panels" },
  { fg: "line", bg: "bg", min: 3, use: "Control edges" },
  { fg: "line", bg: "panel", min: 3, use: "Input edges" },
  { fg: "accent", bg: "bg", min: 3, use: "Focus ring" },
];

/**
 * Typefaces. One family, Mona Sans (free, OFL), loaded with next/font in
 * src/app/layout.tsx. It has a width axis: normal width for text, stretched
 * wide and heavy for display, like lettering on a race bib.
 */
export const fonts = {
  /** Everything by default. */
  sans: 'var(--font-mona-sans), "Helvetica Neue", Arial, sans-serif',
  /** Headings, names, big numbers, the wordmark. Always uppercase. */
  display: 'var(--font-mona-sans), "Arial Black", "Helvetica Neue", sans-serif',
} as const;

/** Variable-font settings for the display face: wide and black. */
export const displayVariation = '"wdth" 125, "wght" 900';

/** Type scale: [font-size, line-height]. Mobile first; 16px base so iOS never zooms inputs. */
export const fontSizes = {
  "2xs": ["0.6875rem", "1"], // 11px: flags, badges, counters
  xs: ["0.75rem", "1rem"], // 12px: labels, captions, nav
  sm: ["0.875rem", "1.25rem"], // 14px: secondary copy, buttons, lists
  base: ["1rem", "1.5rem"], // 16px: body, inputs
  lg: ["1.125rem", "1.75rem"], // 18px: lead paragraphs
  xl: ["1.25rem", "1.75rem"], // 20px: section headings
  "2xl": ["1.5rem", "2rem"], // 24px: page titles
  "3xl": ["1.875rem", "2.25rem"], // 30px: hero titles, step numbers
  "4xl": ["2.25rem", "1"], // 36px: profile names (display)
  "5xl": ["3rem", "1"], // 48px: hero wordmark (desktop)
  "6xl": ["3.75rem", "1"], // 60px: Oops
} as const;

export const fontWeights = {
  normal: "400",
  semibold: "600",
  bold: "700",
} as const;

export const letterSpacing = {
  normal: "0em",
  wide: "0.025em", // buttons, headings
  wider: "0.05em", // labels, nav
  widest: "0.1em", // flags and badges
  brand: "0.3em", // wordmark and tagline only
} as const;

export const lineHeights = {
  none: "1",
  tight: "1.25",
  normal: "1.5",
} as const;

/** Spacing is Tailwind's 4px grid (p-1 = 4px, p-4 = 16px). */
export const spacingUnit = "0.25rem";

/** Content widths. Screens are a single centred column. */
export const containers = {
  xs: "20rem", // stacked hero buttons
  sm: "24rem", // sign-in form
  md: "28rem", // hero copy
  xl: "36rem", // app column
} as const;

/** Motion. Short and functional; switched off for people who ask for less motion. */
export const motion = {
  duration: "150ms",
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

/** Focus ring for every interactive element. */
export const focusRing = { width: "2px", offset: "2px", color: "accent" as ColorToken };

/** Smallest tap target (44px), from Apple's guidelines; buttons and inputs use min-h-11. */
export const minTapTarget = "2.75rem";
