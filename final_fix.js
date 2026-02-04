
const fs = require('fs');
const FILE_PATH = 'd:/OneDrive/SISTEMA BROTAR/Sistema-Brotar-v-2.1/components/ClinicalPages.tsx';

function applyFinalFixes() {
    let content = fs.readFileSync(FILE_PATH, 'utf8');

    // Fonoaudiologia
    content = content.replace("alert('Dados salvos com sucesso!');", "showToast('Dados salvos com sucesso!');");
    content = content.replace("alert('Erro ao salvar dados.');", "toastError('Erro ao salvar dados.');");

    // Nutrição
    content = content.replace("} catch (e) { alert('Erro na impressão.'); }", "} catch (e) { toastError('Erro na impressão.'); }");

    // Psicologia confirm (Delete note)
    content = content.replace("if (confirm('Deseja excluir este registro permanentemente?')) {", "setConfirmModal({ title: 'Confirmar Exclusão', message: 'Deseja excluir este registro permanentemente?', onConfirm: async () => { setConfirmModal(null); ");
    // This last one is complex because it needs to wrap the logic. I'll stick to alerts first.

    fs.writeFileSync(FILE_PATH, content, 'utf8');
    console.log('Final fixes applied via Node.');
}

applyFinalFixes();
