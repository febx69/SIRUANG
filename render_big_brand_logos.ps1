$artDir = "C:\Users\ADVAN\.gemini\antigravity-ide\brain\b25ef16a-54df-4577-9f58-72cc822c7c5d"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

$icons = @(
  @{ 
     Name = 'brand_logo_1'; 
     Bg = '#ffffff'; 
     Border = '12px solid #e2e8f0'; 
     Svg = '<path d="M74 24C74 15.1634 66.8366 8 58 8H40C28.9543 8 20 16.9543 20 28C20 39.0457 28.9543 48 40 48H60" stroke="#2563EB" stroke-width="14" stroke-linecap="round"/><path d="M40 52H60C71.0457 52 80 60.9543 80 72C80 83.0457 71.0457 92 60 92H42C33.1634 92 26 84.8366 26 76" stroke="#059669" stroke-width="14" stroke-linecap="round"/><circle cx="50" cy="50" r="7" fill="#06B6D4"/>' 
  },
  @{ 
     Name = 'brand_logo_2'; 
     Bg = '#ffffff'; 
     Border = '12px solid #e2e8f0'; 
     Svg = '<path d="M72 26C72 16.0589 63.9411 8 54 8H40C27.8497 8 18 17.8497 18 30C18 42.1503 27.8497 50 40 50H60C72.1503 50 82 57.8497 82 70C82 82.1503 72.1503 92 60 92H46C36.0589 92 28 83.9411 28 74" stroke="url(#blueGreenGrad)" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><rect x="44" y="44" width="12" height="12" rx="3" fill="#FFFFFF"/><rect x="47" y="47" width="6" height="6" rx="1.5" fill="#2563EB"/><defs><linearGradient id="blueGreenGrad" x1="18" y1="8" x2="82" y2="92" gradientUnits="userSpaceOnUse"><stop stop-color="#1D4ED8"/><stop offset="0.45" stop-color="#0284C7"/><stop offset="0.75" stop-color="#0D9488"/><stop offset="1" stop-color="#10B981"/></linearGradient></defs>' 
  },
  @{ 
     Name = 'brand_logo_3'; 
     Bg = '#080e1a'; 
     Border = 'none'; 
     Svg = '<path d="M74 28C74 16.9543 65.0457 8 54 8H36C25.5066 8 17 16.5066 17 27C17 37.4934 25.5066 46 36 46H58" stroke="url(#topGlow)" stroke-width="14" stroke-linecap="round"/><path d="M42 54H64C74.4934 54 83 62.5066 83 73C83 83.4934 74.4934 92 64 92H46C34.9543 92 26 83.0457 26 72" stroke="url(#botGlow)" stroke-width="14" stroke-linecap="round"/><circle cx="50" cy="50" r="5" fill="#38BDF8"/><defs><linearGradient id="topGlow" x1="17" y1="8" x2="74" y2="46" gradientUnits="userSpaceOnUse"><stop stop-color="#38BDF8"/><stop offset="1" stop-color="#2563EB"/></linearGradient><linearGradient id="botGlow" x1="26" y1="92" x2="83" y2="54" gradientUnits="userSpaceOnUse"><stop stop-color="#10B981"/><stop offset="1" stop-color="#06B6D4"/></linearGradient></defs>' 
  }
)

foreach ($item in $icons) {
    $htmlPath = Join-Path $artDir "$($item.Name).html"
    $pngPath = Join-Path $artDir "$($item.Name).png"
    $htmlContent = @"
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;width:512px;height:512px;">
  <div style="width:512px;height:512px;border-radius:115px;background:$($item.Bg);border:$($item.Border);display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
    <svg width="360" height="360" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      $($item.Svg)
    </svg>
  </div>
</body>
</html>
"@
    [System.IO.File]::WriteAllText($htmlPath, $htmlContent)
    & $edge --headless --disable-gpu --default-background-color=00000000 --window-size=512,512 --screenshot="$pngPath" "$htmlPath"
}
Write-Host "Rendered big brand 512x512 PNGs!"
