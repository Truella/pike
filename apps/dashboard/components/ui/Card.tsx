import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`pike-border pike-card rounded-token border-border bg-surface p-5 shadow-token ${className}`}
      {...props}
    />
  );
}
