// FILE: src/pages/VerifyCertificate.tsx - UPDATED CERTIFICATE VERIFICATION PAGE
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, Download, Award, CheckCircle2, AlertCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    generatePassingCertificate,
    generateTransferCertificate,
    generateCharacterCertificate,
    generateHifzCertificate
} from '@/lib/certificates-all';
import { useToast } from '@/hooks/use-toast';

export default function VerifyCertificate() {
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const certificateId = searchParams.get('id');
    const certType = searchParams.get('type'); // 'passing' or 'other'

    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [certificateData, setCertificateData] = useState<any>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (certificateId && certType) {
            loadCertificate();
        } else {
            setError(true);
            setLoading(false);
        }
    }, [certificateId, certType]);

    const loadCertificate = async () => {
        try {
            if (certType === 'passing') {
                // Load passing certificate
                const { data: cert, error: certError } = await supabase
                    .from('passing_certificates')
                    .select(`*, students(*, classes(name), sections(name), guardians(*)), exams(*)`)
                    .eq('id', certificateId)
                    .single();

                if (certError || !cert) {
                    setError(true);
                    return;
                }

                const { data: school } = await supabase.from('school_settings').select('*').single();
                setCertificateData({ ...cert, school, type: 'passing' });
            } else {
                // Load other certificate types
                const { data: cert, error: certError } = await supabase
                    .from('other_certificates')
                    .select(`*, students(*, classes(name), sections(name), guardians(*))`)
                    .eq('id', certificateId)
                    .single();

                if (certError || !cert) {
                    setError(true);
                    return;
                }

                const { data: school } = await supabase.from('school_settings').select('*').single();
                setCertificateData({ ...cert, school });
            }
        } catch (error) {
            console.error('Error loading certificate:', error);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!certificateData) return;

        setDownloading(true);
        try {
            let doc;
            if (certificateData.type === 'passing') {
                doc = await generatePassingCertificate(certificateData.students, certificateData.exams, certificateData.school, certificateData);
            } else if (certificateData.type === 'transfer') {
                doc = await generateTransferCertificate(certificateData.students, certificateData.school, certificateData);
            } else if (certificateData.type === 'character') {
                doc = await generateCharacterCertificate(certificateData.students, certificateData.school, certificateData);
            } else if (certificateData.type === 'hifz') {
                doc = await generateHifzCertificate(certificateData.students, certificateData.school, certificateData);
            }

            if (doc) {
                const fileName = certificateData.type === 'passing'
                    ? `Certificate_${certificateData.students.student_id}_${certificateData.exams?.name}.pdf`
                    : `${certificateData.type}_Certificate_${certificateData.students.student_id}.pdf`;
                doc.save(fileName);
                toast({ title: "✓ Certificate downloaded successfully!" });
            }
        } catch (error: any) {
            toast({ title: "Error downloading certificate", description: error.message, variant: "destructive" });
        } finally {
            setDownloading(false);
        }
    };

    const getCertificateTypeLabel = (type: string) => {
        switch(type) {
            case 'passing': return 'Passing Certificate';
            case 'transfer': return 'Transfer Certificate';
            case 'character': return 'Character Certificate';
            case 'hifz': return 'Hifz Certificate';
            default: return 'Certificate';
        }
    };

    const getCertificateTypeColor = (type: string) => {
        switch(type) {
            case 'passing': return 'bg-green-100 text-green-800 border-green-300';
            case 'transfer': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'character': return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'hifz': return 'bg-orange-100 text-orange-800 border-orange-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Verifying certificate...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !certificateData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-red-200">
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <div>
                                <CardTitle className="text-red-900">Invalid Certificate</CardTitle>
                                <CardDescription>This certificate could not be verified</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-800">
                                The certificate ID provided is invalid or the certificate does not exist in our system.
                                Please verify the QR code or certificate number and try again.
                            </p>
                        </div>
                        <Separator />
                        <div className="text-center text-sm text-muted-foreground">
                            <p>If you believe this is an error, please contact the issuing institution.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Verification Badge */}
                <Card className="border-green-200 bg-white shadow-lg">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-green-100 rounded-full">
                                <Shield className="w-10 h-10 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                    <CardTitle className="text-2xl text-green-900">Verified Authentic</CardTitle>
                                </div>
                                <CardDescription className="text-base">
                                    This certificate has been verified and is authentic
                                </CardDescription>
                            </div>
                            <Badge className={`${getCertificateTypeColor(certificateData.type)} border text-sm px-4 py-2`}>
                                {getCertificateTypeLabel(certificateData.type)}
                            </Badge>
                        </div>
                    </CardHeader>
                </Card>

                {/* Certificate Details */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Award className="w-6 h-6 text-primary" />
                            <CardTitle>Certificate Details</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* School Info */}
                        <div>
                            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Issuing Institution</h3>
                            <div className="text-lg font-semibold">{certificateData.school?.name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{certificateData.school?.address || ''}</div>
                        </div>

                        <Separator />

                        {/* Student Info */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Student Name</h3>
                                <div className="text-lg font-semibold">{certificateData.students?.name_en}</div>
                                {certificateData.students?.name_bn && (
                                    <div className="text-sm text-muted-foreground">{certificateData.students.name_bn}</div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Student ID</h3>
                                <div className="text-lg font-mono">{certificateData.students?.student_id}</div>
                            </div>
                        </div>

                        {certificateData.students?.guardians?.father_name && (
                            <div>
                                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Father's Name</h3>
                                <div className="text-base">{certificateData.students.guardians.father_name}</div>
                            </div>
                        )}

                        <Separator />

                        {/* Certificate Specific Details */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Certificate Number</h3>
                                <div className="text-base font-mono">{certificateData.certificate_no}</div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Issue Date</h3>
                                <div className="text-base">{new Date(certificateData.issue_date).toLocaleDateString('en-GB')}</div>
                            </div>
                        </div>

                        {/* Passing Certificate Details */}
                        {certificateData.type === 'passing' && (
                            <>
                                <Separator />
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Examination</h3>
                                        <div className="text-base">{certificateData.exams?.name}</div>
                                        <div className="text-sm text-muted-foreground">{certificateData.exams?.academic_year}</div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Grade</h3>
                                        <div className="text-2xl font-bold text-green-600">{certificateData.grade}</div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">GPA</h3>
                                        <div className="text-2xl font-bold text-blue-600">{certificateData.gpa.toFixed(2)}</div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Other Certificate Details */}
                        {certificateData.type !== 'passing' && (
                            <>
                                <Separator />
                                <div className="grid md:grid-cols-2 gap-4">
                                    {certificateData.conduct && (
                                        <div>
                                            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Conduct</h3>
                                            <Badge variant="secondary" className="text-base">{certificateData.conduct}</Badge>
                                        </div>
                                    )}
                                    {certificateData.type === 'transfer' && certificateData.leaving_date && (
                                        <div>
                                            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Leaving Date</h3>
                                            <div className="text-base">{new Date(certificateData.leaving_date).toLocaleDateString('en-GB')}</div>
                                        </div>
                                    )}
                                    {certificateData.type === 'hifz' && certificateData.completion_date && (
                                        <div>
                                            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Completion Date</h3>
                                            <div className="text-base">{new Date(certificateData.completion_date).toLocaleDateString('en-GB')}</div>
                                        </div>
                                    )}
                                    {certificateData.type === 'hifz' && certificateData.teacher_name && (
                                        <div>
                                            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Teacher</h3>
                                            <div className="text-base">{certificateData.teacher_name}</div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <Separator />

                        {/* Download Button */}
                        <div className="flex justify-center">
                            <Button
                                size="lg"
                                onClick={handleDownload}
                                disabled={downloading}
                                className="w-full md:w-auto"
                            >
                                {downloading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating PDF...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Certificate
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer Info */}
                <Card className="bg-muted/50">
                    <CardContent className="py-6">
                        <div className="text-center text-sm text-muted-foreground space-y-2">
                            <p>
                                This certificate was issued by <strong>{certificateData.school?.name}</strong>
                            </p>
                            <p className="text-xs">
                                Certificate verification is instant. If you have concerns about authenticity,
                                please contact the issuing institution directly.
                            </p>
                            <div className="pt-4">
                                <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline">
                                    <Home className="w-4 h-4" />
                                    Back to Home
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Branding */}
                <div className="text-center text-xs text-muted-foreground">
                    <p>Powered by <span className="font-semibold">BarakahSoft School Manager</span></p>
                    <p className="text-[10px] mt-1">barakahsoft.com</p>
                </div>
            </div>
        </div>
    );
}