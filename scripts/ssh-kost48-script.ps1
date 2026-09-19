# Menjalankan skrip bash di server KOST48 tanpa masalah quoting.
# Pemakaian:  .\scripts\ssh-kost48-script.ps1 -Path .\scripts\remote\recon.sh
#             .\scripts\ssh-kost48-script.ps1 -Command "ls -la ~"

param(
  [string]$Path,
  [Parameter(Mandatory = $false)][string]$Command,
  [int]$TimeoutSeconds = 600
)

$key = Join-Path $env:TEMP 'kost48ssh\id_kost48_deploy'
$known = Join-Path $env:TEMP 'kost48ssh\known_hosts'
$target = 'kost48s1@api.kost48surabaya.com'
$port = '4422'

if (-not (Test-Path $key)) { Write-Error "Private key tidak ditemukan: $key"; exit 1 }

$scriptText = if ($Path) {
  if (-not (Test-Path $Path)) { Write-Error "Skrip tidak ditemukan: $Path"; exit 1 }
  Get-Content -Raw -Path $Path
} else {
  $Command
}

if (-not $scriptText) { Write-Error "Isi skrip kosong (pakai -Path atau -Command)."; exit 1 }

$bytes = [System.Text.Encoding]::UTF8.GetBytes($scriptText)
$encoded = [System.Convert]::ToBase64String($bytes)
$remote = "echo $encoded | base64 -d | bash"

& ssh -i $key -p $port -o BatchMode=yes -o StrictHostKeyChecking=no `
  -o "UserKnownHostsFile=$known" -o ConnectTimeout=20 -o ServerAliveInterval=30 `
  $target $remote

exit $LASTEXITCODE
