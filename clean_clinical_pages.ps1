$file = "d:\OneDrive\SISTEMA BROTAR\Sistema-Brotar-v-2.1\components\ClinicalPages.tsx"
$content = Get-Content $file
# Indices are 0-based. Line 4902 is index 4901. Line 5415 is index 5414.
# We want to keep 0..4901 and 5414..end
$newContent = $content[0..4901] + $content[5414..($content.Length - 1)]
Set-Content $file $newContent -Encoding UTF8
Write-Host "Lines removed successfully."
