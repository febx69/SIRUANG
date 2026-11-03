Add-Type -AssemblyName System.Drawing

$srcPath = "d:\SIRUANG\src\assets\logo-pamekasan.png"
$resBase = "d:\SIRUANG\android\app\src\main\res"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source logo not found: $srcPath"
    exit 1
}

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

# Standard Android Mipmap Sizes
# Key: folder, fullSize (for ic_launcher & ic_launcher_round), fgCanvasSize, fgLogoSize
$configs = @(
    @{ Folder = "mipmap-mdpi";    Full = 48;  FgCanvas = 108; FgLogo = 72 },
    @{ Folder = "mipmap-hdpi";    Full = 72;  FgCanvas = 162; FgLogo = 108 },
    @{ Folder = "mipmap-xhdpi";   Full = 96;  FgCanvas = 216; FgLogo = 144 },
    @{ Folder = "mipmap-xxhdpi";  Full = 144; FgCanvas = 324; FgLogo = 216 },
    @{ Folder = "mipmap-xxxhdpi"; Full = 192; FgCanvas = 432; FgLogo = 288 }
)

function Draw-HighQuality([System.Drawing.Graphics]$g) {
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
}

foreach ($c in $configs) {
    $folderPath = Join-Path $resBase $c.Folder
    if (-not (Test-Path $folderPath)) {
        New-Item -ItemType Directory -Force -Path $folderPath | Out-Null
    }

    # 1. ic_launcher.png (With white rounded background so it looks crisp and professional)
    $bmpFull = New-Object System.Drawing.Bitmap($c.Full, $c.Full, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gFull = [System.Drawing.Graphics]::FromImage($bmpFull)
    Draw-HighQuality $gFull
    $gFull.Clear([System.Drawing.Color]::Transparent)

    # Draw white circular/rounded background
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $gFull.FillEllipse($brush, 1, 1, ($c.Full - 2), ($c.Full - 2))
    $brush.Dispose()

    # Draw logo scaled inside (with a comfortable padding)
    $padding = [int]($c.Full * 0.12)
    $drawSize = $c.Full - (2 * $padding)
    $gFull.DrawImage($srcImg, $padding, $padding, $drawSize, $drawSize)
    $gFull.Dispose()

    $fullOut = Join-Path $folderPath "ic_launcher.png"
    $roundOut = Join-Path $folderPath "ic_launcher_round.png"
    $bmpFull.Save($fullOut, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFull.Save($roundOut, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFull.Dispose()

    # 2. ic_launcher_foreground.png (Adaptive icon foreground with transparent padding)
    $bmpFg = New-Object System.Drawing.Bitmap($c.FgCanvas, $c.FgCanvas, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gFg = [System.Drawing.Graphics]::FromImage($bmpFg)
    Draw-HighQuality $gFg
    $gFg.Clear([System.Drawing.Color]::Transparent)

    $offset = [int](($c.FgCanvas - $c.FgLogo) / 2)
    $gFg.DrawImage($srcImg, $offset, $offset, $c.FgLogo, $c.FgLogo)
    $gFg.Dispose()

    $fgOut = Join-Path $folderPath "ic_launcher_foreground.png"
    $bmpFg.Save($fgOut, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFg.Dispose()

    Write-Host "Generated icons for $($c.Folder)"
}

$srcImg.Dispose()
Write-Host "All icons generated successfully!"
