(()=>{'use strict';
const client=window.ForoDB?.client;const status=document.querySelector('#status');const intro=document.querySelector('#intro');const form=document.querySelector('#form');
let ready=false;
const say=s=>{status.textContent=s};
const enable=()=>{if(ready)return;ready=true;form.hidden=false;intro.textContent='Elegí tu contraseña para activar el acceso o recuperar tu cuenta.';say('')};
async function init(){
 if(!client){say('No se pudo conectar con Supabase.');return}
 // Supabase detectSessionInUrl procesa enlaces de invitación y recuperación.
 client.auth.onAuthStateChange((event,session)=>{if((event==='PASSWORD_RECOVERY'||event==='SIGNED_IN')&&session?.user)enable()});
 const params=new URLSearchParams(location.search);
 const hash=new URLSearchParams(location.hash.slice(1));
 const error=params.get('error_description')||hash.get('error_description');
 if(error){say('El enlace no es válido o ha vencido: '+error);return}
 if(params.has('token_hash')&&params.has('type')){
  const type=params.get('type');
  if(['invite','recovery','magiclink'].includes(type)){
   const {error:err}=await client.auth.verifyOtp({token_hash:params.get('token_hash'),type});
   if(err){say('No se pudo confirmar el enlace: '+err.message);return}
  }
 }
 const {data:{session},error:sessionError}=await client.auth.getSession();
 if(sessionError){say('No se pudo validar el enlace: '+sessionError.message);return}
 if(session?.user)enable();else say('No hay una invitación o sesión válida. Solicitá un nuevo enlace al administrador o utilizá «Olvidé mi contraseña».');
}
form.addEventListener('submit',async e=>{
 e.preventDefault();const password=document.querySelector('#password').value,confirm=document.querySelector('#confirm').value;
 if(password.length<10){say('Usá al menos 10 caracteres.');return}if(password!==confirm){say('Las contraseñas no coinciden.');return}
 const submit=document.querySelector('#submit');submit.disabled=true;say('Guardando contraseña…');
 try{const {error}=await client.auth.updateUser({password});if(error)throw error;
  form.hidden=true;intro.textContent='Contraseña guardada correctamente.';say('Ya podés ingresar al CMS con tu correo y nueva contraseña.');
  await client.auth.signOut();
 }catch(err){say('No se pudo cambiar la contraseña: '+err.message)}finally{submit.disabled=false}
});
init().catch(err=>say('No se pudo verificar el enlace: '+err.message));
})();