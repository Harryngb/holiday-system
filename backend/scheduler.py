import base64
import json
import urllib.request
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import (
    DEFAULT_ADMIN_EMAIL, SMTP_SERVER, SMTP_PORT, SMTP_USER,
    SMTP_PASSWORD, SMTP_FROM, SENDGRID_API_KEY, RESEND_API_KEY, EMAIL_ENABLED,
)
from database import DATABASE_URL, connect_args
from models import User, LeaveRequest
from utils.excel import generate_report
from utils.email import _html_wrapper

scheduler = BackgroundScheduler()


def send_daily_report():
    """生成并发送每日假期报表给管理员"""
    if not EMAIL_ENABLED:
        return
    if not RESEND_API_KEY and not SENDGRID_API_KEY and not all([SMTP_SERVER, SMTP_USER, SMTP_PASSWORD, SMTP_FROM]):
        return

    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        admin_emails = [
            row[0] for row in db.query(User.email)
            .filter(User.user_type == "admin", User.email.isnot(None), User.email != "")
            .all()
        ]
        if not admin_emails and DEFAULT_ADMIN_EMAIL:
            admin_emails = [DEFAULT_ADMIN_EMAIL]
        if not admin_emails:
            return

        users = db.query(User).order_by(User.employee_id).all()
        leave_requests = (
            db.query(LeaveRequest)
            .order_by(LeaveRequest.created_at.desc())
            .limit(500)
            .all()
        )

        current_year = datetime.now().strftime("%Y")
        buffer = generate_report(users, leave_requests, current_year)
        xlsx_data = buffer.getvalue()

        today = datetime.now().strftime("%Y-%m-%d")
        stats = _build_summary(leave_requests)
        body_html = f"""
        <p>管理员您好，</p>
        <p>以下是 nVision Global 假期系统每日自动报表。</p>
        {stats}
        <p style="color:#999;font-size:12px;">报表文件已附在邮件中。</p>
        """
        full_html = _html_wrapper(body_html)

        if RESEND_API_KEY:
            _send_report_via_resend(admin_emails, today, full_html, xlsx_data)
        elif SENDGRID_API_KEY:
            _send_report_via_sendgrid(admin_emails, today, full_html, xlsx_data)
        else:
            _send_report_via_smtp(admin_emails, today, full_html, xlsx_data)

        print(f"[日报] {today} 报表已发送给 {len(admin_emails)} 个管理员")
    except Exception as e:
        print(f"[日报] 发送失败: {e}")
    finally:
        db.close()


def _send_report_via_resend(admin_emails, today, html, xlsx_data):
    encoded = base64.b64encode(xlsx_data).decode("utf-8")
    for addr in admin_emails:
        payload = json.dumps({
            "from": SMTP_FROM or "nVision Global <onboarding@resend.dev>",
            "to": [addr],
            "subject": f"[nVision] 假期日报 {today}",
            "html": html,
            "attachments": [{
                "filename": f"nVision_Daily_Report_{today}.xlsx",
                "content": encoded,
            }],
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        urllib.request.urlopen(req, timeout=30)


def _send_report_via_sendgrid(admin_emails, today, html, xlsx_data):
    encoded = base64.b64encode(xlsx_data).decode("utf-8")
    for addr in admin_emails:
        payload = json.dumps({
            "personalizations": [{"to": [{"email": addr}]}],
            "from": {"email": SMTP_FROM or "noreply@nvisionglobal.com", "name": "nVision Global"},
            "subject": f"[nVision] 假期日报 {today}",
            "content": [{"type": "text/html", "value": html}],
            "attachments": [{
                "content": encoded,
                "filename": f"nVision_Daily_Report_{today}.xlsx",
                "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }],
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.sendgrid.com/v3/mail/send",
            data=payload,
            headers={
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        urllib.request.urlopen(req, timeout=30)


def _send_report_via_smtp(admin_emails, today, html, xlsx_data):
    import smtplib
    from email import encoders
    from email.mime.base import MIMEBase
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, timeout=15)
    server.login(SMTP_USER, SMTP_PASSWORD)
    try:
        for addr in admin_emails:
            msg = MIMEMultipart("mixed")
            msg["From"] = SMTP_FROM
            msg["To"] = addr
            msg["Subject"] = f"[nVision] 假期日报 {today}"
            msg.attach(MIMEText(html, "html", "utf-8"))

            xlsx_part = MIMEBase("application", "vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            xlsx_part.set_payload(xlsx_data)
            encoders.encode_base64(xlsx_part)
            xlsx_part.add_header(
                "Content-Disposition", "attachment",
                filename=f"nVision_Daily_Report_{today}.xlsx",
            )
            msg.attach(xlsx_part)
            server.send_message(msg)
    finally:
        server.quit()


def _build_summary(leave_requests):
    """生成文本摘要统计"""
    total = len(leave_requests)
    pending = sum(1 for lr in leave_requests if lr.status == "pending")
    approved = sum(1 for lr in leave_requests if lr.status == "approved")
    rejected = sum(1 for lr in leave_requests if lr.status == "rejected")
    return f"""
    <table style="width:100%;border-collapse:collapse;margin:10px 0;">
        <tr><td style="padding:8px;border:1px solid #ddd;">总申请数</td><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">{total}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;">待审批</td><td style="padding:8px;border:1px solid #ddd;color:#e67e22;font-weight:bold;">{pending}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;">已通过</td><td style="padding:8px;border:1px solid #ddd;color:#27ae60;font-weight:bold;">{approved}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;">已拒绝</td><td style="padding:8px;border:1px solid #ddd;color:#e74c3c;font-weight:bold;">{rejected}</td></tr>
    </table>
    """


def start_scheduler():
    """启动每日定时任务（每天早上 8:00）"""
    try:
        scheduler.add_job(send_daily_report, "cron", hour=8, minute=0, id="daily_report")
        scheduler.start()
        print("[调度器] 每日报表定时任务已启动（08:00）")
    except Exception as e:
        print(f"[调度器] 启动失败: {e}")
