// FILE: src/lib/certificates.ts
import jsPDF from 'jspdf';

export async function generateTransferCertificate(cert: any, student: any, school: any) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Ornate border
  doc.setDrawColor(184, 134, 11); // Gold
  doc.setLineWidth(3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(1);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

  // Decorative corners
  doc.setFillColor(184, 134, 11);
  [
    [10, 10], [pageWidth - 15, 10],
    [10, pageHeight - 15], [pageWidth - 15, pageHeight - 15]
  ].forEach(([x, y]) => {
    doc.circle(x, y, 5, 'F');
  });

  // Header
  doc.setFontSize(28);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text(school.name, pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(school.address, pageWidth / 2, 38, { align: 'center' });

  // Certificate title
  doc.setFillColor(184, 134, 11);
  doc.roundedRect(pageWidth / 2 - 70, 50, 140, 20, 3, 3, 'F');
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TRANSFER CERTIFICATE', pageWidth / 2, 63, { align: 'center' });

  // Certificate number
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.text(`Certificate No: ${cert.certificate_no}`, 25, 85);
  doc.text(`Issue Date: ${new Date(cert.issue_date).toLocaleDateString()}`, pageWidth - 25, 85, { align: 'right' });

  // Content
  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);

  const contentY = 100;
  doc.text('This is to certify that', pageWidth / 2, contentY, { align: 'center' });

  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(student.name_en, pageWidth / 2, contentY + 12, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Son/Daughter of ${student.guardians?.father_name || 'N/A'}`, pageWidth / 2, contentY + 22, { align: 'center' });
  
  doc.text(`bearing Student ID: ${student.student_id}, Roll No: ${student.roll}`, pageWidth / 2, contentY + 32, { align: 'center' });

  doc.text(`was a bonafide student of ${school.name}`, pageWidth / 2, contentY + 42, { align: 'center' });
  
  doc.text(`studying in ${student.classes?.name || 'N/A'} during the academic year ${school.academic_year}.`, pageWidth / 2, contentY + 52, { align: 'center' });

  doc.setFont(undefined, 'bold');
  doc.text('His/Her conduct and character have been GOOD.', pageWidth / 2, contentY + 66, { align: 'center' });

  doc.setFont(undefined, 'normal');
  doc.text(`Reason for leaving: ${cert.reason || 'Not specified'}`, pageWidth / 2, contentY + 78, { align: 'center' });

  // Signatures
  const signY = pageHeight - 45;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);

  doc.line(40, signY, 100, signY);
  doc.setFontSize(10);
  doc.text('Class Teacher', 70, signY + 6, { align: 'center' });

  doc.line(pageWidth - 100, signY, pageWidth - 40, signY);
  doc.text('Principal', pageWidth - 70, signY + 6, { align: 'center' });
  doc.text('(School Seal)', pageWidth - 70, signY + 12, { align: 'center' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('This certificate is valid for official purposes.', pageWidth / 2, pageHeight - 20, { align: 'center' });

  return doc;
}

export async function generateCharacterCertificate(cert: any, student: any, school: any) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Border
  doc.setDrawColor(34, 139, 34); // Green
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Header
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(34, 139, 34);
  doc.text(school.name, pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(school.address, pageWidth / 2, 38, { align: 'center' });

  // Title
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('CHARACTER CERTIFICATE', pageWidth / 2, 60, { align: 'center' });

  // Certificate details
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`Certificate No: ${cert.certificate_no}`, 20, 75);
  doc.text(`Date: ${new Date(cert.issue_date).toLocaleDateString()}`, pageWidth - 20, 75, { align: 'right' });

  // Content
  doc.setFontSize(12);
  const contentY = 95;
  
  doc.text('TO WHOM IT MAY CONCERN', pageWidth / 2, contentY, { align: 'center' });

  doc.setFont(undefined, 'normal');
  doc.text('This is to certify that', pageWidth / 2, contentY + 15, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(34, 139, 34);
  doc.text(student.name_en, pageWidth / 2, contentY + 28, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Student ID: ${student.student_id}, Class: ${student.classes?.name || 'N/A'}`, pageWidth / 2, contentY + 38, { align: 'center' });

  const text1 = `has been a student of this institution. During the period of study,`;
  const text2 = `his/her character and conduct have been found to be ${cert.conduct || 'GOOD'}.`;
  const text3 = `He/She has shown dedication to academic work and maintained discipline.`;

  doc.text(text1, pageWidth / 2, contentY + 53, { align: 'center', maxWidth: pageWidth - 40 });
  doc.setFont(undefined, 'bold');
  doc.text(text2, pageWidth / 2, contentY + 65, { align: 'center', maxWidth: pageWidth - 40 });
  doc.setFont(undefined, 'normal');
  doc.text(text3, pageWidth / 2, contentY + 77, { align: 'center', maxWidth: pageWidth - 40 });

  doc.text(`This certificate is issued for ${cert.reason || 'official purposes'}.`, pageWidth / 2, contentY + 92, { align: 'center' });

  doc.text('We wish him/her all success in future endeavors.', pageWidth / 2, contentY + 107, { align: 'center' });

  // Signatures
  const signY = pageHeight - 50;
  doc.line(35, signY, 80, signY);
  doc.setFontSize(9);
  doc.text('Class Teacher', 57.5, signY + 6, { align: 'center' });

  doc.line(pageWidth - 80, signY, pageWidth - 35, signY);
  doc.text('Principal', pageWidth - 57.5, signY + 6, { align: 'center' });

  return doc;
}

export async function generateHifzCertificate(cert: any, student: any, school: any) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Ornate Islamic pattern border
  doc.setDrawColor(0, 128, 0); // Islamic green
  doc.setLineWidth(4);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
  doc.setLineWidth(1);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Background pattern
  doc.setFillColor(240, 255, 240);
  doc.rect(17, 17, pageWidth - 34, pageHeight - 34, 'F');

  // Arabic Bismillah at top (placeholder)
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 100, 0);
  doc.text('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', pageWidth / 2, 30, { align: 'center' });

  // School name
  doc.setFontSize(26);
  doc.setTextColor(0, 128, 0);
  doc.text(school.name, pageWidth / 2, 45, { align: 'center' });

  // Certificate title
  doc.setFillColor(0, 128, 0);
  doc.roundedRect(pageWidth / 2 - 80, 55, 160, 25, 5, 5, 'F');
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('شَهَادَةُ حِفْظِ القُرْآنِ الكَرِيمِ', pageWidth / 2, 70, { align: 'center' });
  doc.setFontSize(16);
  doc.text('HIFZ COMPLETION CERTIFICATE', pageWidth / 2, 77, { align: 'center' });

  // Content
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');

  const contentY = 100;
  doc.text('الحَمْدُ لِلَّهِ رَبِّ العَالَمِينَ، وَالصَّلاَةُ وَالسَّلاَمُ عَلَى أَشْرَفِ الأَنْبِيَاءِ وَالمُرْسَلِينَ', pageWidth / 2, contentY, { align: 'center' });

  doc.text('This is to certify that', pageWidth / 2, contentY + 15, { align: 'center' });

  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 100, 0);
  doc.text(student.name_en, pageWidth / 2, contentY + 28, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Son/Daughter of ${student.guardians?.father_name || 'N/A'}`, pageWidth / 2, contentY + 38, { align: 'center' });
  doc.text(`Student ID: ${student.student_id}`, pageWidth / 2, contentY + 48, { align: 'center' });

  doc.setFont(undefined, 'bold');
  doc.setFontSize(15);
  doc.text('has successfully completed the memorization', pageWidth / 2, contentY + 62, { align: 'center' });
  doc.text('of the Holy Quran (30 Juz)', pageWidth / 2, contentY + 72, { align: 'center' });

  doc.setFont(undefined, 'normal');
  doc.setFontSize(12);
  doc.text(`under the guidance of our esteemed teachers at ${school.name}.`, pageWidth / 2, contentY + 85, { align: 'center' });
  
  doc.text(`Completion Date: ${new Date(cert.issue_date).toLocaleDateString()}`, pageWidth / 2, contentY + 97, { align: 'center' });

  doc.setFont(undefined, 'bold');
  doc.text('May Allah (SWT) make this achievement a means of guidance and success.', pageWidth / 2, contentY + 110, { align: 'center' });

  // Dua
  doc.setFontSize(11);
  doc.setFont(undefined, 'italic');
  doc.text('رَبِّ زِدْنِي عِلْمًا - My Lord, increase me in knowledge', pageWidth / 2, contentY + 123, { align: 'center' });

  // Signatures
  const signY = pageHeight - 40;
  doc.setFont(undefined, 'normal');
  
  doc.line(50, signY, 100, signY);
  doc.setFontSize(10);
  doc.text('Head Teacher (Hifz)', 75, signY + 6, { align: 'center' });

  doc.line(pageWidth / 2 - 25, signY, pageWidth / 2 + 25, signY);
  doc.text('Principal', pageWidth / 2, signY + 6, { align: 'center' });

  doc.line(pageWidth - 100, signY, pageWidth - 50, signY);
  doc.text('School Seal', pageWidth - 75, signY + 6, { align: 'center' });

  return doc;
}
