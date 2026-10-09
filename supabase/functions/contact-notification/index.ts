import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM_EMAIL');
  const to = Deno.env.get('CONTACT_TO_EMAIL') || 'foroeconomiadelvisitante@gmail.com';
  if (!resendKey || !from) return json({ error: 'RESEND_API_KEY o RESEND_FROM_EMAIL no configurados' }, 500);

  const { inquiryId } = await req.json().catch(() => ({}));
  if (!inquiryId) return json({ error: 'inquiryId requerido' }, 400);

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const { data: inquiry, error } = await admin.from('inquiries').select('*').eq('id', inquiryId).maybeSingle();
  if (error || !inquiry) return json({ error: 'Consulta no encontrada' }, 404);
  if (inquiry.notified_at) return json({ ok: true, alreadyNotified: true });

  const safe = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m] || m));
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#17354d">
      <h2 style="color:#063e76">Nueva consulta desde el Foro</h2>
      <p><strong>Tipo:</strong> ${safe(inquiry.inquiry_type)}</p>
      <p><strong>Nombre:</strong> ${safe(inquiry.name)}</p>
      <p><strong>Email:</strong> ${safe(inquiry.email)}</p>
      <p><strong>Organización:</strong> ${safe(inquiry.organization || '—')}</p>
      <p><strong>Asunto:</strong> ${safe(inquiry.subject)}</p>
      <div style="padding:16px;background:#f3f7f9;border-left:4px solid #009ac3;white-space:pre-wrap">${safe(inquiry.message)}</div>
      ${inquiry.reference_url ? `<p><strong>Referencia:</strong> ${safe(inquiry.reference_url)}</p>` : ''}
      <p style="font-size:12px;color:#627487">La consulta quedó registrada en el CMS.</p>
    </div>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], reply_to: inquiry.email, subject: `[Foro] ${inquiry.subject}`, html })
  });
  const payload = await response.json();
  if (!response.ok) return json({ error: payload }, 502);

  await admin.from('inquiries').update({ notified_at: new Date().toISOString() }).eq('id', inquiry.id).is('notified_at', null);
  return json({ ok: true, id: payload.id });
});
