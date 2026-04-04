import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data: workflows, error } = await supabase
    .from('workflows')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workflows: workflows || [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, nodes, edges, confidenceThreshold, status } = body;

    const { data, error } = await supabase
      .from('workflows')
      .insert({
        name: name || 'Untitled Workflow',
        nodes: nodes || [],
        edges: edges || [],
        confidence_threshold: confidenceThreshold || 0.75,
        status: status || 'active',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ workflow: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
