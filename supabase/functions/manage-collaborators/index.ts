import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const cors={ 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const respond=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers:cors});
const validRole=(v:unknown)=>['admin','editor','author'].includes(String(v));
const clean=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
const safeUrl=(v:unknown)=>{const x=clean(v,1000);if(!x)return '';try{const u=new URL(x);if(u.protocol!=='https:')throw Error('Protocolo inválido');return x}catch{throw Error('La imagen debe tener una URL https válida')}};
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response(null,{headers:cors,status:204});
  if(req.method!=='POST')return respond({error:'Método no permitido'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!anon||!service)return respond({error:'Faltan secretos de configuración de la Edge Function'},500);
    const jwt=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!jwt)return respond({error:'Sesión requerida'},401);
    const auth=createClient(url,anon,{auth:{autoRefreshToken:false,persistSession:false}});
    const {data:{user},error:userError}=await auth.auth.getUser(jwt);
    if(userError||!user)return respond({error:'Sesión inválida'},401);
    const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
    const {data:self,error:selfError}=await admin.from('cms_profiles').select('*').eq('user_id',user.id).maybeSingle();
    if(selfError)throw selfError;
    if(!self||!self.enabled)return respond({error:'Acceso deshabilitado o sin perfil CMS'},403);
    const body=await req.json().catch(()=>({}));const action=String(body.action||'');
    const own=()=>({user_id:user.id,display_name:self.display_name||'',organization:self.organization||'',bio:self.bio||'',avatar_url:self.avatar_url||'',role:self.role,enabled:true});
    if(action==='me')return respond(own());
    if(action==='update_me'){
      const patch={display_name:clean(body.display_name,120),organization:clean(body.organization,180),bio:clean(body.bio,4000),avatar_url:safeUrl(body.avatar_url)};
      const {error}=await admin.from('cms_profiles').update(patch).eq('user_id',user.id);if(error)throw error;
      return respond({ok:true});
    }
    if(self.role!=='admin')return respond({error:'La administración de colaboradores está reservada a administradores'},403);
    if(action==='list'){
      const {data:profiles,error}=await admin.from('cms_profiles').select('*').order('created_at',{ascending:false}).limit(250);
      if(error)throw error;
      const users=await Promise.all((profiles||[]).map(async p=>{const res=await admin.auth.admin.getUserById(p.user_id);return {...p,email:res.data?.user?.email||'',is_self:p.user_id===user.id}}));
      return respond({users});
    }
    if(action==='invite'){
      const email=clean(body.email,254).toLowerCase(),role=body.role,display_name=clean(body.display_name,120);
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!validRole(role))return respond({error:'Correo o rol inválido'},400);
      const redirect='https://foroeconomiadelvisitante.com.ar/admin/acceso.html';
      const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{data:{full_name:display_name},redirectTo:redirect});
      if(error)throw error;
      if(!data.user?.id)throw Error('Supabase no devolvió el ID del usuario invitado');
      const {error:profileError}=await admin.from('cms_profiles').upsert({user_id:data.user.id,display_name,role,enabled:true},{onConflict:'user_id'});
      if(profileError)throw profileError;
      return respond({ok:true,message:'Invitación enviada a '+email});
    }
    const target=clean(body.user_id,80);if(!/^[0-9a-f-]{36}$/i.test(target))return respond({error:'ID de usuario inválido'},400);
    const {data:p,error:pe}=await admin.from('cms_profiles').select('*').eq('user_id',target).maybeSingle();if(pe)throw pe;if(!p)return respond({error:'El perfil no existe'},404);
    const changingAdmin=p.role==='admin';
    const guardAdmin=async()=>{if(target===user.id)throw Error('No podés deshabilitar, eliminar ni cambiar tu propio rol');if(changingAdmin){const {count,error}=await admin.from('cms_profiles').select('user_id',{count:'exact',head:true}).eq('role','admin').eq('enabled',true);if(error)throw error;if((count||0)<=1)throw Error('Debe permanecer al menos un administrador activo')}};
    if(action==='update_user'){
      if(!validRole(body.role))return respond({error:'Rol inválido'},400);
      if(body.role!==p.role)await guardAdmin();
      const patch={display_name:clean(body.display_name,120),organization:clean(body.organization,180),bio:clean(body.bio,4000),avatar_url:safeUrl(body.avatar_url),role:body.role};
      const {error}=await admin.from('cms_profiles').update(patch).eq('user_id',target);if(error)throw error;return respond({ok:true});
    }
    if(action==='set_enabled'){
      if(typeof body.enabled!=='boolean')return respond({error:'Estado inválido'},400);
      if(!body.enabled)await guardAdmin();
      const {error}=await admin.from('cms_profiles').update({enabled:body.enabled}).eq('user_id',target);if(error)throw error;
      // La RLS aplica el bloqueo de inmediato, incluso a sesiones previamente emitidas.
      return respond({ok:true});
    }
    if(action==='delete'){
      await guardAdmin();
      const {error}=await admin.auth.admin.deleteUser(target);if(error)throw error;
      // FK ON DELETE CASCADE elimina el perfil; posts.created_by quedan en null.
      return respond({ok:true});
    }
    return respond({error:'Acción no reconocida'},400);
  }catch(e){console.error('manage-collaborators',e);return respond({error:e instanceof Error?e.message:'Error de servidor'},500)}
});
