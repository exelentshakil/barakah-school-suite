// FILE: src/lib/receipts.ts - ADD FEE ITEMS BREAKDOWN

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

export async function generateReceipt(invoice: any, school: any) {
    // Fetch full student data with class info
    let student = invoice.students;
    if (!student?.classes?.name) {
        const { data } = await supabase
            .from('students')
            .select('*, classes(name), sections(name)')
            .eq('id', invoice.student_id)
            .single();
        student = data;
    }

    // Fetch invoice items
    const { data: items } = await supabase
        .from('invoice_items')
        .select('fee_head_name, amount')
        .eq('invoice_id', invoice.id);

    const receiptDiv = document.createElement('div');
    receiptDiv.style.width = '302px';
    receiptDiv.style.padding = '16px';
    receiptDiv.style.fontFamily = "'Courier New', monospace";
    receiptDiv.style.fontSize = '12px';
    receiptDiv.style.lineHeight = '1.4';
    receiptDiv.style.color = '#000';
    receiptDiv.style.backgroundColor = '#fff';

    const date = new Date(invoice.created_at || Date.now());
    const totalFee = parseFloat(invoice.total_amount || 0);
    const paidAmount = parseFloat(invoice.paid_amount || 0);
    const balanceDue = totalFee - paidAmount;

    // Generate fee items HTML
    const feeItemsHTML = items?.map(item => `
    <tr>
      <td style="padding: 2px 0;">${item.fee_head_name || 'Fee'}</td>
      <td style="text-align: right;">৳${parseFloat(item.amount).toFixed(2)}</td>
    </tr>
  `).join('') || '';

    receiptDiv.innerHTML = `
    <div style="text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 10px;">
      <div style="font-size: 16px; font-weight: bold; letter-spacing: 0.5px;">${school?.name || 'School Name'}</div>
      <div style="font-size: 10px; margin-top: 4px; line-height: 1.3;">${school?.address || ''}</div>
      <div style="font-size: 10px; margin-top: 2px;">Phone: ${school?.phone || ''}</div>
      <div style="font-size: 13px; font-weight: bold; margin-top: 8px; letter-spacing: 1px;">FEE RECEIPT</div>
    </div>

    <div style="margin-bottom: 10px;">
      <table style="width: 100%; font-size: 11px;">
        <tr>
          <td style="padding: 2px 0;">Receipt No:</td>
          <td style="text-align: right; font-weight: bold;">${invoice.invoice_no}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0;">Date:</td>
          <td style="text-align: right;">${date.toLocaleDateString('en-GB')}</td>
        </tr>
      </table>
    </div>

    <div style="border-top: 2px dashed #333; padding-top: 10px; margin-bottom: 10px;">
      <div style="font-weight: bold; margin-bottom: 6px; font-size: 11px; letter-spacing: 0.5px;">STUDENT INFORMATION</div>
      <table style="width: 100%; font-size: 11px; line-height: 1.5;">
        <tr>
          <td style="padding: 2px 0; width: 30%;">Name:</td>
          <td style="font-weight: bold;">${student?.name_en || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0;">ID:</td>
          <td>${student?.student_id || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0;">Class:</td>
          <td>${student?.classes?.name || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0;">Roll:</td>
          <td>${student?.roll || 'N/A'}</td>
        </tr>
      </table>
    </div>

    <div style="border-top: 2px dashed #333; padding-top: 10px; margin-bottom: 10px;">
      <div style="font-weight: bold; margin-bottom: 6px; font-size: 11px; letter-spacing: 0.5px;">PAYMENT DETAILS</div>
      ${invoice.months ? `<div style="margin-bottom: 6px; font-size: 11px;">Months: <span style="font-weight: bold;">${invoice.months}</span></div>` : ''}
      
      ${feeItemsHTML ? `
      <table style="width: 100%; font-size: 10px; margin-bottom: 8px; line-height: 1.5;">
        ${feeItemsHTML}
      </table>
      ` : ''}

      <table style="width: 100%; font-size: 11px; line-height: 1.6;">
        <tr style="border-top: 1px solid #ccc;">
          <td style="padding: 6px 0 3px 0; font-weight: bold;">Total Fee:</td>
          <td style="text-align: right; font-weight: bold; padding: 6px 0 3px 0;">৳${totalFee.toFixed(2)}</td>
        </tr>
        ${invoice.discount && parseFloat(invoice.discount) > 0 ? `
        <tr>
          <td style="padding: 3px 0;">Discount:</td>
          <td style="text-align: right; color: #059669;">- ৳${parseFloat(invoice.discount).toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 3px 0; font-weight: bold;">Paid Amount:</td>
          <td style="text-align: right; font-weight: bold;">৳${paidAmount.toFixed(2)}</td>
        </tr>
        <tr style="border-top: 2px solid #000;">
          <td style="padding: 6px 0 0 0; font-weight: bold; font-size: 12px;">Balance Due:</td>
          <td style="text-align: right; font-weight: bold; font-size: 12px; padding: 6px 0 0 0;">
            ${balanceDue > 0 ? '৳' + balanceDue.toFixed(2) : '<span style="color: #059669;">PAID ✓</span>'}
          </td>
        </tr>
      </table>
    </div>

    <div style="border-top: 2px dashed #333; padding-top: 10px; margin-bottom: 10px;">
      <table style="width: 100%; font-size: 11px; line-height: 1.6;">
        <tr>
          <td style="padding: 2px 0; width: 45%;">Payment Method:</td>
          <td style="font-weight: bold;">${invoice.payment_method || 'Cash'}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0;">Status:</td>
          <td style="font-weight: bold; color: ${balanceDue <= 0 ? '#059669' : '#dc2626'};">
            ${balanceDue <= 0 ? 'PAID' : 'PARTIAL'}
          </td>
        </tr>
      </table>
    </div>

    <div style="border-top: 2px dashed #333; padding-top: 10px; text-align: center; font-size: 10px; line-height: 1.5;">
      <div style="font-weight: bold; margin-bottom: 4px;">Thank you!</div>
      <div style="margin-bottom: 3px; color: #666;">Computer Generated Receipt</div>
      <div style="margin-bottom: 6px; color: #666; font-size: 9px;">${new Date().toLocaleString('en-GB')}</div>
      <div style="font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 6px; margin-top: 6px;">
        Powered by <span style="font-weight: bold; color: #666;">BarakahSoft.com</span>
      </div>
    </div>
  `;

    document.body.appendChild(receiptDiv);

    const canvas = await html2canvas(receiptDiv, {
        scale: 3,
        backgroundColor: '#ffffff',
        logging: false
    });

    document.body.removeChild(receiptDiv);

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 80;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, imgHeight + 2]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`Receipt-${invoice.invoice_no}.pdf`);
}

export function viewReceipt(invoice: any, school: any) {
    window.open(`/receipt/${invoice.id}`, '_blank');
}