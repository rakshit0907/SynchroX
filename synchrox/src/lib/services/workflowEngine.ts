import { supabase } from '@/lib/supabase';
import { generateAIResponse } from './aiService';

async function createLog(
  queryId: string,
  event: string,
  details: string,
  metadata: Record<string, unknown> = {}
) {
  await supabase.from('logs').insert({ query_id: queryId, event, details, metadata });
}

export async function executeWorkflow(queryText: string, workflowId?: string) {
  const threshold = parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.75');

  // 1. Create query record
  const { data: query, error } = await supabase
    .from('queries')
    .insert({ workflow_id: workflowId || null, user_query: queryText, status: 'processing' })
    .select()
    .single();

  if (error || !query) throw new Error(`Failed to create query: ${error?.message}`);

  const queryId = query.id;
  await createLog(queryId, 'query_received', `User submitted: "${queryText.substring(0, 100)}..."`);

  // 2. Get workflow confidence threshold if provided
  let confidenceThreshold = threshold;
  if (workflowId) {
    const { data: workflow } = await supabase
      .from('workflows')
      .select('confidence_threshold')
      .eq('id', workflowId)
      .single();
    if (workflow) confidenceThreshold = workflow.confidence_threshold;
  }

  // 3. Call AI
  await createLog(queryId, 'ai_processing', 'AI agent is analyzing the query...');
  const aiResult = await generateAIResponse(queryText);

  await createLog(queryId, 'ai_response', `AI confidence: ${aiResult.confidence_scor}`, {
    model: aiResult.model,
    processingTimeMs: aiResult.processingTimeMs,
    tokensUsed: aiResult.tokensUsed,
  });

  // 4. Confidence check
  await createLog(queryId, 'confidence_check',
    `Confidence ${aiResult.confidence_scor} vs threshold ${confidenceThreshold}`, {
    confidenceScore: aiResult.confidence_scor,
    threshold: confidenceThreshold,
    meetsThreshold: aiResult.confidence_scor >= confidenceThreshold,
  });

  // 5. Route decision
  const updates: Record<string, unknown> = {
    ai_response: aiResult.text,
    confidence_score: aiResult.confidence_scor,
    ai_model: aiResult.model,
    processing_time_ms: aiResult.processingTimeMs,
  };

  if (aiResult.confidence_scor >= confidenceThreshold) {
    updates.status = 'auto_approved';
    updates.final_response = aiResult.text;
    updates.routing_reason = `Confidence (${aiResult.confidence_scor}) meets threshold (${confidenceThreshold})`;
    await createLog(queryId, 'auto_approved', 'Response auto-approved');
    await createLog(queryId, 'response_delivered', 'Final response delivered to user');
  } else {
    updates.status = 'pending_review';
    updates.routing_reason = `Confidence (${aiResult.confidence_scor}) below threshold (${confidenceThreshold})`;
    await createLog(queryId, 'routed_to_human', `Low confidence. Escalated to human reviewer.`);
    // Create notification
    await supabase.from('notifications').insert({
      type    : 'hitl_required',
      title   : 'Human Review Required',
      message : `Query "${queryText.slice(0, 60)}..." needs review (${Math.round(aiResult.confidence_scor * 100)}% confidence)`,
      severity: 'warning',
      linked_entity_type: 'query',
      linked_entity_id  : queryId,
    });
  }

  const { data: updated } = await supabase
    .from('queries').update(updates).eq('id', queryId).select().single();

  return updated || { ...query, ...updates };
}

export async function approveQuery(queryId: string, notes?: string) {
  const { data: q } = await supabase.from('queries').select('ai_response').eq('id', queryId).single();
  if (!q) throw new Error('Query not found');
  const { data } = await supabase
    .from('queries')
    .update({ status: 'human_approved', final_response: q.ai_response, human_notes: notes || '' })
    .eq('id', queryId).select().single();
  await createLog(queryId, 'human_approved', 'Human approved the AI response', { notes });
  await createLog(queryId, 'response_delivered', 'Final response delivered to user');
  return data;
}

export async function editAndApproveQuery(queryId: string, editedResponse: string, notes?: string) {
  const { data } = await supabase
    .from('queries')
    .update({ status: 'human_edited', final_response: editedResponse, human_notes: notes || '' })
    .eq('id', queryId).select().single();
  await createLog(queryId, 'human_edited', 'Human edited and approved the response', { editedResponse, notes });
  await createLog(queryId, 'response_delivered', 'Final (edited) response delivered to user');
  return data;
}

export async function rejectQuery(queryId: string, reason: string) {
  const { data } = await supabase
    .from('queries')
    .update({ status: 'rejected', human_notes: reason })
    .eq('id', queryId).select().single();
  await createLog(queryId, 'human_rejected', `Rejected: ${reason}`, { reason });
  return data;
}
