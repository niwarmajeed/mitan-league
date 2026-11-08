@echo off
chcp 65001 >nul
rem ماڵپەرێ قارەمانیا تەپا پێ یا پەیمانگەها میتان ڤەدکەت ب سێرڤەرەکێ بچووک (server.py) کو چ فایلان د Cache دا ناهێلیت.
rem ڤی پەنجەرەیێ ڕەش مەگرە هەتا تو کارێ خۆ خلاس دکەی.
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
where python >nul 2>nul && (python server.py) || (py server.py)
pause
