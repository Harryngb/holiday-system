from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User, LeaveRequest, Notification, ClearanceRecord
from schemas import UserCreate, UserUpdate, UserResponse, BatchImportItem
from auth import hash_password, get_current_user, require_admin

router = APIRouter(prefix="/api/users", tags=["员工管理"])


@router.get("", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    users = db.query(User).order_by(User.employee_id).all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("", response_model=UserResponse)
def create_user(req: UserCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    if db.query(User).filter(User.employee_id == req.employee_id).first():
        raise HTTPException(status_code=400, detail="工号已存在")

    user = User(
        employee_id=req.employee_id,
        name=req.name,
        username=req.username,
        password=hash_password(req.password),
        email=req.email,
        user_type=req.user_type,
        last_year=req.last_year,
        current_year=req.current_year,
        last_year_days=req.last_year_days,
        current_year_days=req.current_year_days,
        total_leave_days=req.total_leave_days or (req.last_year_days + req.current_year_days),
        used_leave_days=req.used_leave_days,
        remaining_days=req.remaining_days or (req.last_year_days + req.current_year_days - req.used_leave_days),
        last_year_hours=req.last_year_hours,
        current_year_hours=req.current_year_hours,
        total_leave_hours=req.total_leave_hours or (req.last_year_hours + req.current_year_hours),
        used_leave_hours=req.used_leave_hours,
        remaining_hours=req.remaining_hours or (req.last_year_hours + req.current_year_hours - req.used_leave_hours),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, req: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    update_data = req.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["password"] = hash_password(update_data["password"])

    for key, value in update_data.items():
        setattr(user, key, value)

    # 重新计算汇总
    if any(k in update_data for k in ("last_year_days", "current_year_days", "used_leave_days")):
        user.total_leave_days = user.last_year_days + user.current_year_days
        user.remaining_days = user.total_leave_days - user.used_leave_days
    if any(k in update_data for k in ("last_year_hours", "current_year_hours", "used_leave_hours")):
        user.total_leave_hours = user.last_year_hours + user.current_year_hours
        user.remaining_hours = user.total_leave_hours - user.used_leave_hours

    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.user_type == "admin":
        raise HTTPException(status_code=400, detail="不能删除管理员账号")
    # 先清理关联数据
    db.query(Notification).filter(Notification.user_id == user_id).delete()
    db.query(LeaveRequest).filter(LeaveRequest.user_id == user_id).delete()
    db.query(LeaveRequest).filter(LeaveRequest.approver_id == user_id).update(
        {"approver_id": None}, synchronize_session=False
    )
    db.query(ClearanceRecord).filter(ClearanceRecord.admin_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"message": "删除成功"}


@router.post("/import", response_model=List[UserResponse])
def batch_import(items: List[BatchImportItem], db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    imported = []
    for item in items:
        existing = db.query(User).filter(User.employee_id == item.employee_id).first()
        if existing:
            # 仅更新假期数据
            existing.last_year_days = item.last_year_days
            existing.current_year_days = item.current_year_days
            existing.total_leave_days = item.total_leave_days or (item.last_year_days + item.current_year_days)
            existing.used_leave_days = item.used_leave_days
            existing.remaining_days = item.remaining_days or (item.total_leave_days - item.used_leave_days)
            existing.last_year_hours = item.last_year_hours
            existing.current_year_hours = item.current_year_hours
            existing.total_leave_hours = item.total_leave_hours or (item.last_year_hours + item.current_year_hours)
            existing.used_leave_hours = item.used_leave_hours
            existing.remaining_hours = item.remaining_hours or (item.total_leave_hours - item.used_leave_hours)
            existing.last_year = item.last_year
            existing.current_year = item.current_year
            db.flush()
            imported.append(existing)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"工号 {item.employee_id} 不存在，请先创建员工档案再导入假期数据"
            )

    db.commit()
    for u in imported:
        db.refresh(u)
    return [UserResponse.model_validate(u) for u in imported]
