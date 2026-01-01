// FILE: src/lib/sms-payment.ts - SMS RECHARGE PAYMENT

import { supabase } from '@/integrations/supabase/client';

const SSLCOMMERZ_STORE_ID = import.meta.env.VITE_SSLCOMMERZ_STORE_ID || '';
const SSLCOMMERZ_STORE_PASSWORD = import.meta.env.VITE_SSLCOMMERZ_STORE_PASSWORD || '';
const IS_SANDBOX = import.meta.env.VITE_SSLCOMMERZ_SANDBOX === 'true';

interface RechargePackage {
    sms: number;
    price: number;
    bonus?: number;
}

/**
 * Initiate SMS recharge payment
 */
export async function initiateSMSRecharge(packageData: RechargePackage): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', user.id)
        .single();

    const totalSMS = packageData.sms + (packageData.bonus || 0);
    const orderId = `SMS-${Date.now()}-${user.id.substring(0, 8)}`;

    await supabase.from('sms_orders').insert({
        order_id: orderId,
        user_id: user.id,
        package_sms: packageData.sms,
        total_sms: totalSMS,
        amount: packageData.price,
        status: 'pending'
    });

    const baseUrl = window.location.origin;

    const formData = new URLSearchParams({
        store_id: SSLCOMMERZ_STORE_ID,
        store_passwd: SSLCOMMERZ_STORE_PASSWORD,
        total_amount: packageData.price.toString(),
        currency: 'BDT',
        tran_id: orderId,
        success_url: `${baseUrl}/sms-payment-success`,
        fail_url: `${baseUrl}/sms-payment-fail`,
        cancel_url: `${baseUrl}/sms-payment-cancel`,
        product_name: `${totalSMS} SMS Package`,
        product_category: 'SMS_RECHARGE',
        product_profile: 'digital-goods',
        cus_name: profile?.name || 'Customer',
        cus_email: profile?.email || 'customer@example.com',
        cus_add1: 'Rajshahi',
        cus_city: 'Rajshahi',
        cus_postcode: '6000',
        cus_country: 'Bangladesh',
        cus_phone: '01700000000',
        shipping_method: 'NO'
    });

    // const apiUrl = IS_SANDBOX
    //     ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
    //     : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';
    //
    // const response = await fetch(apiUrl, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //     body: formData.toString()
    // });
    //
    // const result = await response.json();
    //
    // if (result.status === 'SUCCESS') {
    //     // Redirect to payment gateway
    //     window.location.href = result.GatewayPageURL;
    // } else {
    //     throw new Error(result.failedreason || 'Payment failed');
    // }


    // Call Edge Function instead
    const { data, error } = await supabase.functions.invoke('initiate-payment', {
        body: { packageData, orderId, profile }
    })

    if (error) throw error

    if (data.status === 'SUCCESS') {
        window.location.href = data.GatewayPageURL
    } else {
        throw new Error(data.failedreason || 'Payment failed')
    }
}

/**
 * Handle successful payment
 */
export async function handleSMSPaymentSuccess(params: URLSearchParams): Promise<void> {
    const tranId = params.get('tran_id');
    const amount = params.get('amount');
    const cardType = params.get('card_type');

    if (!tranId) {
        throw new Error('Transaction ID not found');
    }

    // Get order
    const { data: order } = await supabase
        .from('sms_orders')
        .select('*')
        .eq('order_id', tranId)
        .single();

    if (!order) {
        throw new Error('Order not found');
    }

    if (order.status === 'completed') {
        return; // Already processed
    }

    // Update order status
    await supabase
        .from('sms_orders')
        .update({
            status: 'completed',
            payment_method: cardType || 'unknown',
            paid_at: new Date().toISOString()
        })
        .eq('order_id', tranId);

    // Get current balance
    const { data: currentCredit } = await supabase
        .from('sms_credits')
        .select('balance')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const currentBalance = currentCredit?.balance || 0;
    const newBalance = currentBalance + order.total_sms;

    // Add credits
    await supabase.from('sms_credits').insert({
        balance: newBalance
    });
}

/**
 * Handle failed payment
 */
export async function handleSMSPaymentFailure(params: URLSearchParams): Promise<void> {
    const tranId = params.get('tran_id');

    if (!tranId) return;

    await supabase
        .from('sms_orders')
        .update({ status: 'failed' })
        .eq('order_id', tranId);
}

/**
 * Handle cancelled payment
 */
export async function handleSMSPaymentCancel(params: URLSearchParams): Promise<void> {
    const tranId = params.get('tran_id');

    if (!tranId) return;

    await supabase
        .from('sms_orders')
        .update({ status: 'cancelled' })
        .eq('order_id', tranId);
}