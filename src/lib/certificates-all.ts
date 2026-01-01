// FILE: src/lib/certificates-all.ts - FIXED CERTIFICATES
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

// Helper to create properly hidden container (visible to html2canvas, invisible to users)
const createHiddenContainer = () => {
    const container = document.createElement('div');
    container.style.cssText = `
    position: absolute !important;
    top: -99999px !important;
    left: -99999px !important;
    width: 297mm !important;
    height: 210mm !important;
    pointer-events: none !important;
    z-index: -99999 !important;
  `;
    return container;
};

// PASSING CERTIFICATE
export async function generatePassingCertificate(student: any, exam: any, school: any, certificate: any) {
    const verificationUrl = `${window.location.origin}/verify-certificate?id=${certificate.id}&type=passing`;
    const qrCodeDataURL = await QRCode.toDataURL(verificationUrl, { width: 300, margin: 1 });

    const container = createHiddenContainer();

    container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&family=Noto+Serif:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .certificate {
        width: 297mm;
        height: 210mm;
        background: white;
        padding: 8mm;
        font-family: 'Noto Serif', serif;
        position: relative;
      }
      .border {
        width: 100%;
        height: 100%;
        border: 3px double #000;
        padding: 2.5mm;
      }
      .inner-border {
        width: 100%;
        height: 100%;
        border: 1px solid #000;
        padding: 6mm 10mm;
        display: flex;
        flex-direction: column;
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 6mm;
        margin-bottom: 6mm;
      }
      .logo {
        width: 45px;
        height: 45px;
        border: 2px solid #000;
        border-radius: 50%;
        margin: 0 auto 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
      }
      .school-name {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 2px;
        text-transform: uppercase;
      }
      .school-address {
        font-size: 10px;
        color: #333;
      }
      .cert-meta {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        margin-bottom: 6mm;
      }
      .cert-title {
        font-size: 16px;
        font-weight: 700;
        text-align: center;
        margin-bottom: 6mm;
        text-transform: uppercase;
        text-decoration: underline;
      }
      .content {
        font-size: 12px;
        line-height: 1.6;
        flex: 1;
      }
      .row {
        display: flex;
        margin: 3.5mm 0;
        align-items: baseline;
      }
      .label {
        font-style: italic;
        min-width: 160px;
        flex-shrink: 0;
      }
      .value {
        flex: 1;
        border-bottom: 1px solid #000;
        padding: 0 8px 2px 8px;
        font-weight: 600;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: auto;
        padding-top: 5mm;
      }
      .left-section {
        font-size: 9px;
        color: #666;
        flex: 1;
      }
      .qr-section {
        text-align: center;
        margin: 0 15px;
      }
      .qr-code {
        width: 45px;
        height: 45px;
        border: 1px solid #000;
      }
      .qr-label {
        font-size: 7px;
        margin-top: 2px;
        color: #666;
      }
      .signature {
        text-align: center;
        flex: 1;
      }
      .sig-line {
        width: 110px;
        border-top: 1px solid #000;
        margin: 28px auto 4px auto;
      }
      .sig-text {
        font-size: 10px;
        font-weight: 600;
      }
      .branding {
        position: absolute;
        bottom: 2mm;
        right: 10mm;
        font-size: 7px;
        color: #ccc;
        font-family: Arial, sans-serif;
      }
    </style>
    <div class="certificate">
      <div class="border">
        <div class="inner-border">
          <div class="header">
            <div class="logo">🎓</div>
            <div class="school-name">${school?.name || 'School Name'}</div>
            <div class="school-address">${school?.address || ''}</div>
          </div>

          <div class="cert-meta">
            <div>Serial No. ${certificate.certificate_no}</div>
            <div>Date: ${new Date(certificate.issue_date).toLocaleDateString('en-GB')}</div>
          </div>

          <div class="cert-title">Certificate of Examination</div>

          <div class="content">
            <div class="row">
              <div class="label">This is to Certify that</div>
              <div class="value">${student.name_en}</div>
            </div>

            <div class="row">
              <div class="label">Son / Daughter of</div>
              <div class="value">${student.guardians?.father_name || ''}</div>
            </div>

            <div class="row">
              <div class="label">bearing Roll</div>
              <div class="value" style="max-width: 100px;">${student.roll || student.student_id}</div>
              <div class="label" style="min-width: 100px; margin-left: 15px;">duly passed the ${exam.name}</div>
            </div>

            <div class="row">
              <div class="label">Examination in</div>
              <div class="value" style="max-width: 150px;">${student.classes?.name || 'N/A'}</div>
              <div class="label" style="min-width: 120px; margin-left: 15px;">class and secured</div>
            </div>

            <div class="row">
              <div class="label">G.P.A</div>
              <div class="value" style="max-width: 80px;">${certificate.gpa.toFixed(2)}</div>
              <div class="label" style="min-width: auto; margin-left: 15px;">on a scale of 5.00 .</div>
            </div>
          </div>

          <div class="footer">
            <div class="left-section">
              ${school?.address || ''}<br/>
              Date: ${new Date(certificate.issue_date).toLocaleDateString('en-GB')}
            </div>

            <div class="qr-section">
              <img src="${qrCodeDataURL}" class="qr-code" />
              <div class="qr-label">Verify</div>
            </div>

            <div class="signature">
              <div class="sig-line"></div>
              <div class="sig-text">Principal</div>
            </div>
          </div>

          <div class="branding">Powered By BarakahSoft.com</div>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(container);
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
    });

    document.body.removeChild(container);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, 297, 210);
    return doc;
}

// TRANSFER CERTIFICATE
export async function generateTransferCertificate(student: any, school: any, certificate: any) {
    const verificationUrl = `${window.location.origin}/verify-certificate?id=${certificate.id}&type=other`;
    const qrCodeDataURL = await QRCode.toDataURL(verificationUrl, { width: 300, margin: 1 });

    const container = createHiddenContainer();

    const fields = [];
    if (student.name_en) fields.push({ label: 'Name of Student', value: student.name_en });
    if (student.student_id) fields.push({ label: 'Student ID', value: student.student_id });
    if (student.guardians?.father_name) fields.push({ label: "Father's Name", value: student.guardians.father_name });
    if (student.guardians?.mother_name) fields.push({ label: "Mother's Name", value: student.guardians.mother_name });
    if (student.dob) fields.push({ label: 'Date of Birth', value: new Date(student.dob).toLocaleDateString('en-GB') });
    if (student.classes?.name) fields.push({ label: 'Class Last Studied', value: student.classes.name });
    if (student.admission_date) fields.push({ label: 'Date of Admission', value: new Date(student.admission_date).toLocaleDateString('en-GB') });
    if (certificate.leaving_date) fields.push({ label: 'Date of Leaving', value: new Date(certificate.leaving_date).toLocaleDateString('en-GB') });
    if (certificate.reason) fields.push({ label: 'Reason', value: certificate.reason });
    if (certificate.conduct) fields.push({ label: 'Conduct', value: certificate.conduct });

    container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&family=Noto+Serif:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .certificate {
        width: 297mm;
        height: 210mm;
        background: white;
        padding: 8mm;
        font-family: 'Noto Serif', serif;
      }
      .border {
        width: 100%;
        height: 100%;
        border: 3px double #000;
        padding: 2.5mm;
      }
      .inner-border {
        width: 100%;
        height: 100%;
        border: 1px solid #000;
        padding: 6mm 10mm;
        position: relative;
        display: flex;
        flex-direction: column;
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 6mm;
        margin-bottom: 5mm;
      }
      .logo {
        width: 45px;
        height: 45px;
        border: 2px solid #000;
        border-radius: 50%;
        margin: 0 auto 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
      }
      .school-name {
        font-size: 18px;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .school-address {
        font-size: 10px;
      }
      .cert-meta {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        margin-bottom: 5mm;
      }
      .cert-title {
        font-size: 16px;
        font-weight: 700;
        text-align: center;
        margin-bottom: 6mm;
        text-transform: uppercase;
        text-decoration: underline;
      }
      .fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3mm 8mm;
        font-size: 11px;
        flex: 1;
      }
      .field {
        display: flex;
        align-items: baseline;
      }
      .field-label {
        min-width: 100px;
        font-weight: 600;
        flex-shrink: 0;
      }
      .field-value {
        flex: 1;
        border-bottom: 1px dotted #000;
        padding-bottom: 2px;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: auto;
        padding-top: 5mm;
      }
      .left-section {
        font-size: 9px;
        color: #666;
        flex: 1;
      }
      .qr-section {
        text-align: center;
        margin: 0 15px;
      }
      .qr-code {
        width: 45px;
        height: 45px;
        border: 1px solid #000;
      }
      .signature {
        text-align: center;
        flex: 1;
      }
      .sig-line {
        width: 110px;
        border-top: 1px solid #000;
        margin: 28px auto 4px auto;
      }
      .sig-text {
        font-size: 10px;
        font-weight: 600;
      }
      .branding {
        position: absolute;
        bottom: 0mm;
        right: 10mm;
        font-size: 7px;
        color: #ccc;
        font-family: Arial, sans-serif;
      }
    </style>
    <div class="certificate">
      <div class="border">
        <div class="inner-border">
          <div class="header">
            <div class="logo">📄</div>
            <div class="school-name">${school?.name || 'School Name'}</div>
            <div class="school-address">${school?.address || ''}</div>
          </div>

          <div class="cert-meta">
            <div>Certificate No. ${certificate.certificate_no}</div>
            <div>Date: ${new Date(certificate.issue_date).toLocaleDateString('en-GB')}</div>
          </div>

          <div class="cert-title">Transfer Certificate</div>

          <div class="fields">
            ${fields.map(field => `
              <div class="field">
                <div class="field-label">${field.label}:</div>
                <div class="field-value">${field.value}</div>
              </div>
            `).join('')}
          </div>

          <div class="footer">
            <div class="left-section">
              ${school?.name || ''}<br/>
              ${school?.address || ''}
            </div>

            <div class="qr-section">
              <img src="${qrCodeDataURL}" class="qr-code" />
            </div>

            <div class="signature">
              <div class="sig-line"></div>
              <div class="sig-text">Principal</div>
            </div>
          </div>

          <div class="branding">Powered By BarakahSoft.com</div>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(container);
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
    });

    document.body.removeChild(container);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, 297, 210);
    return doc;
}

// CHARACTER CERTIFICATE
export async function generateCharacterCertificate(student: any, school: any, certificate: any) {
    const verificationUrl = `${window.location.origin}/verify-certificate?id=${certificate.id}&type=other`;
    const qrCodeDataURL = await QRCode.toDataURL(verificationUrl, { width: 300, margin: 1 });

    const container = createHiddenContainer();

    container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&family=Noto+Serif:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .certificate {
        width: 297mm;
        height: 210mm;
        background: white;
        padding: 8mm;
        font-family: 'Noto Serif', serif;
      }
      .border {
        width: 100%;
        height: 100%;
        border: 3px double #000;
        padding: 2.5mm;
      }
      .inner-border {
        width: 100%;
        height: 100%;
        border: 1px solid #000;
        padding: 6mm 10mm;
        position: relative;
        display: flex;
        flex-direction: column;
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 6mm;
        margin-bottom: 5mm;
      }
      .logo {
        width: 45px;
        height: 45px;
        border: 2px solid #000;
        border-radius: 50%;
        margin: 0 auto 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
      }
      .school-name {
        font-size: 18px;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .school-address {
        font-size: 10px;
      }
      .cert-meta {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        margin-bottom: 5mm;
      }
      .cert-title {
        font-size: 16px;
        font-weight: 700;
        text-align: center;
        margin-bottom: 6mm;
        text-transform: uppercase;
        text-decoration: underline;
      }
      .content {
        font-size: 14px;
        line-height: 2.2;
        text-align: justify;
        flex: 1;
      }
      .content p {
        margin-bottom: 12px;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: auto;
        padding-top: 5mm;
      }
      .left-section {
        font-size: 9px;
        color: #666;
        flex: 1;
      }
      .qr-section {
        text-align: center;
        margin: 0 15px;
      }
      .qr-code {
        width: 45px;
        height: 45px;
        border: 1px solid #000;
      }
      .signature {
        text-align: center;
        flex: 1;
      }
      .sig-line {
        width: 110px;
        border-top: 1px solid #000;
        margin: 28px auto 4px auto;
      }
      .sig-text {
        font-size: 10px;
        font-weight: 600;
      }
      .branding {
        position: absolute;
        bottom: 2mm;
        right: 10mm;
        font-size: 7px;
        color: #ccc;
        font-family: Arial, sans-serif;
      }
    </style>
    <div class="certificate">
      <div class="border">
        <div class="inner-border">
          <div class="header">
            <div class="logo">✓</div>
            <div class="school-name">${school?.name || 'School Name'}</div>
            <div class="school-address">${school?.address || ''}</div>
          </div>

          <div class="cert-meta">
            <div>Certificate No. ${certificate.certificate_no}</div>
            <div>Date: ${new Date(certificate.issue_date).toLocaleDateString('en-GB')}</div>
          </div>

          <div class="cert-title">Character Certificate</div>

          <div class="content">
            <p>
              This is to certify that <strong>${student.name_en}</strong>, Student ID <strong>${student.student_id}</strong>, 
              ${student.guardians?.father_name ? `son/daughter of <strong>${student.guardians.father_name}</strong>,` : ''} 
              was a student of this institution in Class <strong>${student.classes?.name || 'N/A'}</strong>.
            </p>

            <p>
              During the period of study, the student maintained <strong>${certificate.conduct || 'GOOD'}</strong> conduct 
              and behavior. The student was punctual, respectful to teachers and peers, and followed all institutional rules and regulations.
            </p>

            ${certificate.remarks ? `<p><strong>Remarks:</strong> ${certificate.remarks}</p>` : ''}

            <p>We wish the student success in all future endeavors and highly recommend them for any academic or professional opportunity they may pursue.</p>
          </div>

          <div class="footer">
            <div class="left-section">
              ${school?.name || ''}<br/>
              ${school?.address || ''}
            </div>

            <div class="qr-section">
              <img src="${qrCodeDataURL}" class="qr-code" />
            </div>

            <div class="signature">
              <div class="sig-line"></div>
              <div class="sig-text">Principal</div>
            </div>
          </div>

          <div class="branding">Powered By BarakahSoft.com</div>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(container);
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
    });

    document.body.removeChild(container);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, 297, 210);
    return doc;
}

// HIFZ CERTIFICATE
export async function generateHifzCertificate(student: any, school: any, certificate: any) {
    const verificationUrl = `${window.location.origin}/verify-certificate?id=${certificate.id}&type=other`;
    const qrCodeDataURL = await QRCode.toDataURL(verificationUrl, { width: 300, margin: 1 });

    const container = createHiddenContainer();

    container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&family=Amiri:wght@400;700&family=Noto+Serif:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .certificate {
        width: 297mm;
        height: 210mm;
        background: white;
        padding: 8mm;
        font-family: 'Noto Serif', serif;
      }
      .border {
        width: 100%;
        height: 100%;
        border: 3px double #000;
        padding: 2.5mm;
      }
      .inner-border {
        width: 100%;
        height: 100%;
        border: 1px solid #000;
        padding: 5mm 10mm;
        position: relative;
        display: flex;
        flex-direction: column;
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 5mm;
        margin-bottom: 4mm;
      }
      .crescent {
        font-size: 28px;
        margin-bottom: 6px;
      }
      .school-name {
        font-size: 18px;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .school-address {
        font-size: 10px;
      }
      .bismillah {
        font-family: 'Amiri', serif;
        font-size: 20px;
        text-align: center;
        margin: 5mm 0;
        direction: rtl;
        font-weight: 700;
      }
      .cert-meta {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        margin-bottom: 4mm;
      }
      .cert-title {
        font-size: 16px;
        font-weight: 700;
        text-align: center;
        margin-bottom: 5mm;
        text-transform: uppercase;
        text-decoration: underline;
      }
      .content {
        font-size: 12px;
        line-height: 1.6;
        flex: 1;
      }
      .row {
        display: flex;
        margin: 3mm 0;
        align-items: baseline;
      }
      .label {
        font-style: italic;
        min-width: 140px;
        flex-shrink: 0;
      }
      .value {
        flex: 1;
        border-bottom: 1px solid #000;
        padding: 0 8px 2px 8px;
        font-weight: 600;
      }
      .quran-box {
        border: 1px solid #000;
        padding: 7px;
        margin: 5mm 0;
        text-align: center;
      }
      .quran-text {
        font-family: 'Amiri', serif;
        font-size: 16px;
        direction: rtl;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .quran-trans {
        font-size: 9px;
        font-style: italic;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: auto;
        padding-top: 4mm;
      }
      .left-section {
        font-size: 9px;
        color: #666;
        flex: 1;
      }
      .qr-section {
        text-align: center;
        margin: 0 15px;
      }
      .qr-code {
        width: 45px;
        height: 45px;
        border: 1px solid #000;
      }
      .signature {
        text-align: center;
        flex: 1;
      }
      .sig-line {
        width: 110px;
        border-top: 1px solid #000;
        margin: 25px auto 4px auto;
      }
      .sig-text {
        font-size: 10px;
        font-weight: 600;
      }
      .branding {
        position: absolute;
        bottom: 2mm;
        right: 10mm;
        font-size: 7px;
        color: #ccc;
        font-family: Arial, sans-serif;
      }
    </style>
    <div class="certificate">
      <div class="border">
        <div class="inner-border">
          <div class="header">
            <div class="crescent">☪</div>
            <div class="school-name">${school?.name || 'Islamic School'}</div>
            <div class="school-address">${school?.address || ''}</div>
          </div>

          <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>

          <div class="cert-meta">
            <div>Certificate No. ${certificate.certificate_no}</div>
            <div>Date: ${new Date(certificate.issue_date).toLocaleDateString('en-GB')}</div>
          </div>

          <div class="cert-title">Certificate of Quran Memorization</div>

          <div class="content">
            <div class="row">
              <div class="label">This is to Certify that</div>
              <div class="value">${student.name_en}</div>
            </div>

            <div class="row">
              <div class="label">Son / Daughter of</div>
              <div class="value">${student.guardians?.father_name || ''}</div>
            </div>

            <div class="row">
              <div class="label">bearing Student ID</div>
              <div class="value">${student.student_id}</div>
            </div>

            <div style="margin: 5mm 0; text-align: center; font-size: 13px;">
              has successfully completed the memorization of the <strong>HOLY QURAN</strong><br/>
              (30 Juz / 114 Surahs) with proper Tajweed.
            </div>

            ${certificate.completion_date ? `
            <div class="row">
              <div class="label">Date of Completion</div>
              <div class="value">${new Date(certificate.completion_date).toLocaleDateString('en-GB')}</div>
            </div>
            ` : ''}

            ${certificate.teacher_name ? `
            <div class="row">
              <div class="label">Under guidance of</div>
              <div class="value">${certificate.teacher_name}</div>
            </div>
            ` : ''}
          </div>

          <div class="quran-box">
            <div class="quran-text">وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ</div>
            <div class="quran-trans">"And We have made the Quran easy for remembrance" (54:17)</div>
          </div>

          <div class="footer">
            <div class="left-section">
              ${school?.name || ''}<br/>
              Date: ${new Date(certificate.issue_date).toLocaleDateString('en-GB')}
            </div>

            <div class="qr-section">
              <img src="${qrCodeDataURL}" class="qr-code" />
            </div>

            <div class="signature">
              <div class="sig-line"></div>
              <div class="sig-text">Principal</div>
            </div>
          </div>

          <div class="branding">Powered By BarakahSoft.com</div>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(container);
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
    });

    document.body.removeChild(container);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, 297, 210);
    return doc;
}