from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any
from datetime import date, datetime


# ===== Auth =====
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    employee_id: str
    name: str
    username: str
    email: Optional[str] = ""
    user_type: str
    last_year: str
    current_year: str
    last_year_days: float
    current_year_days: float
    total_leave_days: float
    used_leave_days: float
    remaining_days: float
    last_year_hours: float
    current_year_hours: float
    total_leave_hours: float
    used_leave_hours: float
    remaining_hours: float

    class Config:
        from_attributes = True


# ===== User Management =====
class UserCreate(BaseModel):
    employee_id: str
    name: str
    username: str
    password: str
    email: Optional[str] = ""
    user_type: str = "employee"
    last_year: str = "2025"
    current_year: str = "2026"
    last_year_days: float = 0
    current_year_days: float = 0
    total_leave_days: float = 0
    used_leave_days: float = 0
    remaining_days: float = 0
    last_year_hours: float = 0
    current_year_hours: float = 0
    total_leave_hours: float = 0
    used_leave_hours: float = 0
    remaining_hours: float = 0


class UserUpdate(BaseModel):
    employee_id: Optional[str] = None
    name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    email: Optional[str] = None
    user_type: Optional[str] = None
    last_year: Optional[str] = None
    current_year: Optional[str] = None
    last_year_days: Optional[float] = None
    current_year_days: Optional[float] = None
    total_leave_days: Optional[float] = None
    used_leave_days: Optional[float] = None
    remaining_days: Optional[float] = None
    last_year_hours: Optional[float] = None
    current_year_hours: Optional[float] = None
    total_leave_hours: Optional[float] = None
    used_leave_hours: Optional[float] = None
    remaining_hours: Optional[float] = None


class BatchImportItem(BaseModel):
    employee_id: str
    last_year_days: float = 0
    current_year_days: float = 0
    total_leave_days: float = 0
    used_leave_days: float = 0
    remaining_days: float = 0
    last_year_hours: float = 0
    current_year_hours: float = 0
    total_leave_hours: float = 0
    used_leave_hours: float = 0
    remaining_hours: float = 0
    last_year: str
    current_year: str

    @field_validator("employee_id", "last_year", "current_year", mode="before")
    @classmethod
    def coerce_to_string(cls, v: Any) -> str:
        if isinstance(v, (int, float)):
            return str(int(v))
        return v


# ===== Leave Request =====
class LeaveRequestCreate(BaseModel):
    request_type: str  # leave, overtime
    start_date: date
    end_date: Optional[date] = None
    start_time: Optional[str] = None  # HH:mm
    end_time: Optional[str] = None    # HH:mm
    quantity: float
    unit: str  # day, hour
    leave_type: Optional[str] = None  # 年假/事假/病假/婚假/丧假/天转时
    overtime_reason: Optional[str] = None
    reason: Optional[str] = None


class LeaveRequestResponse(BaseModel):
    id: int
    user_id: int
    request_type: str
    start_date: date
    end_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    quantity: float
    unit: str
    leave_type: Optional[str] = None
    overtime_reason: Optional[str] = None
    reason: Optional[str] = None
    status: str
    approver_id: Optional[int] = None
    approval_comment: Optional[str] = None
    deduction_type: Optional[str] = None
    deduction_days: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    user_name: str = ""
    user_employee_id: str = ""
    user_type: str = ""
    approver_name: str = ""

    class Config:
        from_attributes = True


# ===== Approval =====
class ApproveRequest(BaseModel):
    comment: Optional[str] = None
    deduction_type: Optional[str] = None  # 扣假/不扣假
    deduction_days: Optional[float] = None  # 实际扣假天数(病假/婚假/丧假可选)


class RejectRequest(BaseModel):
    comment: Optional[str] = None


# ===== Clearance =====
class ClearanceCreate(BaseModel):
    notes: Optional[str] = None


class ClearanceDetailItem(BaseModel):
    employee_id: str
    name: str
    cleared_days: float
    cleared_hours: float


class ClearanceRecordResponse(BaseModel):
    id: int
    admin_id: int
    admin_name: str = ""
    cleared_at: datetime
    notes: Optional[str] = None
    created_at: datetime
    details: List[ClearanceDetailItem] = []

    class Config:
        from_attributes = True


# ===== Notification =====
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Dashboard =====
class DashboardSummary(BaseModel):
    total_employees: int = 0
    pending_requests: int = 0
    total_leave_days: float = 0
    used_leave_days: float = 0
    remaining_days: float = 0
    last_year_days: float = 0
    current_year_days: float = 0
    total_leave_hours: float = 0
    used_leave_hours: float = 0
    remaining_hours: float = 0
    last_year_hours: float = 0
    current_year_hours: float = 0
    current_year: str = ""


class EmployeeSummary(BaseModel):
    id: int
    employee_id: str
    name: str
    user_type: str
    total_leave_days: float
    used_leave_days: float
    remaining_days: float
    remaining_hours: float
    total_leave_hours: float
    used_leave_hours: float
