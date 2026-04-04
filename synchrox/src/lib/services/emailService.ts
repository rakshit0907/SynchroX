import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host  : process.env.SMTP_HOST || 'smtp.gmail.com',
  port  : parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth  : {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM    = process.env.SMTP_FROM || `SynchroX <${process.env.SMTP_USER}>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function buildHITLEmail(params: {
  queryText: string;
  confidenceScore: number;
  queryId: string;
  reason: string;
}) {
  const conf      = Math.round(params.confidenceScore * 100);
  const confColor = conf < 50 ? '#ef4444' : '#f59e0b';
  const reviewUrl = `${APP_URL}/review`;
  const shortQuery = params.queryText.length > 120 ? params.queryText.slice(0, 120) + '...' : params.queryText;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#111827;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
    <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:32px 40px;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px;">&#9889;</div>
      <h1 style="color:white;margin:0;font-size:22px;font-weight:800;">SynchroX</h1>
      <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">AI Orchestration Platform</p>
    </div>
    <div style="background:rgba(245,158,11,0.1);border-bottom:1px solid rgba(245,158,11,0.2);padding:16px 40px;">
      <div style="color:#f59e0b;font-weight:700;font-size:14px;">&#128680; Human Review Required</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">A query has been escalated to your review queue</div>
    </div>
    <div style="padding:36px 40px;">
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:100px;padding:10px 24px;">
          <span style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:1px;">AI Confidence Score</span>
          <div style="color:${confColor};font-size:36px;font-weight:800;line-height:1.1;margin-top:4px;">${conf}%</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:20px;">
        <div style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">User Query</div>
        <div style="color:#e2e8f0;font-size:15px;line-height:1.6;">"${shortQuery}"</div>
      </div>
      <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:16px;margin-bottom:28px;">
        <div style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Routing Reason</div>
        <div style="color:#fca5a5;font-size:13px;">${params.reason}</div>
      </div>
      <div style="text-align:center;">
        <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#7c3aed);color:white;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;">Review Query Now &#8594;</a>
      </div>
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.05);">
        <div style="color:rgba(255,255,255,0.3);font-size:12px;">Query ID: <span style="font-family:monospace;">${params.queryId.slice(0, 8)}...</span> &nbsp;&bull;&nbsp; ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
      </div>
    </div>
    <div style="background:rgba(0,0,0,0.3);padding:16px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;">You received this as a reviewer on SynchroX &bull; <a href="${APP_URL}" style="color:rgba(255,255,255,0.4);text-decoration:none;">Visit Platform</a></p>
    </div>
  </div>
</body></html>`;
}

export async function sendHITLAlertEmail(params: {
  queryText: string;
  confidenceScore: number;
  queryId: string;
  reason: string;
  reviewerEmails: string[];
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[emailService] SMTP not configured — skipping. Set SMTP_USER and SMTP_PASS in .env.local');
    return { sent: false, reason: 'SMTP not configured' };
  }
  if (params.reviewerEmails.length === 0) {
    console.log('[emailService] No reviewer emails found — skipping.');
    return { sent: false, reason: 'No reviewers' };
  }
  try {
    const html    = buildHITLEmail(params);
    const snippet = params.queryText.slice(0, 60);
    await transporter.sendMail({
      from   : FROM,
      to     : params.reviewerEmails.join(', '),
      subject: `[SynchroX] Human Review Required - "${snippet}..." (${Math.round(params.confidenceScore * 100)}% confidence)`,
      html,
      text   : `HITL Review Required\nQuery: ${params.queryText}\nConfidence: ${Math.round(params.confidenceScore * 100)}%\nReason: ${params.reason}\nReview at: ${APP_URL}/review`,
    });
    console.log(`[emailService] HITL alert sent to: ${params.reviewerEmails.join(', ')}`);
    return { sent: true, recipients: params.reviewerEmails };
  } catch (err) {
    console.error('[emailService] Failed to send email:', err);
    return { sent: false, error: String(err) };
  }
}

export async function sendReviewCompleteEmail(params: {
  queryText: string;
  status: 'human_approved' | 'human_edited' | 'rejected';
  reviewerEmail: string;
  notes?: string;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  const icons  = { human_approved: 'Approved', human_edited: 'Edited & Approved', rejected: 'Rejected' };
  try {
    await transporter.sendMail({
      from   : FROM,
      to     : params.reviewerEmail,
      subject: `[SynchroX] Review ${icons[params.status]} - "${params.queryText.slice(0, 50)}"`,
      html   : `<div style="font-family:Arial;max-width:500px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
        <h2 style="color:#1d4ed8;">Review ${icons[params.status]}</h2>
        <p><strong>Query:</strong> "${params.queryText.slice(0, 100)}"</p>
        ${params.notes ? `<p><strong>Notes:</strong> ${params.notes}</p>` : ''}
        <a href="${APP_URL}/logs" style="background:#1d4ed8;color:white;padding:10px 20px;text-decoration:none;border-radius:8px;display:inline-block;margin-top:12px;">View in Logs</a>
      </div>`,
    });
  } catch (err) {
    console.error('[emailService] Review complete email failed:', err);
  }
}
