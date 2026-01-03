// FILE: src/pages/ReceiptView.tsx - SAME STYLING AS PDF

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Download, Printer } from 'lucide-react';
import { generateReceipt } from '@/lib/receipt';

export default function ReceiptView() {
    const { id } = useParams();
    const [invoice, setInvoice] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [school, setSchool] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        const { data: invoiceData } = await supabase
            .from('invoices')
            .select('*, students(*, classes(name), sections(name))')
            .eq('id', id)
            .single();

        const { data: itemsData } = await supabase
            .from('invoice_items')
            .select('fee_head_name, amount')
            .eq('invoice_id', id);

        const { data: schoolData } = await supabase
            .from('school_settings')
            .select('*')
            .single();

        setInvoice(invoiceData);
        setItems(itemsData || []);
        setSchool(schoolData);
        setLoading(false);
    };

    if (loading) return <MainLayout><div className="p-8">Loading...</div></MainLayout>;
    if (!invoice) return <MainLayout><div className="p-8">Receipt not found</div></MainLayout>;

    const date = new Date(invoice.created_at);
    const totalFee = parseFloat(invoice.total_amount || 0);
    const paidAmount = parseFloat(invoice.paid_amount || 0);
    const balanceDue = totalFee - paidAmount;

    const feeItemsHTML = items?.map(item => `
    <tr>
      <td style="padding: 2px 0;">${item.fee_head_name}</td>
      <td style="text-align: right;">৳${parseFloat(item.amount).toFixed(2)}</td>
    </tr>
  `).join('');

    return (
        <MainLayout>
            <div className="max-w-md mx-auto p-8">
                <div className="flex gap-2 mb-6 print:hidden">
                    <Button onClick={() => generateReceipt(invoice, school)} className="flex-1">
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                    </Button>
                    <Button onClick={() => window.print()} variant="outline" className="flex-1">
                        <Printer className="w-4 h-4 mr-2" />
                        Print
                    </Button>
                </div>

                <div id="receipt-content" style={{
                    width: '302px',
                    margin: '0 auto',
                    padding: '16px',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '12px',
                    lineHeight: '1.4',
                    color: '#000',
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb'
                }}>
                    <div style={{
                        textAlign: 'center',
                        borderBottom: '2px dashed #333',
                        paddingBottom: '10px',
                        marginBottom: '10px'
                    }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                            {school?.name || 'School Name'}
                        </div>
                        <div style={{ fontSize: '10px', marginTop: '4px', lineHeight: '1.3' }}>
                            {school?.address || ''}
                        </div>
                        <div style={{ fontSize: '10px', marginTop: '2px' }}>
                            Phone: {school?.phone || ''}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '8px', letterSpacing: '1px' }}>
                            FEE RECEIPT
                        </div>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <table style={{ width: '100%', fontSize: '11px' }}>
                            <tbody>
                            <tr>
                                <td style={{ padding: '2px 0' }}>Receipt No:</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{invoice.invoice_no}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '2px 0' }}>Date:</td>
                                <td style={{ textAlign: 'right' }}>{date.toLocaleDateString('en-GB')}</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ borderTop: '2px dashed #333', paddingTop: '10px', marginBottom: '10px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '11px', letterSpacing: '0.5px' }}>
                            STUDENT INFORMATION
                        </div>
                        <table style={{ width: '100%', fontSize: '11px', lineHeight: '1.5' }}>
                            <tbody>
                            <tr>
                                <td style={{ padding: '2px 0', width: '30%' }}>Name:</td>
                                <td style={{ fontWeight: 'bold' }}>{invoice.students?.name_en || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '2px 0' }}>ID:</td>
                                <td>{invoice.students?.student_id || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '2px 0' }}>Class:</td>
                                <td>{invoice.students?.classes?.name || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '2px 0' }}>Roll:</td>
                                <td>{invoice.students?.roll || 'N/A'}</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ borderTop: '2px dashed #333', paddingTop: '10px', marginBottom: '10px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '11px', letterSpacing: '0.5px' }}>
                            PAYMENT DETAILS
                        </div>

                        {items.length > 0 && (
                            <table style={{ width: '100%', fontSize: '10px', marginBottom: '8px', lineHeight: '1.5' }}>
                                <tbody dangerouslySetInnerHTML={{ __html: feeItemsHTML }} />
                            </table>
                        )}

                        <table style={{ width: '100%', fontSize: '11px', lineHeight: '1.6' }}>
                            <tbody>
                            <tr style={{ borderTop: '1px solid #ccc' }}>
                                <td style={{ padding: '6px 0 3px 0', fontWeight: 'bold' }}>Total Fee:</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 0 3px 0' }}>
                                    ৳{totalFee.toFixed(2)}
                                </td>
                            </tr>
                            {invoice.discount && parseFloat(invoice.discount) > 0 && (
                                <tr>
                                    <td style={{ padding: '3px 0' }}>Discount:</td>
                                    <td style={{ textAlign: 'right', color: '#059669' }}>
                                        - ৳{parseFloat(invoice.discount).toFixed(2)}
                                    </td>
                                </tr>
                            )}
                            <tr>
                                <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Paid Amount:</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>৳{paidAmount.toFixed(2)}</td>
                            </tr>
                            <tr style={{ borderTop: '2px solid #000' }}>
                                <td style={{ padding: '6px 0 0 0', fontWeight: 'bold', fontSize: '12px' }}>Balance Due:</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '12px', padding: '6px 0 0 0' }}>
                                    {balanceDue > 0 ? (
                                        <span style={{ color: '#dc2626' }}>৳{balanceDue.toFixed(2)}</span>
                                    ) : (
                                        <span style={{ color: '#059669' }}>PAID ✓</span>
                                    )}
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ borderTop: '2px dashed #333', paddingTop: '10px', marginBottom: '10px' }}>
                        <table style={{ width: '100%', fontSize: '11px', lineHeight: '1.6' }}>
                            <tbody>
                            <tr>
                                <td style={{ padding: '2px 0', width: '45%' }}>Payment Method:</td>
                                <td style={{ fontWeight: 'bold' }}>{invoice.payment_method || 'Cash'}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '2px 0' }}>Status:</td>
                                <td style={{ fontWeight: 'bold', color: balanceDue <= 0 ? '#059669' : '#dc2626' }}>
                                    {balanceDue <= 0 ? 'PAID' : 'PARTIAL'}
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{
                        borderTop: '2px dashed #333',
                        paddingTop: '10px',
                        textAlign: 'center',
                        fontSize: '10px',
                        lineHeight: '1.5'
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Thank you!</div>
                        <div style={{ marginBottom: '3px', color: '#666' }}>Computer Generated Receipt</div>
                        <div style={{ marginBottom: '6px', color: '#666', fontSize: '9px' }}>
                            {new Date().toLocaleString('en-GB')}
                        </div>
                        <div style={{
                            fontSize: '9px',
                            color: '#999',
                            borderTop: '1px solid #ddd',
                            paddingTop: '6px',
                            marginTop: '6px'
                        }}>
                            Powered by <span style={{ fontWeight: 'bold', color: '#666' }}>BarakahSoft.com</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #receipt-content,
          #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            border: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
        </MainLayout>
    );
}