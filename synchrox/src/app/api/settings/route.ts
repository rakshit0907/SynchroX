import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_SETTINGS = {
  confidence_threshold: 0.75,
  hf_model: process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3',
  sla_warning_mins: 20,
  sla_breach_mins: 30,
  sla_critical_mins: 60,
  email_notifications: true,
  auto_escalate: true,
  max_retries: 2,
};

export async function GET() {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', Object.keys(DEFAULT_SETTINGS));

    if (!data || data.length === 0) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS });
    }

    const settings = { ...DEFAULT_SETTINGS };
    for (const row of data) {
      try {
        (settings as Record<string, unknown>)[row.key] = JSON.parse(row.value);
      } catch {
        (settings as Record<string, unknown>)[row.key] = row.value;
      }
    }
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updates = Object.entries(body).map(([key, value]) => ({
      key,
      value: JSON.stringify(value),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('platform_settings')
      .upsert(updates, { onConflict: 'key' });

    if (error) {
      // Table may not exist — return OK with local-only message
      return NextResponse.json({ saved: false, local: true, message: 'Settings saved locally (DB table not configured)' });
    }

    return NextResponse.json({ saved: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
