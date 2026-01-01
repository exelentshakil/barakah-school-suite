// FILE: src/lib/certificate-passing.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generatePassingCertificate(
    student: any,
    school: any,
    exam: any,
    gpa: number,
    grade: string,
    issueDate: string
) {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = '-9999px';
    div.style.width = '1122px'; // A4 landscape
    div.style.padding = '40px';
    div.style.backgroundColor = 'white';

    div.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&family=Noto+Naskh+Arabic&display=swap');
            * { font-family: 'Noto Sans Bengali', 'Noto Naskh Arabic', Arial, sans-serif; }
            .cert { 
                padding: 50px; 
                border: 12px double #D97706;
                background: linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%);
                position: relative;
            }
            .corner { 
                position: absolute; 
                width: 80px; 
                height: 80px; 
                border: 4px solid #D97706;
            }
            .tl { top: 20px; left: 20px; border-right: none; border-bottom: none; }
            .tr { top: 20px; right: 20px; border-left: none; border-bottom: none; }
            .bl { bottom: 20px; left: 20px; border-right: none; border-top: none; }
            .br { bottom: 20px; right: 20px; border-left: none; border-top: none; }
            .header { text-align: center; margin-bottom: 40px; }
            .title { 
                font-size: 48px; 
                font-weight: bold; 
                color: #D97706; 
                text-transform: uppercase; 
                letter-spacing: 4px; 
                margin: 30px 0;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            }
            .subtitle {
                font-size: 20px;
                color: #92400E;
                font-style: italic;
                margin: 10px 0;
            }
            .school-name { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .content { 
                text-align: center; 
                margin: 50px 0; 
                line-height: 2.5; 
                font-size: 20px; 
            }
            .student-name {
                font-size: 36px;
                font-weight: bold;
                color: #D97706;
                margin: 20px 0;
                text-decoration: underline;
                text-decoration-style: double;
            }
            .class-name {
                font-size: 28px;
                font-weight: bold;
                color: #92400E;
            }
            .grade-section {
                margin: 40px 0;
                padding: 20px;
                background: white;
                border-radius: 10px;
                display: inline-block;
            }
            .grade { 
                font-size: 48px; 
                font-weight: bold; 
                color: #059669;
            }
            .footer { 
                margin-top: 80px; 
                display: flex; 
                justify-content: space-around;
                align-items: flex-end;
            }
            .sign { text-align: center; }
            .sign-line { 
                border-top: 2px solid #000; 
                width: 200px; 
                margin: 10px auto; 
            }
            .seal {
                width: 120px;
                height: 120px;
                border: 3px solid #D97706;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                font-weight: bold;
                color: #D97706;
                margin: 0 auto 10px;
            }
        </style>
        <div class="cert">
            <div class="corner tl"></div>
            <div class="corner tr"></div>
            <div class="corner bl"></div>
            <div class="corner br"></div>
            
            <div class="header">
                <div class="school-name">${school.name}</div>
                <div style="font-size: 16px; margin: 5px 0;">${school.address}</div>
            </div>
            
            <div class="title">Certificate of Achievement</div>
            <div class="subtitle">This is to certify that</div>
            
            <div class="content">
                <div class="student-name">${student.name_en}</div>
                ${student.name_bn ? `<div style="font-size: 24px; color: #666; margin: 10px 0;">${student.name_bn}</div>` : ''}
                
                <div style="margin: 40px 0; font-size: 22px;">
                    has successfully completed
                </div>
                
                <div class="class-name">${exam.classes?.name || student.classes?.name || ''}</div>
                
                <div style="margin: 30px 0; font-size: 18px;">
                    in the academic year ${exam.academic_year || new Date().getFullYear()}
                </div>
                
                <div class="grade-section">
                    <div style="font-size: 18px; color: #666;">with</div>
                    <div class="grade">Grade: ${grade}</div>
                    <div style="font-size: 24px; color: #059669; font-weight: bold;">GPA: ${gpa.toFixed(2)}</div>
                </div>
                
                <div style="margin: 40px 0; font-size: 18px; font-style: italic; color: #666;">
                    We are proud of your achievement and wish you continued success!
                </div>
            </div>
            
            <div style="text-align: center; margin: 20px 0; font-size: 14px;">
                Date of Issue: ${new Date(issueDate).toLocaleDateString('en-GB')}
            </div>
            
            <div class="footer">
                <div class="sign">
                    <div class="sign-line"></div>
                    <div style="font-weight: bold;">Class Teacher</div>
                </div>
                <div class="sign">
                    <div class="seal">SCHOOL<br>SEAL</div>
                    <div style="font-size: 12px; color: #666;">Official Seal</div>
                </div>
                <div class="sign">
                    <div class="sign-line"></div>
                    <div style="font-weight: bold;">Principal</div>
                    <div>${school.name}</div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(div);
    await document.fonts.ready;

    const canvas = await html2canvas(div, { scale: 2, backgroundColor: '#ffffff' });
    document.body.removeChild(div);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 0, 0, 297, 210);

    return doc;
}