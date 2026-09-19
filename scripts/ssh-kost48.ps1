# Helper koneksi SSH ke server KOST48 (dipakai sesi deploy).
# Pemakaian:  .\scripts\ssh-kost48.ps1 "perintah remote"

$key = Join-Path $env:TEMP 'kost48ssh\id_kost48_deploy'
$known = Join-Path $env:TEMP 'kost48ssh\known_hosts'
$target = 'kost48s1@api.kost48surabaya.com'
$port = '4422'

if (-not (Test-Path $key)) {
  Write-Error "Private key tidak ditemukan di $key"
  exit 1
}

$arguments = @(
  '-i', $key,
  '-p', $port,
  '-o', 'BatchMode=yes',
  '-o', 'StrictHostKeyChecking=no',
  '-o', "UserKnownHostsFile=$known",
  '-o', 'ConnectTimeout=20',
  '-o', 'ServerAliveInterval=30',
  $target,
  $args[0]
)

& ssh @arguments
exit $LASTEXITCODE
