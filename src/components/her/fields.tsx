"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Small accessible form primitives shared by Saelis Her onboarding and
 * settings. Every control has a visible label, an explicit optional marker
 * where applicable, and never conveys state by color alone.
 */

export function FieldLabel({
  htmlFor,
  label,
  optional,
  hint,
}: {
  htmlFor: string;
  label: string;
  optional?: boolean;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-0.5">
      <span className="font-medium text-ink">
        {label}
        {optional ? (
          <span className="ml-2 text-xs font-normal text-ink-muted">optional</span>
        ) : null}
      </span>
      {hint ? <span className="text-sm text-ink-soft">{hint}</span> : null}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  optional = true,
  hint,
  placeholder,
  maxLength = 100,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  hint?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} label={label} optional={optional} hint={hint} />
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="glass-surface min-h-11 rounded-2xl px-4 py-2 text-ink placeholder:text-ink-muted"
      />
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  optional = true,
  hint,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  optional?: boolean;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} label={label} optional={optional} hint={hint} />
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value ?? ""}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const raw = event.target.value;
            onChange(raw === "" ? null : Number(raw));
          }}
          className="glass-surface min-h-11 w-36 rounded-2xl px-4 py-2 text-ink"
        />
        {unit ? <span className="text-sm text-ink-soft">{unit}</span> : null}
      </div>
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
  optional = true,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  optional?: boolean;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} label={label} optional={optional} hint={hint} />
      <input
        id={id}
        type="date"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
        className="glass-surface min-h-11 w-48 rounded-2xl px-4 py-2 text-ink"
      />
    </div>
  );
}

/** Single-select rendered as radio chips (real radio semantics). */
export function RadioChips<T extends string>({
  legend,
  options,
  value,
  onChange,
  optional,
  hint,
}: {
  legend: string;
  options: readonly { value: T; label: string; description?: string }[];
  value: T | null;
  onChange: (value: T) => void;
  optional?: boolean;
  hint?: string;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-medium text-ink">
        {legend}
        {optional ? (
          <span className="ml-2 text-xs font-normal text-ink-muted">optional</span>
        ) : null}
      </legend>
      {hint ? <p className="text-sm text-ink-soft">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "glass-surface flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 py-2",
                selected ? "border-2 border-accent-lilac" : "hover:bg-cloud-lilac/50",
              )}
            >
              <input
                type="radio"
                name={name}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span aria-hidden="true" className="text-xs">
                {selected ? "✓" : "○"}
              </span>
              <span className="flex flex-col text-left">
                <span className="text-sm font-medium text-ink">{option.label}</span>
                {option.description ? (
                  <span className="text-xs text-ink-soft">{option.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Free-form tag list (allergies, dislikes, equipment…). */
export function TagListField({
  label,
  values,
  onChange,
  optional = true,
  hint,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  optional?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value || values.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} label={label} optional={optional} hint={hint} />
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          maxLength={50}
          placeholder={placeholder ?? "Type and press Add"}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className="glass-surface min-h-11 flex-1 rounded-2xl px-4 py-2 text-ink placeholder:text-ink-muted"
        />
        <Button variant="soft" onClick={add}>
          Add
        </Button>
      </div>
      {values.length > 0 ? (
        <ul className="mt-1 flex flex-wrap gap-2" aria-label={`${label} — added items`}>
          {values.map((value) => (
            <li key={value}>
              <button
                type="button"
                onClick={() => onChange(values.filter((item) => item !== value))}
                className="glass-surface inline-flex min-h-9 items-center gap-1 rounded-full px-3 py-1 text-sm text-ink hover:bg-cloud-pink"
                aria-label={`Remove ${value}`}
              >
                {value} <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
