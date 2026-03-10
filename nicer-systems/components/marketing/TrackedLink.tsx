"use client";

import Link from "next/link";
import { track, type EventName } from "@/lib/analytics";

interface TrackedLinkProps {
  href: string;
  eventName: EventName;
  eventPayload?: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}

export function TrackedLink({
  href,
  eventName,
  eventPayload,
  children,
  className,
  target,
  rel,
}: TrackedLinkProps) {
  const isExternal = href.startsWith("http://") || href.startsWith("https://");

  if (isExternal || target === "_blank") {
    return (
      <a
        href={href}
        className={className}
        target={target}
        rel={rel || (target === "_blank" ? "noopener noreferrer" : undefined)}
        onClick={() => track(eventName, eventPayload)}
      >
        {children}
      </a>
    );
  }

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
