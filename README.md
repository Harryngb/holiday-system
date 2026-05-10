# nVision Global 假期管理系统 (Ningbo Office)

nVision Global 宁波办公室假期管理系统，支持员工休假/加班申请、审批流程、假期余额管理、Excel报表导出等功能。

## 技术栈

| 层级 | 技术 | 部署 |
|------|------|------|
| 前端 | React 18 + TypeScript + Ant Design 5 | **Cloudflare Pages** |
| 后端 | Python FastAPI + SQLAlchemy | Railway / 任意VPS |
| 数据库 | PostgreSQL (Supabase) | **Supabase** |
| 缓存/认证 | JWT | — |

## 功能概览

- **角色权限**: 员工(申请)、主管(审批员工)、管理员(全部权限)
- **假期类型**: 年假、事假、病假、婚假、丧假
- **特殊规则**: 病假/婚假/丧假可选择"扣假"或"不扣假"
- **加班管理**: 加班申请及余额增加
- **优先扣除**: 先扣上年度余额，再扣本年度
- **一键清零**: 管理员可清零上年度数据，有记录
- **报表导出**: Excel格式，按角色过滤数据
- **通知系统**: 站内通知 + 可选邮件通知

## 快速启动 (本地开发)

### 前置要求
- Python 3.9+
- Node.js 18+

### 1. 启动后端

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
# 默认使用SQLite (无需额外配置)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 3. 访问系统

- 前端: http://localhost:5173
- 后端API: http://localhost:8000
- 默认管理员: **jhong** / **123456**

## 生产部署

### 前端 → Cloudflare Pages

```bash
cd frontend
npm run build    # 输出到 dist/
```

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Pages** → **创建项目**
3. 连接Git仓库 或 直接上传 `dist/` 文件夹
4. 设置环境变量: `VITE_API_URL` = 后端API地址

### 数据库 → Supabase

1. 注册 [Supabase](https://supabase.com)
2. 创建新项目
3. 获取 PostgreSQL 连接字符串
4. 数据库表会在后端首次启动时自动创建

### 后端 → Railway/VPS

1. 部署后端代码到 Railway (或任何支持Python的云平台)
2. 设置环境变量:

```env
DATABASE_URL=postgresql://user:password@host:5432/postgres
JWT_SECRET=your-secret-key
SMTP_SERVER=smtp.your-company.com    # 可选，企业邮箱
SMTP_PORT=465
SMTP_USER=your-email@company.com
SMTP_PASSWORD=your-password
SMTP_FROM=your-email@company.com
EMAIL_ENABLED=false
ADMIN_EMAIL=admin@nvisionglobal.com
```

> **注意**: 如果不配置SMTP，邮件通知功能会自动跳过，不影响其他功能。

## 环境变量说明

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| DATABASE_URL | 否 | sqlite:///./holiday.db | 数据库连接 |
| JWT_SECRET | 否 | (内置) | JWT签名密钥 |
| SMTP_SERVER | 否 | "" | 企业邮箱SMTP服务器 |
| SMTP_PORT | 否 | 465 | SMTP端口 |
| SMTP_USER | 否 | "" | 邮箱账号 |
| SMTP_PASSWORD | 否 | "" | 邮箱密码 |
| SMTP_FROM | 否 | "" | 发件人地址 |
| EMAIL_ENABLED | 否 | false | 是否启用邮件 |
| ADMIN_EMAIL | 否 | admin@nvisionglobal.com | 管理员邮箱 |

## 项目结构

```
holiday-system/
├── backend/
│   ├── main.py              # FastAPI 入口 & 路由注册
│   ├── config.py            # 配置
│   ├── database.py          # 数据库连接
│   ├── models.py            # 数据模型
│   ├── schemas.py           # 请求/响应模型
│   ├── auth.py              # JWT认证
│   ├── routers/
│   │   ├── auth.py          # 登录
│   │   ├── users.py         # 员工管理
│   │   ├── leaves.py        # 假期申请
│   │   ├── approval.py      # 审批
│   │   ├── dashboard.py     # 仪表盘
│   │   ├── reports.py       # 报表
│   │   ├── clearance.py     # 清零
│   │   └── notifications.py # 通知
│   ├── utils/
│   │   ├── email.py         # 邮件发送
│   │   └── excel.py         # Excel处理
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # API请求封装
│   │   ├── pages/           # 页面组件
│   │   ├── components/      # 通用组件
│   │   ├── App.tsx          # 路由配置
│   │   └── main.tsx         # 入口
│   ├── index.html
│   └── package.json
├── public/                  # LOGO等静态资源
├── run.sh                   # 本地一键启动
└── README.md
```

## 品牌配色 (nVision Global)

| 用途 | 色值 | 说明 |
|------|------|------|
| 主色 | #1a3c6e | 深海军蓝 |
| 辅色 | #2b6cb0 | 中蓝色 |
| 强调色 | #e8b830 | 金色 |
| 背景 | #f0f2f5 | 浅灰色 |

## 替换LOGO

将官方LOGO文件放到 `public/` 目录，然后更新 `frontend/src/pages/Login.tsx` 中的LOGO部分：

```tsx
{/* 替换为官方LOGO */}
<img src="/nvision-logo.png" alt="nVision Global" style={{ height: 60, marginBottom: 16 }} />
```

## 系统截图

- **登录页**: nVision Global 品牌色渐变背景 + LOGO
- **仪表盘**: 数据统计卡片 + 员工假期汇总表
- **假期管理**: 休假/加班申请表单 + 申请记录
- **审批中心**: 待审批列表 + 同意/拒绝操作（含扣假选项）
- **员工管理**: 员工CRUD + 批量导入
- **报表**: 一键导出Excel汇总表
- **清零管理**: 一键清零 + 历史记录
