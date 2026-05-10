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
