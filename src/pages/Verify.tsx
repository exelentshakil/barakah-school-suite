// FILE: src/pages/Verify.tsx - VERIFICATION PAGE
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, Download } from 'lucide-react';
import { generateReportCard } from '@/lib/report-card';
import { useToast } from '@/hooks/use-toast';

export default function Verify() {
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const studentId = searchParams.get('student');
    const examId = searchParams.get('exam');

    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);

    useEffect(() => {
        if (studentId && examId) {
            loadReportCard();
        }
    }, [studentId, examId]);

    const loadReportCard = async () => {
        try {
            // Load student with guardians
            const { data: student } = await supabase
                .from('students')
                .select('*, classes(name), sections(name), guardians(*)')
                .eq('id', studentId)
                .single();

            // Load exam
            const { data: exam } = await supabase
                .from('exams')
                .select('*')
                .eq('id', examId)
                .single();

            // Load marks
            const { data: marks } = await supabase
                .from('marks')
                .select(`
          *,
          exam_subjects (
            id,
            subject_id,
            subject_name,
            full_marks,
            pass_marks
          )
        `)
                .eq('exam_id', examId)
                .eq('student_id', studentId);

            // Enrich marks with subject names from subjects table if needed
            let enrichedMarks = marks || [];
            if (enrichedMarks.length > 0) {
                enrichedMarks = await Promise.all(
                    enrichedMarks.map(async (mark) => {
                        if (mark.exam_subjects && !mark.exam_subjects.subject_name && mark.exam_subjects.subject_id) {
                            const { data: subject } = await supabase
                                .from('subjects')
                                .select('name, name_bn')
                                .eq('id', mark.exam_subjects.subject_id)
                                .single();

                            if (subject) {
                                return {
                                    ...mark,
                                    exam_subjects: {
                                        ...mark.exam_subjects,
                                        subject_name: subject.name
                                    }
                                };
                            }
                        }
                        return mark;
                    })
                );
            }

            // Load school
            const { data: school } = await supabase
                .from('school_settings')
                .select('*')
                .single();

            if (student && exam && enrichedMarks) {
                const studentWithMarks = { ...student, marks: enrichedMarks };
                setReportData({ student: studentWithMarks, exam, school });
            }
        } catch (error) {
            console.error('Error loading report card:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!reportData) return;

        setDownloading(true);
        try {
            const { student, exam, school } = reportData;
            await generateReportCard(student, exam, school);
            toast({ title: "✓ Report card downloaded successfully!" });
        } catch (error) {
            toast({ title: "Error downloading report card", variant: "destructive" });
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading report card...</p>
                </div>
            </div>
        );
    }

    if (!reportData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Invalid Report Card</h2>
                    <p className="text-muted-foreground">This report card could not be verified.</p>
                </div>
            </div>
        );
    }

    const { student, exam, school } = reportData;
    const guardianData = student.guardians || {};
    const fatherName = guardianData.father_name || 'N/A';
    const motherName = guardianData.mother_name || 'N/A';

    const totalFullMarks = student.marks.reduce((sum: number, m: any) => sum + parseFloat(m.exam_subjects?.full_marks || 0), 0);
    const totalObtained = student.marks.reduce((sum: number, m: any) => sum + parseFloat(m.total || 0), 0);
    const totalGP = student.marks.reduce((sum: number, m: any) => sum + parseFloat(m.grade_point || 0), 0);
    const gpa = student.marks.length > 0 ? (totalGP / student.marks.length).toFixed(2) : '0.00';

    const getGrade = (gpa: number) => {
        if (gpa >= 5.0) return 'A+';
        if (gpa >= 4.0) return 'A';
        if (gpa >= 3.5) return 'A-';
        if (gpa >= 3.0) return 'B';
        if (gpa >= 2.0) return 'C';
        if (gpa >= 1.0) return 'D';
        return 'F';
    };

    const failedCount = student.marks.filter((m: any) => parseFloat(m.total) < (m.exam_subjects?.pass_marks || 33)).length;

    return (
        <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '32px 0' }}>
            {/* Download Button */}
            <div style={{ maxWidth: '210mm', margin: '0 auto 24px', padding: '0 16px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Shield style={{ width: '32px', height: '32px', color: '#16a34a' }} />
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Verified Report Card</h3>
                            <p style={{ fontSize: '14px', color: '#6b7280' }}>This is an authentic report card issued by the institution</p>
                        </div>
                    </div>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            background: downloading ? '#9ca3af' : '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: downloading ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '14px'
                        }}
                    >
                        {downloading ? (
                            <>
                                <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
                                Downloading...
                            </>
                        ) : (
                            <>
                                <Download style={{ width: '16px', height: '16px' }} />
                                Download PDF
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Report Card - Using exact same HTML/CSS from report-card.ts */}
            <div dangerouslySetInnerHTML={{ __html: `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
          .verify-report * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', 'Noto Sans Bengali', sans-serif; }
          .verify-report .transcript { width: 210mm; min-height: 297mm; background: white; padding: 0; position: relative; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .verify-report .border-frame { position: absolute; inset: 8mm; border: 4px solid #1a1a1a; border-radius: 4px; }
          .verify-report .inner-border { position: absolute; inset: 10mm; border: 2px solid #b8860b; border-radius: 2px; }
          .verify-report .content { position: relative; padding: 15mm; z-index: 10; }
          .verify-report .header { text-align: center; margin-bottom: 8mm; }
          .verify-report .school-logo { width: 50px; height: 50px; margin: 0 auto 8px; border-radius: 50%; border: 2px solid #2c5f2d; display: flex; align-items: center; justify-content: center; background: #2c5f2d; color: white; font-size: 24px; font-weight: bold; }
          .verify-report .school-name { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px; text-transform: uppercase; }
          .verify-report .school-address { font-size: 10px; color: #1a1a1a; margin-bottom: 6px; }
          .verify-report .transcript-title { font-size: 13px; font-weight: 700; text-decoration: underline; margin-top: 6px; letter-spacing: 1px; }
          .verify-report .grade-table-header { position: absolute; top: 15mm; right: 15mm }
          .verify-report .grade-table-header table { border-collapse: collapse; font-size: 8px; }
          .verify-report .grade-table-header th { border: 1px solid #000; padding: 2px 6px; font-weight: 600; background: #f5f5f5; }
          .verify-report .grade-table-header td { border: 1px solid #000; padding: 2px 6px; text-align: center; }
          .verify-report .student-info { margin: 12px 0; clear: both; }
          .verify-report .info-row { display: grid; grid-template-columns: 140px 1fr 140px 1fr; margin-bottom: 5px; font-size: 10px; }
          .verify-report .info-label { font-weight: 600; }
          .verify-report .student-photo { position: absolute; top: 15mm; left: 15mm; width: 32mm; height: 38mm; border: 2px solid #000; display: flex; align-items: center; justify-content: center; background: #f5f5f5; color: #999; font-size: 40px; }
          .verify-report .student-photo img { width: 100%; height: 100%; object-fit: cover; }
          .verify-report .marks-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9px; }
          .verify-report .marks-table th { border: 1px solid #000; padding: 5px 3px; font-weight: 600; background: #f5f5f5; text-align: center; }
          .verify-report .marks-table td { border: 1px solid #000; padding: 5px 3px; text-align: center; }
          .verify-report .marks-table td:first-child { text-align: left; padding-left: 6px; font-weight: 500; }
          .verify-report .marks-table .total-row { font-weight: 700; background: #f0f9ff; }
          .verify-report .marks-table .total-row td:first-child { text-align: center; color: #16a34a; }
          .verify-report .bottom-section { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; font-size: 9px; }
          .verify-report .position-box { border: 1px solid #000; padding: 6px; }
          .verify-report .position-table { width: 100%; border-collapse: collapse; }
          .verify-report .position-table td { padding: 3px; border-bottom: 1px solid #eee; }
          .verify-report .position-table td:first-child { font-weight: 600; width: 120px; }
          .verify-report .evaluation-box { border: 1px solid #000; padding: 6px; }
          .verify-report .eval-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .verify-report .eval-item { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f0f0f0; font-size: 8px; }
          .verify-report .final-section { margin-top: 10mm; }
          .verify-report .comment-qr-row { display: grid; grid-template-columns: 1fr 40mm; gap: 10mm; margin-bottom: 8mm; }
          .verify-report .comment-box { border: 1px solid #000; padding: 8px; min-height: 35mm; position: relative; }
          .verify-report .comment-label { font-size: 8px; font-weight: 600; position: absolute; left: 3px; top: 3px; writing-mode: vertical-rl; text-orientation: mixed; }
          .verify-report .qr-container { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .verify-report .qr-verified { width: 35mm; height: 35mm; border: 2px solid #16a34a; background: #f0fdf4; display: flex; align-items: center; justify-content: center; flex-direction: column; border-radius: 8px; }
          .verify-report .qr-verified-icon { width: 48px; height: 48px; color: #16a34a; margin-bottom: 8px; }
          .verify-report .qr-verified-text { font-size: 9px; font-weight: 600; color: #16a34a; }
          .verify-report .verified-badge { background: #16a34a; color: white; padding: 4px 8px; border-radius: 4px; font-size: 7px; margin-top: 8px; }
          .verify-report .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15mm; margin-bottom: 6mm; }
          .verify-report .signature { text-align: center; }
          .verify-report .signature-line { width: 100%; border-top: 1px solid #000; margin: 25px 0 4px; }
          .verify-report .signature-label { font-size: 9px; font-weight: 600; }
          .verify-report .footer { display: flex; justify-content: space-between; font-size: 7px; color: #888; }
        </style>
        <div class="verify-report">
          <div class="transcript">
            <div class="border-frame"></div>
            <div class="inner-border"></div>
            <div class="content">
              <div class="student-photo">${student.photo_url ? `<img src="${student.photo_url}" />` : `<span>👤</span>`}</div>
              <div class="header">
                <div class="school-logo">🎓</div>
                <div class="school-name">${school?.name || 'SCHOOL NAME'}</div>
                ${school?.name_bn ? `<div class="school-address">${school.name_bn}</div>` : ''}
                <div class="school-address">${school?.address || 'School Address'}</div>
                <div class="transcript-title">ACADEMIC TRANSCRIPT</div>
              </div>
              <div class="grade-table-header">
                <table>
                  <tr><th>Range</th><th>Grade</th><th>GPA</th></tr>
                  <tr><td>80-100</td><td>A+</td><td>5.0</td></tr>
                  <tr><td>70-79</td><td>A</td><td>4.0</td></tr>
                  <tr><td>60-69</td><td>A-</td><td>3.5</td></tr>
                  <tr><td>50-59</td><td>B</td><td>3.0</td></tr>
                  <tr><td>40-49</td><td>C</td><td>2.0</td></tr>
                  <tr><td>33-39</td><td>D</td><td>1.0</td></tr>
                  <tr><td>00-32</td><td>F</td><td>0.0</td></tr>
                </table>
              </div>
              <div class="student-info">
                <div class="info-row"><span class="info-label">Student's Name</span><span>: <strong>${student.name_en}</strong></span><span class="info-label">Exam</span><span>: <strong>${exam.name}</strong></span></div>
                <div class="info-row"><span class="info-label">Father's Name</span><span>: ${fatherName}</span><span class="info-label">Year/Session</span><span>: ${exam.academic_year}</span></div>
                <div class="info-row"><span class="info-label">Mother's Name</span><span>: ${motherName}</span><span class="info-label">Section</span><span>: ${student.sections?.name || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Student's ID</span><span>: ${student.student_id}</span><span></span><span></span></div>
                <div class="info-row"><span class="info-label">Class</span><span>: ${student.classes?.name || ''}</span><span></span><span></span></div>
                <div class="info-row"><span class="info-label">Roll No</span><span>: ${student.roll || 'N/A'}</span><span></span><span></span></div>
              </div>
              <table class="marks-table">
                <thead>
                  <tr>
                    <th rowspan="2">Subject</th><th rowspan="2">Full<br/>Marks</th><th rowspan="2">Highest<br/>Marks</th>
                    <th colspan="4">Marks Distribution</th>
                    <th rowspan="2">Total<br/>Marks</th><th rowspan="2">Letter<br/>Grade</th><th rowspan="2">GP</th>
                  </tr>
                  <tr><th>CT</th><th>WR</th><th>MCQ</th><th>PR</th></tr>
                </thead>
                <tbody>
                  ${student.marks.map((m: any) => {
                    const subjectName = m.exam_subjects?.subject_name || 'Unknown Subject';
                    const fullMarks = m.exam_subjects?.full_marks || 100;
                    return `<tr>
                      <td>${subjectName}</td>
                      <td>${fullMarks}</td>
                      <td>${fullMarks.toFixed(1)}</td>
                      <td>-</td>
                      <td>${m.written || '-'}</td>
                      <td>${m.mcq || '-'}</td>
                      <td>${m.practical || '-'}</td>
                      <td><strong>${parseFloat(m.total).toFixed(1)}</strong></td>
                      <td><strong>${m.letter_grade}</strong></td>
                      <td>${parseFloat(m.grade_point).toFixed(1)}</td>
                    </tr>`;
                }).join('')}
                  <tr class="total-row">
                    <td colspan="2">Total Exam Marks</td>
                    <td>${totalFullMarks}</td>
                    <td colspan="4">Obtained Marks & GPA</td>
                    <td><strong>${totalObtained.toFixed(2)}</strong></td>
                    <td><strong>${getGrade(parseFloat(gpa))}</strong></td>
                    <td><strong>${gpa}</strong></td>
                  </tr>
                </tbody>
              </table>
              <div class="bottom-section">
                <div class="position-box">
                  <table class="position-table">
                    <tr><td>Section Position</td><td>-</td></tr>
                    <tr><td>GPA (Without 4th)</td><td><strong>${gpa}</strong></td></tr>
                    <tr><td>Failed Subject (s)</td><td><strong>${failedCount}</strong></td></tr>
                    <tr><td>Working Days</td><td>-</td></tr>
                    <tr><td>Total Present</td><td>-</td></tr>
                  </table>
                </div>
                <div class="evaluation-box">
                  <div class="eval-row">
                    <div>
                      <div style="font-weight: 700; margin-bottom: 4px; font-size: 8px; text-decoration: underline;">Moral & Behavior Evaluation</div>
                      <div class="eval-item"><span>Best</span><span>☐</span></div>
                      <div class="eval-item"><span>Better</span><span>☐</span></div>
                      <div class="eval-item"><span>Good</span><span>☐</span></div>
                      <div class="eval-item"><span>Need Improvement</span><span>☐</span></div>
                    </div>
                    <div>
                      <div style="font-weight: 700; margin-bottom: 4px; font-size: 8px; text-decoration: underline;">Co-Curricular Activities</div>
                      <div class="eval-item"><span>Sports</span><span>☐</span></div>
                      <div class="eval-item"><span>Cultural Function</span><span>☐</span></div>
                      <div class="eval-item"><span>Scout/BNCC</span><span>☐</span></div>
                      <div class="eval-item"><span>Math Olympiad</span><span>☐</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="final-section">
                <div class="comment-qr-row">
                  <div class="comment-box">
                    <div class="comment-label">Comment</div>
                  </div>
                  <div class="qr-container">
                    <div class="qr-verified">
                      <svg class="qr-verified-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span class="qr-verified-text">VERIFIED</span>
                    </div>
                    <div class="verified-badge">Authentic Report Card</div>
                  </div>
                </div>
                <div class="signatures">
                  <div class="signature"><div class="signature-line"></div><div class="signature-label">Class Teacher</div></div>
                  <div class="signature"><div class="signature-line"></div><div class="signature-label">Principal</div></div>
                  <div class="signature"><div class="signature-line"></div><div class="signature-label">Guardian</div></div>
                </div>
                <div class="footer">
                  <div>Powered By BarakahSoft.com</div>
                  <div>Date of Result Publication: ${new Date().toLocaleDateString('en-GB')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `}} />
        </div>
    );
}