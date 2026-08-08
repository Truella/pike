"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

export interface DropdownOption<T extends string = string> {
  value: T;
  label: ReactNode;
  colorClass?: string;
}

interface DropdownProps<T extends string = string> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  triggerClassName?: string;
  ariaLabel?: string;
}

export function Dropdown<T extends string = string>({
  options,
  value,
  onChange,
  disabled = false,
  triggerClassName = "",
  ariaLabel = "Select option",
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`pike-border flex items-center justify-between gap-2 rounded-token border-border bg-surface px-3 py-1.5 font-mono text-xs font-bold uppercase text-ink outline-none transition-colors hover:border-signal focus:border-signal disabled:opacity-60 ${triggerClassName}`}
      >
        <span>{selectedOption ? selectedOption.label : value}</span>
        <span className="text-[10px] text-muted ml-1">▼</span>
      </button>

      {isOpen && (
        <div className="pike-border absolute right-0 z-50 mt-1 min-w-[140px] rounded-token border-border bg-surface py-1 shadow-token">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center px-3 py-2 text-left font-mono text-xs uppercase transition-colors hover:bg-background ${
                option.value === value ? "font-bold text-signal" : "text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
