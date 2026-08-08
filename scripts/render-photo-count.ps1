param(
  [string]$ReportPath = "MENU_ITEMS_WITHOUT_PHOTOS.md",
  [string]$OutputPath = "photo-count-diagnostic.png"
)

$ErrorActionPreference = "Stop"

$report = Resolve-Path -LiteralPath $ReportPath
$lines = [System.IO.File]::ReadAllLines($report.Path)
$keywordLines = @($lines | Where-Object { $_ -match '(?i)total|remaining|without photo|missing photo|no photo|unmatched' } | Select-Object -First 24)
$numbered = @($lines | Where-Object { $_ -match '^\s*\d+[.)]\s+' }).Count
$bullets = @($lines | Where-Object { $_ -match '^\s*[-*+]\s+' }).Count
$tableRows = @($lines | Where-Object { $_ -match '^\s*\|' -and $_ -notmatch '^\s*\|?\s*:?-{3,}' }).Count

Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap 1400, 1000
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::White)
$titleFont = New-Object System.Drawing.Font("Segoe UI", 28, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font("Consolas", 18)
$brush = [System.Drawing.Brushes]::Black

$graphics.DrawString("Menu photo report diagnostic", $titleFont, $brush, 30, 25)
$graphics.DrawString("Numbered rows: $numbered   Bullet rows: $bullets   Table-like rows: $tableRows", $bodyFont, $brush, 30, 85)
$y = 135
foreach ($line in $keywordLines) {
  $safe = if ($line.Length -gt 120) { $line.Substring(0, 120) } else { $line }
  $graphics.DrawString($safe, $bodyFont, $brush, 30, $y)
  $y += 34
}

$output = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
