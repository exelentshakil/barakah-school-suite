// FILE: src/lib/report-card.ts - PROFESSIONAL REPORT CARD WITH VERIFICATION
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

export async function generateReportCard(student: any, exam: any, school: any) {
    // Generate verification URL for QR code
    const verificationUrl = `${window.location.origin}/verify?student=${student.id}&exam=${exam.id}`;
    const qrCodeDataURL = await QRCode.toDataURL(verificationUrl, {
        width: 400,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
    });

    // Get guardian data
    const guardianData = student.guardians || {};
    const fatherName = guardianData.father_name || 'N/A';
    const motherName = guardianData.mother_name || 'N/A';

    // Calculate totals
    const totalFullMarks = student.marks.reduce((sum: number, m: any) => sum + parseFloat(m.exam_subjects?.full_marks || 0), 0);
    const totalObtained = student.marks.reduce((sum: number, m: any) => sum + parseFloat(m.total || 0), 0);
    const totalGP = student.marks.reduce((sum: number, m: any) => sum + parseFloat(m.grade_point || 0), 0);
    const gpa = student.marks.length > 0 ? (totalGP / student.marks.length).toFixed(2) : '0.00';

    const getGrade = (gpa: number) => {
        if (gpa >= 5.0) return 'A+';
        if (gpa >= 4.0) return 'A';
        if (gpa >= 3.5) return 'A-';
        if (gpa >= 3.0) return 'B';
        if (gpa >= 2.0) return 'C';
        if (gpa >= 1.0) return 'D';
        return 'F';
    };

    const failedCount = student.marks.filter((m: any) => parseFloat(m.total) < (m.exam_subjects?.pass_marks || 33)).length;

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm';
    container.style.backgroundColor = 'white';

    container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', 'Noto Sans Bengali', sans-serif; }
      .transcript { width: 210mm; min-height: 297mm; background: white; padding: 0; position: relative; }
      .border-frame { position: absolute; inset: 8mm; border: 4px solid #1a1a1a; border-radius: 4px; }
      .inner-border { position: absolute; inset: 10mm; border: 2px solid #b8860b; border-radius: 2px; }
      .content { position: relative; padding: 15mm; z-index: 10; }
      .header { text-align: center; margin-bottom: 8mm; }
      .school-logo { width: 50px; height: 50px; margin: 0 auto 8px; border-radius: 50%; border: 2px solid #2c5f2d; display: flex; align-items: center; justify-content: center; background: #2c5f2d; color: white; font-size: 24px; font-weight: bold; }
      .school-name { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px; text-transform: uppercase; }
      .school-address { font-size: 10px; color: #1a1a1a; margin-bottom: 6px; }
      .transcript-title { font-size: 13px; font-weight: 700; text-decoration: underline; margin-top: 6px; letter-spacing: 1px; }
      .grade-table-header { position: absolute; top: 15mm; right: 15mm }
      .grade-table-header table { border-collapse: collapse; font-size: 8px; }
      .grade-table-header th { border: 1px solid #000; padding: 2px 6px; font-weight: 600; background: #f5f5f5; }
      .grade-table-header td { border: 1px solid #000; padding: 2px 6px; text-align: center; }
      .student-info { margin: 12px 0; clear: both; }
      .info-row { display: grid; grid-template-columns: 140px 1fr 140px 1fr; margin-bottom: 5px; font-size: 10px; }
      .info-label { font-weight: 600; }
      .student-photo { position: absolute; top: 15mm; left: 15mm; width: 32mm; height: 38mm; border: 2px solid #000; display: flex; align-items: center; justify-content: center; background: #f5f5f5; color: #999; font-size: 40px; }
      .student-photo img { width: 100%; height: 100%; object-fit: cover; }
      .marks-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9px; }
      .marks-table th { border: 1px solid #000; padding: 5px 3px; font-weight: 600; background: #f5f5f5; text-align: center; }
      .marks-table td { border: 1px solid #000; padding: 5px 3px; text-align: center; }
      .marks-table td:first-child { text-align: left; padding-left: 6px; font-weight: 500; }
      .marks-table .total-row { font-weight: 700; background: #f0f9ff; }
      .marks-table .total-row td:first-child { text-align: center; color: #16a34a; }
      .bottom-section { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; font-size: 9px; }
      .position-box { border: 1px solid #000; padding: 6px; }
      .position-table { width: 100%; border-collapse: collapse; }
      .position-table td { padding: 3px; border-bottom: 1px solid #eee; }
      .position-table td:first-child { font-weight: 600; width: 120px; }
      .evaluation-box { border: 1px solid #000; padding: 6px; }
      .eval-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .eval-item { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f0f0f0; font-size: 8px; }
      .final-section { margin-top: 10mm; }
      .comment-qr-row { display: grid; grid-template-columns: 1fr 40mm; gap: 10mm; margin-bottom: 8mm; }
      .comment-box { border: 1px solid #000; padding: 8px; min-height: 35mm; position: relative; }
      .comment-label { font-size: 8px; font-weight: 600; position: absolute; left: 3px; top: 3px; writing-mode: vertical-rl; text-orientation: mixed; }
      .qr-container { text-align: center; }
      .qr-code { width: 35mm; height: 35mm; border: 1px solid #ccc; margin-bottom: 4px; }
      .qr-label { font-size: 7px; color: #666; font-weight: 600; }
      .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15mm; margin-bottom: 6mm; }
      .signature { text-align: center; }
      .signature-line { width: 100%; border-top: 1px solid #000; margin: 25px 0 4px; }
      .signature-label { font-size: 9px; font-weight: 600; }
      .footer { display: flex; justify-content: space-between; font-size: 7px; color: #888; }
    </style>
    <div class="transcript">
      <div class="border-frame"></div>
      <div class="inner-border"></div>
      <div class="content">
        <div class="student-photo">${student.photo_url ? `<img src="${student.photo_url}" crossorigin="anonymous" />` : `<span>👤</span>`}</div>
        <div class="header">
          <div class="school-logo">🎓</div>
          <div class="school-name">${school?.name || 'SCHOOL NAME'}</div>
          ${school?.name_bn ? `<div class="school-address">${school.name_bn}</div>` : ''}
          <div class="school-address">${school?.address || 'School Address'}</div>
          <div class="transcript-title">ACADEMIC TRANSCRIPT</div>
        </div>
        <div class="grade-table-header">
          <table>
            <tr><th>Range</th><th>Grade</th><th>GPA</th></tr>
            <tr><td>80-100</td><td>A+</td><td>5.0</td></tr>
            <tr><td>70-79</td><td>A</td><td>4.0</td></tr>
            <tr><td>60-69</td><td>A-</td><td>3.5</td></tr>
            <tr><td>50-59</td><td>B</td><td>3.0</td></tr>
            <tr><td>40-49</td><td>C</td><td>2.0</td></tr>
            <tr><td>33-39</td><td>D</td><td>1.0</td></tr>
            <tr><td>00-32</td><td>F</td><td>0.0</td></tr>
          </table>
        </div>
        <div class="student-info">
          <div class="info-row"><span class="info-label">Student's Name</span><span>: <strong>${student.name_en}</strong></span><span class="info-label">Exam</span><span>: <strong>${exam.name}</strong></span></div>
          <div class="info-row"><span class="info-label">Father's Name</span><span>: ${fatherName}</span><span class="info-label">Year/Session</span><span>: ${exam.academic_year}</span></div>
          <div class="info-row"><span class="info-label">Mother's Name</span><span>: ${motherName}</span><span class="info-label">Section</span><span>: ${student.sections?.name || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Student's ID</span><span>: ${student.student_id}</span><span></span><span></span></div>
          <div class="info-row"><span class="info-label">Class</span><span>: ${student.classes?.name || ''}</span><span></span><span></span></div>
          <div class="info-row"><span class="info-label">Roll No</span><span>: ${student.roll || 'N/A'}</span><span></span><span></span></div>
        </div>
        <table class="marks-table">
          <thead>
            <tr>
              <th rowspan="2">Subject</th><th rowspan="2">Full<br/>Marks</th><th rowspan="2">Highest<br/>Marks</th>
              <th colspan="4">Marks Distribution</th>
              <th rowspan="2">Total<br/>Marks</th><th rowspan="2">Letter<br/>Grade</th><th rowspan="2">GP</th>
            </tr>
            <tr><th>CT</th><th>WR</th><th>MCQ</th><th>PR</th></tr>
          </thead>
          <tbody>
            ${student.marks.map((m: any) => {
        const subjectName = m.exam_subjects?.subject_name || 'Unknown Subject';
        const fullMarks = m.exam_subjects?.full_marks || 100;
        return `<tr>
                <td>${subjectName}</td>
                <td>${fullMarks}</td>
                <td>${fullMarks.toFixed(1)}</td>
                <td>-</td>
                <td>${m.written || '-'}</td>
                <td>${m.mcq || '-'}</td>
                <td>${m.practical || '-'}</td>
                <td><strong>${parseFloat(m.total).toFixed(1)}</strong></td>
                <td><strong>${m.letter_grade}</strong></td>
                <td>${parseFloat(m.grade_point).toFixed(1)}</td>
              </tr>`;
    }).join('')}
            <tr class="total-row">
              <td colspan="2">Total Exam Marks</td>
              <td>${totalFullMarks}</td>
              <td colspan="4">Obtained Marks & GPA</td>
              <td><strong>${totalObtained.toFixed(2)}</strong></td>
              <td><strong>${getGrade(parseFloat(gpa))}</strong></td>
              <td><strong>${gpa}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="bottom-section">
          <div class="position-box">
            <table class="position-table">
              <tr><td>Section Position</td><td>-</td></tr>
              <tr><td>GPA (Without 4th)</td><td><strong>${gpa}</strong></td></tr>
              <tr><td>Failed Subject (s)</td><td><strong>${failedCount}</strong></td></tr>
              <tr><td>Working Days</td><td>-</td></tr>
              <tr><td>Total Present</td><td>-</td></tr>
            </table>
          </div>
          <div class="evaluation-box">
            <div class="eval-row">
              <div>
                <div style="font-weight: 700; margin-bottom: 4px; font-size: 8px; text-decoration: underline;">Moral & Behavior Evaluation</div>
                <div class="eval-item"><span>Best</span><span>☐</span></div>
                <div class="eval-item"><span>Better</span><span>☐</span></div>
                <div class="eval-item"><span>Good</span><span>☐</span></div>
                <div class="eval-item"><span>Need Improvement</span><span>☐</span></div>
              </div>
              <div>
                <div style="font-weight: 700; margin-bottom: 4px; font-size: 8px; text-decoration: underline;">Co-Curricular Activities</div>
                <div class="eval-item"><span>Sports</span><span>☐</span></div>
                <div class="eval-item"><span>Cultural Function</span><span>☐</span></div>
                <div class="eval-item"><span>Scout/BNCC</span><span>☐</span></div>
                <div class="eval-item"><span>Math Olympiad</span><span>☐</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="final-section">
          <div class="comment-qr-row">
            <div class="comment-box">
              <div class="comment-label">Comment</div>
            </div>
            <div class="qr-container">
              <img src="${qrCodeDataURL}" class="qr-code" />
              <div class="qr-label">Scan to Verify</div>
            </div>
          </div>
          <div class="signatures">
            <div class="signature"><div class="signature-line"></div><div class="signature-label">Class Teacher</div></div>
            <div class="signature"><div class="signature-line"></div><div class="signature-label">Principal</div></div>
            <div class="signature"><div class="signature-line"></div><div class="signature-label">Guardian</div></div>
          </div>
          <div class="footer">
            <div>Powered By BarakahSoft.com</div>
            <div>Date of Result Publication: ${new Date().toLocaleDateString('en-GB')}</div>
          </div>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(container);
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 1000));

    const canvas = await html2canvas(container, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false
    });

    document.body.removeChild(container);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png', 1.0);
    doc.addImage(imgData, 'PNG', 0, 0, 210, 297);
    doc.save(`transcript-${student.student_id}-${exam.name.replace(/\s+/g, '-')}.pdf`);
}