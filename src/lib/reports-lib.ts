// FILE: src/lib/reports-lib.ts - REPORTS GENERATION WITH BENGALI SUPPORT
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ATTENDANCE REPORT - Using HTML rendering for Bengali support
export async function generateAttendanceReport(
    students: any[],
    attendanceData: any[],
    classInfo: any,
    schoolSettings: any,
    dateRange: { start: string; end: string }
) {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '297mm';
    container.style.backgroundColor = 'white';

    // Calculate attendance summary
    const tableRows = students.map((student, index) => {
        const studentAttendance = attendanceData.filter(a => a.student_id === student.id);
        const totalDays = studentAttendance.length;
        const presentDays = studentAttendance.filter(a => a.status === 'present').length;
        const absentDays = studentAttendance.filter(a => a.status === 'absent').length;
        const lateDays = studentAttendance.filter(a => a.status === 'late').length;
        const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0.0';

        return { index: index + 1, student, totalDays, presentDays, absentDays, lateDays, percentage };
    });

    const avgAttendance = tableRows.reduce((sum, row) => sum + parseFloat(row.percentage), 0) / students.length;

    container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Noto Sans Bengali', Arial, sans-serif; }
      .report {
        width: 297mm;
        min-height: 210mm;
        padding: 15mm;
        background: white;
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 10mm;
        margin-bottom: 8mm;
      }
      .school-name {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 5px;
      }
      .school-address {
        font-size: 12px;
        color: #666;
      }
      .report-title {
        font-size: 18px;
        font-weight: 700;
        margin: 10px 0;
      }
      .meta {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        margin-bottom: 8mm;
        color: #333;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }
      th {
        background: #1e40af;
        color: white;
        padding: 8px 5px;
        text-align: center;
        border: 1px solid #1e40af;
        font-weight: 600;
      }
      td {
        padding: 6px 5px;
        border: 1px solid #ddd;
        text-align: center;
      }
      tr:nth-child(even) {
        background: #f9fafb;
      }
      .summary {
        margin-top: 10mm;
        padding: 8px;
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        font-size: 11px;
      }
      .summary-item {
        margin: 3px 0;
      }
      .footer {
        text-align: center;
        margin-top: 10mm;
        font-size: 9px;
        color: #999;
      }
    </style>
    <div class="report">
      <div class="header">
        <div class="school-name">${schoolSettings?.name || 'School Name'}</div>
        <div class="school-address">${schoolSettings?.address || ''}</div>
        <div class="report-title">Attendance Report</div>
      </div>

      <div class="meta">
        <div>
          <strong>Class:</strong> ${classInfo?.name || 'N/A'}<br/>
          <strong>Period:</strong> ${new Date(dateRange.start).toLocaleDateString('en-GB')} to ${new Date(dateRange.end).toLocaleDateString('en-GB')}
        </div>
        <div>
          <strong>Generated:</strong> ${new Date().toLocaleDateString('en-GB')}<br/>
          <strong>Total Students:</strong> ${students.length}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th style="width: 60px;">ID</th>
            <th style="width: 120px;">Student Name</th>
            <th style="width: 40px;">Roll</th>
            <th style="width: 50px;">Total Days</th>
            <th style="width: 50px;">Present</th>
            <th style="width: 50px;">Absent</th>
            <th style="width: 50px;">Late</th>
            <th style="width: 60px;">Attendance %</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows.map(row => `
            <tr>
              <td>${row.index}</td>
              <td>${row.student.student_id}</td>
              <td style="text-align: left; padding-left: 8px;">${row.student.name_en}</td>
              <td>${row.student.roll || '-'}</td>
              <td>${row.totalDays}</td>
              <td style="color: #16a34a; font-weight: 600;">${row.presentDays}</td>
              <td style="color: #dc2626; font-weight: 600;">${row.absentDays}</td>
              <td style="color: #ea580c; font-weight: 600;">${row.lateDays}</td>
              <td style="font-weight: 700;">${row.percentage}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-item"><strong>Summary:</strong></div>
        <div class="summary-item">Total Students: ${students.length}</div>
        <div class="summary-item">Average Attendance: ${avgAttendance.toFixed(1)}%</div>
      </div>

      <div class="footer">
        Powered by BarakahSoft School Manager
      </div>
    </div>
  `;

    document.body.appendChild(container);
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 1000));

    const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
    });

    document.body.removeChild(container);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png', 1.0);
    doc.addImage(imgData, 'PNG', 0, 0, 297, 210);

    return doc;
}

// FEE REPORT - Using HTML rendering for Bengali support
export async function generateFeeReport(
    students: any[],
    invoices: any[],
    schoolSettings: any,
    filters: { class?: string; status?: string }
) {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '297mm';
    container.style.backgroundColor = 'white';

    // Calculate fee summary
    const tableRows = students.map((student, index) => {
        const studentInvoices = invoices.filter(inv => inv.student_id === student.id);
        const totalAmount = studentInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        const paidAmount = studentInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
        const dueAmount = totalAmount - paidAmount;
        const status = dueAmount === 0 ? 'Paid' : dueAmount < totalAmount ? 'Partial' : 'Unpaid';

        return { index: index + 1, student, totalAmount, paidAmount, dueAmount, status };
    });

    const totalFees = tableRows.reduce((sum, row) => sum + row.totalAmount, 0);
    const totalPaid = tableRows.reduce((sum, row) => sum + row.paidAmount, 0);
    const totalDue = tableRows.reduce((sum, row) => sum + row.dueAmount, 0);
    const collectionRate = totalFees > 0 ? ((totalPaid / totalFees) * 100).toFixed(1) : '0.0';

    const paidCount = tableRows.filter(row => row.status === 'Paid').length;
    const partialCount = tableRows.filter(row => row.status === 'Partial').length;
    const unpaidCount = tableRows.filter(row => row.status === 'Unpaid').length;

    container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Noto Sans Bengali', Arial, sans-serif; }
      .report {
        width: 297mm;
        min-height: 210mm;
        padding: 15mm;
        background: white;
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 10mm;
        margin-bottom: 8mm;
      }
      .school-name {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 5px;
      }
      .school-address {
        font-size: 12px;
        color: #666;
      }
      .report-title {
        font-size: 18px;
        font-weight: 700;
        margin: 10px 0;
      }
      .meta {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        margin-bottom: 8mm;
        color: #333;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }
      th {
        background: #1e40af;
        color: white;
        padding: 8px 5px;
        text-align: center;
        border: 1px solid #1e40af;
        font-weight: 600;
      }
      td {
        padding: 6px 5px;
        border: 1px solid #ddd;
        text-align: center;
      }
      tr:nth-child(even) {
        background: #f9fafb;
      }
      .amount {
        text-align: right;
        padding-right: 10px;
      }
      .status-paid {
        color: #16a34a;
        font-weight: 700;
      }
      .status-partial {
        color: #ea580c;
        font-weight: 700;
      }
      .status-unpaid {
        color: #dc2626;
        font-weight: 700;
      }
      .summary {
        margin-top: 10mm;
        padding: 8px;
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        font-size: 11px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .summary-item {
        margin: 3px 0;
      }
      .footer {
        text-align: center;
        margin-top: 10mm;
        font-size: 9px;
        color: #999;
      }
    </style>
    <div class="report">
      <div class="header">
        <div class="school-name">${schoolSettings?.name || 'School Name'}</div>
        <div class="school-address">${schoolSettings?.address || ''}</div>
        <div class="report-title">Fee Collection Report</div>
      </div>

      <div class="meta">
        <div>
          ${filters.class ? '<strong>Filter:</strong> Class Selected<br/>' : ''}
          ${filters.status ? `<strong>Status:</strong> ${filters.status}<br/>` : ''}
        </div>
        <div>
          <strong>Generated:</strong> ${new Date().toLocaleDateString('en-GB')}<br/>
          <strong>Total Students:</strong> ${students.length}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th style="width: 60px;">ID</th>
            <th style="width: 120px;">Student Name</th>
            <th style="width: 50px;">Class</th>
            <th style="width: 40px;">Roll</th>
            <th style="width: 60px;">Total (৳)</th>
            <th style="width: 60px;">Paid (৳)</th>
            <th style="width: 60px;">Due (৳)</th>
            <th style="width: 60px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows.map(row => `
            <tr>
              <td>${row.index}</td>
              <td>${row.student.student_id}</td>
              <td style="text-align: left; padding-left: 8px;">${row.student.name_en}</td>
              <td>${row.student.classes?.name || '-'}</td>
              <td>${row.student.roll || '-'}</td>
              <td class="amount">${row.totalAmount.toFixed(2)}</td>
              <td class="amount">${row.paidAmount.toFixed(2)}</td>
              <td class="amount">${row.dueAmount.toFixed(2)}</td>
              <td class="status-${row.status.toLowerCase()}">${row.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary">
        <div>
          <div class="summary-item"><strong>Financial Summary:</strong></div>
          <div class="summary-item">Total Fees: ৳${totalFees.toFixed(2)}</div>
          <div class="summary-item">Total Collected: ৳${totalPaid.toFixed(2)}</div>
          <div class="summary-item">Total Due: ৳${totalDue.toFixed(2)}</div>
          <div class="summary-item">Collection Rate: ${collectionRate}%</div>
        </div>
        <div>
          <div class="summary-item"><strong>Status Breakdown:</strong></div>
          <div class="summary-item">Fully Paid: ${paidCount} students</div>
          <div class="summary-item">Partial: ${partialCount} students</div>
          <div class="summary-item">Unpaid: ${unpaidCount} students</div>
        </div>
      </div>

      <div class="footer">
        Powered by BarakahSoft School Manager
      </div>
    </div>
  `;

    document.body.appendChild(container);
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 1000));

    const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
    });

    document.body.removeChild(container);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png', 1.0);
    doc.addImage(imgData, 'PNG', 0, 0, 297, 210);

    return doc;
}

// CSV EXPORT HELPER
export function exportToCSV(data: any[], filename: string) {
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header]?.toString() || '';
            return value.includes(',') ? `"${value}"` : value;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}