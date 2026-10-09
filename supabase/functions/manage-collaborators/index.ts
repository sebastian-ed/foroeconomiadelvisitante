import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
function respond(data,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}})}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('',{headers:cors});
 if(req.method!=='POST')return respond({error:'Método no permitido'},405);
 try {
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const header=req.headers.get('Authorization')||'';if(!header.startsWith('Bearer '))return respond({error:'No autorizado'},401);
  const userClient=createClient(url,anon,{global:{headers:{Authorization:header}}});
  const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return respond({error:'Sesión inválida'},401);
  const adminClient=createClient(url,service);
  const {data:role,error:roleError}=await adminClient.from('cms_profiles').select('role').eq('user_id',user.id).maybeSingle();
  if(roleError||role?.role!=='admin')return respond({error:'Solo los administradores pueden invitar o asignar roles'},403);
  const payload=await req.json();if(!['admin','editor','author'].includes(payload.role))return respond({error:'Rol inválido'},400);
  if(payload.action==='set_role'){
   if(payload.user_id===user.id)return respond({error:'No podés cambiar tu propio rol'},400);
   const {error}=await adminClient.from('cms_profiles').update({role:payload.role}).eq('user_id',payload.user_id);if(error)throw error;
   return respond({ok:true});
  }
  if(payload.action!=='invite')return respond({error:'Acción inválida'},400);
  const email=String(payload.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>250)return respond({error:'Correo inválido'},400);
  const display_name=String(payload.display_name||'').trim().slice(0,150);
  const redirect=Deno.env.get('FORO_ADMIN_REDIRECT')||'https://sebastian-ed.github.io/foroeconomiadelvisitante/admin/';
  // generateLink genera el usuario y token de invitación sin exponer una clave administrativa.
  const {data,error}=await adminClient.auth.admin.generateLink({type:'invite',email,options:{redirectTo:redirect,data:{display_name}}});if(error)throw error;
  const invited=data.user;if(!invited?.id)throw Error('No se pudo crear la invitación');
  const {error:profileError}=await adminClient.from('cms_profiles').upsert({user_id:invited.id,display_name,role:payload.role},{onConflict:'user_id'});if(profileError)throw profileError;
  const invite_url=data.properties?.action_link;const apiKey=Deno.env.get('RESEND_API_KEY');const from=Deno.env.get('FORO_FROM_EMAIL');
  if(apiKey&&from&&invite_url){const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject:'Invitación para colaborar en el Foro',html:`<p>Fuiste invitado/a a colaborar como ${payload.role}.</p><p><a href="${invite_url}">Aceptar invitación</a></p>`})});if(!res.ok)throw Error('El usuario se creó, pero falló el envío del correo. Revisá Resend.');return respond({ok:true,sent:true})}
  return respond({ok:true,invite_url});
 }catch(e){return respond({error:e.message||'Error interno'},400)}
});
