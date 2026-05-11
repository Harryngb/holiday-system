from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, and_, not_
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import User, LeaveRequest, Notification
from schemas import ApproveRequest, RejectRequest, LeaveRequestResponse
from auth import get_current_user
from utils.email import send_leave_notification

router = APIRouter(prefix="/api/leaves", tags=["审批"])


def update_leave_balance(db: Session, user: User, quantity: float, unit: str, is_adding: bool):
    """扣除或增加假期余额。is_adding=True表示增加(加班), False表示扣除(休假)。
    允许余额为负（倒欠），返回是否余额不足的警告信息。"""
    warning = None

    if unit == "day":
        to_process = quantity
        if user.last_year_days > 0 and not is_adding:
            deduct = min(user.last_year_days, to_process)
            user.last_year_days -= deduct
            to_process -= deduct
            user.used_leave_days += deduct

        if to_process > 0:
            if is_adding:
                user.current_year_days += to_process
                user.total_leave_days += to_process
            else:
                user.current_year_days -= to_process
                user.used_leave_days += to_process
                overdrawn = -min(user.current_year_days, 0) if user.current_year_days < 0 else 0
                if overdrawn > 0 or user.last_year_days + user.current_year_days < 0:
                    warning = f"⚠ 假期天数余额不足，将倒欠 {overdrawn:.1f} 天"
                to_process = 0

        user.remaining_days = user.last_year_days + user.current_year_days
    else:
        to_process = quantity
        if user.last_year_hours > 0 and not is_adding:
            deduct = min(user.last_year_hours, to_process)
            user.last_year_hours -= deduct
            to_process -= deduct
            user.used_leave_hours += deduct

        if to_process > 0:
            if is_adding:
                user.current_year_hours += to_process
                user.total_leave_hours += to_process
            else:
                user.current_year_hours -= to_process
                user.used_leave_hours += to_process
                overdrawn = -min(user.current_year_hours, 0) if user.current_year_hours < 0 else 0
                if overdrawn > 0 or user.last_year_hours + user.current_year_hours < 0:
                    warning = f"⚠ 假期小时余额不足，将倒欠 {overdrawn:.1f} 小时"
                to_process = 0

        user.remaining_hours = user.last_year_hours + user.current_year_hours

    return warning


def handle_day_to_hour_conversion(db: Session, user: User, days: float):
    """天转时：扣除天数，增加小时数。1天=8小时"""
    hours_to_add = days * 8
    to_deduct = days
    if user.last_year_days > 0:
        deduct = min(user.last_year_days, to_deduct)
        user.last_year_days -= deduct
        to_deduct -= deduct
        user.used_leave_days += deduct
    if to_deduct > 0:
        user.current_year_days -= to_deduct
        user.used_leave_days += to_deduct
        to_deduct = 0
    user.remaining_days = user.last_year_days + user.current_year_days
    user.current_year_hours += hours_to_add
    user.total_leave_hours += hours_to_add
    user.remaining_hours = user.last_year_hours + user.current_year_hours

    warning = None
    overdrawn = -min(user.remaining_days, 0) if user.remaining_days < 0 else 0
    if overdrawn > 0:
        warning = f"⚠ 天数余额不足，将倒欠 {overdrawn:.1f} 天"
    return warning


def _enrich_resp(resp, lr):
    resp.user_name = lr.user.name if lr.user else ""
    resp.user_employee_id = lr.user.employee_id if lr.user else ""
    resp.user_type = lr.user.user_type if lr.user else ""
    resp.approver_name = lr.approver.name if lr.approver else ""
    return resp


@router.post("/batch-approve")
def batch_approve(
    db: Session = Depends(get_db),
    approver: User = Depends(get_current_user),
):
    """一键审批所有符合条件的待审批申请（排除病假/婚假/丧假）"""
    if approver.user_type not in ("supervisor", "admin"):
        raise HTTPException(status_code=403, detail="无权审批")

    query = db.query(LeaveRequest).options(
        joinedload(LeaveRequest.user), joinedload(LeaveRequest.approver)
    ).filter(LeaveRequest.status == "pending")

    if approver.user_type == "admin":
        supervisor_ids = db.query(User.id).filter(User.user_type == "supervisor").subquery()
        query = query.filter(
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
            )
        )
    else:
        query = query.filter(
            LeaveRequest.user_id != approver.id,
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

    # 排除病假/婚假/丧假（需要手动扣假选项）
    query = query.filter(
        not_(
            and_(
                LeaveRequest.request_type == "leave",
                LeaveRequest.leave_type.in_(["病假", "婚假", "丧假"]),
            )
        )
    )

    leaves = query.all()
    count = len(leaves)
    warnings = []

    for lr in leaves:
        if lr.status != "pending":
            continue
        if lr.user_id == approver.id and approver.user_type != "admin":
            continue
        if lr.user.user_type == "supervisor" and approver.user_type != "admin":
            continue

        deduction = "扣假"
        deduction_days = lr.quantity

        lr.status = "approved"
        lr.approver_id = approver.id
        lr.approval_comment = ""
        lr.deduction_type = deduction
        lr.deduction_days = deduction_days

        warning = None
        if lr.request_type == "leave" and lr.leave_type == "天转时":
            warning = handle_day_to_hour_conversion(db, lr.user, lr.quantity)
        elif lr.request_type == "leave":
            warning = update_leave_balance(db, lr.user, lr.quantity, lr.unit, is_adding=False)
        else:
            update_leave_balance(db, lr.user, lr.quantity, lr.unit, is_adding=True)

        leave_label = "天转时" if lr.leave_type == "天转时" else ("加班" if lr.request_type == "overtime" else (lr.leave_type or "休假"))
        notification_text = f"您的{leave_label}申请已由 {approver.name} 批量审批通过"
        if warning:
            notification_text += f"\n{warning}"
        create_notification(db, lr.user_id, "申请已通过（批量审批）", notification_text)
        if lr.user.email:
            send_leave_notification(lr.user.email, lr.user.name, leave_label, "approved")

        if warning:
            warnings.append({"leave_id": lr.id, "user_name": lr.user.name if lr.user else "", "warning": warning})

    db.commit()
    return {"count": count, "warnings": warnings}


@router.post("/{leave_id}/approve")
def approve_leave(
    leave_id: int,
    req: ApproveRequest,
    db: Session = Depends(get_db),
    approver: User = Depends(get_current_user),
):
    if approver.user_type not in ("supervisor", "admin"):
        raise HTTPException(status_code=403, detail="无权审批")

    lr = db.query(LeaveRequest).options(
        joinedload(LeaveRequest.user), joinedload(LeaveRequest.approver)
    ).filter(LeaveRequest.id == leave_id).first()

    if not lr:
        raise HTTPException(status_code=404, detail="申请不存在")
    if lr.status != "pending":
        raise HTTPException(status_code=400, detail="已处理的申请不能重复审批")
    # 不能自己审批自己（管理员可以审批自己的小额假期）
    if lr.user_id == approver.id and approver.user_type != "admin":
        raise HTTPException(status_code=400, detail="不能审批自己的申请")
    # 主管的申请需要管理员审批
    if lr.user.user_type == "supervisor" and approver.user_type != "admin":
        raise HTTPException(status_code=403, detail="主管的申请需要管理员审批")

    deduction = req.deduction_type
    deduction_days = req.deduction_days

    if lr.request_type == "leave" and lr.leave_type in ("病假", "婚假", "丧假"):
        if deduction not in ("扣假", "不扣假"):
            raise HTTPException(status_code=400, detail=f"{lr.leave_type}必须选择'扣假'或'不扣假'")
        if deduction == "扣假" and deduction_days is not None:
            if deduction_days <= 0:
                raise HTTPException(status_code=400, detail="扣假天数必须大于0")
            if deduction_days > lr.quantity:
                raise HTTPException(status_code=400, detail=f"扣假天数不能超过申请天数({lr.quantity})")

    lr.status = "approved"
    lr.approver_id = approver.id
    lr.approval_comment = req.comment or ""
    lr.deduction_type = deduction
    lr.deduction_days = deduction_days if deduction == "扣假" else None

    warning = None

    if lr.request_type == "leave" and lr.leave_type == "天转时":
        warning = handle_day_to_hour_conversion(db, lr.user, lr.quantity)
    elif lr.request_type == "leave":
        should_deduct = True
        actual_qty = lr.quantity
        if lr.leave_type in ("病假", "婚假", "丧假") and deduction == "不扣假":
            should_deduct = False
        elif lr.leave_type in ("病假", "婚假", "丧假") and deduction == "扣假" and deduction_days is not None:
            # 部分扣假
            actual_qty = deduction_days

        if should_deduct:
            warning = update_leave_balance(db, lr.user, actual_qty, lr.unit, is_adding=False)
    else:
        update_leave_balance(db, lr.user, lr.quantity, lr.unit, is_adding=True)

    deduction_note = f"（{deduction}）" if deduction else ""
    leave_label = "天转时" if lr.leave_type == "天转时" else ("加班" if lr.request_type == "overtime" else (lr.leave_type or "休假"))
    notification_text = f"您的{leave_label}申请已由 {approver.name} 审批通过{deduction_note}"
    if deduction_days:
        notification_text += f"，实际扣假 {deduction_days} 天"
    if warning:
        notification_text += f"\n{warning}"

    create_notification(db, lr.user_id, f"申请已通过{deduction_note}", notification_text)
    if lr.user.email:
        send_leave_notification(lr.user.email, lr.user.name, leave_label, "approved")

    db.commit()
    db.refresh(lr)
    lr = db.query(LeaveRequest).options(
        joinedload(LeaveRequest.user), joinedload(LeaveRequest.approver)
    ).filter(LeaveRequest.id == lr.id).first()

    resp = LeaveRequestResponse.model_validate(lr)
    resp = _enrich_resp(resp, lr)

    return {
        "leave": resp,
        "warning": warning,
        "remaining_days": lr.user.remaining_days,
        "remaining_hours": lr.user.remaining_hours,
    }


@router.post("/{leave_id}/reject", response_model=LeaveRequestResponse)
def reject_leave(
    leave_id: int,
    req: RejectRequest,
    db: Session = Depends(get_db),
    approver: User = Depends(get_current_user),
):
    if approver.user_type not in ("supervisor", "admin"):
        raise HTTPException(status_code=403, detail="无权审批")

    lr = db.query(LeaveRequest).options(
        joinedload(LeaveRequest.user), joinedload(LeaveRequest.approver)
    ).filter(LeaveRequest.id == leave_id).first()

    if not lr:
        raise HTTPException(status_code=404, detail="申请不存在")
    if lr.status != "pending":
        raise HTTPException(status_code=400, detail="已处理的申请不能重复审批")
    if lr.user_id == approver.id and approver.user_type != "admin":
        raise HTTPException(status_code=400, detail="不能审批自己的申请")
    if lr.user.user_type == "supervisor" and approver.user_type != "admin":
        raise HTTPException(status_code=403, detail="主管的申请需要管理员审批")

    lr.status = "rejected"
    lr.approver_id = approver.id
    lr.approval_comment = req.comment or ""

    leave_label = "加班" if lr.request_type == "overtime" else (lr.leave_type or "休假")
    create_notification(
        db, lr.user_id,
        "申请已拒绝",
        f"您的{leave_label}申请已由 {approver.name} 拒绝"
        + (f"。原因: {req.comment}" if req.comment else ""),
    )
    if lr.user.email:
        send_leave_notification(lr.user.email, lr.user.name, leave_label, "rejected")

    db.commit()
    db.refresh(lr)
    lr = db.query(LeaveRequest).options(
        joinedload(LeaveRequest.user), joinedload(LeaveRequest.approver)
    ).filter(LeaveRequest.id == lr.id).first()

    resp = LeaveRequestResponse.model_validate(lr)
    return _enrich_resp(resp, lr)


def create_notification(db: Session, user_id: int, title: str, message: str):
    notif = Notification(user_id=user_id, title=title, message=message)
    db.add(notif)
