#!/bin/bash
# ============================================
# 假期管理系统 - 一键公司改名
# ============================================
# 用法:
#   ./rename.sh "新公司名"
#   例如: ./rename.sh "ABC Company"
#
# 改完后 git commit + git push 即可部署
#============================================

set -e

if [ $# -lt 1 ]; then
    echo "用法: ./rename.sh \"新公司名\""
    echo "示例: ./rename.sh \"ABC Company\""
    exit 1
fi

NEW_NAME="$1"
OLD_NAME="Fugistics Hub"

echo "将公司名从 \"$OLD_NAME\" 改为 \"$NEW_NAME\"..."
echo ""

FILES=(
    "frontend/src/config.ts"
    "frontend/index.html"
    "frontend/src/components/Layout.tsx"
    "frontend/src/pages/Login.tsx"
    "frontend/src/pages/Reports.tsx"
    "frontend/src/pages/CalculationGuide.tsx"
    "backend/main.py"
    "backend/utils/email.py"
    "backend/utils/excel.py"
    "backend/scheduler.py"
    "backend/routers/reports.py"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        count=$(grep -c "$OLD_NAME" "$file" 2>/dev/null || true)
        if [ "$count" -gt 0 ]; then
            if sed -i "" "s/$OLD_NAME/$NEW_NAME/g" "$file" 2>/dev/null; then
                echo "  ✅ $file（$count 处）"
            else
                echo "  ❌ $file"
            fi
        fi
    else
        echo "  ⚠️  跳过（不存在）: $file"
    fi
done

echo ""
echo "🎉 完成！公司名已改为 \"$NEW_NAME\""
echo ""
echo "📌 更换 Logo：替换 frontend/public/fugistics-logo.svg 或前端用其他格式"
echo "📌 邮箱 Logo：上传图片后，在 Railway 添加 LOGO_URL 环境变量"
echo ""
echo "▶ 部署："
echo "   git add ."
echo "   git commit -m \"rename company to $NEW_NAME\""
echo "   git push"
echo ""
echo "💡 提示：后端邮件/报表也已支持通过 COMPANY_NAME 环境变量动态修改"
