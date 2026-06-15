# KOST48 V5.3 manual UAT guide commands
# Run commands one by one in PowerShell after backend is running on http://localhost:3000/api

$api = "http://localhost:3000/api"

Write-Host "[UAT 1] Public rooms list should work without token"
Invoke-RestMethod -Method Get -Uri "$api/public/rooms"

Write-Host "[UAT 2] Public rooms list with pagination/search should work without token"
Invoke-RestMethod -Method Get -Uri "$api/public/rooms?page=1&limit=10&search=G2"

Write-Host "[UAT 3] Public room detail should work for an AVAILABLE active room ID"
Write-Host "Replace 1 with a real AVAILABLE room ID if needed."
Invoke-RestMethod -Method Get -Uri "$api/public/rooms/1"

Write-Host "[UAT 4] Backoffice/admin room endpoints must still require normal auth and stay unchanged."
Write-Host 'Use admin token separately if you want to test /api/rooms.'
