import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { approveQuery, editAndApproveQuery, rejectQuery } from '@/lib/services/workflowEngine';
import { supabase } from '@/lib/supabase';

// ─── Auth helper — returns user profile or null ───────────────────────────────
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return { user, role: profile?.role || 'viewer' };
}

// ─── PATCH: Approve / Edit / Reject — admin and reviewer only ────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUser();

    // Block viewers and unauthenticated users
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized — please log in' }, { status: 401 });
    }
    if (auth.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden — viewers cannot perform review actions. Contact an admin to upgrade your role.' }, { status: 403 });
    }

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

// ─── DELETE — admin only ──────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUser();

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — only admins can delete queries' }, { status: 403 });
    }

    const { id } = await params;
    await supabase.from('logs').delete().eq('query_id', id);
    const { error } = await supabase.from('queries').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
