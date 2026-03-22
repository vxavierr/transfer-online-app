import React from 'react';
import { jsPDF } from 'jspdf';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PresentationPdfButton({ content }) {
  const handleDownload = () => {
    const doc = new jsPDF();
    let y = 20;

    const addBlock = (title, lines) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(title, 14, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      lines.forEach((line) => {
        const wrapped = doc.splitTextToSize(`• ${line}`, 180);
        doc.text(wrapped, 14, y);
        y += wrapped.length * 6;
      });
      y += 4;
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(content.hero.title, 14, y);
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const intro = doc.splitTextToSize(content.hero.subtitle, 180);
    doc.text(intro, 14, y);
    y += intro.length * 6 + 6;

    addBlock(content.pillarsTitle, content.pillars.flatMap((pillar) => [pillar.title, pillar.description, ...pillar.bullets]));
    addBlock(content.journeyTitle, content.journey);
    addBlock(content.differentiatorsTitle, content.differentiators);
    addBlock(content.cta.title, [content.cta.description]);

    doc.save(content.pdfFileName);
  };

  return (
    <Button onClick={handleDownload} className="bg-slate-900 text-white hover:bg-slate-800">
      <Download className="mr-2 h-4 w-4" />
      PDF
    </Button>
  );
}