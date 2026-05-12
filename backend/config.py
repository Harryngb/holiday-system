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

# SMTP (企业邮箱，Railway免费计划不支持SMTP端口)
SMTP_SERVER = os.getenv("SMTP_SERVER", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")

# SendGrid HTTP API (备用)
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")

# Resend HTTP API (备用)
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")

# Brevo (Sendinblue) HTTP API (推荐，免费300封/天，Railway免费计划可用)
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")

# 公司名称（用于邮件、报表等）
COMPANY_NAME = os.getenv("COMPANY_NAME", "nVision Global")
# Logo URL（用于邮件模板，留空则显示文字标题）
LOGO_URL = os.getenv("LOGO_URL", "")

# 是否启用邮件通知
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "false").lower() == "true"

# 默认管理员
DEFAULT_ADMIN_USERNAME = "jhong"
DEFAULT_ADMIN_PASSWORD = "123456"
DEFAULT_ADMIN_NAME = "Admin"
DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@nvisionglobal.com")

# 系统访问地址（邮件中的链接）
BASE_URL = os.getenv("BASE_URL", "https://applyleave.pages.dev")
