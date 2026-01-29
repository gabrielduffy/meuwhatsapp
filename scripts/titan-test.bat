@echo off
echo 🦁 TITAN v8 - Suite de Testes
echo ==============================
echo.
echo Escolha uma opçao:
echo 1) Teste Anti-Detecçao (CreepJS + Sannysoft)
echo 2) Teste Scraping Real (50 leads Sao Paulo)
echo 3) Teste Multiplas Cidades
echo 4) Executar todos os testes
echo.
set /p opcao="Opçao: "

if "%opcao%"=="1" (
  echo Executando teste anti-detecçao...
  node src/tests/test-antidetect.js
)
if "%opcao%"=="2" (
  echo Executando teste de scraping real...
  node src/tests/test-scraping-real.js "Restaurante" "Sao Paulo" 50
)
if "%opcao%"=="3" (
  echo Executando teste de multiplas cidades...
  node src/tests/test-multiplas-cidades.js
)
if "%opcao%"=="4" (
  echo Executando todos os testes...
  node src/tests/test-antidetect.js
  node src/tests/test-scraping-real.js "Restaurante" "Sao Paulo" 30
)

pause
