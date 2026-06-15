Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"
git status --short
git diff -- backend/src/modules/stays/stays.service.ts frontend/src/pages/stays/CheckInWizard.tsx
Set-Location ".\backend"
npm run build
Set-Location "..\frontend"
npm run build
