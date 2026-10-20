import { ShieldCheck } from "lucide-react";

export default function RecaptchaNotice() {
  return (
    <div
      role="note"
      aria-label="reCAPTCHA protection"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "11px 12px",
        marginBottom: 16,
        border: "1px solid #99f6e4",
        borderRadius: 8,
        background: "#f0fdfa",
        color: "#115e59",
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <ShieldCheck size={18} aria-hidden="true" style={{ flex: "0 0 auto", marginTop: 1, color: "#0f766e" }} />
      <div>
        <strong style={{ display: "block", fontSize: 13 }}>Protected by reCAPTCHA</strong>
        <span>Automatic verification runs when you submit this form. Google’s </span>
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
        <span> and </span>
        <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Terms</a>
        <span> apply.</span>
      </div>
    </div>
  );
}
