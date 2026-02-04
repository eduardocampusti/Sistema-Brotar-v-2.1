$path = 'd:\OneDrive\SISTEMA BROTAR\Sistema-Brotar-v-2.1\components\ClinicalPages.tsx'
$content = Get-Content $path -Raw -Encoding UTF8

# 1. Add hooks (loading -> loading + toast + confirm)
$hooks = "    const [loading, setLoading] = useState(false);`r`n    const { success: showToast, error: toastError } = useToast();`r`n    const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);`r`n    const [showConfirmDischarge, setShowConfirmDischarge] = useState(false);"
$content = $content -replace "const \[loading, setLoading\] = useState\(false\);", $hooks

# 2. Add useToast to BaseSessionForm
$content = $content -replace "const \[notes, setNotes\] = useState\(''\);", "const [notes, setNotes] = useState('');`r`n    const { success: showToast, error: toastError } = useToast();"

# 3. Replace alerts globally (doing this BEFORE regex replacement of functions to ensure consistent state inside functions if they had alerts)
# Note: PowerShell replace operator uses regex, so escape parens.
$content = $content -replace "alert\('Dados salvos com sucesso!'\)", "showToast('Dados salvos com sucesso!')"
$content = $content -replace "alert\('Erro ao salvar dados.'\)", "toastError('Erro ao salvar dados.')"
$content = $content -replace "alert\('Sessão salva!'\)", "showToast('Sessão salva!')"
$content = $content -replace "alert\('Erro ao salvar sessão.'\)", "toastError('Erro ao salvar sessão.')"
$content = $content -replace "alert\('Atendimento salvo com sucesso!'\)", "showToast('Atendimento salvo com sucesso!')"
$content = $content -replace "alert\('Erro ao salvar: ' \+ err.message\)", "toastError('Erro ao salvar: ' + err.message)"
$content = $content -replace "alert\('Falha ao processar alta.'\)", "toastError('Falha ao processar alta.')"
$content = $content -replace "alert\('Funcionalidade de exclusão em desenvolvimento no backend.'\)", "showFeedback('error', 'Funcionalidade de exclusão em desenvolvimento.');"

# 4. Capture and Rewrite handleDischarge for Speech/OT/Physio
# Regex to capture the try/catch block.
# We assume the structure: const confirmAlta ... if (!confirmAlta) return; ... try { BODY } catch ... };
# We use [\\s\\S]*? to match across newlines non-greedily.

$dischargeRegex = 'const handleDischarge = async \(\) => \{\s*if \(!selectedStudent\) return;\s*const confirmAlta = confirm\(".*?"\);\s*if \(!confirmAlta\) return;(\s*try\s*\{[\s\S]*?\}\s*catch\s*\(.*?\)\s*\{[\s\S]*?\})\s*\};'

$dischargeReplacement = '    const handleDischarge = async () => {
        if (!selectedStudent) return;
        setShowConfirmDischarge(true);
    };

    const confirmDischargeAction = async () => {
        setShowConfirmDischarge(false);$1
    };'

$content = [regex]::Replace($content, $dischargeRegex, $dischargeReplacement)

Set-Content $path $content -Encoding UTF8
Write-Host "Restoration complete."
