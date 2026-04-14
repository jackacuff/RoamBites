import nodemailer from "nodemailer";

function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    const d = process.env.REPLIT_INTERNAL_APP_DOMAIN.replace(/^https?:\/\//, "");
    return `https://${d}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "http://localhost:21222";
}

const FROM_EMAIL = process.env.FROM_EMAIL ?? "RoamBites <onboarding@resend.dev>";

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[mailer] Resend error ${res.status}: ${err}`);
    return false;
  }
  return true;
}

async function sendViaSMTP(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.SMTP_HOST) return false;

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transport.sendMail({ from: FROM_EMAIL, to, subject, html });
  return true;
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (await sendViaResend(to, subject, html)) return;
  if (await sendViaSMTP(to, subject, html)) return;

  const linkMatch = html.match(/href="([^"]+)"/);
  const link = linkMatch ? linkMatch[1] : "(no link found)";
  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`📧  EMAIL — dev mode, not actually sent`);
  console.log(`    To:      ${to}`);
  console.log(`    Subject: ${subject}`);
  console.log(`    Link:    ${link}`);
  console.log("═══════════════════════════════════════════════════════\n");
}

function baseTemplate(body: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #FBFAF8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .wrapper { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .header { background: #F47825; padding: 32px 40px 24px; text-align: center; }
    .header h1 { margin: 0; color: #fff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 14px; }
    .body { padding: 32px 40px; color: #2B1B12; }
    .body p { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #4a3728; }
    .btn { display: inline-block; margin: 8px 0 24px; padding: 14px 28px; background: #F47825; color: #fff !important; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 600; }
    .note { font-size: 13px !important; color: #888 !important; }
    .footer { padding: 20px 40px; border-top: 1px solid #EDE8E0; text-align: center; font-size: 12px; color: #aaa; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🚚 RoamBites</h1>
      <p>Central Oklahoma Food Truck Tracker</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">RoamBites · Central Oklahoma · <a href="${getAppUrl()}" style="color:#F47825">roambites.app</a></div>
  </div>
</body>
</html>`;
}

export async function sendVerificationEmail(to: string, token: string, baseUrl?: string): Promise<void> {
  const base = baseUrl ?? getAppUrl();
  const link = `${base}/verify-email?token=${token}`;
  await sendMail(
    to,
    "Verify your RoamBites email",
    baseTemplate(`
      <p>Thanks for joining RoamBites! Please verify your email address to unlock your full account.</p>
      <a href="${link}" class="btn">Verify Email Address</a>
      <p class="note">This link expires in 24 hours. If you didn't create a RoamBites account, you can safely ignore this email.</p>
      <p class="note">Or copy and paste this URL: ${link}</p>
    `)
  );
}

export async function sendPasswordResetEmail(to: string, token: string, baseUrl?: string): Promise<void> {
  const base = baseUrl ?? getAppUrl();
  const link = `${base}/reset-password?token=${token}`;
  await sendMail(
    to,
    "Reset your RoamBites password",
    baseTemplate(`
      <p>We received a request to reset your password. Click the button below to choose a new password.</p>
      <a href="${link}" class="btn">Reset Password</a>
      <p class="note">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
      <p class="note">Or copy and paste this URL: ${link}</p>
    `)
  );
}
