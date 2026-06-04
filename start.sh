#!/bin/bash
# 多Agent协作平台 - Mac/Linux 启动脚本

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║     多Agent分级调用与协作平台            ║"
echo "  ║     Multi-Agent Collaboration Platform   ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "  [错误] 未检测到 Node.js，请先安装 Node.js v18+"
    echo "  下载地址: https://nodejs.org/"
    exit 1
fi

echo "  [检查] Node.js 版本: $(node --version)"
echo ""

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "  [安装] 首次运行，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "  [错误] 依赖安装失败"
        exit 1
    fi
    echo "  [完成] 依赖安装成功!"
    echo ""
fi

# 创建目录
mkdir -p data uploads project-workspace

echo "  [启动] 正在启动平台..."
echo "  ──────────────────────────────────────────"
echo "  前端地址: http://localhost:5173"
echo "  后端地址: http://localhost:3001"
echo "  ──────────────────────────────────────────"
echo ""
echo "  按 Ctrl+C 可停止服务"
echo ""

npm run dev
