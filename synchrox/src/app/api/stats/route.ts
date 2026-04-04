import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const [
      { count: total },
      { count: autoApproved },
      { count: pendingReview },
      { count: humanApproved },
      { count: humanEdited },
      { count: rejected },
    ] = await Promise.all([
      supabase.from('queries').select('*', { count: 'exact', head: true }),
      supabase.from('queries').select('*', { count: 'exact', head: true }).eq('status', 'auto_approved'),
      supabase.from('queries').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
      supabase.from('queries').select('*', { count: 'exact', head: true }).eq('status', 'human_approved'),
      supabase.from('queries').select('*', { count: 'exact', head: true }).eq('status', 'human_edited'),
      supabase.from('queries').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    ]);

    const { data: allScores } = await supabase.from('queries').select('confidence_score, processing_time_ms');
    const avgConfidence    = allScores?.length ? allScores.reduce((s, q) => s + q.confidence_score, 0) / allScores.length : 0;
    const avgProcessingTime= allScores?.length ? allScores.reduce((s, q) => s + q.processing_time_ms, 0) / allScores.length : 0;
    const { data: recentQueries } = await supabase.from('queries').select('*').order('created_at', { ascending: false }).limit(10);
    const t = total || 0;
    const hitlRate = t > 0 ? (((pendingReview || 0) + (humanApproved || 0) + (humanEdited || 0)) / t * 100) : 0;

    return NextResponse.json({
      totalQueries    : total || 0,
      autoApproved    : autoApproved || 0,
      pendingReview   : pendingReview || 0,
      humanApproved   : humanApproved || 0,
      humanEdited     : humanEdited || 0,
      rejected        : rejected || 0,
      processing      : 0,
      avgConfidence   : Math.round(avgConfidence * 100) / 100,
      avgProcessingTime: Math.round(avgProcessingTime),
      hitlRate        : Math.round(hitlRate * 10) / 10,
      recentQueries   : recentQueries || [],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
