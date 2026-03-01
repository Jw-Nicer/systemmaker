"use client";

import Link from "next/link";
import { track, type EventName } from "@/lib/analytics";

interface TrackedLinkProps {
  href: string;
  eventName: EventName;
  eventPayload?: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
}

export function TrackedLink({
  href,
  eventName,
  eventPayload,
  children,
  className,
}: TrackedLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => track(eventName, eventPayload)}
    >
      {children}
    </Link>
  );
}
