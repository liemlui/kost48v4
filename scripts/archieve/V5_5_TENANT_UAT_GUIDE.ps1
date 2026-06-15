Write-Host "=== KOST48 V5.5 Tenant Boundary UAT Guide ===" -ForegroundColor Cyan
Write-Host "Run this from project root after backend is running at http://localhost:3000/api" -ForegroundColor Yellow
Write-Host "This script prints safe PowerShell commands. Copy/run the relevant parts manually." -ForegroundColor Yellow
Write-Host ""

@'
# 1) Login as TENANT
$tenantLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"tenant.g2@kost48.com","password":"tenant123"}'
$tenantToken = $tenantLogin.accessToken

# 2) Tenant can read own current stay only
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/stays/me/current" -Headers @{Authorization="Bearer $tenantToken"}

# 3) Tenant can read own invoices only
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/invoices/my" -Headers @{Authorization="Bearer $tenantToken"}

# 4) Tenant can read own payment submissions only
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/payment-submissions/my" -Headers @{Authorization="Bearer $tenantToken"}

# 5) Tenant must NOT access payment review queue
try { Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/payment-submissions/review-queue" -Headers @{Authorization="Bearer $tenantToken"} } catch { $_.Exception.Response.StatusCode.value__; $_.ErrorDetails.Message }

# 6) Tenant must NOT approve payment
try { Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/payment-submissions/1/approve" -Headers @{Authorization="Bearer $tenantToken"} -ContentType "application/json" -Body '{"reviewNotes":"should fail"}' } catch { $_.Exception.Response.StatusCode.value__; $_.ErrorDetails.Message }

# 7) Tenant active announcements: occupied tenants may see TENANT + ALL; non-occupied tenants should not receive TENANT operational announcements
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/announcements/active" -Headers @{Authorization="Bearer $tenantToken"}

# 8) Tenant cannot call admin renew approval
try { Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/admin/renew-requests/1/approve" -Headers @{Authorization="Bearer $tenantToken"} -ContentType "application/json" -Body '{"reviewNotes":"should fail"}' } catch { $_.Exception.Response.StatusCode.value__; $_.ErrorDetails.Message }

# 9) Tenant cannot call admin checkout approval
try { Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/api/admin/checkout-requests/1/approve" -Headers @{Authorization="Bearer $tenantToken"} -ContentType "application/json" -Body '{"reviewNotes":"should fail"}' } catch { $_.Exception.Response.StatusCode.value__; $_.ErrorDetails.Message }
'@ | Write-Host
