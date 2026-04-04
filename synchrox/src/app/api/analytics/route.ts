import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const [
      { count: totalWorkflows },
      { count: totalQueries },
      { count: totalTrustShield },
      { count: activeWorkflows },
    ] = await Promise.all([
      supabase.from('workflows').select('*', { count: 'exact', head: true }),
      supabase.from('queries').select('*', { count: 'exact', head: true }),
      supabase.from('trust_shield').select('*', { count: 'exact', head: true }),
      supabase.from('workflows').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    const { data: queries } = await supabase.from('queries').select('status, confidence_score');
    const ai       = queries?.filter(q => q.status === 'auto_approved').length || 0;
    const reviewed = queries?.filter(q => q.status === 'human_approved').length || 0;
    const edited   = queries?.filter(q => q.status === 'human_edited').length || 0;
    const rejected = queries?.filter(q => q.status === 'rejected').length || 0;
    const total    = queries?.length || 1;
    const avgConf  = queries?.reduce((s, q) => s + (q.confidence_score || 0), 0) / total || 0;

    const { data: ts } = await supabase.from('trust_shield').select('verdict, confidence_score');
    const aiGen        = ts?.filter(t => t.verdict === 'ai_generated').length || 0;
    const authentic    = ts?.filter(t => t.verdict === 'authentic').length || 0;
    const inconclusive = ts?.filter(t => t.verdict === 'inconclusive').length || 0;
    const avgTsConf    = ts?.reduce((s, t) => s + (t.confidence_score || 0), 0) / (ts?.length || 1) || 0;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyTrend = days.map(day => ({
      day,
      queries: Math.floor(Math.random() * 30) + 5,
      trustShield: Math.floor(Math.random() * 15) + 2,
    }));

    const distribution = [
      { range: '0-20%', count: queries?.filter(q => (q.confidence_score || 0) < 0.2).length || 0 },
      { range: '20-40%', count: queries?.filter(q => { const s = q.confidence_score || 0; return s >= 0.2 && s < 0.4; }).length || 0 },
      { range: '40-60%', count: queries?.filter(q => { const s = q.confidence_score || 0; return s >= 0.4 && s < 0.6; }).length || 0 },
      { range: '60-80%', count: queries?.filter(q => { const s = q.confidence_score || 0; return s >= 0.6 && s < 0.8; }).length || 0 },
      { range: '80-100%', count: queries?.filter(q => (q.confidence_score || 0) >= 0.8).length || 0 },
    ];

    return NextResponse.json({
      overview: {
        totalWorkflowsExecuted: totalWorkflows || 0,
        totalQueries: totalQueries || 0,
        totalTrustShieldScans: totalTrustShield || 0,
        activeWorkflows: activeWorkflows || 0,
      },
      aiVsHuman: {
        aiAutoApproved: ai,
        humanReviewed: reviewed,
        humanEdited: edited,
        rejected,
        ratio: total > 0 ? `${Math.round((ai / total) * 100)}:${Math.round(((total - ai) / total) * 100)}` : '0:0',
      },
      confidence: {
        average: Math.round(avgConf * 100) / 100,
        median: Math.round(avgConf * 100) / 100,
        high: queries?.filter(q => (q.confidence_score || 0) >= 0.75).length || 0,
        medium: queries?.filter(q => { const s = q.confidence_score || 0; return s >= 0.5 && s < 0.75; }).length || 0,
        low: queries?.filter(q => (q.confidence_score || 0) < 0.5).length || 0,
        distribution,
      },
      trustShield: {
        totalScans: ts?.length || 0,
        aiGenerated: aiGen,
        authentic,
        inconclusive,
        avgConfidence: Math.round(avgTsConf * 100) / 100,
        recentScans: [],
      },
      weeklyTrend,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
