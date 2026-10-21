import nodemailer from "nodemailer";

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

export interface PublicAppointmentEmailInput {
  patientName: string;
  recipientEmail: string;
  bookingCode: string;
  hospitalName: string;
  doctorName: string;
  departmentName: string;
  scheduledAt: Date;
}

export interface TenantRegistrationEmailInput {
  tenantName: string;
  tenantId: string;
  ownerName: string;
  ownerEmail: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
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

const sendSmtpEmail = async (input: {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
}): Promise<void> => {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const senderEmail = process.env.SMTP_FROM?.trim() || user;
  const port = Number(process.env.SMTP_PORT?.trim() || 587);
  if (!host || !user || !pass || !senderEmail || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("not_configured");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE?.trim().toLowerCase() === "true" || port === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  await transporter.sendMail({
    from: { name: process.env.SMTP_FROM_NAME?.trim() || "CareBase", address: senderEmail },
    to: input.to.name ? { name: input.to.name, address: input.to.email } : input.to.email,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
};

const emailFailure = (label: string, error: unknown): CredentialEmailResult => {
  if (error instanceof Error && error.message === "not_configured") console.error(`${label} email was not sent: SMTP configuration is incomplete or invalid.`);
  else console.error(`${label} email could not be delivered through SMTP.`, error instanceof Error ? error.name : "unknown error");
  return { sent: false, reason: error instanceof Error && error.message === "not_configured" ? "not_configured" : "provider_error" };
};

export const sendStaffCredentialsEmail = async (input: StaffCredentialEmailInput): Promise<CredentialEmailResult> => {
  try {
    await sendSmtpEmail({
      to: { email: input.email, name: input.name },
      subject: "Your CareBase sign-in details",
      html: buildHtml(input),
      text: `Welcome to CareBase, ${input.name}. Your ${input.roleName} account for ${input.hospitalName || "your hospital"} is ready. Sign in with email: ${input.email} and temporary password: ${input.password}. Keep these credentials private.`,
    });
    return { sent: true };
  } catch (error) {
    return emailFailure("Staff credentials", error);
  }
};

export const sendPublicAppointmentEmail = async (input: PublicAppointmentEmailInput): Promise<CredentialEmailResult> => {
  const dateTime = new Intl.DateTimeFormat("en-PK", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Karachi",
  }).format(input.scheduledAt);
  const patientName = escapeHtml(input.patientName);
  const hospitalName = escapeHtml(input.hospitalName);
  const doctorName = escapeHtml(input.doctorName);
  const departmentName = escapeHtml(input.departmentName);
  const code = escapeHtml(input.bookingCode);
  const loginUrl = safeLoginUrl();
  try {
    await sendSmtpEmail({
      to: { email: input.recipientEmail, name: input.patientName },
      subject: "Your CareBase appointment booking",
      html: `<!doctype html><html lang="en"><body style="margin:0;padding:28px 12px;background:${BRAND.surface};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;margin:0 auto;background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:12px;"><tr><td style="padding:28px 30px;"><div style="font-size:24px;font-weight:700;letter-spacing:-1px;"><span style="color:${BRAND.primary};">Care</span><span style="color:#0F172A;">Base</span></div><p style="margin:24px 0 8px;color:${BRAND.primary};font-size:12px;font-weight:700;letter-spacing:1px;">APPOINTMENT BOOKED</p><h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">Your appointment is confirmed</h1><p style="margin:0 0 22px;line-height:1.65;color:${BRAND.muted};">Hello ${patientName}, your appointment has been booked. Keep your private booking code to view the appointment later.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8FAFC;border:1px solid ${BRAND.border};border-radius:8px;"><tr><td style="padding:16px 18px;font-size:14px;line-height:1.8;"><strong>${hospitalName}</strong><br>Dr. ${doctorName}<br>${departmentName}<br>${escapeHtml(dateTime)} (Pakistan Standard Time)</td></tr></table><p style="margin:22px 0 7px;font-size:12px;color:${BRAND.muted};font-weight:700;letter-spacing:.7px;">PRIVATE BOOKING CODE</p><div style="padding:15px 18px;border:1px dashed ${BRAND.primary};border-radius:8px;background:#F0FDFA;color:${BRAND.primary};font-family:monospace;font-size:19px;font-weight:700;letter-spacing:2px;word-break:break-all;">${code}</div><p style="margin:14px 0 0;font-size:13px;line-height:1.65;color:${BRAND.muted};">Use this code together with ${escapeHtml(input.recipientEmail)} on the CareBase patient appointments page. Anyone with the code can access these booking details, so keep it private.</p>${loginUrl ? `<p style="margin:22px 0 0;"><a href="${escapeHtml(new URL("/my-appointments", loginUrl).toString())}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:${BRAND.primary};color:white;text-decoration:none;font-size:14px;font-weight:700;">View my appointment</a></p>` : ""}</td></tr></table></body></html>`,
      text: `Your CareBase appointment is booked.\n\n${input.hospitalName}\nDr. ${input.doctorName}\n${input.departmentName}\n${dateTime} (Pakistan Standard Time)\n\nPrivate booking code: ${input.bookingCode}\nUse the code and your email address on the CareBase patient appointments page. Keep this code private.`,
    });
    return { sent: true };
  } catch (error) {
    if (error instanceof Error && error.message === "not_configured") {
      console.error("Patient booking email was not sent: SMTP configuration is incomplete or invalid.");
      return { sent: false, reason: "not_configured" };
    }
    console.error("Patient booking email could not be delivered through SMTP.", error instanceof Error ? error.name : "unknown error");
    return { sent: false, reason: "provider_error" };
  }
};

export const sendTenantRegistrationEmail = async (input: TenantRegistrationEmailInput): Promise<CredentialEmailResult> => {
  const recipientEmail = process.env.OWNER_EMAIL?.trim();
  if (!recipientEmail) {
    console.error("Tenant registration email was not sent: OWNER_EMAIL is not configured.");
    return { sent: false, reason: "not_configured" };
  }

  const tenantName = escapeHtml(input.tenantName);
  const ownerName = escapeHtml(input.ownerName);
  const ownerEmail = escapeHtml(input.ownerEmail);
  const tenantId = escapeHtml(input.tenantId);
  const location = [input.city, input.state, input.country].filter(Boolean).join(", ");
  const safeLocation = escapeHtml(location || "Not provided");
  try {
    await sendSmtpEmail({
      to: { email: recipientEmail },
      subject: `New hospital registration: ${input.tenantName}`,
      html: `<!doctype html><html lang="en"><body style="font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};"><h1>New hospital registration</h1><p>A hospital has been submitted for approval on CareBase.</p><table role="presentation" cellspacing="0" cellpadding="8"><tr><td><strong>Hospital</strong></td><td>${tenantName}</td></tr><tr><td><strong>Tenant ID</strong></td><td>${tenantId}</td></tr><tr><td><strong>Owner</strong></td><td>${ownerName} (${ownerEmail})</td></tr><tr><td><strong>Location</strong></td><td>${safeLocation}</td></tr></table></body></html>`,
      text: `A hospital has been submitted for approval on CareBase.\n\nHospital: ${input.tenantName}\nTenant ID: ${input.tenantId}\nOwner: ${input.ownerName} (${input.ownerEmail})\nLocation: ${location || "Not provided"}`,
    });
    return { sent: true };
  } catch (error) {
    return emailFailure("Tenant registration", error);
  }
};
