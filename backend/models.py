from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from database import Base, beijing_now


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    user_type = Column(String(20), default="employee")  # employee, supervisor, admin

    # 年份
    last_year = Column(String(10), default="")
    current_year = Column(String(10), default="")

    # 天数
    last_year_days = Column(Float, default=0)
    current_year_days = Column(Float, default=0)
    total_leave_days = Column(Float, default=0)
    used_leave_days = Column(Float, default=0)
    remaining_days = Column(Float, default=0)

    # 小时
    last_year_hours = Column(Float, default=0)
    current_year_hours = Column(Float, default=0)
    total_leave_hours = Column(Float, default=0)
    used_leave_hours = Column(Float, default=0)
    remaining_hours = Column(Float, default=0)

    created_at = Column(DateTime, default=beijing_now)
    updated_at = Column(DateTime, default=beijing_now, onupdate=beijing_now)

    leave_requests = relationship("LeaveRequest", back_populates="user", foreign_keys="LeaveRequest.user_id")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_type = Column(String(20), nullable=False)  # leave, overtime
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    start_time = Column(String(10), nullable=True)  # 加班起始时间 HH:mm
    end_time = Column(String(10), nullable=True)    # 加班结束时间 HH:mm
    quantity = Column(Float, nullable=False)
    unit = Column(String(10), nullable=False)  # day, hour
    leave_type = Column(String(20), nullable=True)  # 年假/事假/病假/婚假/丧假/天转时
    overtime_reason = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approval_comment = Column(Text, nullable=True)
    deduction_type = Column(String(10), nullable=True)  # 扣假/不扣假
    deduction_days = Column(Float, nullable=True)  # 实际扣假天数(病假/婚假/丧假可选部分扣)

    created_at = Column(DateTime, default=beijing_now)
    updated_at = Column(DateTime, default=beijing_now, onupdate=beijing_now)

    user = relationship("User", back_populates="leave_requests", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approver_id])


class ClearanceRecord(Base):
    __tablename__ = "clearance_records"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cleared_at = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=beijing_now)

    details = relationship("ClearanceDetail", back_populates="clearance", cascade="all, delete-orphan")


class ClearanceDetail(Base):
    __tablename__ = "clearance_details"

    id = Column(Integer, primary_key=True, index=True)
    clearance_id = Column(Integer, ForeignKey("clearance_records.id"), nullable=False)
    user_id = Column(Integer, nullable=False)
    employee_id = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    cleared_days = Column(Float, default=0)
    cleared_hours = Column(Float, default=0)

    clearance = relationship("ClearanceRecord", back_populates="details")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=beijing_now)
