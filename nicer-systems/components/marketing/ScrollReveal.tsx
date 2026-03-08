"use client";

import React from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
  className?: string;
}

const offsets = {
  up: { x: 0, y: 30 },
  left: { x: -30, y: 0 },
  right: { x: 30, y: 0 },
};

export const ScrollReveal = React.memo(function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  className,
}: ScrollRevealProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.97, ...offsets[direction] }}
      whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 20,
        mass: 1,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
});

interface StaggeredRevealProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggeredReveal({ children, className }: StaggeredRevealProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.08,
          },
        },
      }}
    >
      {React.Children.map(children, (child) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.97 },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { type: "spring", stiffness: 80, damping: 20 },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
