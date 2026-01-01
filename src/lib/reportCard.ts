// FILE: src/lib/reportCard.ts
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export async function generateBeautifulReportCard(student: any, exam: any, schoolSettings: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Add border
  doc.setDrawColor(79, 70, 229); // Primary color
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Header with gradient effect
  doc.setFillColor(79, 70, 229);
  doc.rect(15, 15, pageWidth - 30, 50, 'F');

  // School logo placeholder (circular)
  if (schoolSettings.logo_url) {
    try {
      const img = await loadImage(schoolSettings.logo_url);
      doc.addImage(img, 'PNG', 25, 20, 40, 40, undefined, 'FAST');
    } catch (e) {
      // Logo loading failed, continue without
    }
  }

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text(schoolSettings.name || 'Global Quranic School', pageWidth / 2, 35, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(schoolSettings.address || 'Rajshahi, Bangladesh', pageWidth / 2, 43, { align: 'center' });
  doc.text(`Phone: ${schoolSettings.phone || '+880 1700-000000'} | Email: ${schoolSettings.email || 'info@gqs.edu.bd'}`, pageWidth / 2, 50, { align: 'center' });

  // Certificate title with decorative lines
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('PROGRESS REPORT', pageWidth / 2, 80, { align: 'center' });

  // Decorative lines
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.5);
  doc.line(40, 85, pageWidth - 40, 85);

  // Student info box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(15, 95, pageWidth - 30, 40, 3, 3, 'F');

  // Student photo
  if (student.photo_url) {
    try {
      const photo = await loadImage(student.photo_url);
      doc.addImage(photo, 'JPEG', 20, 100, 30, 30, undefined, 'FAST');
    } catch (e) {}
  }

  // Student details
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Student Information', 60, 105);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Name: ${student.name_en}`, 60, 112);
  doc.text(`Student ID: ${student.student_id}`, 60, 119);
  doc.text(`Roll No: ${student.roll}`, 60, 126);
  doc.text(`Class: ${exam.classes.name}`, 60, 133);

  doc.text(`Exam: ${exam.name}`, 130, 112);
  doc.text(`Type: ${exam.type.toUpperCase()}`, 130, 119);
  doc.text(`Year: ${exam.academic_year}`, 130, 126);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 130, 133);

  // Marks table
  const tableData = student.examMarks.map((m: any, idx: number) => [
    idx + 1,
    m.exam_subjects?.subject_name || 'N/A',
    m.written?.toFixed(1) || '-',
    m.mcq?.toFixed(1) || '-',
    m.practical?.toFixed(1) || '-',
    m.total?.toFixed(1) || '0',
    m.exam_subjects?.full_marks || 100,
    m.letter_grade || '-',
    m.grade_point?.toFixed(2) || '-'
  ]);

  (doc as any).autoTable({
    startY: 145,
    head: [['#', 'Subject', 'Written', 'MCQ', 'Practical', 'Total', 'Full Marks', 'Grade', 'GP']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 15, halign: 'center' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Result summary box
  doc.setFillColor(79, 70, 229);
  doc.setTextColor(255, 255, 255);
  doc.roundedRect(15, finalY, pageWidth - 30, 30, 3, 3, 'F');

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  
  const summaryY = finalY + 10;
  doc.text(`Total Marks: ${student.totalMarks} / ${student.totalFull}`, 25, summaryY);
  doc.text(`Percentage: ${((student.totalMarks / student.totalFull) * 100).toFixed(2)}%`, 25, summaryY + 8);
  doc.text(`Average GPA: ${student.avgGP}`, 110, summaryY);
  
  // Grade with colored background
  const gradeColor = student.finalGrade === 'F' ? [239, 68, 68] : student.finalGrade.includes('A') ? [34, 197, 94] : [234, 179, 8];
  doc.setFillColor(gradeColor[0], gradeColor[1], gradeColor[2]);
  doc.roundedRect(150, summaryY - 5, 35, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(`Grade: ${student.finalGrade}`, 167, summaryY + 4, { align: 'center' });

  // Remarks section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Remarks:', 20, finalY + 45);
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  const remark = student.finalGrade === 'F' 
    ? 'Student needs improvement in multiple subjects. Extra attention required.'
    : student.avgGP >= 4.5
    ? 'Excellent performance! Keep up the outstanding work.'
    : student.avgGP >= 3.5
    ? 'Very good performance. Continue working hard.'
    : 'Good effort. Focus on weaker subjects for better results.';
  doc.text(remark, 20, finalY + 52, { maxWidth: pageWidth - 40 });

  // Signature section
  const signY = pageHeight - 45;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  
  // Parent signature
  doc.line(20, signY, 70, signY);
  doc.setFontSize(9);
  doc.text("Parent's Signature", 45, signY + 5, { align: 'center' });
  
  // Class teacher signature
  doc.line(pageWidth / 2 - 25, signY, pageWidth / 2 + 25, signY);
  doc.text("Class Teacher", pageWidth / 2, signY + 5, { align: 'center' });
  
  // Principal signature
  doc.line(pageWidth - 70, signY, pageWidth - 20, signY);
  doc.text("Principal", pageWidth - 45, signY + 5, { align: 'center' });

  // Footer
  doc.setFillColor(79, 70, 229);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('This is a computer-generated document. No signature required.', pageWidth / 2, pageHeight - 7, { align: 'center' });

  return doc;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
