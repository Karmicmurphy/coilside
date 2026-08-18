"use client";

// Reusable big button — the COILSIDE home screen uses these as primary navigation.
// Large touch target, dark surface, industrial feel.

import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  description?: string;
  /** left-side icon element (an SVG, lucide icon, or image) */
  icon?: React.ReactNode;
  variant?: "default" | "primary" | "warning" | "danger" | "ghost";
  full?: boolean;
}

const variantClasses: Record<NonNullable<BigButtonProps["variant"]>, string> = {
  default:
    "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 active:bg-secondary/60",
  primary:
    "bg-primary text-primary-foreground border-primary hover:brightness-110 active:brightness-95",
  warning:
    "bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600/30",
  danger:
    "bg-destructive/15 text-red-300 border-destructive/40 hover:bg-destructive/25",
  ghost:
    "bg-transparent text-foreground border-transparent hover:bg-secondary/40 active:bg-secondary/60",
};

export const BigButton = forwardRef<HTMLButtonElement, BigButtonProps>(
  ({ label, description, icon, variant = "default", full = true, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "relative flex w-full items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all no-tap-highlight select-none",
          full && "w-full",
          variantClasses[variant],
          "tap-lg",
          className
        )}
        {...props}
      >
        {icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-background/40">
            {icon}
          </div>
        )}
        <span className="flex flex-col gap-0.5 leading-tight">
          <span className="text-lg font-bold tracking-wide">{label}</span>
          {description && (
            <span className="text-sm text-muted-foreground">{description}</span>
          )}
        </span>
      </button>
    );
  }
);
BigButton.displayName = "BigButton";
