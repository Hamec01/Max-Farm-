@echo off
chcp 65001 >nul
title Ферма Макса — запуск

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [Ошибка] Node.js не найден.
    echo Установите Node.js 18 или новее: https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [Ошибка] npm не найден. Переустановите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo Установка зависимостей...
    call npm install
    if errorlevel 1 (
        echo [Ошибка] Не удалось установить зависимости.
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   Ферма Макса — dev-сервер
echo   http://localhost:5173
echo ========================================
echo.
echo Закройте это окно, чтобы остановить игру.
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5173"

call npm run dev

pause
