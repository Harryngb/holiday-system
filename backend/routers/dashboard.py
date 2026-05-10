from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
from models import User, LeaveRequest
from schemas import DashboardSummary, EmployeeSummary, LeaveRequestResponse
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["仪表盘"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pending = db.query(LeaveRequest).filter(
        LeaveRequest.user_id == user.id,
        LeaveRequest.status == "pending",
    ).count()

    return DashboardSummary(
        total_employees=1,
        pending_requests=pending,
        total_leave_days=user.total_leave_days,
        used_leave_days=user.used_leave_days,
        remaining_days=user.remaining_days,
        last_year_days=user.last_year_days,
        current_year_days=user.current_year_days,
        total_leave_hours=user.total_leave_hours,
        used_leave_hours=user.used_leave_hours,
        remaining_hours=user.remaining_hours,
        last_year_hours=user.last_year_hours,
        current_year_hours=user.current_year_hours,
        current_year=user.current_year or "2026",
    )


@router.get("/employees", response_model=List[EmployeeSummary])
def get_employee_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """所有员工假期汇总（管理员和主管可查看全部）"""
    if user.user_type == "employee":
        users = db.query(User).filter(User.id == user.id).all()
    else:
        users = db.query(User).order_by(User.employee_id).all()

    result = []
    for u in users:
        result.append(EmployeeSummary(
            id=u.id,
            employee_id=u.employee_id,
            name=u.name,
            user_type=u.user_type,
            total_leave_days=u.total_leave_days,
            used_leave_days=u.used_leave_days,
            remaining_days=u.remaining_days,
            remaining_hours=u.remaining_hours,
            total_leave_hours=u.total_leave_hours,
            used_leave_hours=u.used_leave_hours,
        ))
    return result


@router.get("/approval-log", response_model=List[LeaveRequestResponse])
def get_approval_log(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """当前用户相关的审批日志（自己的申请被审批的记录）"""
    query = db.query(LeaveRequest).options(
        joinedload(LeaveRequest.user),
        joinedload(LeaveRequest.approver),
    ).filter(
        LeaveRequest.user_id == user.id,
        LeaveRequest.status.in_(["approved", "rejected"]),
    ).order_by(LeaveRequest.updated_at.desc()).limit(50)

    results = []
    for lr in query.all():
        resp = LeaveRequestResponse.model_validate(lr)
        resp.user_name = lr.user.name if lr.user else ""
        resp.user_employee_id = lr.user.employee_id if lr.user else ""
        resp.approver_name = lr.approver.name if lr.approver else ""
        results.append(resp)
    return results
