#!/bin/bash

# 🚀 Figma插件开发环境快速启动脚本

echo "🚀 启动 Figma 插件开发环境..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

# 安装依赖（如果 node_modules 不存在）
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install
fi

# 启动监听模式
echo "🔄 启动 TypeScript 监听模式..."
echo "💡 现在可以在 Figma 中加载插件进行测试"
echo "📝 修改代码后会自动重新编译"
echo ""
echo "按 Ctrl+C 停止开发服务"
echo ""

npm run watch 