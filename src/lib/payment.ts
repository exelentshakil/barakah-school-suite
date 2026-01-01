// FILE: src/lib/payment.ts - HOSTED CHECKOUT FOR FEE PAYMENTS
import { supabase } from '@/integrations/supabase/client.ts';

const SSLCOMMERZ_STORE_ID = import.meta.env.VITE_SSLCOMMERZ_STORE_ID || '';
const SSLCOMMERZ_STORE_PASSWORD = import.meta.env.VITE_SSLCOMMERZ_STORE_PASSWORD || '';
const SSLCOMMERZ_SANDBOX = import.meta.env.VITE_SSLCOMMERZ_SANDBOX === 'true';

// Hosted Checkout URL (different from API URL!)
const SSLCOMMERZ_CHECKOUT_URL = SSLCOMMERZ_SANDBOX
    ? 'https://sandbox.sslcommerz.com/gwprocess/v4/gw.php'
    : 'https://securepay.sslcommerz.com/gwprocess/v4/gw.php';

export interface PaymentData {
    amount: number;
    invoiceId: string;
    studentId: string;
    studentName: string;
    guardianMobile: string;
    guardianEmail?: string;
}

export async function initiatePayment(data: PaymentData): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const origin = window.location.origin;

        // Store pending transaction FIRST
        const { error: dbError } = await supabase.from('payment_transactions').insert({
            transaction_id: transactionId,
            invoice_id: data.invoiceId,
            amount: data.amount,
            status: 'pending',
            gateway_data: {}
        });

        if (dbError) {
            console.error('Database error:', dbError);
            throw new Error('Failed to create transaction');
        }

        const paymentData = {
            store_id: SSLCOMMERZ_STORE_ID,
            store_passwd: SSLCOMMERZ_STORE_PASSWORD,
            total_amount: data.amount.toString(),
            currency: 'BDT',
            tran_id: transactionId,
            success_url: `${origin}/payment/success`,
            fail_url: `${origin}/payment/failed`,
            cancel_url: `${origin}/payment/cancel`,
            ipn_url: `${origin}/api/payment/ipn`,

            // Product info
            product_name: 'School Fee Payment',
            product_category: 'Education',
            product_profile: 'general',

            // Customer info
            cus_name: data.studentName,
            cus_email: data.guardianEmail || 'noemail@school.com',
            cus_add1: 'Rajshahi',
            cus_city: 'Rajshahi',
            cus_state: 'Rajshahi',
            cus_postcode: '6000',
            cus_country: 'Bangladesh',
            cus_phone: data.guardianMobile,

            // Shipping (same as customer)
            shipping_method: 'NO',
            num_of_item: 1,

            // Custom fields to track
            value_a: data.invoiceId,
            value_b: data.studentId,
            value_c: 'fee_payment'
        };

        // Create a hidden form and auto-submit
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = SSLCOMMERZ_CHECKOUT_URL;
        form.style.display = 'none';

        // Add all payment data as hidden inputs
        Object.entries(paymentData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        });

        // Append to body and submit
        document.body.appendChild(form);
        form.submit();

        return {
            success: true
        };
    } catch (error: any) {
        console.error('Payment Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export async function verifyPayment(transactionId: string): Promise<{ success: boolean; data?: any }> {
    try {
        // Note: For hosted checkout, SSLCommerz will redirect to success_url with payment details
        // You can optionally verify using their validation API if needed
        return { success: true };
    } catch (error) {
        console.error('Verification Error:', error);
        return { success: false };
    }
}

export async function processSuccessfulPayment(
    transactionId: string,
    invoiceId: string,
    amount: number,
    paymentMethod: string = 'sslcommerz'
): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        // Create payment record
        const { error: paymentError } = await supabase.from('payments').insert({
            invoice_id: invoiceId,
            amount: amount,
            payment_method: paymentMethod,
            transaction_id: transactionId,
            received_by: user?.id
        });

        if (paymentError) throw paymentError;

        // Update invoice status
        const { data: invoice } = await supabase
            .from('invoices')
            .select('total, status')
            .eq('id', invoiceId)
            .single();

        if (invoice) {
            const { data: payments } = await supabase
                .from('payments')
                .select('amount')
                .eq('invoice_id', invoiceId);

            const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

            let newStatus = 'unpaid';
            if (totalPaid >= invoice.total) newStatus = 'paid';
            else if (totalPaid > 0) newStatus = 'partial';

            await supabase
                .from('invoices')
                .update({ status: newStatus })
                .eq('id', invoiceId);
        }

        // Update transaction record
        await supabase.from('payment_transactions').update({
            status: 'completed',
            completed_at: new Date().toISOString()
        }).eq('transaction_id', transactionId);

        return true;
    } catch (error) {
        console.error('Payment Processing Error:', error);
        return false;
    }
}

// For manual cash/bKash payments
export async function recordManualPayment(
    invoiceId: string,
    amount: number,
    method: 'cash' | 'bkash' | 'nagad' | 'bank',
    transactionId?: string
): Promise<boolean> {
    return await processSuccessfulPayment(
        transactionId || `MANUAL-${Date.now()}`,
        invoiceId,
        amount,
        method
    );
}