import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { analyzeMedia } from '@/lib/services/trustShieldService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const verdict = searchParams.get('verdict');
  const limit   = parseInt(searchParams.get('limit') || '50');

  let q = supabase.from('trust_shield').select('*').order('created_at', { ascending: false }).limit(limit);
  if (verdict) q = q.eq('verdict', verdict);

  const { data: analyses, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ analyses: analyses || [], total: analyses?.length || 0 });
}

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData();
    const file      = formData.get('file') as File | null;
    const fileName  = file?.name || formData.get('fileName') as string || 'unknown';
    const fileType  = file?.type || formData.get('fileType') as string || 'image/jpeg';
    const fileSize  = file?.size || parseInt(formData.get('fileSize') as string || '0');
    const mediaType = (fileType.startsWith('video') ? 'video' : 'image') as 'image' | 'video';

    let fileBuffer: Buffer | undefined;
    if (file) fileBuffer = Buffer.from(await file.arrayBuffer());

    const result = await analyzeMedia(fileName, fileType, fileSize, mediaType, fileBuffer);

    const { data: analysis, error } = await supabase
      .from('trust_shield')
      .insert({
        file_name       : fileName,
        file_type       : fileType,
        file_size       : fileSize,
        media_type      : mediaType,
        verdict         : result.verdict,
        confidence_score: result.confidence_scor,
        analysis_details: result.analysis_details,
        uploaded_by     : 'current_user',
        status          : 'completed',
      })
      .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ analysis }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
