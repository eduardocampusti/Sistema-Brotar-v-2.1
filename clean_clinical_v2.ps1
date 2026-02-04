$file = "d:\OneDrive\SISTEMA BROTAR\Sistema-Brotar-v-2.1\components\ClinicalPages.tsx"
$content = Get-Content $file
# Keep 0..4533 (return + closed brace of the dummy function)
# Skip 4534..4910 (the commented out block + residual code)
# Keep 4911..end (next component)
# Line 4912 starts with // --- BASE DASHBOARD...
# We need to find the exact line numbers dynamically or use the ones from view_file if file didn't change.
# Based on view_file:
# 4533 is last line of dummy function.
# 4910 is closing brace of OLD function (which is now duplicate/garbage).
# We want to keep until 4533, adding a closing brace if needed (it is already closed at 4533 in previous view? No, 4533 is ); 
# Wait, replace_file_content inserted the dummy function.
# Let's check line 4533: "    );"
# Let's check line 4534: "     // Código original comentado..."
# We want to keep 0..4533.
# Then append "};" to close the const SocialServiceSpecificDashboard = ...
# Then append everything from "const BaseDashboard" onwards.
# Where is BaseDashboard? It was at 4913.

$startKeep = 0
$endKeep = 4533
$startResume = 4913
$linesToKeep = $content[$startKeep..$endKeep]
$linesResume = $content[($startResume - 1)..($content.Length - 1)] 
# -1 because array is 0-indexed and line number is 1-indexed?
# content[0] is line 1.
# content[4533] is line 4534.
# We want to keep lines 1 to 4534 (indices 0 to 4533).
# Wait, line 4533 in view_file view is index 4532.
# Let's use string matching to be safer.

$newLines = @()
$foundBaseDashboard = $false
$inSkipZone = $false

for ($i = 0; $i -lt $content.Length; $i++) {
    $line = $content[$i]
    if ($line -match "Código original comentado abaixo para referência") {
        $inSkipZone = $true
        # Ensure we closed the function
        $newLines += "};"
    }

    if ($line -match "// --- BASE DASHBOARD \(OUTRAS ESPECIALIDADES\) ---") {
        $inSkipZone = $false
        $foundBaseDashboard = $true
    }

    if (-not $inSkipZone) {
        $newLines += $line
    }
}

Set-Content $file $newLines -Encoding UTF8
Write-Host "File cleaned successfully."
