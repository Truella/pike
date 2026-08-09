import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Pass a 0-based position index so Sticky theme can cycle accent colours correctly. */
  index?: number;
}

export function Card({
  className = "",
  index,
  ...props
}: CardProps) {
  return (
    <div
      className={`pike-border pike-card rounded-token border-border bg-surface p-5 shadow-token ${className}`}
      data-card-index={index !== undefined ? String(index % 4) : undefined}
      {...props}
    />
  );
}
