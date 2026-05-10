from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, and_, not_
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from database import get_db
from models import User, LeaveRequest, Notification
from schemas import LeaveRequestCreate, LeaveRequestResponse
from auth import get_current_user

router = APIRouter(prefix="/api/leaves", tags=["假期申请"])


def create_notification(db: Session, user_id: int, title: str, message: str):
    notif = Notification(user_id=user_id, title=title, message=message)
    db.add(notif)


@router.get("", response_model=List[LeaveRequestResponse])
def list_leaves(
    status_filter: Optional[str] = None,
    applicant_type: Optional[str] = None,
    exclude_self: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(LeaveRequest).options(
        joinedload(LeaveRequest.user),
        joinedload(LeaveRequest.approver),
    )
    # 员工只看自己
    if user.user_type == "employee":
        query = query.filter(LeaveRequest.user_id == user.id)

    if status_filter:
        query = query.filter(LeaveRequest.status == status_filter)

    if exclude_self:
        query = query.filter(LeaveRequest.user_id != user.id)

    if applicant_type:
        user_ids = db.query(User.id).filter(User.user_type == applicant_type).subquery()
        query = query.filter(LeaveRequest.user_id.in_(user_ids))

    query = query.order_by(LeaveRequest.created_at.desc()).limit(200)
    results = []
    for lr in query.all():
        resp = LeaveRequestResponse.model_validate(lr)
        resp.user_name = lr.user.name if lr.user else ""
        resp.user_employee_id = lr.user.employee_id if lr.user else ""
        resp.user_type = lr.user.user_type if lr.user else ""
        resp.approver_name = lr.approver.name if lr.approver else ""
        results.append(resp)
    return results


@router.get("/approval-log", response_model=List[LeaveRequestResponse])
def list_approval_log(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """当前登录用户相关的审批记录（自己申请被审批的历史）"""
    query = db.query(LeaveRequest).options(
        joinedload(LeaveRequest.user),
        joinedload(LeaveRequest.approver),
    ).filter(LeaveRequest.user_id == user.id)

    # 已审批的
    query = query.filter(LeaveRequest.status.in_(["approved", "rejected"]))
    query = query.order_by(LeaveRequest.updated_at.desc()).limit(50)

    results = []
    for lr in query.all():
        resp = LeaveRequestResponse.model_validate(lr)
        resp.user_name = lr.user.name if lr.user else ""
        resp.user_employee_id = lr.user.employee_id if lr.user else ""
        resp.user_type = lr.user.user_type if lr.user else ""
        resp.approver_name = lr.approver.name if lr.approver else ""
        results.append(resp)
    return results


@router.get("/my-pending-count")
def my_pending_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """我的待审批数量（与审批页面过滤逻辑一致）"""
    if user.user_type not in ("supervisor", "admin"):
        return {"count": 0}

    if user.user_type == "admin":
        # Admin sees all pending matching: supervisor OR small leaves (< 0.5 day or < 4 hours)
        supervisor_ids = db.query(User.id).filter(User.user_type == "supervisor").subquery()
        query = db.query(LeaveRequest).filter(
            LeaveRequest.status == "pending",
            or_(
                LeaveRequest.user_id.in_(supervisor_ids),
                and_(
                    LeaveRequest.quantity < 0.5,
                    LeaveRequest.unit == "day",
                    LeaveRequest.request_type == "leave",
                ),
                and_(
                    LeaveRequest.quantity < 4,
                    LeaveRequest.unit == "hour",
                    LeaveRequest.request_type == "leave",
                ),
            ),
        )
    else:
        # Supervisor sees: all pending except self, exclude small leaves
        query = db.query(LeaveRequest).filter(
            LeaveRequest.status == "pending",
            LeaveRequest.user_id != user.id,
            not_(
                and_(
                    LeaveRequest.quantity < 0.5,
                    LeaveRequest.unit == "day",
                    LeaveRequest.request_type == "leave",
                )
            ),
            not_(
                and_(
                    LeaveRequest.quantity < 4,
                    LeaveRequest.unit == "hour",
                    LeaveRequest.request_type == "leave",
                )
            ),
        )

    count = query.count()
    return {"count": count}


@router.post("", response_model=LeaveRequestResponse)
def create_leave(
    req: LeaveRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if req.request_type == "overtime" and not req.overtime_reason:
        raise HTTPException(status_code=400, detail="加班申请必须填写事由")
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="数量必须大于0")

    leave_req = LeaveRequest(
        user_id=user.id,
        request_type=req.request_type,
        start_date=req.start_date,
        end_date=req.end_date or req.start_date,
        start_time=req.start_time if req.request_type == "overtime" else None,
        end_time=req.end_time if req.request_type == "overtime" else None,
        quantity=req.quantity,
        unit=req.unit,
        leave_type=req.leave_type if req.request_type == "leave" else None,
        overtime_reason=req.overtime_reason if req.request_type == "overtime" else None,
        reason=req.reason,
        status="pending",
    )
    db.add(leave_req)
    db.commit()
    db.refresh(leave_req)

    # 通知管理员和主管（排除自己）
    admins = db.query(User).filter(
        User.user_type.in_(["admin", "supervisor"]),
        User.id != user.id,
    ).all()
    for a in admins:
        leave_label = req.leave_type if req.request_type == "leave" else "加班"
        create_notification(
            db, a.id,
            "新的假期申请",
            f"{user.name} 提交了{leave_label}申请，等待审批",
        )
    db.commit()

    lr = db.query(LeaveRequest).options(
        joinedload(LeaveRequest.user), joinedload(LeaveRequest.approver)
    ).filter(LeaveRequest.id == leave_req.id).first()

    resp = LeaveRequestResponse.model_validate(lr)
    resp.user_name = lr.user.name if lr.user else ""
    resp.user_employee_id = lr.user.employee_id if lr.user else ""
    resp.approver_name = lr.approver.name if lr.approver else ""
    return resp


@router.get("/{leave_id}", response_model=LeaveRequestResponse)
def get_leave(leave_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lr = db.query(LeaveRequest).options(
        joinedload(LeaveRequest.user), joinedload(LeaveRequest.approver)
    ).filter(LeaveRequest.id == leave_id).first()

    if not lr:
        raise HTTPException(status_code=404, detail="申请不存在")
    if user.user_type == "employee" and lr.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权查看")

    resp = LeaveRequestResponse.model_validate(lr)
    resp.user_name = lr.user.name if lr.user else ""
    resp.user_employee_id = lr.user.employee_id if lr.user else ""
    resp.approver_name = lr.approver.name if lr.approver else ""
    return resp
