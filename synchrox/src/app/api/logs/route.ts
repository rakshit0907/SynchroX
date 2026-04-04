import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queryId = searchParams.get('queryId');
  const limit   = parseInt(searchParams.get('limit') || '100');

  let q = supabase.from('logs').select('*').order('created_at', { ascending: true }).limit(limit);
  if (queryId) q = q.eq('query_id', queryId);

  const { data: logs, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: logs || [] });
}
