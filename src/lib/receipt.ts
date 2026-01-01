// FILE: src/lib/receipt-with-bengali.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateReceipt(payment: any, invoice: any, student: any, school: any) {
    // Create hidden div with receipt HTML
    const receiptDiv = document.createElement('div');
    receiptDiv.style.position = 'absolute';
    receiptDiv.style.left = '-9999px';
    receiptDiv.style.width = '302px'; // 80mm in pixels
    receiptDiv.style.padding = '20px';
    receiptDiv.style.backgroundColor = 'white';
    receiptDiv.style.fontFamily = "'Noto Sans Bengali', Arial, sans-serif";

    receiptDiv.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&display=swap');
            .receipt { font-size: 12px; line-height: 1.4; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px solid #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; }
        </style>
        <div class="receipt">
            <div class="center bold" style="font-size: 14px;">${school.name}</div>
            <div class="center" style="font-size: 10px; margin: 5px 0;">${school.address}</div>
            <div class="center" style="font-size: 10px;">Phone: ${school.phone}</div>
            <div class="line"></div>
            <div class="center bold" style="font-size: 13px;">FEE RECEIPT</div>
            <div class="line"></div>
            <div>Receipt No: ${payment.id.slice(0, 8).toUpperCase()}</div>
            <div>Date: ${new Date(payment.payment_date).toLocaleDateString('en-GB')}</div>
            <div>Time: ${new Date(payment.payment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
            <div class="line"></div>
            <div class="bold">STUDENT DETAILS</div>
            <div>Name: ${student.name_en}</div>
            <div>Student ID: ${student.student_id}</div>
            <div>Class: ${student.classes?.name || 'N/A'}</div>
            <div class="line"></div>
            <div class="row bold">
                <span>PARTICULARS</span>
                <span>AMOUNT</span>
            </div>
            <div style="border-bottom: 1px dashed #000; margin: 4px 0;"></div>
            ${invoice.invoice_items?.map((item: any) => `
                <div class="row">
                    <span>${item.fee_head_name}</span>
                    <span>${parseFloat(item.amount).toFixed(2)}</span>
                </div>
            `).join('') || ''}
            <div class="line"></div>
            <div class="row bold" style="font-size: 13px;">
                <span>TOTAL PAID:</span>
                <span>Tk ${parseFloat(payment.amount).toFixed(2)}</span>
            </div>
            <div class="line"></div>
            <div>Payment Method: ${payment.payment_method?.toUpperCase()}</div>
            ${payment.transaction_id ? `<div>Transaction ID: ${payment.transaction_id}</div>` : ''}
            <div class="line"></div>
            <div class="center bold" style="margin: 10px 0;">Thank You!</div>
            <div class="center" style="font-size: 10px;">Please keep this receipt for your records</div>
            <div class="center" style="font-size: 9px; color: #666; margin-top: 15px;">Computer Generated Receipt</div>
            <div class="center" style="font-size: 9px; color: #666;">Powered by BarakahSoft.com</div>
        </div>
    `;

    document.body.appendChild(receiptDiv);

    // Wait for fonts to load
    await document.fonts.ready;

    // Convert to canvas
    const canvas = await html2canvas(receiptDiv, {
        scale: 2,
        backgroundColor: '#ffffff'
    });

    // Remove div
    document.body.removeChild(receiptDiv);

    // Create PDF
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 150]
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 80;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    return doc;
}