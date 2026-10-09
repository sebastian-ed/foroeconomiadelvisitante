(() => {
  const db = window.ForoDB;
  const defaults = window.FORO_DEFAULT_CONTENT;
  let state = structuredClone(defaults);
  let dirty = false;
  let posts = [];
  let events = [];
  let mediaAssets = [];
  let inquiries = [];
  let subscribers = [];
  let campaigns = [];
  let revisions = [];
  let editingSection = null;
  let editingPost = null;
  let editingEvent = null;
  let editingCampaign = null;
  let editingInquiry = null;
  let visualDevice = 'desktop';

  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const esc = (v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clone = v=>structuredClone(v);
  const uid = p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const slugify = v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const getPath=(obj,path)=>path.split('.').reduce((o,k)=>o?.[Number.isNaN(Number(k))?k:Number(k)],obj);
  function setPath(obj,path,value){const a=path.split('.');let cur=obj;a.slice(0,-1).forEach(k=>{const kk=Number.isNaN(Number(k))?k:Number(k);if(cur[kk]==null)cur[kk]={};cur=cur[kk]});const last=a.at(-1),lk=Number.isNaN(Number(last))?last:Number(last);cur[lk]=value}
  function mergeDeep(target,source){if(!source||typeof source!=='object')return target;Object.entries(source).forEach(([k,v])=>{if(Array.isArray(v))target[k]=v;else if(v&&typeof v==='object')target[k]=mergeDeep(target[k]&&typeof target[k]==='object'?target[k]:{},v);else if(v!==undefined&&v!==null)target[k]=v});return target}
  const fmtDate=v=>v?new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'';
  const typeMeta={
    heroForum:['◎','Hero institucional','Propuesta central, CTA y ecosistema visual.'],
    conceptStatement:['◫','Concepto','Explica la economía del visitante y sus sectores.'],
    pillars:['Ⅲ','Pilares','Conocimiento, Encuentro y Acción.'],
    collectionFeed:['¶','Publicaciones','Feed dinámico de Conocimiento.'],
    activitiesFeed:['◷','Agenda','Próximas actividades confirmadas.'],
    voicesFeed:['◉','Voces','Entrevistas, casos y experiencias.'],
    joinCta:['↗','Participación','Convocatoria final a sumarse.']
  };
  const titles={dashboard:'Inicio',visual:'Editor visual',home:'Portada',pages:'Páginas',posts:'Publicaciones',events:'Actividades',media:'Medios',inquiries:'Consultas',newsletter:'Newsletter',design:'Diseño',navigation:'Navegación',history:'Revisiones',settings:'Ajustes',advanced:'JSON avanzado',preview:'Vista previa'};
  const postTypes={article:'Artículo',analysis:'Análisis',research:'Investigación',report:'Informe',resource:'Recurso / biblioteca',interview:'Entrevista',podcast:'Podcast / audiovisual',experience:'Experiencia',case:'Caso territorial'};
  const eventTypes={conversation:'Conversatorio',workshop:'Taller',hackathon:'Hackatón',project:'Proyecto',meeting:'Encuentro'};

  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2600)}
  function markDirty(){dirty=true;$('#dirtyBadge').classList.remove('hidden');$('#saveState').textContent='Cambios locales';pushPreview()}
  function clearDirty(){dirty=false;$('#dirtyBadge').classList.add('hidden');$('#saveState').textContent='Publicado'}

  function switchView(view){
    $$('.admin-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.viewPanel===view));
    $('#viewTitle').textContent=titles[view]||'CMS';
    $('#sidebar').classList.remove('open');
    if(view==='visual'){setTimeout(()=>{resizeVisual();pushPreview()},60)}
    if(view==='posts') loadPosts();
    if(view==='events') loadEvents();
    if(view==='media') loadMedia();
    if(view==='inquiries') loadInquiries();
    if(view==='newsletter') loadNewsletter();
    if(view==='history') loadHistory();
    if(view==='advanced') renderAdvanced();
    if(view==='preview') refreshPreview();
  }

  function renderDashboard(){
    const visible=(state.sections||[]).filter(s=>s.enabled!==false).length;
    const newInquiries=inquiries.filter(x=>x.status==='new').length;
    $('#statsGrid').innerHTML=[['BLOQUES',state.sections?.length||0,`${visible} visibles`],['PUBLICACIONES',posts.length,'en el CMS'],['ACTIVIDADES',events.length,'cargadas'],['CONSULTAS NUEVAS',newInquiries,'por gestionar']].map(x=>`<div class="stat-card"><small>${x[0]}</small><strong>${x[1]}</strong><span>${x[2]}</span></div>`).join('');
    $('#dashboardSections').innerHTML=(state.sections||[]).map(s=>`<div class="mini-section"><span>${typeMeta[s.type]?.[0]||'□'}</span><div><strong>${esc(s.label||typeMeta[s.type]?.[1]||s.type)}</strong><small>${esc(typeMeta[s.type]?.[1]||s.type)} · #${esc(s.settings?.anchor||s.id)}</small></div><span>${s.enabled===false?'Oculta':'Visible'}</span></div>`).join('');
    const edgeReady=db.configured;
    $('#activityList').innerHTML=`<div class="activity-row"><span class="activity-dot ${edgeReady?'good':''}"></span><div><strong>${edgeReady?'Supabase conectado':'Supabase sin configurar'}</strong><small>${edgeReady?'Autenticación, contenido y colecciones habilitadas.':'Configurá URL, anon key y schema.sql.'}</small></div></div><div class="activity-row"><span class="activity-dot good"></span><div><strong>Editor visual activo</strong><small>Edición de textos en contexto y vista responsive.</small></div></div><div class="activity-row"><span class="activity-dot good"></span><div><strong>Modelo editorial</strong><small>Borradores, programación, SEO, revisiones y newsletter.</small></div></div>`;
  }

  function renderSections(){
    const list=$('#sectionList');
    list.innerHTML=(state.sections||[]).map((s,i)=>`<article class="section-row" draggable="true" data-index="${i}"><span class="drag">⋮⋮</span><span class="type-icon">${typeMeta[s.type]?.[0]||'□'}</span><div class="section-main"><strong>${esc(s.label||typeMeta[s.type]?.[1]||s.type)}</strong><small>${esc(typeMeta[s.type]?.[1]||s.type)} · #${esc(s.settings?.anchor||s.id)}</small></div><span class="status ${s.enabled===false?'off':''}">${s.enabled===false?'Oculta':'Visible'}</span><div class="row-actions"><button class="icon-btn" data-act="edit">✎</button><button class="icon-btn" data-act="toggle">${s.enabled===false?'◉':'◌'}</button><button class="icon-btn" data-act="copy">⧉</button><button class="icon-btn danger" data-act="delete">×</button></div></article>`).join('');
    $$('.section-row',list).forEach(row=>{
      row.ondragstart=e=>{row.classList.add('dragging');e.dataTransfer.setData('text/plain',row.dataset.index)};row.ondragend=()=>row.classList.remove('dragging');row.ondragover=e=>e.preventDefault();row.ondrop=e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain')),to=Number(row.dataset.index);if(from===to)return;const [x]=state.sections.splice(from,1);state.sections.splice(to,0,x);markDirty();renderSections();renderDashboard()};
      row.onclick=e=>{const b=e.target.closest('[data-act]');if(!b)return;const i=Number(row.dataset.index),act=b.dataset.act;if(act==='edit')openSectionEditor(i);if(act==='toggle'){state.sections[i].enabled=state.sections[i].enabled===false;markDirty();renderSections();renderDashboard()}if(act==='copy'){const c=clone(state.sections[i]);c.id=uid(c.type);c.label=`${c.label} — copia`;c.settings={...(c.settings||{}),anchor:c.id};state.sections.splice(i+1,0,c);markDirty();renderSections();renderDashboard();toast('Bloque duplicado')}if(act==='delete'&&confirm(`¿Eliminar “${state.sections[i].label}”?`)){state.sections.splice(i,1);markDirty();renderSections();renderDashboard()}};
    });
  }

  function inputField(label,path,value,{textarea=false,type='text'}={}){return `<label class="field"><span>${esc(label)}</span>${textarea?`<textarea data-edit-path="${esc(path)}">${esc(value||'')}</textarea>`:`<input type="${type}" data-edit-path="${esc(path)}" value="${esc(value??'')}">`}</label>`}
  function prettyLabel(k){return ({eyebrow:'Antetítulo',title:'Título',body:'Texto',note:'Nota',primaryLabel:'CTA principal',primaryHref:'Enlace CTA principal',secondaryLabel:'CTA secundario',secondaryHref:'Enlace CTA secundario',ctaLabel:'Texto CTA',ctaHref:'Enlace CTA',emptyTitle:'Título estado vacío',emptyBody:'Texto estado vacío',number:'Número',href:'Enlace'})[k]||k.replace(/([A-Z])/g,' $1').replace(/^./,m=>m.toUpperCase())}

  function openSectionEditor(i){
    editingSection=i;const s=clone(state.sections[i]);$('#sectionDialogTitle').textContent=s.label||typeMeta[s.type]?.[1]||'Editar sección';
    let html=`<div class="editor-card"><h3>Identidad del bloque</h3><div class="form-grid">${inputField('Nombre interno','label',s.label)}${inputField('Ancla','settings.anchor',s.settings?.anchor||s.id)}</div></div><div class="editor-card"><h3>Contenido</h3><div class="form-stack">`;
    Object.entries(s.content||{}).forEach(([k,v])=>html+=inputField(prettyLabel(k),`content.${k}`,v,{textarea:['body','note','emptyBody'].includes(k)}));
    html+=`</div></div>`;
    if(Array.isArray(s.items)){
      html+=`<div class="editor-card"><h3>Items</h3><div class="form-stack">`;
      s.items.forEach((it,j)=>{
        if(typeof it==='string') html+=inputField(`Item ${j+1}`,`items.${j}`,it);
        else html+=`<div class="editor-card" style="background:#f8fafb"><h3>Item ${j+1}</h3><div class="form-stack">${Object.entries(it).map(([k,v])=>inputField(prettyLabel(k),`items.${j}.${k}`,v,{textarea:k==='body'})).join('')}</div></div>`;
      });html+=`</div></div>`;
    }
    html+=`<div class="editor-card"><h3>Configuración</h3><div class="form-grid">${Object.entries(s.settings||{}).map(([k,v])=>inputField(prettyLabel(k),`settings.${k}`,v,{type:typeof v==='number'?'number':'text'})).join('')}</div></div>`;
    $('#sectionEditorBody').innerHTML=html;$('#sectionDialog')._draft=s;$('#sectionDialog').showModal();
    $$('[data-edit-path]',$('#sectionEditorBody')).forEach(el=>el.oninput=()=>{let v=el.type==='number'?Number(el.value):el.value;setPath($('#sectionDialog')._draft,el.dataset.editPath,v)});
  }

  function renderPages(){
    const d=state.pages||{};let html='';
    const foro=d['el-foro'];
    html+=`<article class="page-editor-card"><h3>El Foro · Hero</h3><div class="form-stack">${inputField('Antetítulo','pages.el-foro.hero.eyebrow',foro.hero.eyebrow)}${inputField('Título','pages.el-foro.hero.title',foro.hero.title,{textarea:true})}${inputField('Descripción','pages.el-foro.hero.body',foro.hero.body,{textarea:true})}</div></article>`;
    html+=`<article class="page-editor-card"><h3>El Foro · Quiénes somos</h3><div class="form-stack">${inputField('Título','pages.el-foro.intro.title',foro.intro.title)}${inputField('Texto','pages.el-foro.intro.body',foro.intro.body,{textarea:true})}</div></article>`;
    html+=`<article class="page-editor-card"><h3>El Foro · Misión y visión</h3><div class="form-stack">${inputField('Título misión','pages.el-foro.mission.missionTitle',foro.mission.missionTitle)}${inputField('Misión','pages.el-foro.mission.missionBody',foro.mission.missionBody,{textarea:true})}${inputField('Título visión','pages.el-foro.mission.visionTitle',foro.mission.visionTitle)}${inputField('Visión','pages.el-foro.mission.visionBody',foro.mission.visionBody,{textarea:true})}</div></article>`;
    html+=`<article class="page-editor-card"><h3>El Foro · Objetivos</h3><div class="form-stack">${foro.objectives.map((x,i)=>inputField(`Objetivo ${i+1}`,`pages.el-foro.objectives.${i}`,x,{textarea:true})).join('')}</div></article>`;
    html+=`<article class="page-editor-card"><h3>El Foro · Metodología y Comisión</h3><div class="form-stack">${inputField('Título metodología','pages.el-foro.methodology.title',foro.methodology.title)}${inputField('Metodología','pages.el-foro.methodology.body',foro.methodology.body,{textarea:true})}${inputField('Título comisión','pages.el-foro.commission.title',foro.commission.title)}${inputField('Comisión','pages.el-foro.commission.body',foro.commission.body,{textarea:true})}</div></article>`;
    const part=d.participa;
    html+=`<article class="page-editor-card"><h3>Participá · Encabezado</h3><div class="form-stack">${inputField('Antetítulo','pages.participa.hero.eyebrow',part.hero.eyebrow)}${inputField('Título','pages.participa.hero.title',part.hero.title,{textarea:true})}${inputField('Descripción','pages.participa.hero.body',part.hero.body,{textarea:true})}</div></article>`;
    html+=`<article class="page-editor-card"><h3>Participá · Opciones</h3><div class="form-stack">${part.options.map((x,i)=>`${inputField(`Opción ${i+1} · título`,`pages.participa.options.${i}.title`,x.title)}${inputField(`Opción ${i+1} · descripción`,`pages.participa.options.${i}.body`,x.body,{textarea:true})}`).join('')}</div></article>`;
    $('#pagesEditor').innerHTML=html;$$('[data-edit-path]',$('#pagesEditor')).forEach(el=>el.oninput=()=>{setPath(state,el.dataset.editPath,el.value);markDirty()});
  }

  function renderDesign(){
    const labels={background:'Fondo',paper:'Superficie',ink:'Títulos',text:'Texto',muted:'Texto secundario',line:'Bordes',navy:'Azul institucional',navyDeep:'Azul profundo',cyan:'Celeste acento',cyanSoft:'Celeste suave',warm:'Gris cálido'};
    $('#themeColors').innerHTML=Object.entries(labels).map(([k,l])=>`<label class="field"><span>${l}</span><div class="color-field"><input type="color" data-theme="${k}" value="${esc(state.theme[k])}"><input data-theme-text="${k}" value="${esc(state.theme[k])}"></div></label>`).join('');
    $('#themeFonts').innerHTML=`${inputField('Tipografía de cuerpo','theme.bodyFont',state.theme.bodyFont)}${inputField('Tipografía editorial','theme.headingFont',state.theme.headingFont)}`;
    $('#themeLayout').innerHTML=`${inputField('Ancho máximo','theme.maxWidth',state.theme.maxWidth,{type:'number'})}${inputField('Radio de bordes','theme.radius',state.theme.radius,{type:'number'})}${inputField('Espaciado de secciones','theme.sectionSpace',state.theme.sectionSpace,{type:'number'})}`;
    $$('[data-theme]').forEach(c=>c.oninput=()=>{state.theme[c.dataset.theme]=c.value;$(`[data-theme-text="${c.dataset.theme}"]`).value=c.value;markDirty()});$$('[data-theme-text]').forEach(t=>t.oninput=()=>{state.theme[t.dataset.themeText]=t.value;$(`[data-theme="${t.dataset.themeText}"]`).value=t.value;markDirty()});$$('[data-edit-path]',$('[data-view-panel="design"]')).forEach(el=>el.oninput=()=>{setPath(state,el.dataset.editPath,el.type==='number'?Number(el.value):el.value);markDirty()});
  }

  function renderNavigation(){
    $('#navList').innerHTML=(state.navigation||[]).map((n,i)=>`<article class="repeater-card" data-nav="${i}"><div class="repeater-head"><strong>${esc(n.label||`Enlace ${i+1}`)}</strong><div><button class="icon-btn" data-na="up">↑</button><button class="icon-btn" data-na="down">↓</button><button class="icon-btn danger" data-na="delete">×</button></div></div><div class="repeater-fields"><label class="field"><span>Etiqueta</span><input data-np="label" value="${esc(n.label||'')}"></label><label class="field"><span>Enlace</span><input data-np="href" value="${esc(n.href||'')}"></label><label class="field check-field"><input type="checkbox" data-np="featured" ${n.featured?'checked':''}><span>CTA</span></label></div><p style="font-size:8px;color:#6b7e8f;margin:8px 0 0">Submenú: ${(n.children||[]).map(x=>esc(x.label)).join(' · ')||'sin submenú'}</p></article>`).join('');
    $$('.repeater-card').forEach(card=>{const i=Number(card.dataset.nav);$$('[data-np]',card).forEach(el=>el.oninput=()=>{state.navigation[i][el.dataset.np]=el.type==='checkbox'?el.checked:el.value;markDirty()});$$('[data-na]',card).forEach(b=>b.onclick=()=>{const a=b.dataset.na;if(a==='up'&&i>0)[state.navigation[i-1],state.navigation[i]]=[state.navigation[i],state.navigation[i-1]];if(a==='down'&&i<state.navigation.length-1)[state.navigation[i+1],state.navigation[i]]=[state.navigation[i],state.navigation[i+1]];if(a==='delete'&&confirm('¿Eliminar este enlace?'))state.navigation.splice(i,1);markDirty();renderNavigation()})});
  }

  function renderSettings(){
    const s=state.site;
    $('#siteIdentity').innerHTML=`${inputField('Nombre','site.name',s.name)}${inputField('Nombre corto','site.shortName',s.shortName)}${inputField('Frase institucional','site.phrase',s.phrase)}${inputField('Email de contacto','site.contactEmail',s.contactEmail,{type:'email'})}${inputField('Logo','site.logo',s.logo)}${inputField('Isotipo','site.icon',s.icon)}${inputField('Nota footer','site.footerNote',s.footerNote,{textarea:true})}`;
    $('#siteSeo').innerHTML=`${inputField('Título SEO','site.seo.title',s.seo.title)}${inputField('Descripción SEO','site.seo.description',s.seo.description,{textarea:true})}${inputField('Imagen social','site.seo.image',s.seo.image)}`;
    $('#siteSocial').innerHTML=`${inputField('LinkedIn','site.social.linkedin',s.social.linkedin)}${inputField('Instagram','site.social.instagram',s.social.instagram)}${inputField('YouTube','site.social.youtube',s.social.youtube)}${inputField('Google Analytics 4 · Measurement ID','site.analytics.gtagId',s.analytics?.gtagId||'')}`;
    $$('[data-edit-path]',$('[data-view-panel="settings"]')).forEach(el=>el.oninput=()=>{setPath(state,el.dataset.editPath,el.value);markDirty()});
  }

  async function loadPosts(){try{posts=await db.listPosts({admin:true,limit:500})||[];renderPosts();renderDashboard()}catch(e){toast('Error cargando publicaciones: '+e.message)}}
  function effectiveStatus(p){if(p.status==='published'&&p.published_at&&new Date(p.published_at)>new Date())return'scheduled';return p.status||'draft'}
  function renderPosts(){
    const q=($('#postSearch')?.value||'').toLowerCase();
    const filter=$('#postStatusFilter')?.value||'';
    const list=posts.filter(p=>(!q||[p.title,p.category,p.author_name,p.slug].join(' ').toLowerCase().includes(q))&&(!filter||effectiveStatus(p)===filter));
    const rows=list.map(p=>`<div class="table-row"><div class="table-title"><strong>${esc(p.title)}</strong><small>/${esc(p.slug)}</small></div><div class="table-cell">${esc(postTypes[p.type]||p.type)}</div><div><span class="badge ${effectiveStatus(p)}">${effectiveStatus(p)==='published'?'Publicado':effectiveStatus(p)==='scheduled'?'Programado':effectiveStatus(p)==='archived'?'Archivado':'Borrador'}</span></div><div class="table-cell">${esc(fmtDate(p.published_at))}</div><div class="table-actions"><button class="icon-btn" data-post-edit="${p.id}">✎</button><button class="icon-btn danger" data-post-delete="${p.id}">×</button></div></div>`).join('');
    $('#postList').innerHTML=`<div class="table-row header"><div>Título</div><div>Tipo</div><div>Estado</div><div>Fecha</div><div></div></div>${rows || '<div class="empty-admin">No hay publicaciones en este filtro.</div>'}`;
    $$('[data-post-edit]').forEach(b=>b.onclick=()=>openPost(posts.find(p=>p.id===b.dataset.postEdit)));
    $$('[data-post-delete]').forEach(b=>b.onclick=async()=>{const post=posts.find(x=>x.id===b.dataset.postDelete);if(!post||!confirm(`¿Eliminar “${post.title}”?`))return;try{await db.deletePost(post.id);toast('Publicación eliminada');loadPosts()}catch(e){toast(e.message)}});
  }

  function mediaDatalist(){return `<datalist id="mediaUrlList">${mediaAssets.filter(a=>(a.mime_type||'').startsWith('image/')).map(a=>`<option value="${esc(a.url)}">${esc(a.name)}</option>`).join('')}</datalist>`}
  function richEditorHtml(content=''){return `<div class="rich-toolbar" data-rich-toolbar><button type="button" data-cmd="bold"><b>B</b></button><button type="button" data-cmd="italic"><i>I</i></button><button type="button" data-cmd="formatBlock" data-val="h2">H2</button><button type="button" data-cmd="formatBlock" data-val="h3">H3</button><button type="button" data-cmd="formatBlock" data-val="p">P</button><button type="button" data-cmd="insertUnorderedList">• Lista</button><button type="button" data-cmd="insertOrderedList">1. Lista</button><button type="button" data-cmd="formatBlock" data-val="blockquote">❝</button><button type="button" data-cmd="createLink">Link</button><button type="button" data-cmd="removeFormat">Limpiar</button></div><div class="rich-editor" contenteditable="true" data-rich-editor>${content||''}</div>`}
  function wireRich(root){const ed=$('[data-rich-editor]',root);$$('[data-cmd]',root).forEach(b=>b.onclick=()=>{ed.focus();let val=b.dataset.val||null;if(b.dataset.cmd==='createLink')val=prompt('URL del enlace:','https://');if(b.dataset.cmd==='formatBlock')val=`<${val}>`;if(val===null&&b.dataset.cmd==='createLink')return;document.execCommand(b.dataset.cmd,false,val)});return ed}

  function openPost(post=null){
    editingPost=post?clone(post):{title:'',slug:'',excerpt:'',content_html:'',type:'article',category:'',tags:[],author_name:state.site.shortName,author_role:'',status:'draft',published_at:new Date().toISOString().slice(0,16),featured:false,featured_image:'',references:[],seo_title:'',seo_description:''};
    $('#postDialogTitle').textContent=post?'Editar publicación':'Nueva publicación';
    const p=editingPost;$('#postEditorBody').innerHTML=`<div class="dialog-grid"><div class="editor-main"><div class="editor-card"><h3>Contenido</h3><div class="form-stack"><label class="field"><span>Título</span><input id="peTitle" value="${esc(p.title)}"></label><label class="field"><span>Extracto</span><textarea id="peExcerpt">${esc(p.excerpt||'')}</textarea></label><label class="field"><span>Cuerpo</span>${richEditorHtml(p.content_html||'')}</label></div></div><div class="editor-card"><h3>SEO</h3><div class="form-stack"><label class="field"><span>Título SEO</span><input id="peSeoTitle" value="${esc(p.seo_title||'')}"></label><label class="field"><span>Descripción SEO</span><textarea id="peSeoDesc">${esc(p.seo_description||'')}</textarea></label></div></div></div><aside class="editor-side"><div class="editor-card"><h3>Publicación</h3><div class="form-stack"><label class="field"><span>Estado</span><select id="peStatus"><option value="draft" ${p.status==='draft'?'selected':''}>Borrador</option><option value="published" ${p.status==='published'?'selected':''}>Publicado</option><option value="scheduled" ${p.status==='scheduled'?'selected':''}>Programado</option><option value="archived" ${p.status==='archived'?'selected':''}>Archivado</option></select></label><label class="field"><span>Fecha de publicación</span><input id="peDate" type="datetime-local" value="${esc((p.published_at||'').slice(0,16))}"></label><label class="field check-field"><input id="peFeatured" type="checkbox" ${p.featured?'checked':''}><span>Destacada</span></label></div></div><div class="editor-card"><h3>Organización</h3><div class="form-stack"><label class="field"><span>Tipo</span><select id="peType">${Object.entries(postTypes).map(([k,v])=>`<option value="${k}" ${p.type===k?'selected':''}>${v}</option>`).join('')}</select></label><label class="field"><span>Categoría</span><input id="peCategory" value="${esc(p.category||'')}"></label><label class="field"><span>Etiquetas (separadas por coma)</span><input id="peTags" value="${esc((p.tags||[]).join(', '))}"></label><label class="field"><span>Slug</span><input id="peSlug" value="${esc(p.slug||'')}"></label></div></div><div class="editor-card"><h3>Autoría</h3><div class="form-stack"><label class="field"><span>Autor</span><input id="peAuthor" value="${esc(p.author_name||'')}"></label><label class="field"><span>Rol / organización</span><input id="peRole" value="${esc(p.author_role||'')}"></label></div></div><div class="editor-card"><h3>Imagen destacada</h3><div class="form-stack"><label class="field"><span>URL o medio</span><input id="peImage" list="mediaUrlList" value="${esc(p.featured_image||'')}"></label>${mediaDatalist()}</div></div><div class="editor-card"><h3>Fuentes / referencias</h3><label class="field"><span>Una por línea</span><textarea id="peReferences">${esc((p.references||[]).join('\n'))}</textarea></label></div></aside></div>`;
    wireRich($('#postEditorBody'));$('#peTitle').oninput=e=>{if(!$('#peSlug').dataset.manual)$('#peSlug').value=slugify(e.target.value)};$('#peSlug').oninput=e=>e.target.dataset.manual='1';$('#postDialog').showModal();
  }

  async function savePost(){
    const p=editingPost;const ed=$('[data-rich-editor]',$('#postEditorBody'));Object.assign(p,{title:$('#peTitle').value.trim(),slug:$('#peSlug').value.trim()||slugify($('#peTitle').value),excerpt:$('#peExcerpt').value.trim(),content_html:ed.innerHTML,type:$('#peType').value,category:$('#peCategory').value.trim(),tags:$('#peTags').value.split(',').map(x=>x.trim()).filter(Boolean),author_name:$('#peAuthor').value.trim(),author_role:$('#peRole').value.trim(),status:$('#peStatus').value,published_at:$('#peDate').value?new Date($('#peDate').value).toISOString():null,featured:$('#peFeatured').checked,featured_image:$('#peImage').value.trim(),references:$('#peReferences').value.split('\n').map(x=>x.trim()).filter(Boolean),seo_title:$('#peSeoTitle').value.trim(),seo_description:$('#peSeoDesc').value.trim()});
    if(!p.title||!p.slug){toast('Título y slug son obligatorios');return}try{const saved=await db.savePost(p);toast('Publicación guardada');$('#postDialog').close();editingPost=null;await loadPosts()}catch(e){toast('Error: '+e.message)}
  }

  async function loadEvents(){try{events=await db.listEvents({admin:true,limit:500})||[];renderEvents();renderDashboard()}catch(e){toast('Error cargando actividades: '+e.message)}}
  function renderEvents(){
    const rows=events.map(e=>`<div class="table-row"><div class="table-title"><strong>${esc(e.title)}</strong><small>${esc(e.location||e.mode||'')}</small></div><div class="table-cell">${esc(eventTypes[e.event_type]||e.event_type||'Actividad')}</div><div><span class="badge ${e.status||'draft'}">${e.status==='published'?'Publicado':'Borrador'}</span></div><div class="table-cell">${esc(fmtDate(e.starts_at))}</div><div class="table-actions"><button class="icon-btn" data-event-edit="${e.id}">✎</button><button class="icon-btn danger" data-event-delete="${e.id}">×</button></div></div>`).join('');
    $('#eventList').innerHTML=`<div class="table-row header"><div>Título</div><div>Tipo</div><div>Estado</div><div>Fecha</div><div></div></div>${rows || '<div class="empty-admin">No hay actividades cargadas.</div>'}`;
    $$('[data-event-edit]').forEach(b=>b.onclick=()=>openEvent(events.find(x=>x.id===b.dataset.eventEdit)));
    $$('[data-event-delete]').forEach(b=>b.onclick=async()=>{const ev=events.find(x=>x.id===b.dataset.eventDelete);if(!ev||!confirm(`¿Eliminar “${ev.title}”?`))return;try{await db.deleteEvent(ev.id);toast('Actividad eliminada');loadEvents()}catch(err){toast(err.message)}});
  }

  function openEvent(e=null){
    editingEvent=e?clone(e):{title:'',slug:'',excerpt:'',content_html:'',event_type:'conversation',status:'draft',starts_at:'',ends_at:'',location:'',mode:'Presencial',registration_enabled:false,registration_note:'',featured_image:'',seo_title:'',seo_description:''};const x=editingEvent;$('#eventDialogTitle').textContent=e?'Editar actividad':'Nueva actividad';
    $('#eventEditorBody').innerHTML=`<div class="dialog-grid"><div class="editor-main"><div class="editor-card"><h3>Actividad</h3><div class="form-stack"><label class="field"><span>Título</span><input id="eeTitle" value="${esc(x.title)}"></label><label class="field"><span>Resumen</span><textarea id="eeExcerpt">${esc(x.excerpt||'')}</textarea></label><label class="field"><span>Detalle</span>${richEditorHtml(x.content_html||'')}</label></div></div><div class="editor-card"><h3>SEO</h3><div class="form-stack"><label class="field"><span>Título SEO</span><input id="eeSeoTitle" value="${esc(x.seo_title||'')}"></label><label class="field"><span>Descripción SEO</span><textarea id="eeSeoDesc">${esc(x.seo_description||'')}</textarea></label></div></div></div><aside class="editor-side"><div class="editor-card"><h3>Publicación</h3><div class="form-stack"><label class="field"><span>Estado</span><select id="eeStatus"><option value="draft" ${x.status==='draft'?'selected':''}>Borrador</option><option value="published" ${x.status==='published'?'selected':''}>Publicado</option></select></label><label class="field"><span>Tipo</span><select id="eeType">${Object.entries(eventTypes).map(([k,v])=>`<option value="${k}" ${x.event_type===k?'selected':''}>${v}</option>`).join('')}</select></label><label class="field"><span>Slug</span><input id="eeSlug" value="${esc(x.slug||'')}"></label></div></div><div class="editor-card"><h3>Fecha y lugar</h3><div class="form-stack"><label class="field"><span>Inicio</span><input id="eeStart" type="datetime-local" value="${esc((x.starts_at||'').slice(0,16))}"></label><label class="field"><span>Fin</span><input id="eeEnd" type="datetime-local" value="${esc((x.ends_at||'').slice(0,16))}"></label><label class="field"><span>Lugar</span><input id="eeLocation" value="${esc(x.location||'')}"></label><label class="field"><span>Modalidad</span><input id="eeMode" value="${esc(x.mode||'')}"></label></div></div><div class="editor-card"><h3>Inscripción</h3><div class="form-stack"><label class="field check-field"><input id="eeReg" type="checkbox" ${x.registration_enabled?'checked':''}><span>Habilitar formulario</span></label><label class="field"><span>Nota de inscripción</span><textarea id="eeRegNote">${esc(x.registration_note||'')}</textarea></label></div></div><div class="editor-card"><h3>Imagen</h3><label class="field"><span>URL o medio</span><input id="eeImage" list="mediaUrlList" value="${esc(x.featured_image||'')}"></label>${mediaDatalist()}</div></aside></div>`;
    wireRich($('#eventEditorBody'));$('#eeTitle').oninput=e=>{if(!$('#eeSlug').dataset.manual)$('#eeSlug').value=slugify(e.target.value)};$('#eeSlug').oninput=e=>e.target.dataset.manual='1';$('#eventDialog').showModal();
  }
  async function saveEvent(){const x=editingEvent;Object.assign(x,{title:$('#eeTitle').value.trim(),slug:$('#eeSlug').value.trim()||slugify($('#eeTitle').value),excerpt:$('#eeExcerpt').value.trim(),content_html:$('[data-rich-editor]',$('#eventEditorBody')).innerHTML,event_type:$('#eeType').value,status:$('#eeStatus').value,starts_at:$('#eeStart').value?new Date($('#eeStart').value).toISOString():null,ends_at:$('#eeEnd').value?new Date($('#eeEnd').value).toISOString():null,location:$('#eeLocation').value.trim(),mode:$('#eeMode').value.trim(),registration_enabled:$('#eeReg').checked,registration_note:$('#eeRegNote').value.trim(),featured_image:$('#eeImage').value.trim(),seo_title:$('#eeSeoTitle').value.trim(),seo_description:$('#eeSeoDesc').value.trim()});if(!x.title||!x.slug){toast('Título y slug son obligatorios');return}try{await db.saveEvent(x);toast('Actividad guardada');$('#eventDialog').close();editingEvent=null;loadEvents()}catch(e){toast('Error: '+e.message)}}

  async function loadMedia(){try{mediaAssets=await db.listMedia(500);renderMedia()}catch(e){toast('Error cargando medios: '+e.message)}}
  function renderMedia(){
    const q=($('#mediaSearch')?.value||'').toLowerCase();
    const list=mediaAssets.filter(a=>(a.name||'').toLowerCase().includes(q));
    $('#mediaCount').textContent=`${list.length} archivos`;
    const cards=list.map(a=>{const video=(a.mime_type||'').startsWith('video/'),image=(a.mime_type||'').startsWith('image/');return `<article class="media-card"><div class="media-preview" ${image?`style="background-image:url('${esc(a.url)}')"`:''}>${video?`<video src="${esc(a.url)}" muted preload="metadata"></video>`:!image?'<span class="file-icon">▧</span>':''}</div><div class="media-info"><strong>${esc(a.name)}</strong><small>${esc(a.mime_type||'')} ${a.size_bytes?`· ${Math.round(a.size_bytes/1024)} KB`:''}</small></div><div class="media-actions"><button data-copy-url="${esc(a.url)}">Copiar URL</button><button data-media-delete="${a.id}">Eliminar</button></div></article>`}).join('');
    $('#mediaGrid').innerHTML=cards || '<div class="empty-admin">Todavía no hay medios cargados.</div>';
    $$('[data-copy-url]').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(b.dataset.copyUrl).then(()=>toast('URL copiada')));
    $$('[data-media-delete]').forEach(b=>b.onclick=async()=>{const asset=mediaAssets.find(x=>x.id===b.dataset.mediaDelete);if(!asset||!confirm(`¿Eliminar ${asset.name}?`))return;try{await db.deleteMedia(asset);toast('Medio eliminado');loadMedia()}catch(e){toast(e.message)}});
  }

  async function loadInquiries(){try{inquiries=await db.listInquiries(500);renderInquiries();renderDashboard()}catch(e){toast('Error cargando consultas: '+e.message)}}
  function renderInquiries(){
    const f=$('#inquiryFilter')?.value||'';
    const list=inquiries.filter(x=>!f||x.status===f);
    const rows=list.map(x=>`<div class="table-row"><div class="table-title"><strong>${esc(x.subject||x.name)}</strong><small>${esc(x.name)} · ${esc(x.email)}</small></div><div class="table-cell">${esc(x.inquiry_type||'general')}</div><div><span class="badge ${x.status==='new'?'scheduled':x.status==='closed'?'published':'draft'}">${x.status==='new'?'Nuevo':x.status==='in_progress'?'En gestión':'Cerrado'}</span></div><div class="table-cell">${esc(fmtDate(x.created_at))}</div><div class="table-actions"><button class="icon-btn" data-inquiry="${x.id}">Ver</button></div></div>`).join('');
    $('#inquiryList').innerHTML=`<div class="table-row header"><div>Consulta</div><div>Tipo</div><div>Estado</div><div>Fecha</div><div></div></div>${rows || '<div class="empty-admin">No hay consultas en este filtro.</div>'}`;
    $$('[data-inquiry]').forEach(b=>b.onclick=()=>openInquiry(inquiries.find(x=>x.id===b.dataset.inquiry)));
  }
  function openInquiry(x){editingInquiry=clone(x);$('#inquiryDialogTitle').textContent=x.subject||'Consulta';$('#inquiryEditorBody').innerHTML=`<div class="inquiry-detail"><div class="inquiry-meta"><div class="meta-box"><span>Persona</span><strong>${esc(x.name)}</strong></div><div class="meta-box"><span>Email</span><strong><a href="mailto:${esc(x.email)}">${esc(x.email)}</a></strong></div><div class="meta-box"><span>Organización</span><strong>${esc(x.organization||'—')}</strong></div><div class="meta-box"><span>Tipo</span><strong>${esc(x.inquiry_type||'general')}</strong></div></div><div class="inquiry-message">${esc(x.message||'')}</div>${x.reference_url?`<a class="btn ghost" href="${esc(x.reference_url)}" target="_blank">Abrir referencia ↗</a>`:''}<div class="form-stack"><label class="field"><span>Estado</span><select id="iqStatus"><option value="new" ${x.status==='new'?'selected':''}>Nuevo</option><option value="in_progress" ${x.status==='in_progress'?'selected':''}>En gestión</option><option value="closed" ${x.status==='closed'?'selected':''}>Cerrado</option></select></label><label class="field"><span>Notas internas</span><textarea id="iqNotes">${esc(x.internal_notes||'')}</textarea></label></div></div>`;$('#inquiryDialog').showModal()}
  async function saveInquiry(){try{await db.updateInquiry(editingInquiry.id,{status:$('#iqStatus').value,internal_notes:$('#iqNotes').value});toast('Gestión actualizada');$('#inquiryDialog').close();loadInquiries()}catch(e){toast(e.message)}}

  async function loadNewsletter(){try{[subscribers,campaigns]=await Promise.all([db.listSubscribers(1200),db.listCampaigns(200)]);renderNewsletter()}catch(e){toast('Error cargando newsletter: '+e.message)}}
  function renderNewsletter(){
    const active=subscribers.filter(s=>s.status==='active').length;
    const sent=campaigns.filter(c=>c.status==='sent').length;
    $('#newsletterStats').innerHTML=[['SUSCRIPTORES ACTIVOS',active],['CAMPAÑAS',campaigns.length],['ENVIADAS',sent]].map(x=>`<div class="stat-card"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join('');
    const campaignRows=campaigns.map(c=>`<div class="campaign-row"><div><strong>${esc(c.subject)}</strong><small>${esc(c.status)} · ${esc(fmtDate(c.sent_at||c.created_at))}</small></div><div class="row-actions"><button class="icon-btn" data-camp-edit="${c.id}">✎</button>${c.status!=='sent'?`<button class="icon-btn" data-camp-send="${c.id}" title="Enviar">↗</button>`:''}</div></div>`).join('');
    const subscriberRows=subscribers.slice(0,80).map(s=>`<div class="subscriber-row"><div><strong>${esc(s.email)}</strong><small>${esc(s.name||'')} · ${esc(s.status)}</small></div><button class="icon-btn" data-sub-toggle="${s.id}" title="Activar/desactivar">${s.status==='active'?'◌':'◉'}</button></div>`).join('');
    $('#campaignList').innerHTML=campaignRows || '<div class="empty-admin">No hay campañas.</div>';
    $('#subscriberList').innerHTML=subscriberRows || '<div class="empty-admin">No hay suscriptores todavía.</div>';
    $$('[data-camp-edit]').forEach(b=>b.onclick=()=>openCampaign(campaigns.find(x=>x.id===b.dataset.campEdit)));
    $$('[data-camp-send]').forEach(b=>b.onclick=()=>sendCampaign(b.dataset.campSend));
    $$('[data-sub-toggle]').forEach(b=>b.onclick=async()=>{const sub=subscribers.find(x=>x.id===b.dataset.subToggle);try{await db.updateSubscriber(sub.id,{status:sub.status==='active'?'unsubscribed':'active',unsubscribed_at:sub.status==='active'?new Date().toISOString():null});loadNewsletter()}catch(e){toast(e.message)}});
  }
  function openCampaign(c=null){editingCampaign=c?clone(c):{subject:'',preheader:'',html_content:'<p>Escribí el contenido del boletín.</p>',status:'draft'};const x=editingCampaign;$('#campaignDialogTitle').textContent=c?'Editar campaña':'Nueva campaña';$('#campaignEditorBody').innerHTML=`<div class="form-stack"><label class="field"><span>Asunto</span><input id="ceSubject" value="${esc(x.subject||'')}"></label><label class="field"><span>Preheader</span><input id="cePreheader" value="${esc(x.preheader||'')}"></label><label class="field"><span>Contenido</span>${richEditorHtml(x.html_content||'')}</label></div>`;wireRich($('#campaignEditorBody'));$('#campaignDialog').showModal()}
  async function saveCampaign(){const x=editingCampaign;Object.assign(x,{subject:$('#ceSubject').value.trim(),preheader:$('#cePreheader').value.trim(),html_content:$('[data-rich-editor]',$('#campaignEditorBody')).innerHTML,status:x.status||'draft'});if(!x.subject){toast('El asunto es obligatorio');return}try{const s=await db.saveCampaign(x);toast('Campaña guardada');$('#campaignDialog').close();editingCampaign=s;loadNewsletter()}catch(e){toast(e.message)}}
  async function sendCampaign(id){const c=campaigns.find(x=>x.id===id);if(!confirm(`¿Enviar “${c?.subject}” a todos los suscriptores activos?`))return;try{toast('Enviando campaña…');const r=await db.sendCampaign(id);toast(`Envío procesado: ${r?.sent||0} enviados`);loadNewsletter()}catch(e){toast('Error de envío: '+e.message)}}

  async function loadHistory(){try{revisions=await db.listRevisions(60);renderHistory()}catch(e){toast('Error cargando revisiones: '+e.message)}}
  function renderHistory(){
    const rows=revisions.map(r=>`<article class="history-row"><div><strong>${esc(r.note||'Publicación')}</strong><small>${esc(fmtDate(r.created_at))} · ${esc(r.id.slice(0,8))}</small></div><button class="btn ghost" data-restore="${r.id}">Restaurar</button></article>`).join('');
    $('#historyList').innerHTML=rows || '<div class="empty-admin">No hay revisiones todavía.</div>';
    $$('[data-restore]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Restaurar y publicar esta revisión?'))return;try{const payload=await db.getRevision(b.dataset.restore);state=mergeDeep(clone(defaults),payload);await db.saveSiteContent(state,'Restauración de revisión');clearDirty();renderAll();pushPreview();toast('Revisión restaurada y publicada');loadHistory()}catch(e){toast(e.message)}});
  }

  function renderAdvanced(){const el=$('#advancedJson');if(el)el.value=JSON.stringify(state,null,2)}

  function renderAll(){renderDashboard();renderSections();renderPages();renderDesign();renderNavigation();renderSettings();renderPosts();renderEvents();renderMedia();renderInquiries();renderNewsletter();renderHistory();renderAdvanced()}

  async function publishSite(){if(!db.configured){toast('Supabase no está configurado');return}try{$('#publishSite').disabled=true;$('#saveState').textContent='Publicando…';await db.saveSiteContent(state,'Publicación desde CMS');clearDirty();toast('Sitio publicado');refreshPreview();loadHistory()}catch(e){toast('Error: '+e.message);$('#saveState').textContent='Error'}finally{$('#publishSite').disabled=false}}

  function visualUrl(){const base=$('#visualPage').value;return `${base}${base.includes('?')?'&':'?'}cms_inline_edit=1&t=${Date.now()}`}
  function resizeVisual(){const stage=$('#visualStage'),frame=$('#visualFrame');if(!stage||!frame)return;const widths={desktop:1440,tablet:834,mobile:390};const target=widths[visualDevice];const scale=Math.min(1,Math.max(.3,(stage.clientWidth-10)/target));frame.style.width=`${target}px`;frame.style.height=`${Math.max(800,stage.clientHeight/scale)}px`;frame.style.transform=`scale(${scale})`;frame.style.left=`${Math.max(0,(stage.clientWidth-target*scale)/2)}px`}
  function pushPreview(){['visualFrame','previewFrame'].forEach(id=>{const f=$('#'+id);if(f?.contentWindow)f.contentWindow.postMessage({type:'foro:cms-preview',payload:state},'*')})}
  function reloadVisual(){const f=$('#visualFrame');f.src=visualUrl()}
  function refreshPreview(){const f=$('#previewFrame');f.src=`../index.html?cms_live_preview=1&t=${Date.now()}`}

  async function loadInitial(){try{const remote=await db.loadSiteContent();state=remote?mergeDeep(clone(defaults),remote):clone(defaults);clearDirty();await Promise.all([loadPosts(),loadEvents(),loadMedia(),loadInquiries(),loadNewsletter(),loadHistory()]);renderAll();pushPreview()}catch(e){toast('Error cargando CMS: '+e.message)}}
  async function setSession(session){const logged=Boolean(session?.user);$('#authScreen').classList.toggle('hidden',logged);if(logged){$('#userEmail').textContent=session.user.email||'Usuario';$('#accountButton').textContent=(session.user.email||'A')[0].toUpperCase();await loadInitial()}}
  async function boot(){
    $('#connectionDot').className=db.configured?'online':'offline';$('#connectionText').textContent=db.configured?'Supabase conectado':'Supabase sin configurar';
    if(!db.configured){$('#configNotice').classList.remove('hidden');$('#authCopy').textContent='Configurá el proyecto Supabase nuevo antes de usar el panel.';$('#login').disabled=true;return}
    const {data}=await db.client.auth.getSession();await setSession(data.session);db.client.auth.onAuthStateChange((_e,s)=>setSession(s));
  }

  // Navegación y acciones globales
  $$('.admin-nav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));$$('[data-go]').forEach(b=>b.onclick=()=>switchView(b.dataset.go));
  $('#mobileMenu').onclick=()=>$('#sidebar').classList.toggle('open');$('#publishSite').onclick=publishSite;
  $('#accountButton').onclick=()=>$('#accountMenu').classList.toggle('hidden');$('#logout').onclick=()=>db.client?.auth.signOut();
  $('#login').onclick=async()=>{try{$('#authStatus').textContent='Ingresando…';const {error}=await db.client.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});if(error)throw error;$('#authStatus').textContent=''}catch(e){$('#authStatus').textContent=e.message}};
  $('#addSection').onclick=()=>{$('#blockTemplates').innerHTML=Object.entries(typeMeta).map(([type,m])=>`<button type="button" class="template-card" data-template="${type}"><strong>${m[0]} ${m[1]}</strong><small>${m[2]}</small></button>`).join('');$('#blockDialog').showModal();$$('[data-template]').forEach(b=>b.onclick=()=>{const base=defaults.sections.find(s=>s.type===b.dataset.template);if(!base)return;const c=clone(base);c.id=uid(c.type);c.label=`${typeMeta[c.type][1]} — nuevo`;c.settings={...(c.settings||{}),anchor:c.id};state.sections.push(c);$('#blockDialog').close();markDirty();renderSections();renderDashboard();openSectionEditor(state.sections.length-1)})};
  $('#applySection').onclick=()=>{state.sections[editingSection]=clone($('#sectionDialog')._draft);$('#sectionDialog').close();editingSection=null;markDirty();renderSections();renderDashboard();toast('Bloque actualizado')};
  $('#resetTheme').onclick=()=>{if(confirm('¿Restaurar diseño por defecto?')){state.theme=clone(defaults.theme);markDirty();renderDesign()}};
  $('#addNav').onclick=()=>{state.navigation.push({id:uid('nav'),label:'Nuevo enlace',href:'#',featured:false,children:[]});markDirty();renderNavigation()};
  $('#newPost').onclick=()=>openPost();$('#savePost').onclick=savePost;$('#postSearch').oninput=renderPosts;$('#postStatusFilter').onchange=renderPosts;
  $('#newEvent').onclick=()=>openEvent();$('#saveEvent').onclick=saveEvent;
  $('#mediaSearch').oninput=renderMedia;$('#mediaUpload').onchange=async e=>{for(const file of [...e.target.files]){try{toast(`Subiendo ${file.name}…`);await db.uploadMedia(file)}catch(err){toast(`Error en ${file.name}: ${err.message}`)}}e.target.value='';await loadMedia();toast('Carga finalizada')};
  $('#refreshInquiries').onclick=loadInquiries;$('#inquiryFilter').onchange=renderInquiries;$('#saveInquiry').onclick=saveInquiry;
  $('#newCampaign').onclick=()=>openCampaign();$('#saveCampaign').onclick=saveCampaign;
  $('#refreshHistory').onclick=loadHistory;
  $('#reloadJson').onclick=()=>{renderAdvanced();toast('JSON recargado desde el estado local')};
  $('#applyJson').onclick=()=>{try{const parsed=JSON.parse($('#advancedJson').value);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('El JSON debe ser un objeto');state=mergeDeep(clone(defaults),parsed);markDirty();renderAll();pushPreview();toast('JSON válido y aplicado localmente')}catch(e){toast('JSON inválido: '+e.message)}};
  $('#visualPage').onchange=reloadVisual;$('#visualReload').onclick=reloadVisual;$$('[data-device]').forEach(b=>b.onclick=()=>{visualDevice=b.dataset.device;$$('[data-device]').forEach(x=>x.classList.toggle('active',x===b));resizeVisual()});$('#visualFrame').onload=()=>{resizeVisual();setTimeout(pushPreview,120)};
  $('#previewReload').onclick=refreshPreview;$('#previewFrame').onload=()=>setTimeout(pushPreview,100);
  if('ResizeObserver'in window)new ResizeObserver(resizeVisual).observe($('#visualStage'));else addEventListener('resize',resizeVisual);
  addEventListener('message',e=>{const m=e.data||{};if(m.type==='foro:inline-change'){setPath(state,m.path,m.value);markDirty();renderPages();renderSections();toast('Texto actualizado localmente')}if(m.type==='foro:edit-section'&&Number.isInteger(m.index))openSectionEditor(m.index);if(m.type==='foro:preview-ready')pushPreview()});
  addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
  boot();
})();
