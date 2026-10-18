import { BrevoClient, BrevoError } from "@getbrevo/brevo";

const BRAND = {
  primary: "#0F766E",
  info: "#0284C7",
  text: "#1E293B",
  muted: "#64748B",
  border: "#E2E8F0",
  surface: "#F1F5F9",
  white: "#FFFFFF",
};

export interface StaffCredentialEmailInput {
  name: string;
  email: string;
  password: string;
  hospitalName?: string;
  roleName: string;
}

export type CredentialEmailResult = { sent: true } | { sent: false; reason: "not_configured" | "provider_error" };

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]!));

const safeLoginUrl = (): string | null => {
  const configuredUrl = process.env.FRONTEND_URL?.trim();
  if (!configuredUrl) return null;
  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return new URL("/login", url).toString();
  } catch {
    return null;
  }
};

const safeLogoUrl = (): string | null => {
  const configuredUrl = process.env.FRONTEND_URL?.trim();
  if (!configuredUrl) return null;
  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return new URL("/carebase-logo-icon.svg", url).toString();
  } catch {
    return null;
  }
};

const buildHtml = (input: StaffCredentialEmailInput): string => {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const password = escapeHtml(input.password);
  const role = escapeHtml(input.roleName);
  const hospital = input.hospitalName ? escapeHtml(input.hospitalName) : "your hospital";
  const loginUrl = safeLoginUrl();
  const logoUrl = safeLogoUrl();

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.surface};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.surface};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid ${BRAND.border};">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            ${logoUrl ? `<td style="padding-right:10px;"><img src="${escapeHtml(logoUrl)}" width="42" height="42" alt="" style="display:block;width:42px;height:42px;border-radius:12px;"></td>` : ""}
            <td style="font-size:24px;line-height:32px;font-weight:700;letter-spacing:-1px;"><span style="color:${BRAND.primary};">Care</span><span style="color:#0F172A;">Base</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 32px 32px;">
          <p style="margin:0 0 10px;font-size:14px;line-height:21px;color:${BRAND.muted};">STAFF SYSTEM ACCESS</p>
          <h1 style="margin:0 0 14px;font-size:24px;line-height:32px;color:${BRAND.text};">Welcome to CareBase, ${name}</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:24px;color:${BRAND.text};">Your ${role} account for <strong>${hospital}</strong> is ready. Use the credentials below to sign in.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8FAFC;border:1px solid ${BRAND.border};border-radius:8px;">
            <tr><td style="padding:16px 18px 8px;font-size:12px;line-height:18px;color:${BRAND.muted};">EMAIL</td></tr>
            <tr><td style="padding:0 18px 14px;font-size:15px;line-height:22px;color:${BRAND.text};word-break:break-word;">${email}</td></tr>
            <tr><td style="padding:12px 18px 8px;border-top:1px solid ${BRAND.border};font-size:12px;line-height:18px;color:${BRAND.muted};">TEMPORARY PASSWORD</td></tr>
            <tr><td style="padding:0 18px 16px;font-family:monospace;font-size:15px;line-height:22px;color:${BRAND.text};word-break:break-all;">${password}</td></tr>
          </table>
          ${loginUrl ? `<p style="margin:24px 0;"><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:${BRAND.primary};color:#fff;text-decoration:none;font-size:14px;font-weight:700;line-height:20px;padding:12px 20px;border-radius:8px;">Open CareBase</a></p>` : `<p style="margin:22px 0 0;font-size:14px;line-height:22px;color:${BRAND.text};">Open your hospital's CareBase sign-in page to access the system.</p>`}
          <p style="margin:22px 0 0;padding-top:18px;border-top:1px solid ${BRAND.border};font-size:13px;line-height:21px;color:${BRAND.muted};">Keep these credentials private. If you were not expecting this account, contact your hospital administrator.</p>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:12px;line-height:18px;color:${BRAND.muted};">CareBase · Hospital management made simple</p>
    </td></tr>
  </table>
</body></html>`;
};

export const sendStaffCredentialsEmail = async (input: StaffCredentialEmailInput): Promise<CredentialEmailResult> => {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!apiKey || !senderEmail) {
    console.error("Staff credentials email was not sent: Brevo API key or verified sender email is not configured.");
    return { sent: false, reason: "not_configured" };
  }

  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "CareBase";
  try {
    const brevo = new BrevoClient({
      apiKey,
      timeoutInSeconds: 10,
      maxRetries: 1,
    });
    await brevo.transactionalEmails.sendTransacEmail({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: input.email, name: input.name }],
        subject: "Your CareBase sign-in details",
        htmlContent: buildHtml(input),
        textContent: `Welcome to CareBase, ${input.name}. Your ${input.roleName} account for ${input.hospitalName || "your hospital"} is ready. Sign in with email: ${input.email} and temporary password: ${input.password}. Keep these credentials private.`,
    });
    return { sent: true };
  } catch (error) {
    if (error instanceof BrevoError) {
      // Avoid logging provider response bodies because they can contain email addresses.
      console.error(`Staff credentials email was rejected by Brevo (HTTP ${error.statusCode}).`);
    } else {
      console.error("Staff credentials email could not be delivered through Brevo.", error instanceof Error ? error.name : "unknown error");
    }
    return { sent: false, reason: "provider_error" };
  }
};
