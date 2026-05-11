import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import inspect, text
from database import engine, Base, SessionLocal, DATABASE_URL as DB_URL
from config import DATABASE_URL as RAW_DB_URL
from models import User
from auth import hash_password
from scheduler import start_scheduler

app = FastAPI(title="nVision Global 假期管理系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
from routers import auth, users, leaves, approval, dashboard, clearance, reports, notifications

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(leaves.router)
app.include_router(approval.router)
app.include_router(dashboard.router)
app.include_router(clearance.router)
app.include_router(reports.router)
app.include_router(notifications.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/debug/db")
async def debug_db():
    raw = RAW_DB_URL
    corrected = DB_URL
    def mask(url):
        if "@" not in url:
            return url
        parts = url.split("@")
        creds = parts[0].split(":")
        return f"{creds[0]}:***@{parts[1]}"
    return {
        "raw_url": mask(raw),
        "corrected_url": mask(corrected) if corrected != raw else None,
        "using_sqlite": raw.startswith("sqlite"),
    }


# 生产模式：如果存在 static 目录则提供前端静态文件
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir):
    _assets_dir = os.path.join(_static_dir, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    _root_files = {}
    for _f in os.listdir(_static_dir):
        _fp = os.path.join(_static_dir, _f)
        if os.path.isfile(_fp) and _f != "index.html":
            _root_files[_f] = _fp

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # 先找根目录静态文件 (logo, favicon etc.)
        if full_path in _root_files:
            return FileResponse(_root_files[full_path])
        # SPA 路由回退到 index.html
        _index = os.path.join(_static_dir, "index.html")
        if os.path.isfile(_index):
            return FileResponse(_index)
        return {"error": "not found"}


def run_migrations():
    """新增字段迁移"""
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns("leave_requests")]
    with engine.connect() as conn:
        if "start_time" not in columns:
            conn.execute(text("ALTER TABLE leave_requests ADD COLUMN start_time VARCHAR(10)"))
        if "end_time" not in columns:
            conn.execute(text("ALTER TABLE leave_requests ADD COLUMN end_time VARCHAR(10)"))
        if "deduction_days" not in columns:
            conn.execute(text("ALTER TABLE leave_requests ADD COLUMN deduction_days FLOAT"))
        conn.commit()


@app.on_event("startup")
def startup():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"数据库连接失败: {e}")
        return  # 数据库不可用时不阻塞启动
    try:
        run_migrations()
    except Exception:
        pass  # 生产环境可能不支持动态加列，忽略

    # 创建默认管理员
    try:
        db = SessionLocal()
        try:
            existing = db.query(User).filter(User.username == "jhong").first()
            if not existing:
                admin = User(
                    employee_id="ADMIN001",
                    name="Admin",
                    username="jhong",
                    password=hash_password("123456"),
                    email="admin@nvisionglobal.com",
                    user_type="admin",
                    last_year="2025",
                    current_year="2026",
                    last_year_days=0,
                    current_year_days=0,
                    total_leave_days=0,
                    used_leave_days=0,
                    remaining_days=0,
                    last_year_hours=0,
                    current_year_hours=0,
                    total_leave_hours=0,
                    used_leave_hours=0,
                    remaining_hours=0,
                )
                db.add(admin)
                db.commit()
                print("默认管理员已创建: jhong / 123456")
        finally:
            db.close()
    except Exception as e:
        print(f"创建管理员失败: {e}")

    # 启动定时任务
    try:
        start_scheduler()
    except Exception as e:
        print(f"启动定时任务失败: {e}")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
