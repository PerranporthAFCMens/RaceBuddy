"use client";
import { useEffect, useId, useRef, useState } from "react";
import { splitDuration } from "@/lib/format";

const UNIT = { h: "hrs", m: "min", s: "sec" } as const;
const SPOKEN = { h: "hours", m: "minutes", s: "seconds" } as const;
type Unit = keyof typeof UNIT;
type Value = Partial<Record<Unit, number>>;

/** Each row of a wheel is 44px tall (h-11); five rows show at once. */
const ROW = 44;

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function show(unit: Unit, n: number, first: boolean) {
  // The first wheel shows plain numbers (1, 32); later ones always two digits (05).
  return first ? String(n) : String(n).padStart(2, "0");
}

/**
 * A time picked on spinning wheels, like the iPhone Clock timer. Tap the box,
 * spin each wheel, then Done. Posts `${name}_h`, `${name}_m`, `${name}_s`
 * (empty when not set), so the server reads it like before.
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
  const hasHours = units.includes("h");
  const limits: Record<Unit, [number, number]> = {
    h: [0, maxHours],
    m: hasHours ? [0, 59] : [minMinutes, maxMinutes],
    s: [0, 59],
  };

  const [value, setValue] = useState<Value>(() => {
    if (seconds == null) return {};
    const p = splitDuration(seconds);
    const v: Value = { m: hasHours ? Number(p.m) : Math.floor(seconds / 60), s: Number(p.s) };
    if (hasHours) v.h = Number(p.h);
    return v;
  });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Value>(value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetId = useId();

  const isSet = units.every((u) => value[u] !== undefined);
  const text = isSet ? units.map((u, i) => show(u, value[u]!, i === 0)).join(":") : "";

  function openSheet() {
    // Start the wheels on the saved time, or a sensible middle if there isn't one.
    const start: Value = {};
    for (const u of units) start[u] = value[u] ?? (u === "m" && !hasHours ? 25 : u === "h" ? 1 : 0);
    setDraft(start);
    setOpen(true);
  }
  function close(save: boolean) {
    if (save) setValue(draft);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div>
      <span className="field-label" id={`${sheetId}-label`}>
        {label} {optional && <span className="font-normal normal-case">(optional)</span>}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="input text-left"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${sheetId}-label ${sheetId}-value`}
        onClick={openSheet}
      >
        <span id={`${sheetId}-value`} className={isSet ? "tabular-nums" : "text-hint"}>
          {isSet ? `${text} ${hasHours ? "" : "min"}`.trim() : "Tap to choose"}
        </span>
      </button>
      {units.map((u) => (
        <input key={u} type="hidden" name={`${name}_${u}`} value={value[u] ?? ""} />
      ))}

      {open && (
        <WheelSheet
          title={label}
          units={units}
          limits={limits}
          draft={draft}
          onChange={(u, n) => setDraft((d) => ({ ...d, [u]: n }))}
          onDone={() => close(true)}
          onCancel={() => close(false)}
          onClear={
            optional
              ? () => {
                  setValue({});
                  setOpen(false);
                  triggerRef.current?.focus();
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function WheelSheet({
  title,
  units,
  limits,
  draft,
  onChange,
  onDone,
  onCancel,
  onClear,
}: {
  title: string;
  units: Unit[];
  limits: Record<Unit, [number, number]>;
  draft: Value;
  onChange: (u: Unit, n: number) => void;
  onDone: () => void;
  onCancel: () => void;
  onClear?: () => void;
}) {
  const titleId = useId();
  const firstWheel = useRef<HTMLDivElement>(null);

  const cancel = useRef(onCancel);
  useEffect(() => {
    cancel.current = onCancel;
  });
  // Focus the first wheel once, when the sheet opens.
  useEffect(() => {
    firstWheel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button type="button" aria-label="Cancel" tabIndex={-1} className="flex-1 bg-bg/70" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="border-t border-line bg-panel px-4 pt-3 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="btn-ghost px-2" onClick={onClear ?? onCancel}>
            {onClear ? "Clear" : "Cancel"}
          </button>
          <h2 id={titleId} className="text-sm font-semibold uppercase tracking-wider text-muted">
            {title}
          </h2>
          <button type="button" className="btn-gold" onClick={onDone}>
            Done
          </button>
        </div>
        <div className="relative my-4 flex justify-center gap-2">
          {/* The band behind the middle row marks the chosen value. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-22 h-11 border-y border-line bg-soft" />
          {units.map((u, i) => (
            <Wheel
              key={u}
              ref={i === 0 ? firstWheel : undefined}
              unit={u}
              first={i === 0}
              min={limits[u][0]}
              max={limits[u][1]}
              value={draft[u] ?? limits[u][0]}
              onChange={(n) => onChange(u, n)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Wheel({
  ref,
  unit,
  first,
  min,
  max,
  value,
  onChange,
}: {
  ref?: React.Ref<HTMLDivElement>;
  unit: Unit;
  first: boolean;
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const numbers = range(min, max);

  // Start on the current value.
  useEffect(() => {
    listRef.current?.scrollTo({ top: (value - min) * ROW });
    // Only when the wheel first appears; after that the wheel leads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScroll() {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = listRef.current;
      if (!el) return;
      const n = Math.min(max, Math.max(min, min + Math.round(el.scrollTop / ROW)));
      if (n !== value) onChange(n);
    }, 80);
  }
  function step(n: number) {
    const next = Math.min(max, Math.max(min, n));
    onChange(next);
    listRef.current?.scrollTo({ top: (next - min) * ROW, behavior: "smooth" });
  }

  return (
    <div className="relative flex items-center gap-1">
      <div
        ref={(el) => {
          listRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) (ref as React.RefObject<HTMLDivElement | null>).current = el;
        }}
        role="spinbutton"
        tabIndex={0}
        aria-label={SPOKEN[unit]}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} ${SPOKEN[unit]}`}
        onScroll={onScroll}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          step(e.key === "ArrowUp" ? value - 1 : value + 1);
        }}
        className="h-55 w-16 snap-y snap-mandatory overflow-y-scroll overscroll-contain text-center text-2xl tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-accent [scrollbar-width:none]"
      >
        <div aria-hidden className="h-22" />
        {numbers.map((n) => (
          <div
            key={n}
            aria-hidden
            onClick={() => step(n)}
            className={`flex h-11 snap-center items-center justify-center ${n === value ? "text-fg" : "text-muted"}`}
          >
            {show(unit, n, first)}
          </div>
        ))}
        <div aria-hidden className="h-22" />
      </div>
      <span className="w-8 text-sm text-muted" aria-hidden>
        {UNIT[unit]}
      </span>
    </div>
  );
}
