import { cn } from "@/lib/utils";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "soft" | "ghost" | "danger";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent-lilac text-white shadow-sm hover:opacity-90 active:opacity-80 disabled:opacity-50",
  soft: "bg-cloud-lilac text-ink hover:bg-sky-lilac active:bg-sky-lilac disabled:opacity-50",
  ghost: "bg-transparent text-ink-soft hover:bg-cloud-lilac/60 disabled:opacity-50",
  danger:
    "bg-transparent text-[#a04a5e] border border-accent-blush hover:bg-cloud-pink disabled:opacity-50",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

/** 44px minimum touch target on every variant. */
export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-base font-medium transition-colors",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
