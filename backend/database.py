from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime, timezone, timedelta
from config import DATABASE_URL

BEIJING_OFFSET = timedelta(hours=8)


def beijing_now():
    """返回当前北京时间 (UTC+8)"""
    return datetime.now(timezone.utc) + BEIJING_OFFSET

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
