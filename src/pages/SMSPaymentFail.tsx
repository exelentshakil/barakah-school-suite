// FILE: src/pages/SMSPaymentFail.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { handleSMSPaymentFailure } from '@/lib/sms-payment';
import { XCircle, RefreshCcw, ArrowLeft } from 'lucide-react';

export default function SMSPaymentFail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        handleSMSPaymentFailure(searchParams).catch(console.error);
    }, [searchParams]);

    return (
        <MainLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full border-red-200">
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <XCircle className="w-12 h-12 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-red-600 mb-2">Payment Failed</h2>
                            <p className="text-muted-foreground">
                                Your payment could not be processed. No charges were made.
                            </p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg space-y-2">
                            <p className="text-sm text-red-700 font-medium">Common reasons:</p>
                            <ul className="text-xs text-red-600 text-left space-y-1">
                                <li>• Insufficient balance</li>
                                <li>• Invalid card details</li>
                                <li>• Payment gateway timeout</li>
                                <li>• Bank declined transaction</li>
                            </ul>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => navigate('/sms')}
                                className="flex-1"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                            <Button
                                onClick={() => navigate('/sms')}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}