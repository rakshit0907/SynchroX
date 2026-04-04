import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { executeWorkflow } from '@/lib/services/workflowEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status     = searchParams.get('status');
    const search     = searchParams.get('search');
    const model      = searchParams.get('model');
    const dateFrom   = searchParams.get('dateFrom');
    const dateTo     = searchParams.get('dateTo');
    const confMin    = searchParams.get('confMin');
    const confMax    = searchParams.get('confMax');
    const sortBy     = searchParams.get('sortBy') || 'created_at';
    const sortOrder  = searchParams.get('sortOrder') === 'asc';
    const page       = parseInt(searchParams.get('page') || '1');
    const limit      = parseInt(searchParams.get('limit') || '20');
    const offset     = (page - 1) * limit;

    let q = supabase
      .from('queries')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') q = q.eq('status', status);
    if (search)  q = q.ilike('user_query', `%${search}%`);
    if (model)   q = q.eq('ai_model', model);
    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo)   q = q.lte('created_at', dateTo + 'T23:59:59Z');
    if (confMin)  q = q.gte('confidence_score', parseFloat(confMin));
    if (confMax)  q = q.lte('confidence_score', parseFloat(confMax));

    const { data: queries, error, count } = await q;

    if (error) {
      console.warn('[queries] Supabase error:', error.message);
      return NextResponse.json({ queries: [], total: 0, page, totalPages: 0 });
    }

    return NextResponse.json({
      queries : queries || [],
      total   : count  || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    console.error('[queries] Unexpected error:', err);
    return NextResponse.json({ queries: [], total: 0, page: 1, totalPages: 0 });
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
