import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, School, PapelTimbradoConfig } from '../types';
import { SupabaseService } from '../services/SupabaseService';

export const generateStudentPDF = async (student: Student) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    // Helper to add text
    const addText = (text: string, size = 12, isBold = false) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.text(text, 14, currentY);
        currentY += size * 0.5 + 2;
    };

    const addSectionTitle = (title: string) => {
        currentY += 5;
        doc.setFillColor(240, 240, 240);
        doc.rect(14, currentY - 5, pageWidth - 28, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 51, 102);
        doc.text(title, 16, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 10;
    };

    const addField = (label: string, value: string | undefined | null) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 14, currentY);
        doc.setFont('helvetica', 'normal');

        const cleanValue = value || '-';
        const splitValue = doc.splitTextToSize(cleanValue, pageWidth - 60);
        doc.text(splitValue, 60, currentY);

        currentY += (splitValue.length * 4) + 2;

        // Page break check
        if (currentY > 280) {
            doc.addPage();
            currentY = 20;
        }
    };

    // --- Header ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("Ficha do Aluno", 105, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 105, 22, { align: 'center' });
    doc.setTextColor(0);
    currentY = 35;

    // --- Photo ---
    if (student.photoUrl) {
        try {
            const imgData = await fetchImage(student.photoUrl);
            if (imgData) {
                // Ajuste de layout: Foto abaixo do cabeçalho da seção "Dados Pessoais"
                // Header acaba em Y ~45. Vamos colocar a foto alinhada com os campos.
                doc.addImage(imgData, 'JPEG', pageWidth - 50, 45, 35, 35); // Top right, below title
            }
        } catch (e) {
            console.error("Erro ao carregar foto do perfil:", e);
        }
    }

    // --- Dados Pessoais ---
    addSectionTitle("Dados Pessoais");
    addField("Nome Completo", student.fullName);
    addField("Data de Nascimento", student.birthDate ? new Date(student.birthDate).toLocaleDateString() : '-');
    addField("CPF", student.cpf);
    addField("RG", student.rg); // Ajuste: RG pode estar no root ou clinical, verifique o tipo
    addField("Nome da Mãe", student.motherName);
    addField("Nome do Pai", student.fatherName);
    addField("Endereço", `${student.address?.street}, ${student.address?.number} - ${student.address?.district}`);
    addField("Cidade/UF", `${student.address?.city}/${student.address?.state}`);

    // --- Dados Escolares ---
    addSectionTitle("Dados Escolares");
    addField("Escola", student.school?.schoolName);
    addField("Série/Ano", student.school?.grade);
    addField("Turno", student.school?.shift);
    addField("Tipo de Ensino", student.school?.teachingType);

    // --- Saúde ---
    addSectionTitle("Saúde e Clínico");
    addField("Tipo Sanguíneo", student.clinical?.bloodType);
    addField("Alergias", student.clinical?.allergies);
    addField("Medicamentos", student.clinical?.medications);
    addField("Diagnóstico", student.clinical?.diagnosis);

    // --- Anexos / Documentos ---
    if (student.documents && student.documents.length > 0) {
        console.log(`[PDF Export] Encontrados ${student.documents.length} documentos.`);

        for (const docItem of student.documents) {
            doc.addPage(); // Sempre nova página para cada anexo
            currentY = 20;

            addSectionTitle(`Anexo: ${docItem.type || 'Documento'}`);
            addText(`Arquivo: ${docItem.fileName}`, 10);
            currentY += 5;

            // Se for imagem, tenta renderizar
            const isImage = docItem.fileName.match(/\.(jpg|jpeg|png|webp)$/i) || docItem.type.includes('image');

            if (isImage && docItem.url) {
                try {
                    console.log(`[PDF Export] Baixando imagem: ${docItem.fileName}`);
                    const imgData = await fetchImage(docItem.url);

                    if (imgData) {
                        const imgProps = doc.getImageProperties(imgData);
                        const pdfWidth = pageWidth - 40; // Margem de 20px cada lado
                        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                        // Se a imagem for maior que a página, ajusta para caber na altura
                        const maxPageHeight = 250; // Altura disponível
                        let finalWidth = pdfWidth;
                        let finalHeight = pdfHeight;

                        if (pdfHeight > maxPageHeight) {
                            finalHeight = maxPageHeight;
                            finalWidth = (imgProps.width * finalHeight) / imgProps.height;
                        }

                        // Centralizar horizontalmente se encolheu na largura
                        const xPos = (pageWidth - finalWidth) / 2;

                        doc.addImage(imgData, 'JPEG', xPos, currentY, finalWidth, finalHeight);
                    } else {
                        addText(`[Erro: Não foi possível baixar a imagem do anexo]`, 10);
                    }
                } catch (e) {
                    console.error("Erro ao processar anexo PDF:", e);
                    addText(`[Erro ao carregar imagem: ${e}]`, 9);
                }
            } else {
                addText(`[Arquivo não visualizável diretamente no PDF]`, 10);
                addText(`Link Original: ${docItem.url}`, 8);
            }
        }
    } else {
        console.log(`[PDF Export] Nenhum documento encontrado em student.documents`);
    }

    // Save
    const safeName = student.fullName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'student';
    doc.save(`student_file_${safeName}.pdf`);
};

// --- Letterhead Helper ---
// --- Letterhead Helper ---
export const drawLetterhead = async (doc: jsPDF, config: PapelTimbradoConfig) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 10;

    if (config.showLogo && config.logoUrl) {
        try {
            const imgData = await fetchImage(config.logoUrl);
            if (imgData) {
                const imgProps = doc.getImageProperties(imgData);
                const ratio = imgProps.width / imgProps.height;
                const h = 22;
                const w = h * ratio;
                doc.addImage(imgData, 'PNG', 15, y, w, h);
            }
        } catch (e) {
            console.warn("Erro ao carregar logo:", e);
        }
    }

    if (config.showTitulos) {
        doc.setTextColor(0, 51, 102);
        const startX = config.showLogo ? 48 : pageWidth / 2;
        const align = config.showLogo ? 'left' : 'center';

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(config.tituloLinha1?.toUpperCase() || '', startX, y + 6, { align });

        doc.setFontSize(10);
        doc.text(config.tituloLinha2?.toUpperCase() || '', startX, y + 12, { align });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(config.tituloLinha3 || '', startX, y + 18, { align });

        if (config.showContato) {
            doc.setFontSize(7.5);
            doc.setTextColor(100);
            const contact = [config.cnpj, config.endereco, config.telefone].filter(Boolean).join(' | ');
            doc.text(contact, startX, y + 24, { align });
        }
    }

    doc.setDrawColor(200);
    doc.line(15, 38, pageWidth - 15, 38);
    return 48; // Próximo Y seguro
};

export const drawFooter = async (doc: jsPDF, config: PapelTimbradoConfig) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 20;

    doc.setDrawColor(230);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

    if (config.rodapeImg) {
        try {
            const imgData = await fetchImage(config.rodapeImg);
            if (imgData) {
                const imgProps = doc.getImageProperties(imgData);
                const ratio = imgProps.width / imgProps.height;
                const h = 10;
                const w = h * ratio;
                doc.addImage(imgData, 'PNG', 15, footerY, w, h);
            }
        } catch (e) {
            console.warn("Erro ao carregar imagem do rodapé:", e);
        }
    }

    if (config.rodapeTexto) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(120);
        const lines = doc.splitTextToSize(config.rodapeTexto, pageWidth - 60);
        doc.text(lines, pageWidth - 15, footerY + 3, { align: 'right' });
    }

    doc.setFontSize(6);
    doc.setTextColor(180);
    doc.text(`Gerado em ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} - Sistema Brotar`, pageWidth / 2, pageHeight - 5, { align: 'center' });
};

// --- School Reports ---
export const generateSchoolPDF = async (school: School, config: PapelTimbradoConfig) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = await drawLetterhead(doc, config);

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("FICHA CADASTRAL DA UNIDADE ESCOLAR", pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    const createSection = (title: string, data: [string, string][]) => {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, pageWidth - 30, 8, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100);
        doc.text(title.toUpperCase(), 18, currentY + 5.5);
        currentY += 12;

        data.forEach(([label, value]) => {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text(`${label}:`, 18, currentY);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            const val = value || '-';
            const splitVal = doc.splitTextToSize(val, pageWidth - 70);
            doc.text(splitVal, 60, currentY);
            currentY += (splitVal.length * 4) + 2;
        });
        currentY += 4;
    };

    createSection("Identificação", [
        ["Unidade", school.name],
        ["Código INEP", school.inep],
        ["Distrito/Localidade", school.district || 'Sede'],
        ["Diretor(a)", school.director || 'Não informado'],
        ["Telefone", school.phone || '-'],
        ["Status", school.isActive ? 'Ativa' : 'Inativa']
    ]);

    createSection("Conectividade", [
        ["Internet", school.hasInternet ? 'SIM' : 'NÃO'],
        ["Conexões", school.internetType || '-'],
        ...Object.entries(school.internetProviders || {}).map(([type, prov]) => [
            `Provedor (${type})`, `${prov.company || '-'} ${prov.contact ? `(Tel: ${prov.contact})` : ''}`
        ] as [string, string])
    ]);

    createSection("Endereço", [
        ["Logradouro", `${school.address?.street || ''}, ${school.address?.number || ''}`],
        ["Bairro", school.address?.district || '-'],
        ["Cidade/UF", `${school.address?.city || 'Brotas'}/${school.address?.state || 'BA'}`],
        ["CEP", school.address?.zipCode || '-']
    ]);

    // Footer
    await drawFooter(doc, config);

    doc.save(`school_file_${school.inep}.pdf`);
};

export const generateAllSchoolsPDF = async (schools: School[], config: PapelTimbradoConfig) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = await drawLetterhead(doc, config);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("RELATÓRIO GERAL DE UNIDADES ESCOLARES", pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    const tableData = schools.map(s => [
        s.inep,
        s.name,
        s.district || 'Sede',
        s.phone || '-',
        s.hasInternet ? (s.internetType ? `Sim (${s.internetType.split(',')[0]})` : 'Sim') : 'Não'
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['INEP', 'NOME DA UNIDADE', 'LOCALIDADE', 'TELEFONE', 'INTERNET']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102], fontSize: 9, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 25, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30 },
            3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 35 }
        }
    });

    await drawFooter(doc, config);

    doc.save(`general_school_report.pdf`);
};

// Helper: Convert URL to Base64
async function fetchImage(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn("Falha ao baixar imagem para PDF:", url, error);
        return null;
    }
}
