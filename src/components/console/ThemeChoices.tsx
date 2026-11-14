import { themes, type ThemeName } from "@/design/tokens";

/** Radio buttons for the organiser colour themes, each with a small preview in that theme. */
export function ThemeChoices({ current }: { current: ThemeName }) {
  return (
    <fieldset className="space-y-2">
      <legend className="field-label">Colour theme for athletes</legend>
      {(Object.keys(themes) as ThemeName[]).map((name) => (
        <label key={name} className="card flex cursor-pointer items-center gap-3 p-3 has-checked:border-accent">
          <input type="radio" name="preset" value={name} defaultChecked={name === current} className="size-5 accent-accent" />
          <span data-theme={name} className="flex shrink-0 items-center gap-1 border border-edge bg-bg p-1.5" aria-hidden>
            <span className="size-4 bg-fg" />
            <span className="size-4 bg-accent" />
            <span className="size-4 bg-panel" />
          </span>
          <span className="min-w-0">
            <span className="block font-bold uppercase">{themes[name].label}</span>
            <span className="block text-xs text-muted">{themes[name].description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
