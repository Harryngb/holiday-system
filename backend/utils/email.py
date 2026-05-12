import smtplib
import threading
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

    def _send():
        try:
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, timeout=10)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            print(f"[邮件] 发送成功 -> {to}")
        except smtplib.SMTPAuthenticationError:
            print(f"[邮件] 认证失败: SMTP_USER={SMTP_USER}, 请检查密码/App Password")
        except smtplib.SMTPRecipientsRefused:
            print(f"[邮件] 收件人被拒: {to}")
        except smtplib.SMTPServerDisconnected:
            print(f"[邮件] 服务器断开连接: {SMTP_SERVER}")
        except Exception as e:
            print(f"[邮件] 发送失败: {e}")

    threading.Thread(target=_send, daemon=True).start()


def send_leave_notification(to: str, applicant_name: str, leave_type: str, status: str, detail: str = ""):
    today = datetime.now().strftime("%Y-%m-%d")
    detail_html = (
        f'<div style="background:#f8f9fa;padding:12px;border-radius:4px;margin:10px 0;font-size:14px;color:#555;">{detail}</div>'
        if detail else ""
    )

    if status == "pending":
        subject = f"[nVision] 新的{leave_type}申请 - {applicant_name} ({today})"
        body = f"""
        <p>管理员您好，</p>
        <p>员工 <b>{applicant_name}</b> 提交了新的 <b>{leave_type}</b> 申请，请及时审批。</p>
        {detail_html}
        <p style="margin-top:20px;text-align:center;">
            <a href="{BASE_URL}" style="display:inline-block;background:#1a3c6e;color:white;padding:12px 32px;text-decoration:none;border-radius:4px;font-size:15px;">前往审批</a>
        </p>
        """
    elif status == "approved":
        subject = f"[nVision] {leave_type}申请已通过 - {applicant_name} ({today})"
        body = f"""
        <p>您好 <b>{applicant_name}</b>，</p>
        <p>您的 <b>{leave_type}</b> 申请已通过审批。</p>
        {detail_html}
        <p style="color:#999;font-size:12px;">如有疑问请联系管理员。</p>
        """
    elif status == "rejected":
        subject = f"[nVision] {leave_type}申请已被拒绝 - {applicant_name} ({today})"
        body = f"""
        <p>您好 <b>{applicant_name}</b>，</p>
        <p>您的 <b>{leave_type}</b> 申请已被拒绝。</p>
        {detail_html}
        <p style="color:#999;font-size:12px;">如有疑问请联系管理员了解详情。</p>
        """
    else:
        return

    send_email(to, subject, body)
