import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { approveQuery, editAndApproveQuery, rejectQuery } from '@/lib/services/workflowEngine';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, editedResponse, notes, reason } = body;

    let result;
    if (action === 'approve') {
      result = await approveQuery(id, notes);
    } else if (action === 'edit') {
      result = await editAndApproveQuery(id, editedResponse, notes);
    } else if (action === 'reject') {
      result = await rejectQuery(id, reason || notes || 'Rejected by reviewer');
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ query: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await supabase.from('logs').delete().eq('query_id', id);
    const { error } = await supabase.from('queries').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
