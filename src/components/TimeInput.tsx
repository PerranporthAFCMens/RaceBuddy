import { splitDuration } from "@/lib/format";

const UNIT = { h: "hrs", m: "min", s: "sec" } as const;
const SPOKEN = { h: "hours", m: "minutes", s: "seconds" } as const;
type Unit = keyof typeof UNIT;

/**
 * A time in separate boxes (hours, minutes, seconds) so a phone's number pad
 * is enough. Each box posts as `${name}_h`, `${name}_m`, `${name}_s`.
 */
export function TimeInput({
  name,
  label,
  units,
  seconds,
  optional = false,
  placeholders = {},
}: {
  name: string;
  label: string;
  units: Unit[];
  seconds?: number | null;
  optional?: boolean;
  placeholders?: Partial<Record<Unit, string>>;
}) {
  const parts = splitDuration(seconds);
  // Without an hours box, all the minutes go in the minutes box.
  if (!units.includes("h") && seconds != null) parts.m = String(Math.floor(seconds / 60));
  return (
    <fieldset>
      <legend className="field-label">
        {label} {optional && <span className="font-normal normal-case">(optional)</span>}
      </legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {units.map((unit) => (
          <label key={unit} className="flex items-center gap-2">
            <input
              className="input w-16 text-center"
              name={`${name}_${unit}`}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder={placeholders[unit]}
              defaultValue={parts[unit]}
              aria-label={`${label} ${SPOKEN[unit]}`}
            />
            <span className="text-sm text-muted">{UNIT[unit]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
