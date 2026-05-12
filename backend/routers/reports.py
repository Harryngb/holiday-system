from urllib.parse import quote
import socket
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
from datetime import datetime
from database import get_db
from models import User, LeaveRequest
from auth import get_current_user
from utils.excel import generate_report
from utils.email import send_email
from config import EMAIL_ENABLED, SMTP_SERVER, SMTP_USER, SMTP_FROM, BREVO_API_KEY
from scheduler import send_daily_report

router = APIRouter(prefix="/api/reports", tags=["报表"])


@router.get("/export")
def export_report(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = datetime.now().strftime("%Y年%m月%d日")

    if user.user_type == "employee":
        users = db.query(User).filter(User.id == user.id).all()
        leave_requests = (
            db.query(LeaveRequest)
            .filter(LeaveRequest.user_id == user.id)
            .order_by(LeaveRequest.created_at.desc())
            .all()
        )
    elif user.user_type == "supervisor":
        users = (
            db.query(User)
            .filter(User.user_type.in_(["employee", "supervisor"]))
            .order_by(User.employee_id)
            .all()
        )
        leave_requests = (
            db.query(LeaveRequest)
            .order_by(LeaveRequest.created_at.desc())
            .limit(500)
            .all()
        )
    else:
        users = (
            db.query(User)
            .order_by(User.employee_id)
            .all()
        )
        leave_requests = (
            db.query(LeaveRequest)
            .order_by(LeaveRequest.created_at.desc())
            .limit(500)
            .all()
        )

    current_year = user.current_year or "2026"

    buffer = generate_report(users, leave_requests, current_year)

    filename = f"Fugistics_Hub_Ningbo_{current_year}_假期报表_{today}.xlsx"
    ascii_name = f"Fugistics_Hub_Ningbo_{current_year}_Report.xlsx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(filename)}"
        },
    )


@router.post("/send-daily")
def trigger_daily_report(user: User = Depends(get_current_user)):
    """手动触发每日报表发送（仅管理员）"""
    if user.user_type != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="仅管理员可操作")
    send_daily_report()
    return {"message": "日报已发送"}


@router.get("/email-status")
def email_status(user: User = Depends(get_current_user)):
    """查看邮件配置状态（仅管理员）"""
    if user.user_type != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="仅管理员可操作")

    from database import SessionLocal
    db = SessionLocal()
    try:
        admins_with_email = db.query(User).filter(
            User.user_type == "admin",
            User.email.isnot(None), User.email != "",
        ).all()
        admin_msg = f"{len(admins_with_email)} 个管理员有邮箱"
        if admins_with_email:
            admin_msg += f"：{[a.email for a in admins_with_email]}"
        else:
            admin_msg += "（日报不会发送！）"

        users_with_email = db.query(User).filter(
            User.email.isnot(None), User.email != "",
        ).count()
        all_users = db.query(User).count()
    finally:
        db.close()

    return {
        "EMAIL_ENABLED": EMAIL_ENABLED,
        "BREVO_API_KEY": "已设置" if BREVO_API_KEY else "未设置",
        "SMTP_SERVER": SMTP_SERVER or "未设置",
        "SMTP_USER": SMTP_USER or "未设置",
        "SMTP_FROM": SMTP_FROM or "未设置",
        "admins": admin_msg,
        "users_with_email": f"{users_with_email} / {all_users} 个用户有邮箱",
        "note": "优先使用 Brevo (Sendinblue)，其次 Resend/SendGrid，最后 SMTP（需要 Railway Pro）",
    }


@router.get("/diagnose-network")
def diagnose_network(user: User = Depends(get_current_user)):
    """诊断 SMTP 网络连接（仅管理员）"""
    if user.user_type != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="仅管理员可操作")

    import smtplib
    results = []

    # Test DNS
    try:
        ips = socket.getaddrinfo("smtp.gmail.com", 465)
        results.append({"test": "DNS解析 smtp.gmail.com", "status": "ok", "detail": str(ips[0][4][0])})
    except Exception as e:
        results.append({"test": "DNS解析 smtp.gmail.com", "status": "fail", "detail": str(e)})

    # Test port 465 (SSL)
    try:
        s = socket.create_connection(("smtp.gmail.com", 465), timeout=5)
        s.close()
        results.append({"test": "端口 465 (SSL)", "status": "ok"})
    except Exception as e:
        results.append({"test": "端口 465 (SSL)", "status": "fail", "detail": str(e)})

    # Test port 587 (STARTTLS)
    try:
        s = socket.create_connection(("smtp.gmail.com", 587), timeout=5)
        s.close()
        results.append({"test": "端口 587 (STARTTLS)", "status": "ok"})
    except Exception as e:
        results.append({"test": "端口 587 (STARTTLS)", "status": "fail", "detail": str(e)})

    # Test SMTP login on 465
    if EMAIL_ENABLED and SMTP_SERVER:
        try:
            server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10)
            server.login(SMTP_USER, "***")
            server.quit()
            results.append({"test": "SMTP登录 465", "status": "ok"})
        except smtplib.SMTPAuthenticationError:
            results.append({"test": "SMTP登录 465", "status": "fail", "detail": "认证失败，请检查密码/App Password"})
        except Exception as e:
            results.append({"test": "SMTP登录 465", "status": "fail", "detail": str(e)})

    return {"results": results}


@router.post("/test-email")
def test_email(user: User = Depends(get_current_user)):
    """测试邮件配置（仅管理员）"""
    if user.user_type != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="仅管理员可操作")
    if not user.email:
        raise HTTPException(status_code=400, detail="当前管理员没有设置邮箱")
    send_email(
        to=user.email,
        subject="[Fugistics Hub] 邮件配置测试",
        body="<p>这是一封测试邮件，您的邮件配置正常工作。</p>",
    )
    return {"message": f"测试邮件已发送至 {user.email}"}
