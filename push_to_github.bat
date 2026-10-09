@echo off
chcp 65001 >nul
setlocal EnableExtensions
title Rampart Riot - GitHub Upload
cd /d "%~dp0"

rem ---------------------------------------------------------------------
rem  Uploads this folder to github.com/yongillion/rampart-riot and turns on
rem  GitHub Pages. Run it again after changing the game to update the site.
rem ---------------------------------------------------------------------
set "USER=Yongil"
set "EMAIL=yongillion@gmail.com"
set "OWNER=yongillion"
set "REPO=rampart-riot"
set "REMOTE=https://yongillion@github.com/yongillion/rampart-riot.git"
set "SITE=https://yongillion.github.io/rampart-riot/"

echo.
echo  ============================================================
echo    Rampart Riot  -^>  github.com/%OWNER%/%REPO%  +  GitHub Pages
echo  ============================================================
echo.

rem ---- 1. Git ----------------------------------------------------------
where git >nul 2>nul
if not errorlevel 1 goto :havegit
if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git >nul 2>nul
if not errorlevel 1 goto :havegit
where winget >nul 2>nul
if errorlevel 1 goto :nogit
echo [1/5] Git이 없어서 먼저 설치할게요. 설치 확인 창이 뜨면 '예'를 눌러 주세요.
winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git >nul 2>nul
if not errorlevel 1 goto :havegit
:nogit
echo.
echo  [!] Git을 찾을 수 없어요. 열리는 페이지에서 Git을 설치한 뒤 이 파일을 다시 실행해 주세요.
start "" "https://git-scm.com/download/win"
goto :end

:havegit
echo [1/5] 저장소 준비 중...
if exist ".git\HEAD" goto :repoready
git init -q
if errorlevel 1 goto :fail
git symbolic-ref HEAD refs/heads/main
:repoready
git config user.name "%USER%"
git config user.email "%EMAIL%"
git config core.autocrlf false
git config core.safecrlf false

rem ---- 2. Commit -------------------------------------------------------
echo [2/5] 파일 담는 중 (커밋)...
git add -A
if errorlevel 1 goto :fail
git diff --cached --quiet
if not errorlevel 1 goto :nocommit
set "MSG=%TEMP%\rampart-riot_commit_msg.txt"
git rev-parse --verify -q HEAD >nul 2>nul
if errorlevel 1 goto :msgfirst
if exist ".commit-message.txt" goto :msgfile
>"%MSG%" echo Update Dessert Dash
goto :commit
:msgfile
copy /y ".commit-message.txt" "%MSG%" >nul
goto :commit
:msgfirst
>"%MSG%" echo Rampart Riot: original single-player web auto-runner
:commit
git commit -q -F "%MSG%"
if errorlevel 1 goto :fail
del "%MSG%" >nul 2>nul
if exist ".commit-message.txt" del ".commit-message.txt" >nul 2>nul
goto :push
:nocommit
echo        새로 바뀐 파일은 없어요.

rem ---- 3. Push ---------------------------------------------------------
:push
echo [3/5] GitHub에 올리는 중...
echo        처음이면 GitHub 로그인 창이 떠요. 꼭 yongillion 계정으로 로그인해 주세요.
git remote remove origin >nul 2>nul
git remote add origin "%REMOTE%"
git push -u origin HEAD:main
if not errorlevel 1 goto :pushed
echo.
echo        GitHub 쪽에 다른 변경이 있어서 합친 뒤 다시 올려볼게요...
git pull --no-rebase --allow-unrelated-histories -X ours --no-edit origin main
git push -u origin HEAD:main
if not errorlevel 1 goto :pushed
echo.
echo  [!] 업로드에 실패했어요.
echo      - GitHub 로그인 창에서 yongillion 계정으로 로그인했는지 확인해 주세요.
echo        브라우저가 다른 GitHub 계정으로 로그인돼 있으면 그 계정 말고 yongillion 으로 로그인해야 해요.
echo      - 저장소 https://github.com/%OWNER%/%REPO% 가 있는지 확인해 주세요.
echo      창을 닫고 이 파일을 다시 실행하면 처음부터 다시 시도해요.
goto :end
:pushed
echo        올리기 완료: https://github.com/%OWNER%/%REPO%

rem ---- 4. GitHub Pages -------------------------------------------------
echo [4/5] GitHub Pages 켜는 중...
where curl >nul 2>nul
if errorlevel 1 goto :nocurl
call :sitecode
if "%CODE%"=="200" goto :alreadylive
set "PAGES_AUTO="
where gh >nul 2>nul
if errorlevel 1 goto :pagesmanual
gh api -X POST "repos/%OWNER%/%REPO%/pages" -f build_type=legacy -f "source[branch]=main" -f "source[path]=/" >nul 2>nul
if not errorlevel 1 set "PAGES_AUTO=1"
gh api "repos/%OWNER%/%REPO%/pages" >nul 2>nul
if not errorlevel 1 set "PAGES_AUTO=1"
if defined PAGES_AUTO goto :waitsite
:pagesmanual
echo.
echo        지금 열리는 GitHub 설정 페이지에서 아래처럼 고르고 Save 를 눌러 주세요.
echo          Source: Deploy from a branch     Branch: main     폴더: / (root)
echo        누르고 나면 이 창이 알아서 기다렸다가 게임을 열어 줘요.
start "" "https://github.com/%OWNER%/%REPO%/settings/pages"

rem ---- 5. Wait until the site is live ----------------------------------
:waitsite
echo [5/5] 사이트가 열릴 때까지 기다리는 중... (보통 1~3분)
set /a TRIES=0
:waitloop
call :sitecode
if "%CODE%"=="200" goto :live
set /a TRIES+=1
if %TRIES% GEQ 120 goto :notyet
ping -n 6 127.0.0.1 >nul
goto :waitloop

:alreadylive
echo        사이트가 이미 켜져 있어요. 새 버전은 1~2분 안에 반영돼요.
goto :opensite
:live
echo.
echo  완료! 게임 사이트가 열렸어요.
:opensite
start "" "%SITE%"
echo.
echo     플레이 주소: %SITE%
goto :end

:notyet
echo.
echo        아직 준비 중이에요. 몇 분 뒤에 이 주소를 열어 보세요: %SITE%
start "" "%SITE%"
goto :end

:nocurl
echo        GitHub 설정 페이지에서 Source: Deploy from a branch / Branch: main / 폴더: / (root) 로 Save 하면
echo        몇 분 뒤 %SITE% 에서 플레이할 수 있어요.
start "" "https://github.com/%OWNER%/%REPO%/settings/pages"
goto :end

:fail
echo.
echo  [!] 문제가 생겼어요. 위에 나온 메시지를 확인해 주세요.

:end
echo.
pause
endlocal
exit /b 0

rem ---- helper: HTTP status of the site -> CODE --------------------------
:sitecode
set "CODE=000"
for /f "delims=" %%c in ('curl -s -L -o nul -w "%%{http_code}" "%SITE%?check=%RANDOM%"') do set "CODE=%%c"
goto :eof
