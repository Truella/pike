"use client";

import { toggleFormat } from "@/lib/textFormatting";

type FormatStyle = "bold" | "italic" | "boldItalic";

interface FormatToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string, selStart: number, selEnd: number) => void;
  disabled?: boolean;
}

const FORMAT_BUTTONS: { style: FormatStyle; label: string; title: string }[] = [
  { style: "bold", label: "B", title: "Bold (Unicode Mathematical Bold)" },
  { style: "italic", label: "I", title: "Italic (Unicode Mathematical Italic)" },
  { style: "boldItalic", label: "B+I", title: "Bold Italic (Unicode Mathematical Bold Italic)" },
];

export function FormatToolbar({
  textareaRef,
  value,
  onChange,
  disabled = false,
}: FormatToolbarProps) {
  function handleFormat(style: FormatStyle) {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start === end) return; // nothing selected

    const selected = value.slice(start, end);
    const formatted = toggleFormat(selected, style);

    if (formatted === selected) return; // no change

    const newValue = value.slice(0, start) + formatted + value.slice(end);

    // Calculate new selection end accounting for potential code-point-length change
    const newEnd = start + Array.from(formatted).join("").length;

    onChange(newValue, start, newEnd);

    // Restore selection after React re-renders
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, newEnd);
    });
  }

  return (
    <div
      className="flex items-center gap-1 rounded-token border border-border bg-surface px-2 py-1.5"
      role="toolbar"
      aria-label="Text formatting"
    >
      <span className="font-mono text-[10px] uppercase text-muted mr-1 select-none">
        Format:
      </span>
      {FORMAT_BUTTONS.map(({ style, label, title }) => (
        <button
          key={style}
          type="button"
          title={title}
          aria-label={title}
          disabled={disabled}
          onMouseDown={(e) => {
            // Prevent textarea from losing selection on click
            e.preventDefault();
            handleFormat(style);
          }}
          className={`
            pike-border rounded-token border-border px-2 py-0.5
            font-mono text-xs font-bold uppercase text-ink
            hover:border-signal hover:text-signal
            active:scale-95
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all
            ${style === "italic" ? "italic" : ""}
            ${style === "bold" || style === "boldItalic" ? "font-black" : ""}
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
