$content = Get-Content 'd:\OneDrive\SISTEMA BROTAR\Sistema-Brotar-v-2.1\components\ClinicalPages.tsx' -Raw
$content = $content.Replace("alert('Dados salvos com sucesso!');", "showToast('Dados salvos com sucesso!');")
$content = $content.Replace("alert('Funcionalidade de exclusão em desenvolvimento no backend.');", "showFeedback('error', 'Funcionalidade de exclusão em desenvolvimento.');")
Set-Content 'd:\OneDrive\SISTEMA BROTAR\Sistema-Brotar-v-2.1\components\ClinicalPages.tsx' $content -Encoding UTF8
