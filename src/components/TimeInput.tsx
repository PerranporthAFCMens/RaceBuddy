import { splitDuration } from "@/lib/format";

const UNIT = { h: "hrs", m: "min", s: "sec" } as const;
const SPOKEN = { h: "hours", m: "minutes", s: "seconds" } as const;
type Unit = keyof typeof UNIT;

/** Choices for each wheel. Minutes and seconds show as 00–59. */
function choices(unit: Unit, minMinutes: number, maxMinutes: number, maxHours: number) {
  if (unit === "h") return range(0, maxHours).map((n) => ({ value: String(n), text: String(n) }));
  if (unit === "m" && minMinutes > 0) return range(minMinutes, maxMinutes).map((n) => ({ value: String(n), text: String(n) }));
  return range(0, 59).map((n) => ({ value: String(n), text: String(n).padStart(2, "0") }));
}

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/**
 * A time picked with scroll wheels: on iPhone each box opens the phone's own
 * wheel picker; on a computer it's a dropdown. Each wheel posts as
 * `${name}_h`, `${name}_m`, `${name}_s`, and "–" means not set.
 *
 * Without an hours wheel, the minutes wheel runs from minMinutes to maxMinutes
 * (a 5km time, say 10 to 60).
 */
export function TimeInput({
  name,
  label,
  units,
  seconds,
  optional = false,
  minMinutes = 0,
  maxMinutes = 59,
  maxHours = 9,
}: {
  name: string;
  label: string;
  units: Unit[];
  seconds?: number | null;
  optional?: boolean;
  minMinutes?: number;
  maxMinutes?: number;
  maxHours?: number;
}) {
  const parts = splitDuration(seconds);
  // Without an hours wheel, all the minutes go on the minutes wheel.
  if (!units.includes("h") && seconds != null) parts.m = String(Math.floor(seconds / 60));
  const selected = (unit: Unit) => (parts[unit] === "" ? "" : String(Number(parts[unit])));
  const hasHours = units.includes("h");

  return (
    <fieldset>
      <legend className="field-label">
        {label} {optional && <span className="font-normal normal-case">(optional)</span>}
      </legend>
      <div className="flex flex-wrap gap-x-3 gap-y-2">
        {units.map((unit) => (
          <label key={unit} className="flex items-center gap-1.5">
            <select
              className="input w-18 px-2 text-center"
              name={`${name}_${unit}`}
              defaultValue={selected(unit)}
              aria-label={`${label} ${SPOKEN[unit]}`}
            >
              <option value="">–</option>
              {choices(unit, hasHours ? 0 : minMinutes, hasHours ? 59 : maxMinutes, maxHours).map((c) => (
                <option key={c.value} value={c.value}>
                  {c.text}
                </option>
              ))}
            </select>
            <span className="text-sm text-muted">{UNIT[unit]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
