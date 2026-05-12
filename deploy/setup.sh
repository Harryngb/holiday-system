#!/bin/bash
# ============================================
# Fugistics Hub 假期管理系统 - 一键部署脚本
# ============================================
# 用法: bash deploy/setup.sh
# 本脚本会自动完成所有部署操作，无需手动干预

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "============================================"
echo "  Fugistics Hub 假期管理系统"
echo "  一键部署脚本"
echo "============================================"

# 检查系统要求
echo ""
echo "[检查] 系统环境..."

PYTHON_OK=false
NODE_OK=false

if command -v python3 &>/dev/null; then
    PYTHON_OK=true
    echo "  ✅ Python3 $(python3 --version | cut -d' ' -f2)"
fi

if command -v node &>/dev/null; then
    NODE_OK=true
    echo "  ✅ Node.js $(node --version)"
fi

if ! $PYTHON_OK || ! $NODE_OK; then
    echo "  ❌ 需要安装 Python3 和 Node.js"
    exit 1
fi

# 1. 设置 Python 虚拟环境
echo ""
echo "[1/5] 设置 Python 虚拟环境..."
if [ ! -d "backend/.venv" ]; then
    python3 -m venv backend/.venv
fi
source backend/.venv/bin/activate
pip install -r backend/requirements.txt -q
echo "  ✅ Python 依赖安装完成"

# 2. 安装前端依赖
echo ""
echo "[2/5] 安装前端依赖..."
cd frontend
npm install --silent 2>/dev/null
cd "$PROJECT_DIR"
echo "  ✅ 前端依赖安装完成"

# 3. 构建前端
echo ""
echo "[3/5] 构建前端..."
cd frontend
npm run build 2>&1 | tail -3
cd "$PROJECT_DIR"
echo "  ✅ 前端构建完成"

# 4. 部署静态文件
echo ""
echo "[4/5] 部署静态文件..."
rm -rf backend/static
cp -r frontend/dist backend/static
echo "  ✅ 静态文件已部署 (后自动提供前端页面)"

# 5. 安装 PM2 并启动服务
echo ""
echo "[5/5] 启动生产服务..."
if ! command -v pm2 &>/dev/null; then
    echo "  安装 PM2 进程管理器..."
    npm install -g pm2 --silent 2>/dev/null
fi

mkdir -p logs
pm2 start deploy/ecosystem.config.js 2>/dev/null || pm2 restart deploy/ecosystem.config.js 2>/dev/null
pm2 save 2>/dev/null

echo ""
echo "============================================"
echo "  ✅ 部署完成!"
echo "============================================"
echo ""
echo "  访问地址: http://localhost:8000"
echo "  默认管理员: jhong / 123456"
echo ""
echo "  📋 日常管理:"
echo "    查看状态: pm2 status"
echo "    查看日志: pm2 logs holiday-system"
echo "    重启服务: bash deploy/manage.sh restart"
echo "    重新构建: bash deploy/manage.sh rebuild"
echo ""
echo "  🔧 开机自启:"
echo "    pm2 startup  # 按提示执行即可"
echo ""
echo "  🌐 如需外网访问:"
echo "    方案1: 使用 ngrok (brew install ngrok && ngrok http 8000)"
echo "    方案2: 部署到云服务器 (Railway/Render/VPS)"
echo "============================================"
