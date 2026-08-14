"""
VERITAS — Email Notification Service
Uses Gmail SMTP with App Password (aiosmtplib + TLS on port 587).
Enable by setting SMTP_ENABLED=True and providing SMTP_USER/SMTP_PASSWORD in .env.
"""
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

log = logging.getLogger("veritas.email")


async def _send(to: str, subject: str, html_body: str, text_body: str) -> bool:
    """Internal: compose and send an email. Returns True on success, False on failure."""
    from app.config import settings
    if not settings.SMTP_ENABLED or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        log.info(f"[EMAIL DISABLED] Would have sent '{subject}' to {to}")
        return False

    try:
        import aiosmtplib

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            start_tls=True,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
        )
        log.info(f"✅ Email sent: '{subject}' → {to}")
        return True
    except Exception as e:
        log.error(f"❌ Email failed to {to}: {e}")
        return False


async def send_complaint_receipt(
    email: str,
    reference: str,
    statement: Optional[str],
    artifact_count: int,
    seal_url: str,
) -> bool:
    """
    Email #1 — Sent to the complainant immediately after their report is sealed.
    Contains the reference code and a summary of what was submitted.
    """
    subject = f"[VERITAS] Your Complaint Reference: {reference}"

    statement_section = (
        f"<p><strong>Your Statement:</strong><br>{statement}</p>"
        if statement else ""
    )

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f5f6fa; margin: 0; padding: 0; }}
    .email-wrapper {{ max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }}
    .header {{ background: #1a3a6b; padding: 28px 32px; }}
    .header h1 {{ color: #fff; margin: 0; font-size: 1.4rem; }}
    .header p {{ color: #a8c0e8; margin: 4px 0 0; font-size: 0.875rem; }}
    .body {{ padding: 28px 32px; }}
    .ref-box {{ background: #f0f4ff; border: 2px solid #1a3a6b; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0; }}
    .ref-code {{ font-family: monospace; font-size: 1.5rem; font-weight: 700; color: #1a3a6b; letter-spacing: 0.08em; }}
    .detail-row {{ display: flex; padding: 8px 0; border-bottom: 1px solid #e8eaf0; }}
    .detail-label {{ font-weight: 600; color: #555; width: 180px; flex-shrink: 0; }}
    .detail-value {{ color: #222; }}
    .alert {{ background: #fff8e1; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 16px 0; font-size: 0.875rem; }}
    .footer {{ background: #f5f6fa; padding: 16px 32px; font-size: 0.75rem; color: #888; border-top: 1px solid #e8eaf0; }}
    p {{ color: #333; line-height: 1.6; }}
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>VERITAS ACPIA Evidence System</h1>
      <p>Your complaint has been successfully registered and cryptographically sealed.</p>
    </div>
    <div class="body">
      <p>Dear Complainant,</p>
      <p>Your complaint has been received and cryptographically sealed in the VERITAS evidence ledger. Your evidence cannot be tampered with. Below is your official reference code — please save it.</p>

      <div class="ref-box">
        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin-bottom: 6px;">Your Official Reference Code</div>
        <div class="ref-code">{reference}</div>
        <p style="font-size: 0.8rem; color: #555; margin: 8px 0 0;">Present this code to the investigating authority or use it to track your report.</p>
      </div>

      <h3 style="color: #1a3a6b; margin-top: 24px;">Submission Summary</h3>
      <div>
        <div class="detail-row">
          <span class="detail-label">Reference Code</span>
          <span class="detail-value">{reference}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Evidence Files Sealed</span>
          <span class="detail-value">{artifact_count} file(s) — SHA-256 fingerprint recorded</span>
        </div>
        {statement_section}
      </div>

      <div class="alert">
        <strong>What happens next?</strong><br>
        An investigator will review your submission and verify the cryptographic integrity of your evidence. You may be contacted if further information is required.
      </div>

      <p style="font-size: 0.875rem; color: #555;">
        To track your report status, visit: <a href="{seal_url}/track" style="color: #1a3a6b;">{seal_url}/track</a>
      </p>
    </div>
    <div class="footer">
      VERITAS ACPIA — Evidence you can trust. Investigation you can defend.<br>
      This is an automated message. Do not reply to this email.
    </div>
  </div>
</body>
</html>
"""

    text_body = f"""
VERITAS ACPIA — Complaint Registered

Your Reference Code: {reference}

Evidence Files Sealed: {artifact_count} file(s)
{f"Your Statement: {statement}" if statement else ""}

What happens next: An investigator will review your submission.
Track your report at: {seal_url}/track

This is an automated message. Do not reply.
"""
    return await _send(email, subject, html_body, text_body)


async def send_respondent_invite(
    email: str,
    respondent_code: str,
    case_reference: str,
    scope_summary: str,
    seal_url: str,
) -> bool:
    """
    Email #2 — Sent to the accused/respondent with their dispute portal code.
    Gives them the link to submit their side of the evidence.
    """
    subject = f"[VERITAS] A Complaint Involves You — Your Case Code: {respondent_code}"
    dispute_url = f"{seal_url}/dispute"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f5f6fa; margin: 0; padding: 0; }}
    .email-wrapper {{ max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }}
    .header {{ background: #7c3aed; padding: 28px 32px; }}
    .header h1 {{ color: #fff; margin: 0; font-size: 1.4rem; }}
    .header p {{ color: #c4b5fd; margin: 4px 0 0; font-size: 0.875rem; }}
    .body {{ padding: 28px 32px; }}
    .code-box {{ background: #faf5ff; border: 2px solid #7c3aed; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0; }}
    .code-value {{ font-family: monospace; font-size: 1.4rem; font-weight: 700; color: #7c3aed; letter-spacing: 0.08em; }}
    .scope-box {{ background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; border-radius: 4px; margin: 16px 0; }}
    .rights-box {{ background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; margin: 16px 0; }}
    .rights-box ul {{ margin: 8px 0 0; padding-left: 20px; font-size: 0.875rem; line-height: 1.8; }}
    .btn {{ display: inline-block; background: #7c3aed; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 1rem; margin: 8px 0; }}
    .footer {{ background: #f5f6fa; padding: 16px 32px; font-size: 0.75rem; color: #888; border-top: 1px solid #e8eaf0; }}
    p {{ color: #333; line-height: 1.6; }}
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>VERITAS ACPIA — Respondent Notice</h1>
      <p>You have been identified in a complaint. You have the right to submit your evidence.</p>
    </div>
    <div class="body">
      <p>Dear Respondent,</p>
      <p>A complaint has been filed that involves you. Under the VERITAS Blind Dual Submission system (Section 63 BSA 2023), <strong>you have the right to submit your own evidence and statement</strong> — separately and confidentially.</p>

      <div class="code-box">
        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin-bottom: 6px;">Your Personal Respondent Code</div>
        <div class="code-value">{respondent_code}</div>
        <p style="font-size: 0.8rem; color: #555; margin: 8px 0 0;">Use this code to access your portal. Do not share this code.</p>
      </div>

      <div class="scope-box">
        <strong>Case Scope:</strong><br>
        {scope_summary}
      </div>

      <p style="text-align: center; margin: 24px 0;">
        <a href="{dispute_url}" class="btn">Submit Your Evidence → {dispute_url}</a>
      </p>

      <div class="rights-box">
        <strong>Your Rights Under Blind Dual Submission:</strong>
        <ul>
          <li>You will <strong>not</strong> see the complainant's evidence, and they will not see yours.</li>
          <li>You are <strong>not required</strong> to submit any files or statements.</li>
          <li>Declining to submit evidence is <strong>not evidence</strong> of culpability.</li>
          <li>Your submission is cryptographically sealed independently.</li>
        </ul>
      </div>

      <p style="font-size: 0.8rem; color: #666;">Case Reference: <strong>{case_reference}</strong></p>
    </div>
    <div class="footer">
      VERITAS ACPIA — Evidence you can trust. Investigation you can defend.<br>
      This is an automated message. Do not reply to this email.
    </div>
  </div>
</body>
</html>
"""

    text_body = f"""
VERITAS ACPIA — Respondent Notice

A complaint has been filed that involves you.

Your Respondent Code: {respondent_code}
Case Reference: {case_reference}
Case Scope: {scope_summary}

You have the right to submit your own evidence and statement.
Visit the dispute portal: {dispute_url}
Enter your code when prompted.

Your Rights:
- You will NOT see the complainant's evidence.
- You are NOT required to submit anything.
- Declining is NOT evidence of culpability.

This is an automated message. Do not reply.
"""
    return await _send(email, subject, html_body, text_body)


async def send_complainant_case_opened(
    email: str,
    complainant_code: str,
    case_reference: str,
    scope_summary: str,
    seal_url: str,
) -> bool:
    """
    Optional Email #3 — Sent to the complainant when a FAIR case is formally opened,
    giving them their complainant portal code to track and submit additional evidence.
    """
    subject = f"[VERITAS] Case Opened — Your Complainant Code: {complainant_code}"
    dispute_url = f"{seal_url}/dispute"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f5f6fa; margin: 0; padding: 0; }}
    .email-wrapper {{ max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }}
    .header {{ background: #1a3a6b; padding: 28px 32px; }}
    .header h1 {{ color: #fff; margin: 0; font-size: 1.4rem; }}
    .header p {{ color: #a8c0e8; margin: 4px 0 0; font-size: 0.875rem; }}
    .body {{ padding: 28px 32px; }}
    .code-box {{ background: #f0f4ff; border: 2px solid #1a3a6b; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0; }}
    .code-value {{ font-family: monospace; font-size: 1.4rem; font-weight: 700; color: #1a3a6b; letter-spacing: 0.08em; }}
    .footer {{ background: #f5f6fa; padding: 16px 32px; font-size: 0.75rem; color: #888; border-top: 1px solid #e8eaf0; }}
    p {{ color: #333; line-height: 1.6; }}
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>VERITAS ACPIA — Case Formally Opened</h1>
      <p>Your complaint has progressed to a formal investigation.</p>
    </div>
    <div class="body">
      <p>Dear Complainant,</p>
      <p>Your complaint has been formally escalated into a dual-submission investigation case. You may now submit additional evidence using your complainant code below.</p>

      <div class="code-box">
        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin-bottom: 6px;">Your Complainant Portal Code</div>
        <div class="code-value">{complainant_code}</div>
      </div>

      <p><strong>Case Reference:</strong> {case_reference}</p>
      <p><strong>Case Scope:</strong> {scope_summary}</p>
      <p>Visit <a href="{dispute_url}">{dispute_url}</a> and enter your code to submit additional evidence.</p>
    </div>
    <div class="footer">
      VERITAS ACPIA — Evidence you can trust. Investigation you can defend.<br>
      This is an automated message. Do not reply to this email.
    </div>
  </div>
</body>
</html>
"""
    text_body = f"""
VERITAS ACPIA — Case Formally Opened

Your complaint has been escalated to a formal investigation.
Case Reference: {case_reference}
Case Scope: {scope_summary}

Your Complainant Code: {complainant_code}
Use it at: {dispute_url}

This is an automated message. Do not reply.
"""
    return await _send(email, subject, html_body, text_body)
