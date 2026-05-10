from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db, beijing_now
from models import User, ClearanceRecord, ClearanceDetail
from schemas import ClearanceCreate, ClearanceRecordResponse, ClearanceDetailItem
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/clearance", tags=["清零管理"])


def _do_clearance(db: Session, admin: User, notes: str):
    """执行清零并记录每个员工的清零详情"""
    users = db.query(User).filter(User.user_type.in_(["employee", "supervisor"])).all()
    now = beijing_now()

    details = []
    for u in users:
        cleared_days = u.last_year_days
        cleared_hours = u.last_year_hours
        details.append(ClearanceDetail(
            user_id=u.id,
            employee_id=u.employee_id,
            name=u.name,
            cleared_days=cleared_days,
            cleared_hours=cleared_hours,
        ))
        u.last_year_days = 0
        u.last_year_hours = 0
        u.total_leave_days = u.current_year_days
        u.remaining_days = u.total_leave_days - u.used_leave_days
        u.total_leave_hours = u.current_year_hours
        u.remaining_hours = u.total_leave_hours - u.used_leave_hours

    record = ClearanceRecord(
        admin_id=admin.id,
        cleared_at=now,
        notes=notes,
        details=details,
    )
    db.add(record)
    db.commit()
    return {"message": "清零成功", "cleared_at": now.isoformat(), "details_count": len(details)}


@router.post("/reset")
def reset_yearly(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """一键清零：将所有员工的上年度假期数据置零"""
    return _do_clearance(db, admin, "管理员一键清零操作")


@router.post("/reset-with-note")
def reset_with_note(req: ClearanceCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """一键清零(带备注)"""
    return _do_clearance(db, admin, req.notes or "管理员一键清零操作")


@router.post("/undo")
def undo_last_clearance(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """撤销最近一次清零操作"""
    last = (
        db.query(ClearanceRecord)
        .options(joinedload(ClearanceRecord.details))
        .order_by(ClearanceRecord.created_at.desc())
        .first()
    )
    if not last:
        raise HTTPException(status_code=400, detail="没有可撤销的清零记录")
    if not last.details:
        raise HTTPException(status_code=400, detail="该清零记录无详细数据，无法撤销")

    restored = 0
    for d in last.details:
        user = db.query(User).filter(User.id == d.user_id).first()
        if not user:
            continue
        user.last_year_days = d.cleared_days
        user.last_year_hours = d.cleared_hours
        user.total_leave_days = user.last_year_days + user.current_year_days
        user.remaining_days = user.total_leave_days - user.used_leave_days
        user.total_leave_hours = user.last_year_hours + user.current_year_hours
        user.remaining_hours = user.total_leave_hours - user.used_leave_hours
        restored += 1

    # 先刷新用户修改，再级联删除详情和记录
    last_id = last.id
    db.flush()
    db.query(ClearanceDetail).filter(ClearanceDetail.clearance_id == last_id).delete()
    db.delete(last)
    db.commit()
    return {"message": f"已撤销清零操作，恢复 {restored} 名员工的假期数据"}


@router.get("/records", response_model=List[ClearanceRecordResponse])
def get_records(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    records = (
        db.query(ClearanceRecord)
        .options(joinedload(ClearanceRecord.details))
        .order_by(ClearanceRecord.created_at.desc())
        .limit(50)
        .all()
    )
    result = []
    for r in records:
        admin_user = db.query(User).filter(User.id == r.admin_id).first()
        detail_items = [
            ClearanceDetailItem(
                employee_id=d.employee_id,
                name=d.name,
                cleared_days=d.cleared_days,
                cleared_hours=d.cleared_hours,
            )
            for d in r.details
        ]
        resp = ClearanceRecordResponse(
            id=r.id,
            admin_id=r.admin_id,
            admin_name=admin_user.name if admin_user else "",
            cleared_at=r.cleared_at,
            notes=r.notes,
            created_at=r.created_at,
            details=detail_items,
        )
        result.append(resp)
    return result
