"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "ghost" | "outline";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  glow?: boolean;
  children: ReactNode;
}

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-full " +
  "font-medium transition-[background-color,color,box-shadow,transform,border-color] duration-300 ease-[var(--ease-soft)] " +
  "will-change-transform select-none active:translate-y-[1px] active:scale-[0.98] " +
 "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary:
    "text-white bg-gradient-to-br from-[#8f63c2] via-[#9d6fc8] to-[#d14d6d] " +
    "shadow-[0_10px_30px_-8px_rgba(143,99,194,0.55)] hover:shadow-[0_16px_44px_-10px_rgba(143,99,194,0.7)] " +
    "hover:-translate-y-0.5",
  ghost:
    "text-plum-800 hover:bg-lavender-100/70",
  outline:
    "text-plum-800 border border-plum-700/25 hover:border-plum-700/50 hover:bg-white/40",
};

/**
 * Kokonut Button — accessible, tactile.
 * Glow adds a soft ambient halo (used for hero CTA).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", glow = false, className = "", children, ...rest }, ref) => {
    return (
      <span className={glow ? "relative inline-flex" : "contents"}>
        {glow && (
          <span
            aria-hidden
            className="absolute -inset-3 rounded-full bg-gradient-to-br from-lavender-300/60 to-blush-300/60 blur-2xl opacity-70 breathe -z-10"
          />
        )}
        <button
          ref={ref}
          className={`${base} ${variants[variant]} ${className}`}
          {...rest}
        >
          {children}
        </button>
      </span>
    );
  }
);

Button.displayName = "Button";
