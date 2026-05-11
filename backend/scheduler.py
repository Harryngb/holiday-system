import io
import smtplib
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import (
    DEFAULT_ADMIN_EMAIL, SMTP_SERVER, SMTP_PORT, SMTP_USER,
    SMTP_PASSWORD, SMTP_FROM, EMAIL_ENABLED,
)
from database import DATABASE_URL, connect_args
from models import User, LeaveRequest
from utils.excel import generate_report

scheduler = BackgroundScheduler()


def send_daily_report():
    """生成并发送每日假期报表给管理员"""
    if not EMAIL_ENABLED:
        return
    if not all([SMTP_SERVER, SMTP_USER, SMTP_PASSWORD, SMTP_FROM]):
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

        for addr in admin_emails:
            msg = MIMEMultipart("mixed")
            msg["From"] = SMTP_FROM
            msg["To"] = addr
            msg["Subject"] = f"[nVision] 假期日报 {today}"

            html_part = MIMEText(
                f"""<html><body style="font-family:'Microsoft YaHei',Arial,sans-serif;padding:20px;color:#333;">
                <div style="max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
                    <div style="background-color:#1a3c6e;padding:15px;text-align:center;">
                        <h2 style="color:white;margin:0;">nVision Global</h2>
                        <p style="color:#ccc;margin:5px 0 0;">假期日报 {today}</p>
                    </div>
                    <div style="padding:20px;">{body_html}</div>
                    <div style="background-color:#f5f5f5;padding:10px;text-align:center;font-size:12px;color:#999;">
                        <p>nVision Global 假期管理系统 · 自动发送</p>
                    </div>
                </div></body></html>""",
                "html", "utf-8",
            )
            msg.attach(html_part)

            xlsx_part = MIMEBase("application", "vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            xlsx_part.set_payload(xlsx_data)
            encoders.encode_base64(xlsx_part)
            xlsx_part.add_header(
                "Content-Disposition",
                "attachment",
                filename=f"nVision_Daily_Report_{today}.xlsx",
            )
            msg.attach(xlsx_part)

            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()

        print(f"[日报] {today} 报表已发送给 {len(admin_emails)} 个管理员")
    except Exception as e:
        print(f"[日报] 发送失败: {e}")
    finally:
        db.close()


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
