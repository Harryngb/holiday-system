import os
from pathlib import Path

# 加载 .env.production（如果存在）
_env_file = Path(__file__).resolve().parent.parent / ".env.production"
if _env_file.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_file)

# Database - 默认SQLite本地开发，生产用Supabase PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./holiday.db")

# JWT
JWT_SECRET = os.getenv("JWT_SECRET", "nvision-global-holiday-secret-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# SMTP (企业邮箱)
SMTP_SERVER = os.getenv("SMTP_SERVER", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")

# 是否启用邮件通知
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "false").lower() == "true"

# 默认管理员
DEFAULT_ADMIN_USERNAME = "jhong"
DEFAULT_ADMIN_PASSWORD = "123456"
DEFAULT_ADMIN_NAME = "Admin"
DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@nvisionglobal.com")

# 系统访问地址（邮件中的链接）
BASE_URL = os.getenv("BASE_URL", "https://applyleave.pages.dev")
