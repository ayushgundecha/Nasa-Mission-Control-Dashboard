import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 py-2 text-sm font-semibold transition-colors duration-[var(--motion-fast)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-cosmos)] disabled:cursor-not-allowed disabled:opacity-45",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-signal)] text-[var(--color-cosmos)] hover:bg-[var(--color-signal-hover)] active:bg-[var(--color-signal-pressed)]",
        secondary:
          "border border-[var(--color-line)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]",
        quiet:
          "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
        destructive:
          "bg-[var(--color-critical)] text-[var(--color-cosmos)] hover:bg-[var(--color-critical-hover)]",
      },
      size: {
        default: "h-12",
        compact: "h-11 px-3",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  type = "button",
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
