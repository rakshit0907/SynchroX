import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[users] Supabase error:', error.message);
      return NextResponse.json({ users: [] });
    }

    return NextResponse.json({ users: data || [] });
  } catch (err) {
    console.error('[users] Unexpected error:', err);
    return NextResponse.json({ users: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, email, full_name, role } = body;

    if (!id || !email) {
      return NextResponse.json({ error: 'id and email are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id, email, full_name, role: role || 'reviewer' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ user: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
