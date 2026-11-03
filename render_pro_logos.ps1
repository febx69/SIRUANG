$artDir = "C:\Users\ADVAN\.gemini\antigravity-ide\brain\b25ef16a-54df-4577-9f58-72cc822c7c5d"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

$icons = @(
  @{ 
     Name = 'pro_logo_1'; 
     Bg = '#ffffff'; 
     Border = '12px solid #e2e8f0'; 
     Svg = '<polygon points="46,12 82,24 54,34 18,22" fill="#1D4ED8"/><polygon points="18,22 54,34 54,49 18,37" fill="#2563EB"/><polygon points="54,34 82,24 82,49 54,59" fill="#0D9488"/><polygon points="46,65 82,53 54,43 18,55" fill="#10B981"/><polygon points="18,55 54,43 54,74 18,86" fill="#0F766E"/><polygon points="54,74 82,62 82,77 54,88" fill="#047857"/><line x1="54" y1="34" x2="54" y2="88" stroke="white" stroke-width="1.8" opacity="0.7"/>' 
  },
  @{ 
     Name = 'pro_logo_2'; 
     Bg = '#0b1329'; 
     Border = 'none'; 
     Svg = '<path d="M68 28C68 18.0589 59.9411 10 50 10C40.0589 10 32 18.0589 32 28V44C32 49.5228 36.4772 54 42 54H58C63.5228 54 68 58.4772 68 64V72C68 81.9411 59.9411 90 50 90C40.0589 90 32 81.9411 32 72" stroke="#38BDF8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M50 22V40" stroke="#10B981" stroke-width="7.5" stroke-linecap="round"/><path d="M50 60V78" stroke="#10B981" stroke-width="7.5" stroke-linecap="round"/><circle cx="50" cy="50" r="3.5" fill="#FFFFFF"/>' 
  },
  @{ 
     Name = 'pro_logo_3'; 
     Bg = '#ffffff'; 
     Border = '12px solid #e2e8f0'; 
     Svg = '<path d="M26 44H62C72 44 80 36 80 26C80 16 72 10 62 10H32C22 10 14 18 14 28V36" stroke="#1D4ED8" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="M74 56H38C28 56 20 64 20 74C20 84 28 90 38 90H68C78 90 86 82 86 72V64" stroke="#047857" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><rect x="44" y="44" width="12" height="12" rx="3" transform="rotate(45, 50, 50)" fill="#0284C7"/>' 
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
    <svg width="370" height="370" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      $($item.Svg)
    </svg>
  </div>
</body>
</html>
"@
    [System.IO.File]::WriteAllText($htmlPath, $htmlContent)
    & $edge --headless --disable-gpu --default-background-color=00000000 --window-size=512,512 --screenshot="$pngPath" "$htmlPath"
}
Write-Host "Rendered executive logos!"
