import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { executeWorkflow } from '@/lib/services/workflowEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit  = parseInt(searchParams.get('limit') || '50');

    let q = supabase.from('queries').select('*').order('created_at', { ascending: false }).limit(limit);
    if (status) q = q.eq('status', status);

    const { data: queries, error } = await q;

    // Table might not exist yet — return empty gracefully
    if (error) {
      console.warn('[queries] Supabase error (table may not exist):', error.message);
      return NextResponse.json({ queries: [] });
    }

    return NextResponse.json({ queries: queries || [] });
  } catch (err) {
    console.error('[queries] Unexpected error:', err);
    return NextResponse.json({ queries: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const queryText  = body.query || body.userQuery || body.user_query;
    const workflowId = body.workflowId;

    if (!queryText?.trim()) {
      return NextResponse.json({ error: 'Query text is required' }, { status: 400 });
    }

    const result = await executeWorkflow(queryText.trim(), workflowId);
    return NextResponse.json({ query: result }, { status: 201 });
  } catch (err) {
    console.error('[queries POST] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
