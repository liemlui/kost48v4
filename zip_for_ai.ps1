# zip_for_ai.ps1
# Letakkan di folder final_bundle, jalankan dari sana.
# Output zip juga ke final_bundle.

$root      = $PSScriptRoot  # ← folder tempat script ini diletakkan = final_bundle

$backendOut  = Join-Path $root "backend_$timestamp.zip"   # → final_bundle\backend_....zip
$frontendOut = Join-Path $root "frontend_$timestamp.zip"  # → final_bundle\frontend_....zip

$timestamp = Get-Date -Format "yyyyMMdd_HHmm"

# Folder yang di-skip (exact folder name match di mana saja dalam tree)
$excludeFolders = @(
    'node_modules',
    'dist',
    'generated',   # src/generated/prisma
    '.vite',
    '.turbo',
    'coverage'
)

# File yang di-skip
$excludeFiles = @(
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml'
)

function Zip-Folder {
    param(
        [string]$sourceDir,
        [string]$outputZip
    )

    if (Test-Path $outputZip) { Remove-Item $outputZip -Force }

    $files = Get-ChildItem -Path $sourceDir -Recurse -File | Where-Object {
        $fullPath = $_.FullName

        # Cek apakah path mengandung folder yang di-exclude
        $skip = $false
        foreach ($folder in $excludeFolders) {
            # Match sebagai segment path, bukan substring sembarang
            if ($fullPath -match "(?i)\\$([regex]::Escape($folder))\\") {
                $skip = $true
                break
            }
        }

        # Cek nama file yang di-exclude
        if ($excludeFiles -contains $_.Name) {
            $skip = $true
        }

        -not $skip
    }

    if ($files.Count -eq 0) {
        Write-Host "  Tidak ada file ditemukan di $sourceDir" -ForegroundColor Red
        return
    }

    # Tambahkan file satu per satu ke zip dengan struktur relatif terjaga
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::Open($outputZip, 'Create')

    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($sourceDir.Length + 1)
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip,
            $file.FullName,
            $relativePath,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }

    $zip.Dispose()
}

# ─── BACKEND ─────────────────────────────────────────────────────────────────
$backendSrc = Join-Path $root "backend"
$backendOut = Join-Path $root "backend_$timestamp.zip"

Write-Host ""
Write-Host "=== BACKEND ===" -ForegroundColor Cyan
Write-Host "Source : $backendSrc"
Write-Host "Output : $backendOut"

Zip-Folder -sourceDir $backendSrc -outputZip $backendOut

$sizeMB = [math]::Round((Get-Item $backendOut).Length / 1MB, 2)
Write-Host "Selesai: $sizeMB MB" -ForegroundColor Green

# ─── FRONTEND ────────────────────────────────────────────────────────────────
$frontendSrc = Join-Path $root "frontend"
$frontendOut = Join-Path $root "frontend_$timestamp.zip"

Write-Host ""
Write-Host "=== FRONTEND ===" -ForegroundColor Cyan
Write-Host "Source : $frontendSrc"
Write-Host "Output : $frontendOut"

Zip-Folder -sourceDir $frontendSrc -outputZip $frontendOut

$sizeMB = [math]::Round((Get-Item $frontendOut).Length / 1MB, 2)
Write-Host "Selesai: $sizeMB MB" -ForegroundColor Green

Write-Host ""
Write-Host "Zip ada di folder final_bundle." -ForegroundColor Yellow
