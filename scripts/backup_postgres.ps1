# PowerShell script to backup PostgreSQL database for NEXA / CommerceOS (#23)
[CmdletBinding()]
param(
    [string]$BackupDir = "$PSScriptRoot\..\backups",
    [string]$DbName = $env:POSTGRES_DB,
    [string]$DbUser = $env:POSTGRES_USER,
    [string]$DbHost = $env:POSTGRES_HOST,
    [string]$DbPort = $env:POSTGRES_PORT,
    [int]$RetentionDays = 14
)

if (-not $DbName) { $DbName = "commerceos_apps" }
if (-not $DbUser) { $DbUser = "postgres" }
if (-not $DbHost) { $DbHost = "127.0.0.1" }
if (-not $DbPort) { $DbPort = "5432" }

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "${DbName}_${Timestamp}.dump"
$LogFile = Join-Path $BackupDir "backup.log"

$Msg = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Bắt đầu sao lưu database '$DbName' trên $DbHost:$DbPort..."
Write-Host $Msg -ForegroundColor Cyan
Add-Content -Path $LogFile -Value $Msg

$DumpCmd = Get-Command "pg_dump" -ErrorAction SilentlyContinue
if (-not $DumpCmd) {
    # Check standard PostgreSQL paths on Windows
    $CommonPaths = @(
        "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
    )
    foreach ($p in $CommonPaths) {
        if (Test-Path $p) { $DumpCmd = $p; break }
    }
}

if (-not $DumpCmd) {
    $ErrMsg = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] LỖI: Không tìm thấy pg_dump trên máy chủ. Vui lòng cài đặt PostgreSQL client tools."
    Write-Host $ErrMsg -ForegroundColor Red
    Add-Content -Path $LogFile -Value $ErrMsg
    exit 1
}

$Arguments = @(
    "--host=$DbHost",
    "--port=$DbPort",
    "--username=$DbUser",
    "--format=custom",
    "--blobs",
    "--verbose",
    "--file=$BackupFile",
    $DbName
)

$Process = Start-Process -FilePath $DumpCmd -ArgumentList $Arguments -NoNewWindow -Wait -PassThru

if ($Process.ExitCode -eq 0) {
    $FileSize = (Get-Item $BackupFile).Length / 1MB
    $SuccessMsg = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Sao lưu THÀNH CÔNG: $BackupFile ($([math]::Round($FileSize, 2)) MB)"
    Write-Host $SuccessMsg -ForegroundColor Green
    Add-Content -Path $LogFile -Value $SuccessMsg

    # Retention clean-up
    Get-ChildItem -Path $BackupDir -Filter "${DbName}_*.dump" | Where-Object {
        $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays)
    } | ForEach-Object {
        Remove-Item $_.FullName -Force
        Add-Content -Path $LogFile -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Xóa bản sao lưu cũ: $($_.Name)"
    }
} else {
    $ErrMsg = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] LỖI: pg_dump kết thúc với mã thoát $($Process.ExitCode)"
    Write-Host $ErrMsg -ForegroundColor Red
    Add-Content -Path $LogFile -Value $ErrMsg
    exit $Process.ExitCode
}
