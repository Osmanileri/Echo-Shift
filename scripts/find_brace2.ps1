$content = Get-Content "c:\Projects\shadowSync\components\GameEngine.tsx"
$depth = 0
for ($i = 1879; $i -lt 5584; $i++) {
    $line = $content[$i]
    $opens = ([regex]::Matches($line, '\{')).Count
    $closes = ([regex]::Matches($line, '\}')).Count
    $depth += $opens - $closes
}
Write-Host "Depth at line 5585: $depth"

# Trace depth from 5585 to 7966, showing transitions near depth 3
for ($i = 5584; $i -lt 7966; $i++) {
    $line = $content[$i]
    $opens = ([regex]::Matches($line, '\{')).Count
    $closes = ([regex]::Matches($line, '\}')).Count
    $prevDepth = $depth
    $depth += $opens - $closes
    $lineNum = $i + 1
    if ($depth -ne $prevDepth -and ($depth -le 4 -or $prevDepth -le 4)) {
        $trimmed = $line.TrimStart()
        if ($trimmed.Length -gt 90) { $trimmed = $trimmed.Substring(0, 90) + "..." }
        Write-Host "Line ${lineNum}: ${prevDepth}->${depth} | $trimmed"
    }
}
Write-Host "Final depth at line 7966: $depth"
