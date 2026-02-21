$content = Get-Content "c:\Projects\shadowSync\components\GameEngine.tsx"
$depth = 0

# Count from useEffect start (line 1880) to just before }, [gameState]) (line 7966)
for ($i = 1879; $i -lt 7966; $i++) {
    $line = $content[$i]
    $opens = ([regex]::Matches($line, '\{')).Count
    $closes = ([regex]::Matches($line, '\}')).Count
    $depth += $opens - $closes
}
Write-Host "Depth before line 7967: $depth (expected: 1)"

# Now find WHERE the extra { is by halving
# At what line does depth first exceed the expected "return to 1" path?

# Check loop function start
$depth = 0
$loopLine = 0
for ($i = 1879; $i -lt 7966; $i++) {
    $line = $content[$i]
    if ($line -match '^\s+const loop = \(frameTime') {
        $loopLine = $i + 1
        Write-Host "Loop function starts at line $loopLine, depth=$depth"
    }
    $opens = ([regex]::Matches($line, '\{')).Count
    $closes = ([regex]::Matches($line, '\}')).Count
    $depth += $opens - $closes
}

# Detailed depth trace at every 50 lines
Write-Host "`nDetailed depth at every 50 lines:"
$depth = 0
for ($i = 1879; $i -lt 7966; $i++) {
    $line = $content[$i]
    $opens = ([regex]::Matches($line, '\{')).Count
    $closes = ([regex]::Matches($line, '\}')).Count
    $depth += $opens - $closes
    $lineNum = $i + 1
    if ($lineNum % 50 -eq 0 -and $lineNum -ge 4400 -and $lineNum -le 5600) {
        Write-Host "Line ${lineNum}: depth=$depth"
    }
}

# Now look for the specific mismatch. 
# Find lines where we enter a block and never come back to the same depth
Write-Host "`nSearching for unclosed blocks between 4400-5600..."
$depth = 0
for ($i = 1879; $i -lt 4399; $i++) {
    $line = $content[$i]
    $opens = ([regex]::Matches($line, '\{')).Count
    $closes = ([regex]::Matches($line, '\}')).Count
    $depth += $opens - $closes
}
$baseDepth = $depth
Write-Host "Depth at line 4400: $baseDepth"

for ($i = 4399; $i -lt 5600; $i++) {
    $line = $content[$i]
    $opens = ([regex]::Matches($line, '\{')).Count
    $closes = ([regex]::Matches($line, '\}')).Count
    $prevDepth = $depth
    $depth += $opens - $closes
    $lineNum = $i + 1
    # Show every time depth changes and is near the base depth
    if ($depth -ne $prevDepth -and ($depth -le ($baseDepth + 1) -or $prevDepth -le ($baseDepth + 1))) {
        $trimmed = $line.TrimStart()
        if ($trimmed.Length -gt 80) { $trimmed = $trimmed.Substring(0, 80) + "..." }
        Write-Host "Line ${lineNum}: ${prevDepth}->${depth} | $trimmed"
    }
}
