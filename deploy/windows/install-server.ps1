#Requires -RunAsAdministrator
<#
  One-time production setup for this Windows server. Run in an ADMIN PowerShell:

    powershell -ExecutionPolicy Bypass -File "C:\Prj\My planner\deploy\windows\install-server.ps1"

  Prerequisites: `npm run deploy` has populated C:\planner-prod, and the DNS A record
  of the domain points at this server.

  Steps:
    1. Firewall: allow inbound TCP 80/443, only for pocketbase.exe
    2. Dashboard (superuser) account — asks for email + password
    3. Startup task: runs the server as SYSTEM on boot, restarts it if it stops
    4. Health check over HTTPS

  Safe to re-run.
#>
param(
  [string]$Domain = 'planner.maheri.space',
  [string]$Dir = 'C:\planner-prod'
)
$ErrorActionPreference = 'Stop'

$exe = Join-Path $Dir 'pocketbase.exe'
$data = Join-Path $Dir 'pb_data'
$migrations = Join-Path $Dir 'pb_migrations'
$public = Join-Path $Dir 'pb_public'
$taskName = 'PlannerServer'

if (-not (Test-Path $exe)) { throw "$exe not found. Run 'npm run deploy' first." }

# Stop a previous install so files and ports are free.
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
}
Get-Process pocketbase -ErrorAction SilentlyContinue | Where-Object Path -eq $exe | Stop-Process -Force

# --- 1. Firewall --------------------------------------------------------------
$ruleName = 'Planner (PocketBase) TCP 80,443'
Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort 80, 443 -Program $exe -Action Allow | Out-Null
Write-Host '[1/4] Firewall: inbound 80/443 allowed for pocketbase.exe' -ForegroundColor Cyan

# --- 2. Dashboard account -----------------------------------------------------
[Environment]::SetEnvironmentVariable('PLANNER_APP_URL', "https://$Domain", 'Machine')
$env:PLANNER_APP_URL = "https://$Domain"

$answer = Read-Host '[2/4] Create or reset the dashboard (superuser) account? [Y/n]'
if ($answer -notmatch '^[nN]') {
  $email = Read-Host '      Email'
  do {
    $secure = Read-Host '      Password (min 10 characters)' -AsSecureString
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
  } while ($plain.Length -lt 10)
  & $exe superuser upsert $email $plain --dir $data --migrationsDir $migrations
  $plain = $null
  if ($LASTEXITCODE -ne 0) { throw 'Creating the superuser failed.' }
}

# --- 3. Startup task ----------------------------------------------------------
$arguments = "serve $Domain --dir `"$data`" --publicDir `"$public`" --migrationsDir `"$migrations`""
$action = New-ScheduledTaskAction -Execute $exe -Argument $arguments -WorkingDirectory $Dir
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Write-Host "[3/4] Startup task '$taskName' registered and started" -ForegroundColor Cyan

# --- 4. Health check ----------------------------------------------------------
Write-Host '[4/4] Waiting for HTTPS (first request issues the certificate)...' -ForegroundColor Cyan
$ok = $false
foreach ($i in 1..12) {
  Start-Sleep -Seconds 5
  try {
    $health = Invoke-RestMethod "https://$Domain/api/health" -TimeoutSec 15
    $ok = $true
    break
  } catch { }
}
if ($ok) {
  Write-Host "`nDone: https://$Domain is live ($($health.message))" -ForegroundColor Green
  Write-Host "Dashboard: https://$Domain/_/"
} else {
  Write-Warning "https://$Domain did not answer within a minute."
  Write-Warning 'The server is running; if DNS changed recently, give it a few minutes and open the site in a browser.'
}
