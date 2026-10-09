import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM_EMAIL');
  const publicSiteUrl = (Deno.env.get('PUBLIC_SITE_URL') || '').replace(/\/$/, '');
  if (!resendKey || !from) return json({ error: 'RESEND_API_KEY o RESEND_FROM_EMAIL no configurados' }, 500);

  const authHeader = req.headers.get('Authorization') || '';
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'No autorizado' }, 401);

  const { campaignId } = await req.json().catch(() => ({}));
  if (!campaignId) return json({ error: 'campaignId requerido' }, 400);

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const [{ data: campaign, error: campaignError }, { data: subscribers, error: subscriberError }] = await Promise.all([
    admin.from('newsletter_campaigns').select('*').eq('id', campaignId).single(),
    admin.from('newsletter_subscribers').select('id,email,name').eq('status','active').order('created_at',{ascending:true}).limit(1000)
  ]);
  if (campaignError || !campaign) return json({ error: 'Campaña no encontrada' }, 404);
  if (subscriberError) return json({ error: subscriberError.message }, 500);
  if (campaign.status === 'sent') return json({ error: 'La campaña ya fue enviada' }, 409);

  await admin.from('newsletter_campaigns').update({ status:'sending', sent_count:0, error_count:0 }).eq('id', campaignId);
  let sent = 0, failed = 0;

  for (const sub of subscribers || []) {
    const existing = await admin.from('newsletter_deliveries').select('id,status').eq('campaign_id',campaignId).eq('email',sub.email).maybeSingle();
    if (existing.data?.status === 'sent') { sent++; continue; }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#17354d">
        <div style="padding:16px 0;border-bottom:2px solid #063e76"><strong style="color:#063e76">Foro para el Desarrollo de la Economía del Visitante</strong></div>
        ${campaign.preheader ? `<p style="font-size:12px;color:#627487">${campaign.preheader}</p>` : ''}
        <div style="font-size:16px;line-height:1.65">${campaign.html_content}</div>
        <hr style="border:0;border-top:1px solid #d9e2e8;margin:32px 0">
        <p style="font-size:11px;color:#627487">Recibís este mensaje porque te suscribiste al boletín del Foro. ${publicSiteUrl ? `<a href="${publicSiteUrl}/newsletter.html?email=${encodeURIComponent(sub.email)}">Gestionar suscripción</a>` : `Para solicitar la baja podés responder este correo.`}</p>
      </div>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to:[sub.email], subject:campaign.subject, html })
    });
    const payload = await response.json();
    if (response.ok) {
      sent++;
      await admin.from('newsletter_deliveries').upsert({ campaign_id:campaignId, subscriber_id:sub.id, email:sub.email, status:'sent', provider_id:payload.id || null, error_message:null, sent_at:new Date().toISOString() }, { onConflict:'campaign_id,email' });
    } else {
      failed++;
      await admin.from('newsletter_deliveries').upsert({ campaign_id:campaignId, subscriber_id:sub.id, email:sub.email, status:'failed', error_message:JSON.stringify(payload).slice(0,1500) }, { onConflict:'campaign_id,email' });
    }
    await delay(60);
  }

  await admin.from('newsletter_campaigns').update({ status:failed ? 'failed' : 'sent', sent_count:sent, error_count:failed, sent_at:new Date().toISOString() }).eq('id', campaignId);
  return json({ ok: failed === 0, sent, failed, total:(subscribers || []).length });
});
