# Script para commitar alterações localmente (PowerShell)
# Uso: execute na raiz do repositório: .\commit_changes.ps1

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git não encontrado. Instale Git e execute novamente."
    exit 1
}

git add .
if ($LASTEXITCODE -ne 0) { Write-Error "git add falhou"; exit 1 }

$msg = Get-Content -Raw COMMIT_MESSAGE.txt
if (-not $msg) { Write-Error "COMMIT_MESSAGE.txt vazio ou ausente"; exit 1 }

git commit -F COMMIT_MESSAGE.txt
if ($LASTEXITCODE -ne 0) { Write-Error "git commit falhou"; exit 1 }

Write-Host "Commit criado com sucesso." -ForegroundColor Green
