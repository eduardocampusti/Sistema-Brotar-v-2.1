$file = 'd:\OneDrive\SISTEMA BROTAR\Sistema-Brotar-v-2.1\components\ClinicalPages.tsx'
$lines = Get-Content $file -Encoding UTF8
$startIndex = -1

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "const handleDischarge = async \(\) => \{") {
        # Check if it's the one in Psychology dashboard (followed by confirmAlta)
        # Check upcoming lines
        if ($lines[$i + 3] -match "const confirmAlta = confirm" -or $lines[$i + 4] -match "const confirmAlta = confirm") {
            $startIndex = $i
            break
        }
    }
}

if ($startIndex -ne -1) {
    Write-Host "Found handleDischarge at line $($startIndex+1)"
    
    # We want to replace from $startIndex to where the function ends.
    # The original function is about 15 lines.
    # approximate end
    $endIndex = $startIndex + 18 
    
    # Verify end
    if ($lines[$endIndex] -match "^\s*\}\s*catch") {
        $endIndex = $endIndex + 4 # include catch block
    }
    
    # Construct new lines
    $newLines = @(
        "    const handleDischarge = async () => {",
        "        if (!selectedStudent) return;",
        "",
        "        setConfirmModal({",
        "            title: ""Confirmar Alta?"",",
        "            message: ""Tem certeza que deseja dar alta a este paciente? Esta ação irá salvar o prontuário e gerar o relatório final."",",
        "            onConfirm: async () => {",
        "                setConfirmModal(null);",
        "                try {",
        "                    await saveFullForm({ preventDefault: () => { } } as React.FormEvent);",
        "                    setTimeout(() => {",
        "                        handlePrintPsychology();",
        "                    }, 500);",
        "                } catch (err) {",
        "                    console.error(""Erro ao processar alta:"", err);",
        "                    showFeedback(""error"", ""Falha ao processar alta."");",
        "                }",
        "            }",
        "        });",
        "    };"
    )

    # We need to find exactly how many lines to remove.
    # The original code ends with "};" indented.
    # Let's search for the closing brace of the function.
    # It starts with indent 4 spaces. Closing brace should be 4 spaces.
    
    $removalCount = 0
    for ($j = $startIndex; $j -lt $lines.Count; $j++) {
        if ($lines[$j] -match "^\s{4}\};") {
            $removalCount = ($j - $startIndex) + 1
            break
        }
    }
    
    if ($removalCount -gt 0) {
        Write-Host "Replacing $removalCount lines."
        
        # Replace
        # PowerShell array splice is tricky, easier to rebuild logic
        # But allow us to just overwrite and blank out the rest if needed, or use ArrayList
        
        $list = [System.Collections.Generic.List[string]]::new($lines)
        $list.RemoveRange($startIndex, $removalCount)
        $list.InsertRange($startIndex, $newLines)
        
        Set-Content $file $list -Encoding UTF8
        Write-Host "Done."
    }
    else {
        Write-Host "Could not find end of function."
    }

}
else {
    Write-Host "Could not find handleDischarge."
}
