"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "style"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-primary to-secondary text-background font-semibold hover:shadow-[var(--shadow-soft-md)] active:scale-[0.97] transition-all",
  secondary:
    "border border-border text-foreground hover:border-primary/40 hover:text-primary hover:shadow-[var(--shadow-soft-sm)] transition-all organic-border",
  ghost:
    "text-muted hover:text-foreground hover:bg-surface-light/50 transition-colors",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-sm rounded-full",
  md: "px-6 py-2.5 text-sm rounded-full",
  lg: "px-10 py-4 text-lg rounded-full",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`inline-flex items-center justify-center font-medium focus-organic disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
