from urllib.parse import quote
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
from config import EMAIL_ENABLED, SMTP_SERVER, SMTP_USER, SMTP_FROM
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

    filename = f"nVision_Global_Ningbo_{current_year}_假期报表_{today}.xlsx"
    ascii_name = f"nVision_Global_Ningbo_{current_year}_Report.xlsx"

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
        "SMTP_SERVER": SMTP_SERVER or "未设置",
        "SMTP_USER": SMTP_USER or "未设置",
        "SMTP_FROM": SMTP_FROM or "未设置",
        "admins": admin_msg,
        "users_with_email": f"{users_with_email} / {all_users} 个用户有邮箱",
        "note": "EMAIL_ENABLED 为 false 时所有邮件都不会发送",
    }


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
        subject="[nVision] 邮件配置测试",
        body="<p>这是一封测试邮件，您的邮件配置正常工作。</p>",
    )
    return {"message": f"测试邮件已发送至 {user.email}"}
