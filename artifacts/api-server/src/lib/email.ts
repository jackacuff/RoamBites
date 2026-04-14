const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "RoamBites <noreply@roambites.com>";
const APP_URL = process.env.APP_URL ?? "https://roambites.com";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
  } catch {
    // silent — email is non-critical
  }
}

export async function sendNewMessageEmail({
  toEmail,
  toName,
  fromName,
  subject,
  preview,
  context,
}: {
  toEmail: string;
  toName: string;
  fromName: string;
  subject?: string | null;
  preview: string;
  context?: string;
}) {
  const subjectLine = subject ?? `New message from ${fromName}`;
  const contextLine = context ? `<p style="color:#888;font-size:14px;margin-bottom:8px;">${context}</p>` : "";
  await sendEmail({
    to: toEmail,
    subject: `${subjectLine} — RoamBites`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#FBFAF8;padding:32px 24px;border-radius:16px;">
        <div style="margin-bottom:24px;">
          <img src="${APP_URL}/logo.png" alt="RoamBites" width="40" style="border-radius:10px;" onerror="this.style.display='none'" />
        </div>
        <h2 style="color:#2B1B12;font-size:20px;font-weight:800;margin:0 0 8px;">New message from ${fromName}</h2>
        ${contextLine}
        <div style="background:#fff;border:1px solid #EDE8E0;border-radius:12px;padding:16px;margin-bottom:20px;">
          <p style="color:#2B1B12;font-size:15px;margin:0;line-height:1.6;">${preview.slice(0, 300)}${preview.length > 300 ? "…" : ""}</p>
        </div>
        <a href="${APP_URL}/inbox" style="display:inline-block;background:#F47825;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;text-decoration:none;">
          Reply in RoamBites
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">You received this because you have an account on RoamBites. Log in to manage your notification settings.</p>
      </div>
    `,
  });
}
