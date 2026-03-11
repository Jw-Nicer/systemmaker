"use client";

import { useState } from "react";
import Link from "next/link";
import { track, EVENTS } from "@/lib/analytics";

const TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM",
];

function getTomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function isWeekend(dateStr: string): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.getDay() === 0 || d.getDay() === 6;
}

interface BookingFormProps {
  onClose?: () => void;
  prefillName?: string;
  prefillEmail?: string;
  source?: string;
}

export function BookingForm({
  onClose,
  prefillName = "",
  prefillEmail = "",
  source = "plan",
}: BookingFormProps) {
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !date || !time) return;

    setStatus("submitting");
    setErrorMsg("");
    track(EVENTS.BOOKING_SUBMIT, { source, date, time });

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          preferred_date: date,
          preferred_time: time,
          message: message.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Something went wrong");
      }

      setStatus("success");
      track(EVENTS.BOOKING_CONFIRMED, { source, date, time });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "success") {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#ccd4bf] bg-[#e8eedf]">
          <svg className="h-7 w-7 text-[#4f6328]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[#1d2318]">Call booked!</h3>
        <p className="text-sm text-[#50584b]">
          We&apos;ll confirm your scoping call for{" "}
          <strong>{new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</strong>
          {" "}at <strong>{time} ET</strong>. Check your inbox for confirmation.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-2 text-sm text-[#38552d] underline decoration-[#93a071] underline-offset-4"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  const weekendSelected = date && isWeekend(date);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className="w-full rounded-[var(--radius-sm)] border border-[#d8d0c2] bg-white/80 px-3 py-2.5 text-sm text-[#273022] placeholder:text-[#9ca093] focus-organic"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className="w-full rounded-[var(--radius-sm)] border border-[#d8d0c2] bg-white/80 px-3 py-2.5 text-sm text-[#273022] placeholder:text-[#9ca093] focus-organic"
        />
      </div>

      {/* Date picker */}
      <div>
        <label className="block text-xs text-[#65705d] mb-1.5">Preferred date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setTime(""); }}
          min={getTomorrowISO()}
          required
          className="w-full rounded-[var(--radius-sm)] border border-[#d8d0c2] bg-white/80 px-3 py-2.5 text-sm text-[#273022] focus-organic"
        />
        {weekendSelected && (
          <p className="mt-1 text-xs text-[#ca8a04]">Weekends are limited — we&apos;ll confirm availability.</p>
        )}
      </div>

      {/* Time slots */}
      <div>
        <label className="block text-xs text-[#65705d] mb-1.5">Preferred time (Eastern)</label>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setTime(slot)}
              className={`rounded-full border px-2 py-1.5 text-xs font-medium transition-all ${
                time === slot
                  ? "border-[#4f6328] bg-[#e8eedf] text-[#2d4018]"
                  : "border-[#d8d0c2] bg-white/60 text-[#65705d] hover:border-[#b8c4a8] hover:bg-[#f0ede4]"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      {/* Optional message */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Anything you'd like us to know beforehand? (optional)"
        maxLength={500}
        rows={2}
        className="w-full rounded-[var(--radius-sm)] border border-[#d8d0c2] bg-white/80 px-3 py-2.5 text-sm text-[#273022] placeholder:text-[#9ca093] focus-organic resize-none"
      />

      {/* Honeypot */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={status === "submitting" || !name.trim() || !email.trim() || !date || !time}
        className="w-full rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
      >
        {status === "submitting" ? "Booking..." : "Confirm Scoping Call"}
      </button>

      <p className="text-center text-[11px] leading-5 text-[#65705d]">
        We&apos;ll send a confirmation to your email.{" "}
        <Link
          href="/privacy"
          className="text-[#38552d] underline decoration-[#93a071] underline-offset-4"
        >
          Privacy Policy
        </Link>
      </p>

      {status === "error" && (
        <p className="text-xs text-center text-red-600">
          {errorMsg || "Failed to book — please try again."}
        </p>
      )}
    </form>
  );
}
