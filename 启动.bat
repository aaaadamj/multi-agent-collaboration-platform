@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title 多Agent协作平台 - 一键部署

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║       多Agent分级调用与协作平台              ║
echo  ║       一键部署启动器 v1.0                    ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: ============================================================
:: 第一步：检查并自动安装 Node.js
:: ============================================================
echo  [1/5] 检查运行环境...
echo.

where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
    echo        Node.js 已安装，版本: !NODE_VER!
    echo.
    goto :node_ok
)

echo        未检测到 Node.js，正在自动安装...
echo        （将下载 Node.js v20 LTS 并静默安装，请稍候）
echo.

:: 使用 PowerShell 下载并静默安装 Node.js
set NODE_INSTALLER=%TEMP%\node-installer.msi
echo        正在下载 Node.js 安装包...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host '       下载中...'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '%NODE_INSTALLER%' -UseBasicParsing; Write-Host '       下载完成'; } catch { Write-Host '       下载失败: ' $_.Exception.Message; exit 1; }"

if not exist "%NODE_INSTALLER%" (
    echo.
    echo  [失败] Node.js 下载失败
    echo.
    echo  请手动安装 Node.js:
    echo    1. 访问 https://nodejs.org/
    echo    2. 下载 v20 LTS 版本
    echo    3. 安装完成后重新运行此脚本
    echo.
    pause
    exit /b 1
)

echo        正在安装 Node.js（静默安装，请稍候）...
msiexec /i "%NODE_INSTALLER%" /qn /norestart

:: 刷新环境变量（让当前CMD能找到新安装的node）
set PATH=%ProgramFiles%\nodejs;%PATH%

:: 验证安装
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [失败] Node.js 安装似乎未成功
    echo  请手动安装后重试: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo        Node.js 安装成功！版本: !NODE_VER!
del "%NODE_INSTALLER%" >nul 2>&1
echo.

:node_ok

:: ============================================================
:: 第二步：自动清理端口占用
:: ============================================================
echo  [2/5] 检测并清理端口占用...
echo.

set PORT_CLEANED=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001.*LISTENING"') do (
    echo        清理端口 3001（PID %%a）
    taskkill /PID %%a /F >nul 2>&1
    set PORT_CLEANED=1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173.*LISTENING"') do (
    echo        清理端口 5173（PID %%a）
    taskkill /PID %%a /F >nul 2>&1
    set PORT_CLEANED=1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5174.*LISTENING"') do (
    echo        清理端口 5174（PID %%a）
    taskkill /PID %%a /F >nul 2>&1
    set PORT_CLEANED=1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5175.*LISTENING"') do (
    echo        清理端口 5175（PID %%a）
    taskkill /PID %%a /F >nul 2>&1
    set PORT_CLEANED=1
)

if !PORT_CLEANED! equ 0 (
    echo        端口状态正常，无需清理
)
echo.

:: ============================================================
:: 第三步：安装项目依赖
:: ============================================================
echo  [3/5] 检查项目依赖...
echo.

if exist "node_modules\" (
    echo        依赖已安装，跳过
    echo.
) else (
    echo        首次运行，正在安装依赖（约需2-5分钟）...
    echo.
    call npm install --registry=https://registry.npmmirror.com
    if !errorlevel! neq 0 (
        echo.
        echo  [失败] 依赖安装失败
        echo.
        echo  可能的原因：
        echo    - 网络连接异常
        echo    - npm 源访问受限
        echo.
        echo  解决方法：
        echo    1. 检查网络连接后重新运行此脚本
        echo    2. 或手动执行: npm install
        echo.
        pause
        exit /b 1
    )
    echo.
    echo        依赖安装完成！
    echo.
)

:: ============================================================
:: 第四步：创建必要目录
:: ============================================================
echo  [4/5] 初始化数据目录...
echo.

if not exist "data\" mkdir data
if not exist "uploads\" mkdir uploads
if not exist "project-workspace\" mkdir project-workspace
echo        数据目录就绪
echo.

:: ============================================================
:: 第五步：启动服务
:: ============================================================
echo  [5/5] 启动平台服务...
echo.
echo  ──────────────────────────────────────────────────
echo.
echo        正在启动，请稍候...
echo.

:: 启动服务，并等待端口就绪后打开浏览器
start "" cmd /c "timeout /t 8 /nobreak >nul && start http://localhost:5173"

call npm run dev

:: 如果 npm run dev 退出了（非正常情况）
echo.
echo  服务已停止运行
pause
