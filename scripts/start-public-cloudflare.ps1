param([int]$Port = 5173)
$ErrorActionPreference = 'Stop'
Write-Host "Iniciando Cavern Project em http://localhost:$Port"
Start-Process powershell -ArgumentList "-NoProfile -Command Set-Location '$PSScriptRoot\..\web'; npm run dev -- --host 0.0.0.0 --port $Port" -WindowStyle Hidden
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Error 'cloudflared não está instalado. Instale pelo guia oficial da Cloudflare e execute novamente.'
}
Write-Host 'Abrindo túnel público temporário (o endereço muda ao reiniciar)...'
cloudflared tunnel --url "http://localhost:$Port"
