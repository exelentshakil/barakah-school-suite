// FILE: src/lib/certificate-transfer.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateTransferCertificate(student: any, school: any, issueDate: string, reason: string, conduct: string, remarks: string) {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = '-9999px';
    div.style.width = '794px'; // A4 width
    div.style.padding = '40px';
    div.style.backgroundColor = 'white';

    div.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&family=Noto+Naskh+Arabic&display=swap');
            * { font-family: 'Noto Sans Bengali', 'Noto Naskh Arabic', Arial, sans-serif; }
            .cert { padding: 40px; border: 8px double #4F46E5; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 32px; font-weight: bold; color: #4F46E5; text-transform: uppercase; letter-spacing: 2px; margin: 20px 0; }
            .school-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .info-row { display: flex; justify-content: space-between; margin: 15px 0; font-size: 16px; }
            .label { font-weight: bold; width: 200px; }
            .value { flex: 1; border-bottom: 1px dotted #000; }
            .content { margin: 30px 0; line-height: 1.8; font-size: 16px; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; }
            .sign { text-align: center; }
            .sign-line { border-top: 2px solid #000; width: 200px; margin: 10px auto; }
        </style>
        <div class="cert">
            <div class="header">
                <div class="school-name">${school.name}</div>
                <div style="font-size: 14px; margin: 5px 0;">${school.address}</div>
                <div style="font-size: 14px;">Phone: ${school.phone}</div>
            </div>
            
            <div class="title">Transfer Certificate</div>
            
            <div class="info-row">
                <span class="label">Certificate No:</span>
                <span class="value">${student.student_id}-TC-${Date.now()}</span>
            </div>
            
            <div class="info-row">
                <span class="label">Student Name:</span>
                <span class="value">${student.name_en}${student.name_bn ? ' / ' + student.name_bn : ''}</span>
            </div>
            
            <div class="info-row">
                <span class="label">Father's Name:</span>
                <span class="value">${student.guardians?.father_name || ''}</span>
            </div>
            
            <div class="info-row">
                <span class="label">Date of Birth:</span>
                <span class="value">${student.dob ? new Date(student.dob).toLocaleDateString('en-GB') : ''}</span>
            </div>
            
            <div class="info-row">
                <span class="label">Class:</span>
                <span class="value">${student.classes?.name || ''}</span>
            </div>
            
            <div class="info-row">
                <span class="label">Admission Date:</span>
                <span class="value">${student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-GB') : ''}</span>
            </div>
            
            <div class="content">
                This is to certify that <strong>${student.name_en}</strong> was a bonafide student of this institution.
                ${reason ? `<br><br>Reason for leaving: ${reason}` : ''}
                ${conduct ? `<br><br>Conduct: ${conduct}` : ''}
                ${remarks ? `<br><br>Remarks: ${remarks}` : ''}
            </div>
            
            <div class="info-row">
                <span class="label">Date of Issue:</span>
                <span class="value">${new Date(issueDate).toLocaleDateString('en-GB')}</span>
            </div>
            
            <div class="footer">
                <div class="sign">
                    <div class="sign-line"></div>
                    <div>Class Teacher</div>
                </div>
                <div class="sign">
                    <div class="sign-line"></div>
                    <div>Principal/Headmaster</div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(div);
    await document.fonts.ready;

    const canvas = await html2canvas(div, { scale: 2, backgroundColor: '#ffffff' });
    document.body.removeChild(div);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 0, 0, 210, 297);

    return doc;
}