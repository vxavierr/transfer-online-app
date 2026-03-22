import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { executiveManualByLanguage } from './manualData';

export default function ManualPdfButton({ language = 'pt' }) {
  const content = executiveManualByLanguage[language] || executiveManualByLanguage.pt;
  const isEnglish = language === 'en';

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let currentY = 20;

    doc.setFontSize(20);
    doc.text(content.manualMeta.title, margin, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.text(`${isEnglish ? 'Version' : 'Versão'}: ${content.manualMeta.version}`, margin, currentY);
    currentY += 5;
    doc.text(`${isEnglish ? 'Last update' : 'Última atualização'}: ${content.manualMeta.updateDateLabel}`, margin, currentY);
    currentY += 5;
    doc.text(`${isEnglish ? 'Owner' : 'Responsável'}: ${content.manualMeta.owner}`, margin, currentY);
    currentY += 8;

    doc.setFontSize(11);
    const introLines = doc.splitTextToSize(content.manualMeta.purpose, pageWidth - margin * 2);
    doc.text(introLines, margin, currentY);
    currentY += introLines.length * 5 + 4;

    autoTable(doc, {
      startY: currentY,
      head: [[isEnglish ? 'Layer' : 'Camada', isEnglish ? 'Description' : 'Descrição']],
      body: content.architectureLayers.map((item) => [item.title, item.description]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9, cellPadding: 2.5 }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [[isEnglish ? 'Module' : 'Módulo', isEnglish ? 'Role in the platform' : 'Papel na plataforma']],
      body: content.businessModules,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 9, cellPadding: 2.5 }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [[isEnglish ? 'Profile' : 'Perfil', isEnglish ? 'Responsibility' : 'Responsabilidade']],
      body: content.userProfiles,
      theme: 'grid',
      headStyles: { fillColor: [147, 51, 234] },
      styles: { fontSize: 9, cellPadding: 2.5 }
    });

    doc.addPage();
    currentY = 20;

    autoTable(doc, {
      startY: currentY,
      head: [[isEnglish ? 'Key entity' : 'Entidade-chave', isEnglish ? 'Architectural role' : 'Função arquitetônica']],
      body: content.keyEntities,
      theme: 'grid',
      headStyles: { fillColor: [17, 24, 39] },
      styles: { fontSize: 9, cellPadding: 2.5 }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [[isEnglish ? 'Integration' : 'Integração', isEnglish ? 'Primary use' : 'Uso principal']],
      body: content.integrations,
      theme: 'grid',
      headStyles: { fillColor: [8, 145, 178] },
      styles: { fontSize: 9, cellPadding: 2.5 }
    });

    const governanceStartY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(14);
    doc.text(isEnglish ? 'Governance and attention points' : 'Governança e pontos de atenção', margin, governanceStartY);
    doc.setFontSize(10);
    let governanceY = governanceStartY + 6;
    content.governanceTopics.forEach((topic) => {
      const lines = doc.splitTextToSize(`• ${topic}`, pageWidth - margin * 2);
      doc.text(lines, margin, governanceY);
      governanceY += lines.length * 5;
    });

    autoTable(doc, {
      startY: governanceY + 4,
      head: [[isEnglish ? 'Cadence' : 'Cadência', isEnglish ? 'What management should review' : 'O que o gestor deve consultar']],
      body: content.managerCadence,
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12] },
      styles: { fontSize: 9, cellPadding: 2.5 }
    });

    const checklistStartY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(14);
    doc.text(isEnglish ? 'Recurring review checklist' : 'Checklist de consulta recorrente', margin, checklistStartY);
    doc.setFontSize(10);
    let checklistY = checklistStartY + 6;
    content.consultationChecklist.forEach((item) => {
      const lines = doc.splitTextToSize(`• ${item}`, pageWidth - margin * 2);
      doc.text(lines, margin, checklistY);
      checklistY += lines.length * 5;
    });

    doc.save(isEnglish ? 'platform-architecture-manual.pdf' : 'manual-arquitetonico-plataforma.pdf');
  };

  return (
    <Button onClick={handleExportPdf} className="bg-blue-600 hover:bg-blue-700">
      <Download className="w-4 h-4 mr-2" />
      {isEnglish ? 'Export executive view' : 'Exportar visão executiva'}
    </Button>
  );
}