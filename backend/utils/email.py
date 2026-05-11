import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, EMAIL_ENABLED, BASE_URL


def send_email(to: str, subject: str, body: str):
    if not EMAIL_ENABLED:
        return

    if not all([SMTP_SERVER, SMTP_USER, SMTP_PASSWORD, SMTP_FROM]):
        return

    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject

    html_body = f"""
    <html>
    <body style="font-family: 'Microsoft YaHei', Arial, sans-serif; padding: 20px; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1a3c6e; padding: 15px; text-align: center;">
                <h2 style="color: white; margin: 0;">nVision Global</h2>
            </div>
            <div style="padding: 20px;">
                {body}
            </div>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #999;">
                <p>nVision Global 假期管理系统 · 自动发送</p>
            </div>
        </div>
    </body>
    </html>
    """

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print(f"发送邮件失败: {e}")


def send_leave_notification(to: str, applicant_name: str, leave_type: str, status: str, detail: str = ""):
    today = datetime.now().strftime("%Y-%m-%d")
    if status == "pending":
        subject = f"[nVision] {today} 新的{leave_type}申请 - {applicant_name}"
        body = f"""
        <p>员工 <b>{applicant_name}</b> 提交了新的{leave_type}申请。</p>
        <p style="color:#666;">{detail}</p>
        <p style="margin-top:20px;">
            <a href="{BASE_URL}" style="display:inline-block;background:#1a3c6e;color:white;padding:10px 24px;text-decoration:none;border-radius:4px;">前往审批</a>
        </p>
        """
    elif status == "approved":
        subject = f"[nVision] {today} {leave_type}申请已通过 - {applicant_name}"
        body = f"""
        <p>您好 <b>{applicant_name}</b>，</p>
        <p>您的{leave_type}申请已通过审批。</p>
        <p style="color:#666;">{detail}</p>
        """
    elif status == "rejected":
        subject = f"[nVision] {today} {leave_type}申请已被拒绝 - {applicant_name}"
        body = f"""
        <p>您好 <b>{applicant_name}</b>，</p>
        <p>您的{leave_type}申请已被拒绝。</p>
        <p style="color:#666;">{detail}</p>
        """
    else:
        return

    send_email(to, subject, body)
