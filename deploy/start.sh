#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOGS_DIR="$PROJECT_DIR/logs"

echo "============================================"
echo "  Fugistics Hub 假期管理系统 - 生产部署"
echo "============================================"

# 创建日志目录
mkdir -p "$LOGS_DIR"

# 1. 构建前端
echo ""
echo "[1/3] 构建前端..."
cd "$FRONTEND_DIR"
npm run build 2>&1 | tail -3
echo "      前端构建完成 -> $FRONTEND_DIR/dist"

# 2. 复制前端到后端静态目录
echo ""
echo "[2/3] 复制前端静态文件..."
STATIC_DIR="$BACKEND_DIR/static"
rm -rf "$STATIC_DIR"
cp -r "$FRONTEND_DIR/dist" "$STATIC_DIR"
echo "      静态文件已复制到 $STATIC_DIR"

# 3. 启动后端
echo ""
echo "[3/3] 启动后端服务..."
cd "$BACKEND_DIR"
source .venv/bin/activate

# 如果安装了 PM2，使用 PM2 启动
if command -v pm2 &> /dev/null; then
  echo "      使用 PM2 启动服务..."
  pm2 start "$PROJECT_DIR/deploy/ecosystem.config.js" --env production
  pm2 save
  echo ""
  echo "  ✅ 系统已部署完成!"
  echo "  访问地址: http://localhost:8000"
  echo ""
  echo "  PM2 管理命令:"
  echo "  查看状态: pm2 status"
  echo "  查看日志: pm2 logs holiday-system"
  echo "  重启服务: pm2 restart holiday-system"
  echo "  停止服务: pm2 stop holiday-system"
else
  echo "      直接启动服务 (推荐安装 PM2: npm install -g pm2)..."
  echo ""
  echo "  访问地址: http://localhost:8000"
  PRODUCTION=true uvicorn main:app --host 0.0.0.0 --port 8000
fi
