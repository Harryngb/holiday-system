#!/bin/bash

# Fugistics Hub 假期管理系统 - 启动脚本

echo "============================================"
echo "  Fugistics Hub 假期管理系统"
echo "  Ningbo Office Holiday Management System"
echo "============================================"

# 启动后端
echo ""
echo "[1/2] 启动后端 API..."
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 2

# 启动前端
echo "[2/2] 启动前端开发服务器..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================"
echo "  系统已启动!"
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:8000"
echo "  默认管理员: jhong / 123456"
echo "============================================"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
