// FILE: src/pages/SMSPaymentCancel.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { handleSMSPaymentCancel } from '@/lib/sms-payment';
import { Ban, ArrowLeft, CreditCard } from 'lucide-react';

export default function SMSPaymentCancel() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {

            handleSMSPaymentCancel(searchParams).catch(console.error);

    }, [searchParams]);

    return (
        <MainLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full border-orange-200">
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                            <Ban className="w-12 h-12 text-orange-600" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-orange-600 mb-2">Payment Cancelled</h2>
                            <p className="text-muted-foreground">
                                You cancelled the payment. No charges were made to your account.
                            </p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <p className="text-sm text-orange-700">
                                You can try again anytime. Your SMS package is still available.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => navigate('/sms')}
                                className="flex-1"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to SMS
                            </Button>
                            <Button
                                onClick={() => navigate('/sms')}
                                className="flex-1 bg-orange-600 hover:bg-orange-700"
                            >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Try Payment Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}