// FILE: src/lib/certificate-hifz.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateHifzCertificate(
    student: any,
    school: any,
    completionDate: string,
    paras: number,
    surahs: string,
    teacher: string,
    remarks: string
) {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = '-9999px';
    div.style.width = '1122px'; // A4 landscape
    div.style.padding = '40px';
    div.style.backgroundColor = 'white';

    div.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&family=Noto+Naskh+Arabic&family=Amiri:wght@400;700&display=swap');
            * { font-family: 'Noto Sans Bengali', 'Noto Naskh Arabic', 'Amiri', Arial, sans-serif; }
            .cert { 
                padding: 50px; 
                border: 15px double #047857;
                background: linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%);
                position: relative;
            }
            .islamic-pattern {
                position: absolute;
                width: 150px;
                height: 150px;
                opacity: 0.1;
            }
            .pattern-tl { top: 30px; left: 30px; }
            .pattern-tr { top: 30px; right: 30px; transform: rotate(90deg); }
            .pattern-bl { bottom: 30px; left: 30px; transform: rotate(270deg); }
            .pattern-br { bottom: 30px; right: 30px; transform: rotate(180deg); }
            .header { text-align: center; margin-bottom: 30px; }
            .bismillah { 
                font-size: 32px; 
                font-family: 'Amiri', serif;
                color: #047857; 
                margin: 20px 0;
                direction: rtl;
            }
            .title { 
                font-size: 42px; 
                font-weight: bold; 
                color: #047857; 
                text-transform: uppercase; 
                letter-spacing: 3px; 
                margin: 20px 0;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            }
            .arabic-title {
                font-size: 36px;
                font-family: 'Amiri', serif;
                color: #065F46;
                direction: rtl;
                margin: 10px 0;
            }
            .school-name { 
                font-size: 28px; 
                font-weight: bold; 
                margin-bottom: 10px;
                color: #065F46;
            }
            .content { 
                text-align: center; 
                margin: 40px 0; 
                line-height: 2.5; 
                font-size: 18px; 
            }
            .student-name {
                font-size: 38px;
                font-weight: bold;
                color: #047857;
                margin: 20px 0;
                text-decoration: underline;
                text-decoration-style: double;
            }
            .achievement-box {
                margin: 30px auto;
                padding: 30px;
                background: white;
                border: 3px solid #047857;
                border-radius: 15px;
                max-width: 800px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .stats {
                display: flex;
                justify-content: space-around;
                margin: 20px 0;
            }
            .stat-item {
                text-align: center;
                padding: 20px;
            }
            .stat-number {
                font-size: 48px;
                font-weight: bold;
                color: #047857;
            }
            .stat-label {
                font-size: 16px;
                color: #065F46;
                margin-top: 5px;
            }
            .quran-verse {
                font-family: 'Amiri', serif;
                font-size: 24px;
                color: #065F46;
                direction: rtl;
                margin: 30px 0;
                padding: 20px;
                background: rgba(4, 120, 87, 0.05);
                border-radius: 10px;
            }
            .footer { 
                margin-top: 60px; 
                display: flex; 
                justify-content: space-around;
                align-items: flex-end;
            }
            .sign { text-align: center; }
            .sign-line { 
                border-top: 2px solid #047857; 
                width: 200px; 
                margin: 10px auto; 
            }
            .seal {
                width: 120px;
                height: 120px;
                border: 4px solid #047857;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                color: #047857;
                margin: 0 auto 10px;
                background: white;
            }
        </style>
        <div class="cert">
            <svg class="islamic-pattern pattern-tl" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#047857" stroke-width="2"/>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#047857" stroke-width="2"/>
                <circle cx="50" cy="50" r="20" fill="none" stroke="#047857" stroke-width="2"/>
            </svg>
            <svg class="islamic-pattern pattern-tr" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#047857" stroke-width="2"/>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#047857" stroke-width="2"/>
                <circle cx="50" cy="50" r="20" fill="none" stroke="#047857" stroke-width="2"/>
            </svg>
            <svg class="islamic-pattern pattern-bl" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#047857" stroke-width="2"/>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#047857" stroke-width="2"/>
                <circle cx="50" cy="50" r="20" fill="none" stroke="#047857" stroke-width="2"/>
            </svg>
            <svg class="islamic-pattern pattern-br" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#047857" stroke-width="2"/>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#047857" stroke-width="2"/>
                <circle cx="50" cy="50" r="20" fill="none" stroke="#047857" stroke-width="2"/>
            </svg>
            
            <div class="header">
                <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                <div class="school-name">${school.name}</div>
                <div style="font-size: 16px; margin: 5px 0;">${school.address}</div>
            </div>
            
            <div class="arabic-title">شهادة حفظ القرآن الكريم</div>
            <div class="title">Hifz Certificate</div>
            <div style="text-align: center; font-size: 20px; color: #065F46; font-style: italic; margin: 10px 0;">
                Certificate of Quran Memorization
            </div>
            
            <div class="content">
                <div style="font-size: 20px; color: #065F46; margin: 20px 0;">
                    ٱلْحَمْدُ لِلَّهِ - Alhamdulillah
                </div>
                
                <div style="font-size: 18px; margin: 20px 0;">
                    This is to certify that
                </div>
                
                <div class="student-name">${student.name_en}</div>
                ${student.name_bn ? `<div style="font-size: 24px; color: #666; margin: 10px 0;">${student.name_bn}</div>` : ''}
                
                <div style="font-size: 18px; margin: 20px 0;">
                    ${student.guardians?.father_name ? `Son/Daughter of ${student.guardians.father_name}` : ''}
                </div>
                
                <div class="achievement-box">
                    <div style="font-size: 22px; font-weight: bold; color: #047857; margin-bottom: 20px;">
                        Has Successfully Completed the Memorization of
                    </div>
                    
                    <div class="stats">
                        <div class="stat-item">
                            <div class="stat-number">${paras}</div>
                            <div class="stat-label">Para${paras > 1 ? 's' : ''}</div>
                            <div style="font-family: 'Amiri', serif; font-size: 20px; color: #047857; margin-top: 5px;">
                                ${paras === 30 ? 'جُزْءٍ' : 'أَجْزَاء'}
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">✓</div>
                            <div class="stat-label">Surahs</div>
                            <div style="font-size: 14px; color: #666; margin-top: 5px;">
                                ${surahs || 'Multiple Surahs'}
                            </div>
                        </div>
                    </div>
                    
                    ${paras === 30 ? `
                        <div style="font-size: 28px; font-weight: bold; color: #047857; margin: 20px 0;">
                            🌟 COMPLETE HOLY QURAN 🌟
                        </div>
                        <div style="font-size: 18px; color: #065F46;">
                            Full 30 Juz memorized - May Allah accept this noble achievement
                        </div>
                    ` : ''}
                </div>
                
                <div class="quran-verse">
                    وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ
                    <div style="font-size: 16px; margin-top: 10px; color: #666; font-family: Arial;">
                        "And We have certainly made the Quran easy for remembrance, so is there any who will remember?"
                        <br>(Surah Al-Qamar: 54:17)
                    </div>
                </div>
                
                ${teacher ? `
                    <div style="margin: 20px 0; font-size: 16px;">
                        <strong>Under the guidance of:</strong> ${teacher}
                    </div>
                ` : ''}
                
                ${remarks ? `
                    <div style="margin: 20px 0; font-size: 16px; color: #065F46;">
                        ${remarks}
                    </div>
                ` : ''}
                
                <div style="margin: 30px 0; font-size: 18px; color: #047857; font-weight: bold;">
                    May Allah preserve this knowledge and make it a means of success in both worlds
                </div>
            </div>
            
            <div style="text-align: center; margin: 20px 0; font-size: 14px;">
                Date of Completion: ${new Date(completionDate).toLocaleDateString('en-GB')}
            </div>
            
            <div class="footer">
                <div class="sign">
                    <div class="sign-line"></div>
                    <div style="font-weight: bold;">Quran Teacher</div>
                    <div style="font-size: 14px; color: #666;">${teacher || 'Ustadh/Ustadha'}</div>
                </div>
                <div class="sign">
                    <div class="seal">
                        <div style="text-align: center;">
                            MADRASA<br>SEAL
                        </div>
                    </div>
                    <div style="font-size: 12px; color: #666;">Official Seal</div>
                </div>
                <div class="sign">
                    <div class="sign-line"></div>
                    <div style="font-weight: bold;">Principal/Mudir</div>
                    <div style="font-size: 14px;">${school.name}</div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
                ${school.phone} • ${school.address}
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