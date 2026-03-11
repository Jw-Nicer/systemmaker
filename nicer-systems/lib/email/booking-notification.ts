import { Resend } from "resend";

interface BookingNotificationInput {
  name: string;
  email: string;
  preferred_date: string; // "2026-03-15"
  preferred_time: string; // "10:00 AM"
  message?: string;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Build a Google Calendar "Add to Calendar" URL for the scoping call.
 * Assumes time slots are in America/New_York (ET).
 * Google Calendar render URLs use UTC format: 20260315T140000Z
 */
function buildGoogleCalendarUrl(input: {
  name: string;
  email: string;
  date: string;   // "2026-03-15"
  time: string;   // "10:00 AM"
}): string {
  // Parse the time string (e.g., "10:00 AM" → 10, "2:30 PM" → 14.5)
  const timeMatch = input.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeMatch) return "";

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const ampm = timeMatch[3].toUpperCase();

  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  // Build a date in ET. We approximate ET as UTC-5 (EST) or UTC-4 (EDT).
  // For simplicity, we use UTC-5 (EST). The admin can adjust in the calendar.
  const [year, month, day] = input.date.split("-").map(Number);
  const startUtcHours = hours + 5; // EST → UTC offset
  const startDate = new Date(Date.UTC(year, month - 1, day, startUtcHours, minutes));
  const endDate = new Date(startDate.getTime() + 45 * 60 * 1000); // 45 min

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Scoping Call – ${input.name}`,
    dates: `${fmt(startDate)}/${fmt(endDate)}`,
    details: [
      `45-minute scoping call with ${input.name} (${input.email}).`,
      "",
      "Booked via Nicer Systems.",
    ].join("\n"),
    location: "Google Meet",
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}

function renderBookingHTML(booking: BookingNotificationInput): string {
  const calendarUrl = buildGoogleCalendarUrl({
    name: booking.name,
    email: booking.email,
    date: booking.preferred_date,
    time: booking.preferred_time,
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;line-height:1.6;">
  <h2 style="color:#00d4ff;margin:0 0 16px;">Scoping Call Booked</h2>

  <table style="width:100%;font-size:14px;border-collapse:collapse;">
    <tr>
      <td style="padding:6px 0;color:#6b7280;width:120px;">Name</td>
      <td style="padding:6px 0;">${esc(booking.name)}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#6b7280;">Email</td>
      <td style="padding:6px 0;"><a href="mailto:${esc(booking.email)}">${esc(booking.email)}</a></td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#6b7280;">Date</td>
      <td style="padding:6px 0;font-weight:600;">${formatDateDisplay(booking.preferred_date)}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#6b7280;">Time (ET)</td>
      <td style="padding:6px 0;font-weight:600;">${esc(booking.preferred_time)}</td>
    </tr>
    ${booking.message ? `<tr>
      <td style="padding:6px 0;color:#6b7280;vertical-align:top;">Message</td>
      <td style="padding:6px 0;">${esc(booking.message)}</td>
    </tr>` : ""}
  </table>

  <div style="margin-top:24px;text-align:center;">
    ${calendarUrl ? `<a href="${calendarUrl}" style="background:#00d4ff;color:#0a0e1a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:14px;">
      Add to Google Calendar
    </a>` : ""}
  </div>

  <div style="margin-top:16px;text-align:center;">
    <a href="https://nicer-systems.web.app/admin/leads" style="color:#6b7280;font-size:12px;text-decoration:underline;">
      View in Dashboard
    </a>
  </div>

  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
    Nicer Systems &mdash; Booking notification
  </p>
</body>
</html>`;
}

export async function sendBookingNotification(
  booking: BookingNotificationInput
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not set — cannot send booking notification");
  }

  const adminEmail = process.env.ADMIN_EMAIL || "johnwilnicer@gmail.com";

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: "Nicer Systems <onboarding@resend.dev>",
    to: adminEmail,
    subject: `Scoping Call Booked: ${booking.name} — ${formatDateDisplay(booking.preferred_date)} at ${booking.preferred_time}`,
    html: renderBookingHTML(booking),
  });
}
