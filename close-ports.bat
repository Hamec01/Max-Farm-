@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title Закрытие занятых портов — Max Farm

cd /d "%~dp0"

echo.
echo ========================================
echo   Принудительное закрытие TCP-портов
echo ========================================
echo.
echo Скрипт завершит процессы, которые слушают TCP-порты.
echo Это освободит порты (5173, 4173, 3000 и др.).
echo.
echo ВНИМАНИЕ: могут закрыться браузеры, Node.js, игры,
echo Docker, базы данных и другие программы.
echo Системные службы Windows (PID 0, 4) не трогаем.
echo.
echo Для максимального эффекта запускайте от имени администратора.
echo.

set "MODE=%~1"
if /i "%MODE%"=="/y" goto DO_KILL
if /i "%MODE%"=="-y" goto DO_KILL

set /p CONFIRM=Продолжить? (Y/N): 
if /i not "%CONFIRM%"=="Y" (
    echo Отменено.
    pause
    exit /b 0
)

:DO_KILL
echo.
echo Поиск процессов на портах...
echo.

set KILLED=0
set SKIPPED=0
set FAILED=0

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:"LISTENING" /C:"ПРОСЛУШИВАНИЕ"') do (
    set "PID=%%p"
    if not "!PID!"=="0" if not "!PID!"=="4" (
        echo !SEEN! | findstr /C:"|!PID!|" >nul
        if errorlevel 1 (
            set "SEEN=!SEEN!|!PID!|"
            tasklist /FI "PID eq !PID!" 2>nul | findstr /R "^[A-Za-z]" >nul
            if errorlevel 1 (
                set /a SKIPPED+=1
            ) else (
                for /f "tokens=1" %%n in ('tasklist /FI "PID eq !PID!" /NH 2^>nul') do set "PNAME=%%n"
                taskkill /F /PID !PID! >nul 2>&1
                if not errorlevel 1 (
                    echo [OK] PID !PID! — !PNAME!
                    set /a KILLED+=1
                ) else (
                    echo [??] PID !PID! — !PNAME! ^(нужны права администратора^)
                    set /a FAILED+=1
                )
            )
        )
    )
)

echo.
echo ----------------------------------------
echo Завершено процессов: !KILLED!
if !SKIPPED! gtr 0 echo Пропущено (нет процесса): !SKIPPED!
if !FAILED! gtr 0 echo Не удалось закрыть: !FAILED!
echo ----------------------------------------
echo.

netstat -ano | findstr /R /C:"LISTENING" /C:"ПРОСЛУШИВАНИЕ" | findstr ":5173 " >nul
if errorlevel 1 (
    echo Порт 5173 ^(игра^) — свободен.
) else (
    echo Порт 5173 ^(игра^) — всё ещё занят. Запустите .bat от администратора.
)

echo.
pause
endlocal
