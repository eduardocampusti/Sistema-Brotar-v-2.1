$path = 'd:\OneDrive\SISTEMA BROTAR\Sistema-Brotar-v-2.1\components\ClinicalPages.tsx'
$content = Get-Content $path -Raw -Encoding UTF8

# 1. State Hooks Injection
$hooks = "    const [loading, setLoading] = useState(false);`r`n    const { success: showToast, error: toastError } = useToast();`r`n    const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);`r`n    const [showConfirmDischarge, setShowConfirmDischarge] = useState(false);"
$content = $content -replace "const \[loading, setLoading\] = useState\(false\);", $hooks

# 2. BaseSessionForm useToast
$content = $content -replace "const \[notes, setNotes\] = useState\(''\);", "const [notes, setNotes] = useState('');`r`n    const { success: showToast, error: toastError } = useToast();"

# 3. Global Alert Replacements
$content = $content -replace "alert\('Dados salvos com sucesso!'\)", "showToast('Dados salvos com sucesso!')"
$content = $content -replace "alert\('Erro ao salvar dados.'\)", "toastError('Erro ao salvar dados.')"
$content = $content -replace "alert\('Sessão salva!'\)", "showToast('Sessão salva!')"
$content = $content -replace "alert\('Erro ao salvar sessão.'\)", "toastError('Erro ao salvar sessão.')"
$content = $content -replace "alert\('Atendimento salvo com sucesso!'\)", "showToast('Atendimento salvo com sucesso!')"
$content = $content -replace "alert\('Erro ao salvar: ' \+ err.message\)", "toastError('Erro ao salvar: ' + err.message)"
$content = $content -replace "alert\('Falha ao processar alta.'\)", "toastError('Falha ao processar alta.')"
$content = $content -replace "alert\('Funcionalidade de exclusão em desenvolvimento no backend.'\)", "showFeedback('error', 'Funcionalidade de exclusão em desenvolvimento.');"
# Also fix error message usage in catch blocks if they used alerts
$content = $content -replace "alert\('Erro ao salvar prontuário.'\)", "toastError('Erro ao salvar prontuário.')"

# 4. handleDischarge Replacements (Speech, OT, Physio) - Regex for 'confirm' pattern
$dischargeRegex = 'const handleDischarge = async \(\) => \{\s*if \(!selectedStudent\) return;\s*const confirmAlta = confirm\(".*?"\);\s*if \(!confirmAlta\) return;(\s*try\s*\{[\s\S]*?\}\s*catch\s*\(.*?\)\s*\{[\s\S]*?\})\s*\};'
$dischargeReplacement = '    const handleDischarge = async () => {
        if (!selectedStudent) return;
        setShowConfirmDischarge(true);
    };

    const confirmDischargeAction = async () => {
        setShowConfirmDischarge(false);$1
    };'
$content = [regex]::Replace($content, $dischargeRegex, $dischargeReplacement)

# 4b. handleDischarge Replacement (Psychology) - Regex for 'confirm' pattern in Psych (might be same structure or slightly different indentation)
$psychDischargeRegex = 'const handleDischarge = async \(\) => \{\s*if \(!selectedStudent\) return;\s*const confirmAlta = confirm\(".*?"\);\s*if \(!confirmAlta\) return;(\s*try\s*\{[\s\S]*?\}\s*catch\s*\(.*?\)\s*\{[\s\S]*?\})\s*\};'
# The regex above is generic enough to catch Psych too if indentation matches.
# If Psych was matched by the previous statement, it's already done.
# Double check if Psych has 'const confirmAlta' -> Yes (Step 1552).
# So it likely got replaced.

# 5. Inject Confirm Modal JSX
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
            )}
'

# We inject this before the last "    );" of each Dashboard component.
# This assumes standard indentation "    );\r\n};" at end of component.
# We need to target the closing of the main component return.
# A safe way is to regex replace the very end of the component return.
# "    );\r\n};" 
# But we need to make sure we don't hit nested returns (unlikely if indented 4 spaces).
# However, Psych ended with "    );\r\n};".
# Speech ended with "    );\r\n};" (at line 2309? No component end).
# The components are top level exports.

$closingRegex = '(\n    \);\n\};)'
# Replace with modal + matching closing group
$content = [regex]::Replace($content, $closingRegex, "$modalJSX`$1")

# Clean up any potential double imports or such (not needed here)

Set-Content $path $content -Encoding UTF8
Write-Host "Restoration V2 complete."
