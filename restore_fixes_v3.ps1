$path = 'd:\OneDrive\SISTEMA BROTAR\Sistema-Brotar-v-2.1\components\ClinicalPages.tsx'
$content = Get-Content $path -Raw -Encoding UTF8

# 1. State Hooks Injection (Idempotent)
if ($content -notmatch "const \[showConfirmDischarge, setShowConfirmDischarge\]") {
    $hooks = "    const [loading, setLoading] = useState(false);`r`n    const { success: showToast, error: toastError } = useToast();`r`n    const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);`r`n    const [showConfirmDischarge, setShowConfirmDischarge] = useState(false);"
    $content = $content -replace "const \[loading, setLoading\] = useState\(false\);", $hooks
    Write-Host "Hooks injected."
}

# 2. BaseSessionForm useToast (Idempotent)
if ($content -notmatch "const \{ success: showToast, error: toastError \} = useToast\(\);.*// --- FORMULÁRIO GENÉRICO") { 
    # Hard to check scope. We'll check if "useToast" appears near "setNotes".
    # Or just replace if "const [notes, setNotes] = useState('');" is followed by newline then something else.
    # regex: "const \[notes, setNotes\] = useState\(''\);\r?\n\s*const \{ success"
    if ($content -notmatch "const \[notes, setNotes\] = useState\(''\);\s*const \{ success") {
        $content = $content -replace "const \[notes, setNotes\] = useState\(''\);", "const [notes, setNotes] = useState('');`r`n    const { success: showToast, error: toastError } = useToast();"
        Write-Host "BaseSessionForm hooks injected."
    }
}

# 3. Global Alert Replacements (Always run, safe if identifiers replaced)
# Regex with word boundaries to avoid replacing parts of words if any
$content = $content -replace "alert\('Dados salvos com sucesso!'\)", "showToast('Dados salvos com sucesso!')"
$content = $content -replace "alert\('Erro ao salvar dados.'\)", "toastError('Erro ao salvar dados.')"
$content = $content -replace "alert\('Sessão salva!'\)", "showToast('Sessão salva!')"
$content = $content -replace "alert\('Erro ao salvar sessão.'\)", "toastError('Erro ao salvar sessão.')"
$content = $content -replace "alert\('Atendimento salvo com sucesso!'\)", "showToast('Atendimento salvo com sucesso!')"
$content = $content -replace "alert\('Erro ao salvar: ' \+ err.message\)", "toastError('Erro ao salvar: ' + err.message)"
$content = $content -replace "alert\('Falha ao processar alta.'\)", "toastError('Falha ao processar alta.')"
$content = $content -replace "alert\('Funcionalidade de exclusão em desenvolvimento no backend.'\)", "showFeedback('error', 'Funcionalidade de exclusão em desenvolvimento.');"
$content = $content -replace "alert\('Erro ao salvar prontuário.'\)", "toastError('Erro ao salvar prontuário.')"


# 4. handleDischarge Replacements (Regex updated with \s+)
# We only replace if we find the 'confirm' pattern.
$dischargeRegex = 'const handleDischarge = async \(\) => \{\s*if \(!selectedStudent\) return;\s*const confirmAlta = confirm\(".*?"\);\s*if \(!confirmAlta\) return;(\s*try\s*\{[\s\S]*?\}\s*catch\s*\(.*?\)\s*\{[\s\S]*?\})\s*\};'
if ($content -match $dischargeRegex) {
    $dischargeReplacement = '    const handleDischarge = async () => {
        if (!selectedStudent) return;
        setShowConfirmDischarge(true);
    };

    const confirmDischargeAction = async () => {
        setShowConfirmDischarge(false);$1
    };'
    $content = [regex]::Replace($content, $dischargeRegex, $dischargeReplacement)
    Write-Host "Discharge functions replaced."
}
else {
    Write-Host "No discharge functions matched pattern (already fixed?)."
}


# 5. Inject Confirm Modal JSX (Idempotent check)
# Check if Modal/AlertTriangle is present near end of dashboards?
# We can check if "Modal de Confirmação de Alta Profissional" matches 4 times.
$matches = ([regex]"Modal de Confirmação de Alta Profissional").Matches($content)
if ($matches.Count -lt 4) {
    Write-Host "Injecting Modal JSX (Found $($matches.Count), need 4)."
    
    $modalJSX = '            {/* Modal de Confirmação de Alta Profissional */}
            {showConfirmDischarge && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center text-center animate-slideUp border border-slate-100">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 text-amber-600">
                            <AlertTriangle size={48} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3 uppercase tracking-tight">Confirmar Alta?</h3>
                        <p className="text-slate-500 mb-8 leading-relaxed font-medium">
                            Você está prestes a dar alta para <br/>
                            <strong className="text-slate-900">{selectedStudent?.fullName}</strong>. <br/>
                            Isso irá salvar os dados atuais e gerar o relatório final.
                        </p>
                        
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setShowConfirmDischarge(false)}
                                className="flex-1 py-4 bg-slate-100 text-slate-500 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Sair
                            </button>
                            <button
                                onClick={confirmDischargeAction}
                                className="flex-1 py-4 bg-amber-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 active:scale-95"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}'

    # Updated Regex to handle \r?\n
    $closingRegex = '(\r?\n\s*\);\r?\n\};)'
    # We use a loop to replace all occurrences that DON'T already have the modal before them.
    # Actually, simpler: Regex Replace ALL ends of components.
    # But we must ensure we don't double inject.
    # The regex matches the END.
    # If the Modal is there, the text before the end is `)}` (from {showConfirmDischarge && ... )})
    # If Modal NOT there, text before is `</div>` or `)}` (from other conditions).
    
    # We will use the replacement logic: ONLY replace if "Modal de Confirmação" is NOT already preceding it in the capture window?
    # Hard to lookbehind with variable length.
    
    # Alternative:
    # 1. Split content by "export const" to isolate components.
    # 2. For each component (Speech, OT, Physio, Psych), check if Modal present.
    # 3. If not, append Modal before end.
    
    # Component Names
    $components = @("SpeechTherapySpecificDashboard", "OccupationalTherapySpecificDashboard", "PhysiotherapySpecificDashboard", "PsychologySpecificDashboard")
    
    foreach ($comp in $components) {
        # Find start of component
        $search = "const $comp"
        $idx = $content.IndexOf($search)
        if ($idx -ge 0) {
            # Find next "export const" or end of file to limit scope
            $nextIdx = $content.IndexOf("export const", $idx + 10)
            if ($nextIdx -eq -1) { $nextIdx = $content.Length }
            
            # Check for Modal in this range
            $chunk = $content.Substring($idx, $nextIdx - $idx)
            if ($chunk -notmatch "Modal de Confirmação de Alta Profissional") {
                Write-Host "Injecting Modal into $comp"
                
                # Find the closing sequence inside the chunk (last occurrence)
                # We look for `    );\r\n};`
                $chunkmatches = [regex]::Matches($chunk, '(\r?\n\s*\);\r?\n\};)')
                if ($chunkmatches.Count -gt 0) {
                    $lastMatch = $chunkmatches[$chunkmatches.Count - 1]
                    # We need to replace this specific instance in the global string location.
                    # Calculate global position
                    $replacePos = $idx + $lastMatch.Index
                    $replaceLen = $lastMatch.Length
                    
                    # Original text
                    $originalEnd = $lastMatch.Value
                    
                    # Replacement text
                    $newEnd = "$modalJSX$originalEnd"
                    
                    # We can't easily splice strings by index and keep index valid for next iterations unless we do it carefully or reverse order.
                    # Or simpler: Replace in $chunk, then replace $chunk in $content.
                    # But $chunk might be large.
                    
                    # Let's do string replacement by text unique enough? No.
                    # Let's rebuild $content.
                    
                    $contentPrefix = $content.Substring(0, $replacePos)
                    $contentSuffix = $content.Substring($replacePos + $replaceLen)
                    $content = "$contentPrefix$newEnd$contentSuffix"
                    
                    # Since we modified $content, all subsequent indices are invalid.
                    # We must restart or handle offsets.
                    # Restarting loop is easiest but inefficient.
                    # Or just run script multiple times?
                    # Loop restart is fine for 4 components.
                }
            }
        }
    }
}

Set-Content $path $content -Encoding UTF8
Write-Host "Restoration V3 complete."
