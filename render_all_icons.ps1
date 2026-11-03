$artDir = "C:\Users\ADVAN\.gemini\antigravity-ide\brain\b25ef16a-54df-4577-9f58-72cc822c7c5d"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

$icons = @(
  @{ 
     Name = 'logo_a'; 
     Bg = '#ffffff'; 
     Border = '12px solid #e2e8f0'; 
     Svg = '<rect x="20" y="16" width="36" height="24" rx="7" fill="#2563EB"/><rect x="60" y="16" width="20" height="24" rx="7" fill="#0D9488"/><rect x="42" y="44" width="38" height="18" rx="7" fill="#0D9488"/><rect x="20" y="66" width="20" height="20" rx="7" fill="#2563EB"/><rect x="44" y="66" width="36" height="20" rx="7" fill="#10B981"/><circle cx="51" cy="53" r="3.5" fill="white"/>' 
  },
  @{ 
     Name = 'logo_b'; 
     Bg = '#0f172a'; 
     Border = 'none'; 
     Svg = '<path d="M72 30C72 21.5 64.5 15 56 15H40C28.5 15 20 23.5 20 35C20 46.5 28.5 53 40 53H60C71.5 53 80 59.5 80 71C80 82.5 71.5 89 60 89H40C31 89 24 82 24 73" stroke="url(#grad2)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><rect x="46" y="27" width="8" height="16" rx="2" fill="white" opacity="0.95"/><defs><linearGradient id="grad2" x1="20" y1="15" x2="80" y2="89" gradientUnits="userSpaceOnUse"><stop stop-color="#38BDF8"/><stop offset="0.5" stop-color="#2563EB"/><stop offset="1" stop-color="#10B981"/></linearGradient></defs>' 
  },
  @{ 
     Name = 'logo_c'; 
     Bg = '#ffffff'; 
     Border = '12px solid #e2e8f0'; 
     Svg = '<path d="M50 16L78 28V46C78 47.1 77.1 48 76 48H44C32.9543 48 24 39.0457 24 28C24 26.9 24.9 26 26 26H50V16Z" fill="#1E40AF"/><path d="M50 84L22 72V54C22 52.9 22.9 52 24 52H56C67.0457 52 76 60.9543 76 72C76 73.1 75.1 74 74 74H50V84Z" fill="#059669"/><rect x="44" y="38" width="12" height="24" rx="3" fill="#38BDF8"/>' 
  },
  @{ 
     Name = 'logo_d'; 
     Bg = '#ffffff'; 
     Border = '12px solid #e2e8f0'; 
     Svg = '<path d="M26 84V42C26 28.7452 36.7452 18 50 18C63.2548 18 74 28.7452 74 42V84" stroke="#0284C7" stroke-width="10" stroke-linecap="round"/><path d="M40 38C40 33.5817 44.4772 30 50 30C55.5228 30 60 33.5817 60 38C60 44 40 48 40 56C40 61.5228 44.4772 65 50 65C55.5228 65 60 61.5228 60 58" stroke="#10B981" stroke-width="7" stroke-linecap="round"/><path d="M18 84H82" stroke="#0F172A" stroke-width="6" stroke-linecap="round"/>' 
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
    <svg width="340" height="340" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      $($item.Svg)
    </svg>
  </div>
</body>
</html>
"@
    [System.IO.File]::WriteAllText($htmlPath, $htmlContent)
    & $edge --headless --disable-gpu --default-background-color=00000000 --window-size=512,512 --screenshot="$pngPath" "$htmlPath"
}

Write-Host "All individual icons generated in artifact directory!"
