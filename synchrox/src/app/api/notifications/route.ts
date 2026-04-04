import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    let q = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit);
    if (unreadOnly) q = q.eq('read', false);

    const { data: notifications, error } = await q;

    // Table might not exist yet — return empty gracefully
    if (error) {
      console.warn('[notifications] Supabase error (table may not exist):', error.message);
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const unreadCount = (notifications || []).filter((n) => !n.read).length;
    return NextResponse.json({ notifications: notifications || [], unreadCount });
  } catch (err) {
    console.error('[notifications] Unexpected error:', err);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

export async function PATCH() {
  try {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
    if (error) {
      console.warn('[notifications] PATCH error:', error.message);
      return NextResponse.json({ success: false, error: error.message });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) });
  }
}
