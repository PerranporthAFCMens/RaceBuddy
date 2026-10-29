/**
 * Brand guard rails for ESLint. Keeps colours, type and sizes on the design
 * tokens in src/design/tokens.ts. See BRAND.md for the reasoning.
 *
 * It checks every string and template literal, which covers className,
 * clsx-style helpers and inline style objects.
 */

const HEX = /(?:^|[^\w&/])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})(?![\w-])/i;
const COLOR_FN = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/i;

// Tailwind's default palette names. They are switched off in tokens.css, so
// using one silently does nothing: catch it here instead.
const PALETTE =
  "black|white|slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_UTILS =
  "bg|text|border|border-[trblxy]|border-[se]|from|via|to|ring|ring-offset|outline|fill|stroke|decoration|divide|placeholder|caret|accent|shadow";
const DEFAULT_PALETTE = new RegExp(`^(?:${COLOR_UTILS})-(?:${PALETTE})(?:-\\d{2,3})?(?:/\\d+)?$`);

// Utilities removed from the theme (no radius, no shadow, three weights).
const REMOVED = [
  [/^rounded(?:-[trblse]{1,2})?(?:-(?:xs|sm|md|lg|xl|2xl|3xl|4xl))?$/, "Corners are square. Use rounded-full only for status dots."],
  [/^(?:shadow|drop-shadow|inset-shadow|text-shadow)(?:-\w+)?$/, "No shadows. Separate surfaces with a border or a background step."],
  [/^font-(?:thin|extralight|light|medium|extrabold|black)$/, "Use font-normal, font-semibold or font-bold."],
  [/^blur(?:-\w+)?$/, "No blur effects."],
];

// Arbitrary values ([...]) are allowed only for layout (grid templates,
// percentages, calc with safe-area insets). Brand properties must use tokens.
const BRAND_ARBITRARY =
  /^(?:text|bg|border(?:-[trblxyse])?|from|via|to|ring|ring-offset|outline|fill|stroke|decoration|divide|placeholder|caret|accent|shadow|font|leading|tracking|rounded(?:-[trblse]{1,2})?|underline-offset|opacity|duration|ease|delay)-\[/;
const SIZE_ARBITRARY =
  /^-?(?:[pm][trblxyse]?|gap(?:-[xy])?|space-[xy]|size|[wh]|min-[wh]|max-[wh]|inset(?:-[xy])?|top|right|bottom|left|translate-[xy])-\[/;

function classTokens(text) {
  return text.split(/\s+/).filter(Boolean).map((raw) => {
    // Drop variants (hover:, sm:, aria-invalid:) and the important flag.
    const parts = raw.split(/:(?![^[]*\])/);
    return parts[parts.length - 1].replace(/^!|!$/g, "");
  });
}

function problems(text) {
  const found = [];
  if (HEX.test(text)) found.push("Raw hex colour. Use a colour token (bg-accent, text-muted…) or import from src/design/tokens.ts.");
  if (COLOR_FN.test(text)) found.push("Raw colour function. Use a colour token from src/design/tokens.ts.");
  for (const cls of classTokens(text)) {
    if (DEFAULT_PALETTE.test(cls)) found.push(`"${cls}" uses Tailwind's default palette, which is switched off. Use a brand colour token.`);
    for (const [re, msg] of REMOVED) if (re.test(cls)) found.push(`"${cls}": ${msg}`);
    if (BRAND_ARBITRARY.test(cls)) found.push(`"${cls}" is an arbitrary value. Use a token (text-2xs, tracking-widest, bg-panel…) or add one to tokens.ts.`);
    else if (SIZE_ARBITRARY.test(cls) && !/env\(|%|\b(?:vh|vw|dvh|svh)\b/.test(cls))
      found.push(`"${cls}" is an arbitrary size. Use the 4px spacing scale (p-4, size-2, h-11…).`);
  }
  return found;
}

const noOffBrandStyles = {
  meta: {
    type: "problem",
    docs: { description: "Keep colours, type and sizes on the brand design tokens" },
    schema: [],
  },
  create(context) {
    function check(node, text) {
      if (!text) return;
      for (const message of new Set(problems(text))) context.report({ node, message });
    }
    return {
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
      JSXText() {},
    };
  },
};

export const brandProblems = problems;

const plugin = {
  meta: { name: "brand" },
  rules: { "no-off-brand-styles": noOffBrandStyles },
};

export default plugin;
