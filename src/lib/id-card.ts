// FILE: src/lib/id-card.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

export async function generateIDCard(student: any, school: any) {
    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(student.student_id, { width: 400, margin: 1 });

    // Create container for front and back
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1012px'; // Two cards side by side (506px each)
    container.style.backgroundColor = 'white';

    container.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&family=Noto+Naskh+Arabic&display=swap');
            * { font-family: 'Noto Sans Bengali', 'Noto Naskh Arabic', Arial, sans-serif; }
            .cards-container { display: flex; gap: 20px; padding: 20px; }
            .id-card { 
                width: 506px; 
                height: 320px; 
                border: 3px solid #4F46E5;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .card-header { 
                background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
                color: white;
                padding: 15px;
                text-align: center;
            }
            .school-name { font-size: 18px; font-weight: bold; margin-bottom: 3px; }
            .school-address { font-size: 10px; margin-top: 3px; }
            .card-body { padding: 20px; background: white; }
            .front-body { display: flex; gap: 15px; }
            .photo-section { 
                width: 140px; 
                height: 180px; 
                border: 2px solid #4F46E5;
                border-radius: 8px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #F3F4F6;
            }
            .photo { width: 100%; height: 100%; object-fit: cover; }
            .info-section { flex: 1; }
            .info-row { margin: 8px 0; display: flex; }
            .info-label { 
                font-weight: bold; 
                width: 80px; 
                font-size: 12px;
                color: #4F46E5;
            }
            .info-value { 
                flex: 1; 
                font-size: 12px; 
                border-bottom: 1px dotted #ccc;
            }
            .student-name {
                font-size: 16px;
                font-weight: bold;
                color: #1F2937;
                margin-bottom: 5px;
            }
            .qr-section {
                text-align: center;
                margin-top: 10px;
            }
            .qr-code { width: 150px; height: 150px; }
            
            /* Back side */
            .back-body { padding: 20px; }
            .back-title {
                text-align: center;
                font-weight: bold;
                font-size: 14px;
                color: #4F46E5;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #4F46E5;
            }
            .guardian-section { margin: 15px 0; }
            .section-title {
                font-weight: bold;
                font-size: 12px;
                color: #4F46E5;
                margin-bottom: 8px;
            }
            .back-info-row {
                margin: 5px 0;
                font-size: 11px;
                display: flex;
            }
            .back-label { font-weight: 600; width: 100px; }
            .back-value { flex: 1; }
            .emergency-box {
                background: #FEF3C7;
                border: 2px solid #F59E0B;
                border-radius: 8px;
                padding: 10px;
                margin-top: 15px;
            }
            .emergency-title {
                font-weight: bold;
                font-size: 11px;
                color: #92400E;
                margin-bottom: 5px;
            }
            .footer-text {
                text-align: center;
                font-size: 8px;
                color: #666;
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px solid #ddd;
            }
        </style>
        <div class="cards-container">
            <!-- FRONT SIDE -->
            <div class="id-card">
                <div class="card-header">
                    <div class="school-name">${school.name}</div>
                    <div class="school-address">${school.address}</div>
                    <div class="school-address">Phone: ${school.phone}</div>
                </div>
                <div class="card-body">
                    <div class="front-body">
                        <div class="photo-section">
                            ${student.photo_url ? `<img src="${student.photo_url}" class="photo" crossorigin="anonymous" />` : '<div style="color: #999;">No Photo</div>'}
                        </div>
                        <div class="info-section">
                            <div class="student-name">${student.name_en}</div>
                            ${student.name_bn ? `<div style="font-size: 13px; color: #666; margin-bottom: 10px;">${student.name_bn}</div>` : ''}
                            
                            <div class="info-row">
                                <span class="info-label">ID:</span>
                                <span class="info-value">${student.student_id}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Class:</span>
                                <span class="info-value">${student.classes?.name || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Section:</span>
                                <span class="info-value">${student.sections?.name || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Roll:</span>
                                <span class="info-value">${student.roll || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Blood:</span>
                                <span class="info-value">${student.blood_group || 'N/A'}</span>
                            </div>
                      
                            
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- BACK SIDE -->
            <div class="id-card">
                <div class="card-header">
                    <div style="font-size: 14px; font-weight: bold;">STUDENT ID CARD</div>
                    <div style="font-size: 10px; margin-top: 3px;">Keep this card safe at all times</div>
                </div>
                <div class="front-body" style="padding-left: 20px; padding-bottom: 0px">    
                    <div class="info-section">                
                        <div class="guardian-section">
                            <div class="section-title">Father's Details</div>
                            <div class="back-info-row">
                                <span class="back-label">Name:</span>
                                <span class="back-value">${student.guardians?.father_name || 'N/A'}</span>
                            </div>
                            <div class="back-info-row">
                                <span class="back-label">Mobile:</span>
                                <span class="back-value">${student.guardians?.father_mobile || 'N/A'}</span>
                            </div>
                            ${student.guardians?.father_occupation ? `
                                <div class="back-info-row">
                                    <span class="back-label">Occupation:</span>
                                    <span class="back-value">${student.guardians.father_occupation}</span>
                                </div>
                            ` : ''}
                            <div class="back-info-row" style="margin-top: 10px;">
                                <span class="back-label">Address:</span>
                            </div>
                            <div style="font-size: 11px; margin-top: 5px; line-height: 1.4;">
                                ${student.address_present || 'N/A'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="qr-section" style="padding-right: 20px">
                                <img src="${qrCodeDataURL}" class="qr-code" />
                        </div>
                    
                </div>
                <div class="footer-text">
                        <strong>If found, please return to:</strong><br>
                        ${school.name}<br>
                        ${school.address}<br>
                        Phone: ${school.phone}
                    </div>
            </div>
        </div>
    `;

    document.body.appendChild(container);
    await document.fonts.ready;

    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true
    });
    document.body.removeChild(container);

    // Create PDF with both cards
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [54, 85.6] // Credit card size
    });

    const imgData = canvas.toDataURL('image/png');
    const fullWidth = canvas.width;
    const fullHeight = canvas.height;
    const cardWidth = fullWidth / 2;

    // Add front card (left half)
    const frontCanvas = document.createElement('canvas');
    frontCanvas.width = cardWidth;
    frontCanvas.height = fullHeight;
    const frontCtx = frontCanvas.getContext('2d');
    const img = new Image();
    img.src = imgData;
    await new Promise(resolve => {
        img.onload = () => {
            frontCtx!.drawImage(img, 0, 0, cardWidth, fullHeight, 0, 0, cardWidth, fullHeight);
            resolve(null);
        };
    });

    doc.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 54);

    // Add back card (right half) on new page
    doc.addPage([54, 85.6], 'landscape');
    const backCanvas = document.createElement('canvas');
    backCanvas.width = cardWidth;
    backCanvas.height = fullHeight;
    const backCtx = backCanvas.getContext('2d');
    backCtx!.drawImage(img, cardWidth, 0, cardWidth, fullHeight, 0, 0, cardWidth, fullHeight);

    doc.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 54);

    return doc;
}

export async function generateBulkIDCards(students: any[], school: any) {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [54, 85.6]
    });

    let isFirstCard = true;

    for (const student of students) {
        // Generate QR code for this student
        const qrCodeDataURL = await QRCode.toDataURL(student.student_id, { width: 400, margin: 1 });

        // Create container for this student's cards
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '1012px';
        container.style.backgroundColor = 'white';

        container.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&family=Noto+Naskh+Arabic&display=swap');
                * { font-family: 'Noto Sans Bengali', 'Noto Naskh Arabic', Arial, sans-serif; }
                .cards-container { display: flex; gap: 20px; padding: 20px; }
                .id-card { 
                    width: 506px; 
                    height: 320px; 
                    border: 3px solid #4F46E5;
                    border-radius: 15px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .card-header { 
                    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
                    color: white;
                    padding: 15px;
                    text-align: center;
                }
                .school-name { font-size: 18px; font-weight: bold; margin-bottom: 3px; }
                .school-address { font-size: 10px; margin-top: 3px; }
                .card-body { padding: 20px; background: white; }
                .front-body { display: flex; gap: 15px; }
                .photo-section { 
                    width: 140px; 
                    height: 180px; 
                    border: 2px solid #4F46E5;
                    border-radius: 8px;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #F3F4F6;
                }
                .photo { width: 100%; height: 100%; object-fit: cover; }
                .info-section { flex: 1; }
                .info-row { margin: 8px 0; display: flex; }
                .info-label { 
                    font-weight: bold; 
                    width: 80px; 
                    font-size: 12px;
                    color: #4F46E5;
                }
                .info-value { 
                    flex: 1; 
                    font-size: 12px; 
                    border-bottom: 1px dotted #ccc;
                }
                .student-name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #1F2937;
                    margin-bottom: 5px;
                }
                .qr-section {
                    text-align: center;
                    margin-top: 10px;
                }
                .qr-code { width: 150px; height: 150px; }
                
                .back-body { padding: 20px; }
                .back-title {
                    text-align: center;
                    font-weight: bold;
                    font-size: 14px;
                    color: #4F46E5;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #4F46E5;
                }
                .guardian-section { margin: 15px 0; }
                .section-title {
                    font-weight: bold;
                    font-size: 12px;
                    color: #4F46E5;
                    margin-bottom: 8px;
                }
                .back-info-row {
                    margin: 5px 0;
                    font-size: 11px;
                    display: flex;
                }
                .back-label { font-weight: 600; width: 100px; }
                .back-value { flex: 1; }
                .footer-text {
                    text-align: center;
                    font-size: 8px;
                    color: #666;
                    margin-top: 15px;
                    padding-top: 10px;
                    border-top: 1px solid #ddd;
                }
            </style>
            <div class="cards-container">
                <!-- FRONT SIDE -->
                <div class="id-card">
                    <div class="card-header">
                        <div class="school-name">${school.name}</div>
                        <div class="school-address">${school.address}</div>
                        <div class="school-address">Phone: ${school.phone}</div>
                    </div>
                    <div class="card-body">
                        <div class="front-body">
                            <div class="photo-section">
                                ${student.photo_url ? `<img src="${student.photo_url}" class="photo" crossorigin="anonymous" />` : '<div style="color: #999;">No Photo</div>'}
                            </div>
                            <div class="info-section">
                                <div class="student-name">${student.name_en}</div>
                                ${student.name_bn ? `<div style="font-size: 13px; color: #666; margin-bottom: 10px;">${student.name_bn}</div>` : ''}
                                
                                <div class="info-row">
                                    <span class="info-label">ID:</span>
                                    <span class="info-value">${student.student_id}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Class:</span>
                                    <span class="info-value">${student.classes?.name || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Section:</span>
                                    <span class="info-value">${student.sections?.name || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Roll:</span>
                                    <span class="info-value">${student.roll || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Blood:</span>
                                    <span class="info-value">${student.blood_group || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- BACK SIDE -->
                <div class="id-card">
                    <div class="card-header">
                        <div style="font-size: 14px; font-weight: bold;">STUDENT ID CARD</div>
                        <div style="font-size: 10px; margin-top: 3px;">Keep this card safe at all times</div>
                    </div>
                    <div class="front-body" style="padding-left: 20px; padding-bottom: 0px">    
                        <div class="info-section">                
                            <div class="guardian-section">
                                <div class="section-title">Father's Details</div>
                                <div class="back-info-row">
                                    <span class="back-label">Name:</span>
                                    <span class="back-value">${student.guardians?.father_name || 'N/A'}</span>
                                </div>
                                <div class="back-info-row">
                                    <span class="back-label">Mobile:</span>
                                    <span class="back-value">${student.guardians?.father_mobile || 'N/A'}</span>
                                </div>
                                ${student.guardians?.father_occupation ? `
                                    <div class="back-info-row">
                                        <span class="back-label">Occupation:</span>
                                        <span class="back-value">${student.guardians.father_occupation}</span>
                                    </div>
                                ` : ''}
                                <div class="back-info-row" style="margin-top: 10px;">
                                    <span class="back-label">Address:</span>
                                </div>
                                <div style="font-size: 11px; margin-top: 5px; line-height: 1.4;">
                                    ${student.address_present || 'N/A'}
                                </div>
                            </div>
                        </div>
                        
                        <div class="qr-section" style="padding-right: 20px">
                            <img src="${qrCodeDataURL}" class="qr-code" />
                        </div>
                    </div>
                    <div class="footer-text">
                        <strong>If found, please return to:</strong><br>
                        ${school.name}<br>
                        ${school.address}<br>
                        Phone: ${school.phone}
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
            allowTaint: true
        });
        document.body.removeChild(container);

        const imgData = canvas.toDataURL('image/png');
        const fullWidth = canvas.width;
        const fullHeight = canvas.height;
        const cardWidth = fullWidth / 2;

        // Add front card (left half)
        if (!isFirstCard) {
            doc.addPage([54, 85.6], 'landscape');
        }
        isFirstCard = false;

        const frontCanvas = document.createElement('canvas');
        frontCanvas.width = cardWidth;
        frontCanvas.height = fullHeight;
        const frontCtx = frontCanvas.getContext('2d');
        const img = new Image();
        img.src = imgData;
        await new Promise(resolve => {
            img.onload = () => {
                frontCtx!.drawImage(img, 0, 0, cardWidth, fullHeight, 0, 0, cardWidth, fullHeight);
                resolve(null);
            };
        });

        doc.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 54);

        // Add back card (right half) on new page
        doc.addPage([54, 85.6], 'landscape');
        const backCanvas = document.createElement('canvas');
        backCanvas.width = cardWidth;
        backCanvas.height = fullHeight;
        const backCtx = backCanvas.getContext('2d');
        backCtx!.drawImage(img, cardWidth, 0, cardWidth, fullHeight, 0, 0, cardWidth, fullHeight);

        doc.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 54);
    }

    return doc;
}