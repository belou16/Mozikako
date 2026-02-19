@echo off
TITLE Mozikako — Player Musical
echo ===================================================
echo           LANCEMENT DE MOZIKAKO
echo ===================================================
echo.

REM Verifier si Node.js est installe
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe !
    echo Merci de l'installer sur https://nodejs.org/
    pause
    exit
)

REM Verifier si node_modules existe, sinon installer
if not exist node_modules (
    echo [INFO] Premiere execution : Installation des dependances...
    call npm install
)

echo [INFO] Demarrage du serveur de test...
echo [INFO] L'application s'ouvrira automatiquement dans un instant.
echo.

REM Ouvrir le navigateur en mode "app" (sans interface de navigateur) sur Edge ou Chrome
start msedge --app=http://localhost:5173 || start chrome --app=http://localhost:5173 || start http://localhost:5173

REM Lancer le serveur Vite
call npm run dev

pause
