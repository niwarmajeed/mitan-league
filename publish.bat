@echo off
chcp 65001 >nul
rem publish.bat: گوهورینێن نوو (ئەنجام، گول، ناڤ ...) دبەتە سەر لینکێ ماڵپەری. دوو کلیکان لێ بدە.
cd /d "%~dp0"
echo.
echo Publishing to https://niwarmajeed.github.io/mitan-league/
echo.
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -q -m "Update %date% %time%"
  if errorlevel 1 goto failed
) else (
  echo No new changes to commit.
)
git push
if errorlevel 1 goto failed
echo.
echo DONE. The link updates in 1-2 minutes.
echo.
pause
exit /b 0
:failed
echo.
echo FAILED. Check the internet connection and try again.
echo.
pause
exit /b 1
