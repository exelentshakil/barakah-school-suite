// FILE: src/lib/admit-card.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

/**
 * Generates a single Admit Card PDF
 */
export async function generateAdmitCard(student: any, exam: any, examSubjects: any[], school: any) {
    // 1. Setup PDF (A5 Landscape: 210mm x 148mm)
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a5' // Standard size for admit cards
    });

    // 2. Generate content and add to PDF
    await addAdmitCardToDoc(doc, student, exam, examSubjects, school, true);

    return doc;
}

/**
 * Generates a Bulk Admit Card PDF (Multiple students in one file)
 */
export async function generateBulkAdmitCards(students: any[], exam: any, examSubjects: any[], school: any) {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a5'
    });

    for (let i = 0; i < students.length; i++) {
        if (i > 0) doc.addPage('a5', 'landscape');
        await addAdmitCardToDoc(doc, students[i], exam, examSubjects, school, i === 0);
    }

    return doc;
}

/**
 * Helper function to render HTML to Canvas and add to PDF
 */
async function addAdmitCardToDoc(doc: jsPDF, student: any, exam: any, examSubjects: any[], school: any, isFirst: boolean) {
    // Generate QR code (Student ID verification)
    // const qrCodeDataURL = await QRCode.toDataURL(student.student_id, { width: 400, margin: 1 });
    const verificationUrl = `${window.location.origin}/verify-admit-card?student=${student.id}&exam=${exam.id}`;

    const qrCodeDataURL = await QRCode.toDataURL(verificationUrl, {
        width: 400,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
    });

    // Format subjects table rows
    const subjectsRows = examSubjects.map((sub: any) => `
        <tr>
            <td style="text-align: left; padding-left: 10px;">
                ${sub.subjects?.name || sub.subject_name} 
                ${sub.subjects?.code ? `<span style="color: #666; font-size: 10px;">(${sub.subjects.code})</span>` : ''}
            </td>
            <td>${sub.date ? new Date(sub.date).toLocaleDateString() : '--/--/--'}</td>
            <td>${sub.time || '--:--'}</td>
            <td></td> <!-- Invigilator Signature -->
        </tr>
    `).join('');

    // Create container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    // A5 Landscape is approx 794px width at 96 DPI, but we use high res scale later.
    // We set a fixed width ratio consistent with A5 (210mm / 148mm ~ 1.41)
    container.style.width = '800px';
    container.style.backgroundColor = 'white';

    container.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&family=Noto+Naskh+Arabic&display=swap');
            * { font-family: 'Noto Sans Bengali', 'Noto Naskh Arabic', Arial, sans-serif; box-sizing: border-box; }
            
            .admit-card-container {
                width: 800px;
                min-height: 560px; /* Approx A5 ratio height */
                padding: 30px;
                background-color: white;
                position: relative;
                border: 1px solid #ddd;
            }

            /* Watermark */
            .watermark {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-15deg);
                font-size: 80px;
                font-weight: bold;
                color: rgba(0,0,0,0.03);
                white-space: nowrap;
                pointer-events: none;
                z-index: 0;
            }

            /* Header */
            .header {
                text-align: center;
                border-bottom: 2px solid #333;
                padding-bottom: 15px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 20px;
            }
            .logo { width: 60px; height: 60px; object-fit: contain; }
            .school-info h1 { margin: 0; font-size: 24px; text-transform: uppercase; color: #1a1a1a; }
            .school-info p { margin: 5px 0 0; font-size: 12px; color: #555; }
            
            .badge {
                background: #1a1a1a;
                color: white;
                padding-top: 10px;
                padding-bottom: 20px;
                padding-left: 20px;
                padding-right: 20px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                margin-top: 20px;
                display: inline-block;
            }
            
            /* Exam Title */
            .exam-title {
                text-align: center;
                margin-bottom: 25px;
            }
            .exam-title h2 { margin: 0; font-size: 20px; color: #333; }
            .exam-title p { margin: 5px 0 0; font-size: 14px; color: #666; }

            /* Student Info Grid */
            .student-info-grid {
                display: flex;
                gap: 30px;
                margin-bottom: 25px;
            }
            .info-table {
                flex: 1;
                border-collapse: collapse;
            }
            .info-table td {
                padding: 6px 10px;
                font-size: 14px;
                border-bottom: 1px solid #eee;
            }
            .label { font-weight: bold; color: #555; width: 120px; }
            .value { font-weight: bold; color: #000; }
            
            .photo-box {
                width: 120px;
                height: 140px;
                border: 2px solid #333;
                padding: 4px;
                background: white;
            }
            .photo {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            /* Subjects Table */
            .subjects-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 40px;
            }
            .subjects-table th {
                background-color: #f3f4f6;
                padding: 8px;
                font-size: 12px;
                border: 1px solid #ddd;
                text-align: center;
            }
            .subjects-table td {
                padding: 8px;
                font-size: 12px;
                border: 1px solid #ddd;
                text-align: center;
            }

            /* Footer */
            .footer {
                display: flex;
                justify-content: space-between;
                margin-top: 50px;
                padding-top: 20px;
            }
            .signature-box {
                text-align: center;
            }
            .signature-line {
                width: 150px;
                border-top: 1px dashed #333;
                margin-bottom: 5px;
            }
            .signature-label {
                font-size: 12px;
                color: #555;
            }
            
            .instructions {
                margin-top: 30px;
                font-size: 10px;
                color: #666;
                border-top: 1px solid #eee;
                padding-top: 10px;
            }
            .instructions ul { margin: 5px 0 0; padding-left: 20px; }

            .qr-corner {
                position: absolute;
                bottom: 30px;
                right: 50%;
                transform: translateY(-150%);
                text-align: center;
            }
            .qr-img { width: 60px; opacity: 0.8; }
            .qr-text { font-size: 8px; margin-top: 2px; }
        </style>

        <div class="admit-card-container">
            <div class="watermark">${school.name}</div>

            <div class="header">
                ${school.logo_url ? `<img src="${school.logo_url}" class="logo" crossorigin="anonymous" />` : ''}
                <div class="school-info">
                    <h1>${school.name}</h1>
                    <p>${school.address}</p>
                    <div class="badge">Admit Card</div>
                </div>
            </div>

            <div class="exam-title">
                <h2>${exam.name}</h2>
                <p>Academic Year: ${exam.academic_year}</p>
            </div>

            <div class="student-info-grid">
                <table class="info-table">
                    <tr>
                        <td class="label">Student Name</td>
                        <td class="value">${student.name_en}</td>
                    </tr>
                    <tr>
                        <td class="label">Student ID</td>
                        <td class="value">${student.student_id}</td>
                    </tr>
                    <tr>
                        <td class="label">Class & Section</td>
                        <td class="value">${student.classes?.name || 'N/A'} - ${student.sections?.name || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="label">Roll Number</td>
                        <td class="value">${student.roll || 'N/A'}</td>
                    </tr>
                </table>

                <div class="photo-box">
                    ${student.photo_url
        ? `<img src="${student.photo_url}" class="photo" crossorigin="anonymous" />`
        : '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#f0f0f0; color:#999; font-size:10px;">PHOTO</div>'}
                </div>
            </div>

            <table class="subjects-table">
                <thead>
                    <tr>
                        <th style="width: 40%;">Subject</th>
                        <th style="width: 20%;">Date</th>
                        <th style="width: 20%;">Time</th>
                        <th style="width: 20%;">Invigilator Sign</th>
                    </tr>
                </thead>
                <tbody>
                    ${subjectsRows.length > 0 ? subjectsRows : '<tr><td colspan="4" style="padding:20px; color:#999;">No subjects scheduled</td></tr>'}
                </tbody>
            </table>

            <div class="footer">
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">Student Signature</div>
                </div>
                <div class="qr-corner">
                    <img src="${qrCodeDataURL}" class="qr-img" />
                </div>
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">Controller of Examinations</div>
                </div>
            </div>

            <div class="instructions">
                <strong>Instructions:</strong>
                <ul>
                    <li>This Admit Card must be produced on demand in the Examination Hall.</li>
                    <li>Students are strictly prohibited from bringing mobile phones or electronic devices.</li>
                    <li>Please report 15 minutes prior to the commencement of the examination.</li>
                </ul>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    // Wait for DOM and Images
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 500));

    // Convert to Canvas
    const canvas = await html2canvas(container, {
        scale: 2, // High resolution
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true
    });

    document.body.removeChild(container);

    // Add to PDF
    const imgData = canvas.toDataURL('image/png');
    // A5 Landscape Dimensions
    const pdfWidth = 210;
    const pdfHeight = 148;

    doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
}