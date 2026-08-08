import type { HTMLAttributes } from "react";

type StatusTagProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "live" | "urgent" | "neutral" | "done";
};

export function StatusTag({
  className = "",
  variant = "neutral",
  ...props
}: StatusTagProps) {
  const variants = {
    live: "pike-status-live border-signal text-signal",
    urgent: "pike-status-urgent border-alert text-alert",
    neutral: "pike-status-neutral border-ink text-ink",
    done: "pike-status-live border-signal text-signal",
  };

  return (
    <span
      className={`pike-border pike-status-tag inline-block rounded-token px-3 py-1 font-mono text-xs font-bold uppercase ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
