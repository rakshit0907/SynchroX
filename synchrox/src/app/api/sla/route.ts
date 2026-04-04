import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendHITLAlertEmail } from '@/lib/services/emailService';

const SLA_WARNING_MINS  = 20;  // Yellow warning
const SLA_BREACH_MINS   = 30;  // Red breach → escalate
const SLA_CRITICAL_MINS = 60;  // Critical → re-alert email

export async function GET() {
  try {
    const now = new Date();

    // Fetch all pending_review queries
    const { data: pending, error } = await supabase
      .from('queries')
      .select('id, user_query, created_at, confidence_score')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const queries = pending || [];
    const stats = {
      total_pending   : queries.length,
      within_sla      : 0,
      warning         : 0,
      breached        : 0,
      critical        : 0,
      avg_wait_mins   : 0,
      oldest_wait_mins: 0,
    };

    const escalated: string[] = [];

    for (const q of queries) {
      const waitMs   = now.getTime() - new Date(q.created_at).getTime();
      const waitMins = Math.floor(waitMs / 60000);

      if (waitMins < SLA_WARNING_MINS)  stats.within_sla++;
      else if (waitMins < SLA_BREACH_MINS) stats.warning++;
      else if (waitMins < SLA_CRITICAL_MINS) { stats.breached++; escalated.push(q.id); }
      else { stats.critical++; escalated.push(q.id); }

      stats.avg_wait_mins    += waitMins;
      stats.oldest_wait_mins  = Math.max(stats.oldest_wait_mins, waitMins);
    }

    if (queries.length > 0) {
      stats.avg_wait_mins = Math.round(stats.avg_wait_mins / queries.length);
    }

    // Escalate breached queries — update status flag and re-notify
    if (escalated.length > 0) {
      await supabase.from('logs').insert(
        escalated.map(id => ({
          query_id: id,
          event   : 'sla_breached',
          details : `SLA breach detected. Query has been waiting over ${SLA_BREACH_MINS} minutes.`,
          metadata: { sla_breach_mins: SLA_BREACH_MINS },
        }))
      );

      // Send escalation email if critical queries exist
      const criticalQueries = queries.filter(q => {
        const waitMins = Math.floor((now.getTime() - new Date(q.created_at).getTime()) / 60000);
        return waitMins >= SLA_CRITICAL_MINS;
      });

      if (criticalQueries.length > 0) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('email')
          .eq('role', 'admin');
        const adminEmails = (admins || []).map((a: { email: string }) => a.email).filter(Boolean);
        if (adminEmails.length > 0) {
          await sendHITLAlertEmail({
            queryText      : `ESCALATION: ${criticalQueries.length} query(ies) have exceeded ${SLA_CRITICAL_MINS} minutes without review`,
            confidenceScore: 0,
            queryId        : criticalQueries[0].id,
            reason         : `SLA Critical — ${criticalQueries.length} queries pending over ${SLA_CRITICAL_MINS} mins. Immediate review required.`,
            reviewerEmails : adminEmails,
          });
        }
      }
    }

    return NextResponse.json({ stats, escalated_count: escalated.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
