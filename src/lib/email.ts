import "server-only";

import { Resend } from "resend";
import { getEnv } from "@/lib/d1-utils";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getConfiguredFrom(env: CloudflareEnv): string {
  return env.RESEND_FROM_EMAIL || "MOTBA <noreply@motba.art>";
}

export async function sendEmail(input: SendEmailInput) {
  const env = await getEnv();

  if (!env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY is not set; skipped email to ${input.to}`);
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: getConfiguredFrom(env),
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    throw new Error(`Resend email failed: ${error.message}`);
  }
}

export function buildEmailLayout(title: string, body: string, action?: {
  label: string;
  href: string;
}) {
  const button = action
    ? `<p style="margin: 28px 0;"><a href="${action.href}" style="background:#111;color:#fff;padding:12px 16px;text-decoration:none;font-weight:700;">${action.label}</a></p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f8f4e8;color:#111;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
      <h1 style="font-size:24px;line-height:1.2;margin:0 0 18px;">${title}</h1>
      <div style="font-size:16px;line-height:1.55;">${body}</div>
      ${button}
      <p style="font-size:13px;line-height:1.45;color:#555;margin-top:32px;">The Museum of Time Based Art</p>
    </div>
  </body>
</html>`;
}
