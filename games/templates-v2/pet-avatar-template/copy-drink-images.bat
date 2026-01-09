@echo off
chcp 65001 >nul
echo Copying drink animation images...
echo.

if not exist "assets\avatar\drink" mkdir "assets\avatar\drink"

set "SOURCE=C:\Users\Admin\Downloads\asap uống bia"
set "DEST=assets\avatar\drink"

copy "%SOURCE%\drunk1.png" "%DEST%\drunk1.png" >nul 2>&1 && echo [OK] drunk1.png || echo [FAIL] drunk1.png
copy "%SOURCE%\drunk2.png" "%DEST%\drunk2.png" >nul 2>&1 && echo [OK] drunk2.png || echo [FAIL] drunk2.png
copy "%SOURCE%\drunk3.png" "%DEST%\drunk3.png" >nul 2>&1 && echo [OK] drunk3.png || echo [FAIL] drunk3.png
copy "%SOURCE%\drunk4.png" "%DEST%\drunk4.png" >nul 2>&1 && echo [OK] drunk4.png || echo [FAIL] drunk4.png
copy "%SOURCE%\drunk5.png" "%DEST%\drunk5.png" >nul 2>&1 && echo [OK] drunk5.png || echo [FAIL] drunk5.png
copy "%SOURCE%\drunk6.png" "%DEST%\drunk6.png" >nul 2>&1 && echo [OK] drunk6.png || echo [FAIL] drunk6.png
copy "%SOURCE%\drunk7.png" "%DEST%\drunk7.png" >nul 2>&1 && echo [OK] drunk7.png || echo [FAIL] drunk7.png
copy "%SOURCE%\drunk8.png" "%DEST%\drunk8.png" >nul 2>&1 && echo [OK] drunk8.png || echo [FAIL] drunk8.png
copy "%SOURCE%\drunk9.png" "%DEST%\drunk9.png" >nul 2>&1 && echo [OK] drunk9.png || echo [FAIL] drunk9.png
copy "%SOURCE%\drunk10.png" "%DEST%\drunk10.png" >nul 2>&1 && echo [OK] drunk10.png || echo [FAIL] drunk10.png

echo.
echo Done! Check the output above.
pause
