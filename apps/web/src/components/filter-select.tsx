"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type Option = { value: string; label: string };

type FilterSelectProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  pending?: boolean;
};

export function FilterSelect({ label, value, options, onChange, pending = false }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0]!;

  useEffect(() => {
    function closeWhenOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeWhenOutside);
    return () => document.removeEventListener("mousedown", closeWhenOutside);
  }, []);

  function moveSelection(direction: 1 | -1) {
    const currentIndex = Math.max(0, options.findIndex((option) => option.value === value));
    const next = options[(currentIndex + direction + options.length) % options.length]!;
    onChange(next.value);
  }

  return <div className="filter-select" ref={rootRef}>
    <span className="filter-label">{label}</span>
    <button
      type="button"
      className="filter-select-trigger"
      aria-haspopup="listbox"
      aria-controls={open ? listId : undefined}
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); moveSelection(1); }
        if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); moveSelection(-1); }
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <span>{selected.label}</span>{pending ? <span className="filter-select-pending" aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
    </button>
    {open && <div id={listId} className="filter-select-menu" role="listbox" aria-label={label}>
      {options.map((option) => <button
        type="button"
        role="option"
        aria-selected={option.value === value}
        className={option.value === value ? "filter-option selected" : "filter-option"}
        key={option.value}
        onClick={() => { onChange(option.value); setOpen(false); }}
      >
        <span>{option.label}</span>{option.value === value && <Check size={15} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
}
