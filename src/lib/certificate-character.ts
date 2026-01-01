// FILE: src/lib/certificate-character.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateCharacterCertificate(student: any, school: any, issueDate: string, conduct: string, remarks: string) {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = '-9999px';
    div.style.width = '794px';
    div.style.padding = '40px';
    div.style.backgroundColor = 'white';

    div.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&family=Noto+Naskh+Arabic&display=swap');
            * { font-family: 'Noto Sans Bengali', 'Noto Naskh Arabic', Arial, sans-serif; }
            .cert { padding: 40px; border: 8px double #059669; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 32px; font-weight: bold; color: #059669; text-transform: uppercase; letter-spacing: 2px; margin: 20px 0; }
            .school-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .content { margin: 30px 0; line-height: 2; font-size: 16px; text-align: justify; }
            .footer { margin-top: 80px; text-align: right; }
            .sign-line { border-top: 2px solid #000; width: 200px; margin: 10px 0; display: inline-block; }
        </style>
        <div class="cert">
            <div class="header">
                <div class="school-name">${school.name}</div>
                <div style="font-size: 14px; margin: 5px 0;">${school.address}</div>
                <div style="font-size: 14px;">Phone: ${school.phone}</div>
            </div>
            
            <div class="title">Character Certificate</div>
            
            <div style="text-align: right; margin: 20px 0; font-size: 14px;">
                Date: ${new Date(issueDate).toLocaleDateString('en-GB')}
            </div>
            
            <div class="content">
                <p>To Whom It May Concern,</p>
                
                <p>This is to certify that <strong>${student.name_en}</strong>${student.name_bn ? ' (' + student.name_bn + ')' : ''}, 
                ${student.guardians?.father_name ? `son/daughter of ${student.guardians.father_name},` : ''} 
                was a student of <strong>${student.classes?.name || ''}</strong> in our institution.</p>
                
                <p>During his/her stay in our institution, we found his/her character and conduct to be <strong>${conduct || 'good'}</strong>.</p>
                
                ${remarks ? `<p>${remarks}</p>` : ''}
                
                <p>We wish him/her all success in life.</p>
            </div>
            
            <div class="footer">
                <div class="sign-line"></div>
                <div style="font-weight: bold;">Principal/Headmaster</div>
                <div>${school.name}</div>
            </div>
        </div>
    `;

    document.body.appendChild(div);
    await document.fonts.ready;

    const canvas = await html2canvas(div, { scale: 1, backgroundColor: '#ffffff' });
    document.body.removeChild(div);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 0, 0, 210, 297);

    return doc;
}