$file = 'd:\OneDrive\SISTEMA BROTAR\Sistema-Brotar-v-2.1\components\ClinicalPages.tsx'
$content = Get-Content $file -Raw -Encoding UTF8

# Define the target block to find (based on the artifacts seen)
# We will use a regex to match the block more flexibly
$pattern = 'const confirmAlta = confirm\("Tem certeza que deseja dar alta a este paciente\?.*?"\);\s*if \(!confirmAlta\) return;\s*try\s*\{\s*// 1\. Salvar.*?\n\s*await saveFullForm.*?;\s*// 2\. Aguardar.*?\n\s*// e disparar.*?\n\s*setTimeout.*?;\s*\}, 500\);\s*\} catch \(err\) \{\s*console\.error.*?\n\s*showFeedback.*?\n\s*\}'

$replacement = 'setConfirmModal({
            title: "Confirmar Alta?",
            message: "Tem certeza que deseja dar alta a este paciente? Esta ação irá salvar o prontuário e gerar o relatório final.",
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await saveFullForm({ preventDefault: () => { } } as React.FormEvent);
                    setTimeout(() => {
                        handlePrintPsychology();
                    }, 500);
                } catch (err) {
                    console.error("Erro ao processar alta:", err);
                    showFeedback("error", "Falha ao processar alta.");
                }
            }
        });'

# Perform replacement
if ($content -match $pattern) {
    $content = $content -replace $pattern, $replacement
    Set-Content $file $content -Encoding UTF8
    Write-Host "Replacement successful."
}
else {
    Write-Host "Pattern not found."
    # Print a snippet around line 5875 to debug
    $lines = Get-Content $file
    $lines[5870..5880]
}
