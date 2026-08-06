import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
};

export function Button({
  className = "",
  variant = "default",
  ...props
}: ButtonProps) {
  const variants = {
    default: "bg-ink text-background shadow-token",
    outline: "bg-transparent text-ink",
  };

  return (
    <button
      className={`pike-border pike-button pike-display rounded-token border-border px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
