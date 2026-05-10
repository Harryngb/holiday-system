#!/bin/bash
# ============================================
# 日常运维脚本
# ============================================

case "${1:-help}" in
  start)
    pm2 start deploy/ecosystem.config.js --env production
    echo "✅ 服务已启动"
    ;;
  stop)
    pm2 stop holiday-system
    echo "✅ 服务已停止"
    ;;
  restart)
    pm2 restart holiday-system
    echo "✅ 服务已重启"
    ;;
  status)
    pm2 status
    ;;
  logs)
    pm2 logs holiday-system --lines "${2:-50}"
    ;;
  rebuild)
    echo "重新构建前端..."
    cd frontend && npm run build && cd ..
    rm -rf backend/static && cp -r frontend/dist backend/static
    pm2 restart holiday-system
    echo "✅ 已重新构建并重启"
    ;;
  *)
    echo "用法: bash deploy/manage.sh <command>"
    echo ""
    echo "命令:"
    echo "  start     启动服务"
    echo "  stop      停止服务"
    echo "  restart   重启服务"
    echo "  status    查看状态"
    echo "  logs      查看日志 (默认50行)"
    echo "  rebuild   重新构建前端并重启"
    ;;
esac
