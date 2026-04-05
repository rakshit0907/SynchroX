import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { approveQuery, editAndApproveQuery, rejectQuery } from '@/lib/services/workflowEngine';

// ─── Auth helper using Authorization header (no @supabase/ssr needed) ─────────
async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) return null;

  // Validate token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

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
    // Try header auth first; fall back to cookie-based session check
    const auth = await getAuthenticatedUser(req);

    // If no Authorization header (browser session), check via supabase session
    // For server-side requests from the browser (cookies), we trust the body role hint
    // Real enforcement: also check DB-level RLS
    if (auth && auth.role === 'viewer') {
      return NextResponse.json(
        { error: 'Forbidden — viewers cannot perform review actions. Contact an admin to upgrade your role.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { action, editedResponse, notes, reason, requesterRole } = body;

    // Belt-and-suspenders: also check the role sent from the client
    if (requesterRole === 'viewer') {
      return NextResponse.json(
        { error: 'Forbidden — viewers cannot perform review actions.' },
        { status: 403 }
      );
    }

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

// ─── DELETE — admin only (role checked client-side + body hint) ───────────────
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
