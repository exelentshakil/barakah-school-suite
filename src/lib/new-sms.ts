// FILE: src/lib/sms.ts - BULKSMSBD.NET INTEGRATION
import { supabase } from '@/integrations/supabase/client.ts';

const SMS_API_KEY = import.meta.env.VITE_SMS_API_KEY || '';
const SMS_SENDER_ID = import.meta.env.VITE_SMS_SENDER_ID || '';
const SMS_API_URL = 'http://bulksmsbd.net/api/smsapi';
const SMS_API_MANY_URL = 'http://bulksmsbd.net/api/smsapimany';
const BALANCE_API_URL = 'http://bulksmsbd.net/api/getBalanceApi';

interface SMSMessage {
    mobile: string;
    message: string;
}

interface SMSResponse {
    success: boolean;
    code?: number;
    message?: string;
    sent?: number;
    failed?: number;
}

// Error code mapping
const ERROR_CODES: Record<number, string> = {
    202: 'SMS Submitted Successfully',
    1001: 'Invalid Number',
    1002: 'Sender ID not correct/disabled',
    1003: 'Required fields missing',
    1005: 'Internal Error',
    1006: 'Balance Validity Not Available',
    1007: 'Balance Insufficient',
    1011: 'User ID not found',
    1012: 'Masking SMS must be sent in Bengali',
    1013: 'Sender ID not found',
    1014: 'Sender Type Name not found',
    1015: 'Sender ID has no valid gateway',
    1016: 'Price info not found',
    1017: 'Price info not found',
    1018: 'Account is disabled',
    1019: 'Price is disabled',
    1020: 'Parent account not found',
    1021: 'Parent price not found',
    1031: 'Account Not Verified',
    1032: 'IP Not Whitelisted'
};

/**
 * Get current SMS balance
 */
export async function getSMSBalance(): Promise<number> {
    try {
        // First try to get from database
        const { data: credits } = await supabase
            .from('sms_credits')
            .select('balance')
            .single();

        if (credits) {
            return credits.balance;
        }

        // If not in database, fetch from API
        const response = await fetch(`${BALANCE_API_URL}?api_key=${SMS_API_KEY}`);
        const data = await response.text();
        const balance = parseInt(data) || 0;

        // Save to database
        await supabase
            .from('sms_credits')
            .upsert({
                id: 1,
                balance,
                last_synced: new Date().toISOString()
            });

        return balance;
    } catch (error) {
        console.error('Error fetching SMS balance:', error);
        return 0;
    }
}

/**
 * Send bulk SMS (One to Many - same message to multiple numbers)
 */
export async function sendBulkSMS(recipients: SMSMessage[]): Promise<number> {
    if (!SMS_API_KEY || !SMS_SENDER_ID) {
        console.error('SMS API credentials not configured');
        throw new Error('SMS service not configured. Please add API credentials to .env');
    }

    if (recipients.length === 0) {
        return 0;
    }

    let sentCount = 0;
    const { data: { user } } = await supabase.auth.getUser();

    // Group messages by content for optimization
    const messageGroups = new Map<string, string[]>();
    recipients.forEach(recipient => {
        if (!messageGroups.has(recipient.message)) {
            messageGroups.set(recipient.message, []);
        }
        messageGroups.get(recipient.message)!.push(recipient.mobile);
    });

    // Send each group
    for (const [message, numbers] of messageGroups.entries()) {
        try {
            // Format numbers (ensure they start with 88)
            const formattedNumbers = numbers.map(num => {
                const cleaned = num.replace(/\D/g, '');
                return cleaned.startsWith('88') ? cleaned : `88${cleaned}`;
            }).join(',');

            // URL encode message
            const encodedMessage = encodeURIComponent(message);

            // Send SMS
            const response = await fetch(SMS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `api_key=${SMS_API_KEY}&type=text&number=${formattedNumbers}&senderid=${SMS_SENDER_ID}&message=${encodedMessage}`
            });

            const result = await response.text();
            const code = parseInt(result);

            if (code === 202) {
                // Success
                sentCount += numbers.length;

                // Log each SMS
                for (const number of numbers) {
                    await supabase.from('sms_log').insert({
                        recipient: number,
                        message,
                        status: 'sent',
                        cost: 0.50, // Adjust based on actual cost
                        sent_by: user?.id
                    });
                }

                // Update balance
                await supabase.rpc('decrement_sms_balance', { count: numbers.length });
            } else {
                // Error
                const errorMsg = ERROR_CODES[code] || `Unknown error: ${code}`;
                console.error('SMS Error:', errorMsg);

                // Log failed SMS
                for (const number of numbers) {
                    await supabase.from('sms_log').insert({
                        recipient: number,
                        message,
                        status: 'failed',
                        error_message: errorMsg,
                        cost: 0,
                        sent_by: user?.id
                    });
                }
            }
        } catch (error) {
            console.error('Error sending SMS group:', error);
        }
    }

    return sentCount;
}

/**
 * Send personalized SMS (Many to Many - different message to each number)
 */
export async function sendPersonalizedSMS(messages: { to: string; message: string }[]): Promise<SMSResponse> {
    if (!SMS_API_KEY || !SMS_SENDER_ID) {
        throw new Error('SMS service not configured');
    }

    if (messages.length === 0) {
        return { success: false, message: 'No messages to send' };
    }

    try {
        // Format messages
        const formattedMessages = messages.map(msg => ({
            to: msg.to.startsWith('88') ? msg.to : `88${msg.to.replace(/\D/g, '')}`,
            message: msg.message
        }));

        // Send via Many to Many API
        const response = await fetch(SMS_API_MANY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: SMS_API_KEY,
                senderid: SMS_SENDER_ID,
                messages: formattedMessages
            })
        });

        const result = await response.text();
        const code = parseInt(result);

        const { data: { user } } = await supabase.auth.getUser();
        let sentCount = 0;

        if (code === 202) {
            // Success - log all messages
            sentCount = formattedMessages.length;

            for (const msg of formattedMessages) {
                await supabase.from('sms_log').insert({
                    recipient: msg.to,
                    message: msg.message,
                    status: 'sent',
                    cost: 0.50,
                    sent_by: user?.id
                });
            }

            // Update balance
            await supabase.rpc('decrement_sms_balance', { count: sentCount });

            return {
                success: true,
                code,
                message: ERROR_CODES[code],
                sent: sentCount
            };
        } else {
            // Error - log failures
            const errorMsg = ERROR_CODES[code] || `Unknown error: ${code}`;

            for (const msg of formattedMessages) {
                await supabase.from('sms_log').insert({
                    recipient: msg.to,
                    message: msg.message,
                    status: 'failed',
                    error_message: errorMsg,
                    cost: 0,
                    sent_by: user?.id
                });
            }

            return {
                success: false,
                code,
                message: errorMsg,
                failed: formattedMessages.length
            };
        }
    } catch (error: any) {
        console.error('SMS Error:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * Sync SMS balance from API to database
 */
export async function syncSMSBalance(): Promise<number> {
    try {
        const response = await fetch(`${BALANCE_API_URL}?api_key=${SMS_API_KEY}`);
        const data = await response.text();
        const balance = parseInt(data) || 0;

        await supabase
            .from('sms_credits')
            .upsert({
                id: 1,
                balance,
                last_synced: new Date().toISOString()
            });

        return balance;
    } catch (error) {
        console.error('Error syncing balance:', error);
        throw error;
    }
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(number: string): boolean {
    const cleaned = number.replace(/\D/g, '');

    // Bangladesh numbers: 11 digits starting with 01, or 13 digits starting with 8801
    if (cleaned.length === 11 && cleaned.startsWith('01')) {
        return true;
    }
    if (cleaned.length === 13 && cleaned.startsWith('8801')) {
        return true;
    }

    return false;
}

/**
 * Format phone number to Bangladesh format (88...)
 */
export function formatPhoneNumber(number: string): string {
    const cleaned = number.replace(/\D/g, '');

    if (cleaned.startsWith('88')) {
        return cleaned;
    }
    if (cleaned.startsWith('0')) {
        return `88${cleaned}`;
    }
    return `880${cleaned}`;
}

/**
 * Calculate SMS cost
 */
export function calculateSMSCost(messageCount: number, perSMSCost: number = 0.50): number {
    return messageCount * perSMSCost;
}

/**
 * Get SMS length and count
 */
export function getSMSInfo(message: string): { length: number; count: number } {
    const length = message.length;

    // Standard SMS: 160 chars
    // Unicode (Bengali): 70 chars
    const hasBengali = /[\u0980-\u09FF]/.test(message);
    const maxLength = hasBengali ? 70 : 160;

    const count = Math.ceil(length / maxLength);

    return { length, count };
}