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
  let myRole = 'author';

  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const esc = (v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clone = v=>structuredClone(v);
  const uid = p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const slugify = v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const getPath=(obj,path)=>path.split('.').reduce((o,k)=>o?.[Number.isNaN(Number(k))?k:Number(k)],obj);
  function setPath(obj,path,value){const a=path.split('.');let cur=obj;a.slice(0,-1).forEach(k=>{const kk=Number.isNaN(Number(k))?k:Number(k);if(cur[kk]==null)cur[kk]={};cur=cur[kk]});const last=a.at(-1),lk=Number.isNaN(Number(last))?last:Number(last);cur[lk]=value}
  function migrateLegacyPalette(data) {
    if (!data?.theme) return data;
    const bg = String(data.theme.background || '').toLowerCase();
    if (['#05080c', '#050505', '#05090d'].includes(bg)) {
      const colors = ['background','paper','ink','text','muted','line','navy','navyDeep','cyan','cyanSoft','warm'];
      colors.forEach(key => { data.theme[key] = defaults.theme[key]; });
    }
    return data;
  }
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
  const titles={dashboard:'Inicio',visual:'Editor visual',home:'Portada',pages:'Páginas',posts:'Publicaciones',events:'Actividades',media:'Medios',inquiries:'Consultas',newsletter:'Newsletter',resources:'Biblioteca y recursos',design:'Diseño',navigation:'Navegación',history:'Revisiones',users:'Colaboradores',settings:'Ajustes',advanced:'JSON avanzado',preview:'Vista previa'};
  const postTypes={article:'Artículo',analysis:'Análisis',research:'Investigación',report:'Informe',resource:'Recurso / biblioteca',interview:'Entrevista',podcast:'Podcast / audiovisual',experience:'Experiencia',case:'Caso territorial'};
  const eventTypes={conversation:'Conversatorio',workshop:'Taller',hackathon:'Hackatón',project:'Proyecto',meeting:'Encuentro'};

  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2600)}
  function markDirty(options={}){dirty=true;$('#dirtyBadge').classList.remove('hidden');$('#saveState').textContent='Cambios locales';if(!options.preserveVisualFocus)pushPreview()}
  function clearDirty(){dirty=false;$('#dirtyBadge').classList.add('hidden');$('#saveState').textContent='Publicado'}

  function switchView(view){
    $$('.admin-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.viewPanel===view));
    $('#viewTitle').textContent=titles[view]||'CMS';
    $('#sidebar').classList.remove('open');
    if(view==='visual'){setTimeout(()=>{renderBuilder();resizeVisual();pushPreview()},60)}
    if(view==='posts') loadPosts();
    if(view==='resources') loadPosts().then(()=>renderResourcesAdmin());
    if(view==='events') loadEvents();
    if(view==='media') loadMedia();
    if(view==='users') loadCollaborators();
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

  function mediaTypeFromUrl(url='') { return /(?:youtube\.com|youtu\.be)/i.test(url)?'youtube':/\.(?:mp4|webm|mov)(?:[?#]|$)/i.test(url)?'video':'image'; }
  function mediaAssetOptions(){return mediaAssets.filter(x=>/^image\/|^video\//.test(x.mime_type||'')).map(x=>`<option value="${esc(x.url)}">${esc(x.name||x.url)}</option>`).join('')}
  function cmsVideoUrl(u,m={}) {
    try {const x=new URL(u,location.href);let id=x.hostname.includes('youtu.be')?x.pathname.slice(1):x.searchParams.get('v')||x.pathname.split('/').at(-1);if(!/^[a-zA-Z0-9_-]{11}$/.test(id))return '';const q=new URLSearchParams({autoplay:'0',mute:'1',controls:'1',rel:'0',modestbranding:'1',iv_load_policy:'3',start:String(Math.max(0,Number(m.startAt)||0))});if(Number(m.endAt)>Number(m.startAt||0))q.set('end',String(Number(m.endAt)));return 'https://www.youtube-nocookie.com/embed/'+id+'?'+q.toString()}catch{return ''}
  }
  function cmsMediaPreview(m){if(!m?.src)return '<span>Sin medio asignado</span>';const t=m.type==='image'&&/(youtube.com|youtu.be)/i.test(m.src)?'youtube':m.type;
    if(t==='youtube'){const u=cmsVideoUrl(m.src,m);return u?`<iframe class="${m.cleanEmbed?'youtube-cropped':''}" src="${esc(u)}" title="Vista previa YouTube" allow="encrypted-media; picture-in-picture" loading="lazy"></iframe>`:'<span>Enlace YouTube inválido</span>'}
    if(t==='video')return `<video src="${esc(m.src)}" ${m.poster?`poster="${esc(m.poster)}"`:''} controls playsinline preload="metadata" data-preview-start="${Math.max(0,Number(m.startAt)||0)}" data-preview-end="${Math.max(0,Number(m.endAt)||0)}"></video>`;
    return `<img src="${esc(m.src)}" alt="Previsualización de imagen" style="object-fit:${m.fit==='contain'?'contain':'cover'};object-position:${esc(m.positionX||'center')} ${esc(m.positionY||'center')};">`
  }
  function refreshMediaPreviews(root=document){$$('[data-media-block]',root).forEach(block=>{const path=block.dataset.mediaBlock;const fields=$$('[data-media-key]',block);const m={};fields.forEach(e=>{const key=e.dataset.mediaKey.slice(path.length+1);m[key]=e.type==='checkbox'?e.checked:e.type==='number'?Number(e.value):e.value});const preview=$('[data-media-preview]',block);if(preview){const old=preview.innerHTML;const now=JSON.stringify(m);if(preview.dataset.previewKey!==now){preview.dataset.previewKey=now;preview.innerHTML=cmsMediaPreview(m);const v=$('video',preview);if(v){v.addEventListener('loadedmetadata',()=>{const start=Number(v.dataset.previewStart)||0;if(v.duration>start)v.currentTime=start},{once:true});v.addEventListener('timeupdate',()=>{const end=Number(v.dataset.previewEnd)||0;if(end>0&&v.currentTime>=end)v.pause()})}}}})}
  function mediaControl(label,path,media={},fallback='') {
    const m={type:'image',src:'',poster:'',fit:'cover',positionX:'center',positionY:'center',zoom:100,frameRatio:'auto',autoplay:true,mute:true,loop:true,controls:false,startAt:0,endAt:0,captions:false,cleanEmbed:true,...media};
    const sel=(key,options)=>`<label class="field"><span>${key}</span><select data-media-key="${esc(path)}.${esc(options[0][2])}">${options.slice(1).map(([v,t])=>`<option value="${v}" ${m[options[0][2]]===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
    return `<section class="cms-media-control" data-media-block="${esc(path)}"><header><strong>${esc(label)}</strong><small>Imagen, MP4/WebM o YouTube · Guardado dentro del bloque</small></header>
      <div class="cms-media-preview" data-media-preview>${cmsMediaPreview(m)}</div>
      <div class="form-grid"><label class="field"><span>Tipo de medio</span><select data-media-key="${path}.type"><option value="image" ${m.type==='image'?'selected':''}>Imagen</option><option value="video" ${m.type==='video'?'selected':''}>Video MP4 / WebM</option><option value="youtube" ${m.type==='youtube'?'selected':''}>Video YouTube</option></select></label><label class="field"><span>URL o ruta del medio</span><input data-media-key="${path}.src" list="cmsMediaUrls" value="${esc(m.src)}" placeholder="Elegí de la biblioteca o pegá una URL"></label></div>
      <div class="cms-media-actions"><button type="button" class="btn primary" data-open-media-library="${esc(path)}">▧ Explorar biblioteca con miniaturas</button><button type="button" class="btn ghost" data-media-remove="${esc(path)}">Quitar medio</button></div>
      <div class="form-grid"><label class="field"><span>Imagen alternativa / póster</span><input data-media-key="${path}.poster" list="cmsMediaUrls" value="${esc(m.poster)}"></label><label class="field"><span>Encuadre</span><select data-media-key="${path}.fit"><option value="cover" ${m.fit==='cover'?'selected':''}>Cubrir / recortar</option><option value="contain" ${m.fit==='contain'?'selected':''}>Mostrar completo</option></select></label>
      <label class="field"><span>Posición horizontal</span><select data-media-key="${path}.positionX">${['left','center','right'].map(v=>`<option ${m.positionX===v?'selected':''}>${v}</option>`).join('')}</select></label><label class="field"><span>Posición vertical</span><select data-media-key="${path}.positionY">${['top','center','bottom'].map(v=>`<option ${m.positionY===v?'selected':''}>${v}</option>`).join('')}</select></label>
      <label class="field"><span>Zoom (%)</span><input type="number" min="70" max="220" data-media-key="${path}.zoom" value="${Number(m.zoom)||100}"></label><label class="field"><span>Proporción</span><select data-media-key="${path}.frameRatio">${['auto','21/9','16/9','4/3','1/1','9/16'].map(v=>`<option value="${v}" ${m.frameRatio===v?'selected':''}>${v}</option>`).join('')}</select></label></div>
      <div class="cms-playback"><h4>Reproducción de video</h4><div class="cms-media-checks">${[['autoplay','Reproducción automática'],['mute','Iniciar sin sonido'],['loop','Repetir'],['controls','Mostrar controles'],['captions','Subtítulos (YouTube)'],['cleanEmbed','YouTube sin controles']].map(([k,t])=>`<label><input type="checkbox" data-media-key="${path}.${k}" ${m[k]?'checked':''}> ${t}</label>`).join('')}</div><div class="form-grid"><label class="field"><span>Comenzar en (segundos)</span><input type="number" min="0" data-media-key="${path}.startAt" value="${Number(m.startAt)||0}"></label><label class="field"><span>Finalizar en (segundos; 0 = completo)</span><input type="number" min="0" data-media-key="${path}.endAt" value="${Number(m.endAt)||0}"></label></div></div></section>`;
  }
  const editorialTemplates={
    "Ensayo editorial":'<h2>Una perspectiva para el debate</h2><p>Presentá aquí la idea principal del artículo. Este texto es completamente editable.</p><h3>Contexto y antecedentes</h3><p>Desarrollá el contexto, identificando fuentes, datos y perspectivas.</p><h3>Análisis</h3><p>Incorporá el argumento central, las evidencias y los impactos sobre los territorios.</p><h3>Conclusiones</h3><p>Destacá los hallazgos y las preguntas pendientes.</p>',
    "Informe de investigación":'<h2>Resumen ejecutivo</h2><p>Síntesis de los principales hallazgos.</p><h3>Objetivo y metodología</h3><p>Explicá el alcance, período analizado y fuentes.</p><h3>Resultados</h3><p>Presentá datos contrastables y sus limitaciones.</p><h3>Implicancias para el territorio</h3><p>Describí oportunidades y próximos pasos.</p>',
    "Entrevista":'<h2>Una conversación sobre la economía del visitante</h2><p>Presentación de la persona entrevistada y su perspectiva.</p><h3>¿Cuál es el principal desafío?</h3><p>Respuesta de la entrevista.</p><h3>¿Qué oportunidades identifica?</h3><p>Respuesta de la entrevista.</p><blockquote>Una idea destacada de la conversación.</blockquote>',
    "Con imagen destacada":'<h2>Título de la sección</h2><p>Introducción breve y clara.</p><figure><img src="assets/images/hero-territorio.jpg" alt="Territorio argentino"><figcaption>Reemplazá esta imagen desde el editor o la biblioteca.</figcaption></figure><h3>Desarrollo</h3><p>Contenido de la sección.</p>',
    "Editorial sin imágenes":'<h2>Título principal</h2><p>Texto de apertura de la sección.</p><hr><h3>Subtítulo</h3><p>Contenido editorial en párrafos independientes.</p>',
    "Dos columnas":'<div class="foro-template-columns"><div><h2>Un enfoque territorial</h2><p>Primera columna editable, con información central.</p></div><div><h3>Otra perspectiva</h3><p>Segunda columna para un dato, una cita o un análisis.</p></div></div>',
    "Bloque audiovisual":'<h2>Entrevista o conversación</h2><p>Texto introductorio. Agregá un video MP4 o YouTube con el botón del editor multimedia.</p><h3>Ideas principales</h3><p>Resumen de lo conversado.</p>'
  };
  function addEditorialTemplates(root){
    const editor=root.querySelector('[data-rich-editor]');if(!editor)return;
    // La plantilla audiovisual debe ofrecer el reproductor real, no solo un texto marcador.
    const box=document.createElement('div');box.className='editorial-template-picker';
    box.innerHTML=`<div><strong>Plantillas prediseñadas</strong><p>Elegí una estructura profesional; los textos se reemplazan y editan normalmente. Previsualizá antes de insertar.</p></div><div class="template-choice-grid">${Object.entries(editorialTemplates).map(([name,markup],i)=>`<button type="button" data-editor-template="${i}"><strong>${esc(name)}</strong><small>${i===3?'Imagen y texto':i===5?'Composición editorial':'Contenido editable'}</small></button>`).join('')}</div><div class="template-example" id="templateExample" hidden></div><div class="template-choice-actions"><button type="button" id="insertTemplate" class="btn primary" disabled>Usar plantilla</button><button type="button" id="appendTemplate" class="btn ghost" disabled>Agregar al contenido</button></div>`;
    editor.parentElement.insertBefore(box,editor);
    let active=null;const templates=Object.values(editorialTemplates);
    box.querySelectorAll('[data-editor-template]').forEach(b=>b.onclick=()=>{active=+b.dataset.editorTemplate;box.querySelectorAll('[data-editor-template]').forEach(x=>x.classList.toggle('selected',x===b));const prev=box.querySelector('#templateExample');prev.hidden=false;prev.innerHTML=templates[active];box.querySelector('#insertTemplate').disabled=false;box.querySelector('#appendTemplate').disabled=false});
    box.querySelector('#insertTemplate').onclick=()=>{if(active===null)return;if(editor.textContent.trim()&&!confirm('¿Reemplazar el contenido del editor con esta plantilla?'))return;editor.innerHTML=templates[active];editor.dispatchEvent(new Event('input',{bubbles:true}))};
    box.querySelector('#appendTemplate').onclick=()=>{if(active===null)return;editor.insertAdjacentHTML('beforeend',templates[active]);editor.dispatchEvent(new Event('input',{bubbles:true}))};
    const audiovisualIndex=Object.keys(editorialTemplates).indexOf('Bloque audiovisual');
    const hint=document.createElement('p');hint.className='foro-audiovisual-hint';hint.textContent='Para incorporar el video real, elegí «YouTube» o «Video propio» en Agregar bloque. Se abrirá un selector con vista previa.';box.append(hint);

  }
  function openSectionEditor(i){
    if(!state.sections?.[i]) return;
    if(db.configured)loadMedia().then(()=>{}).catch(()=>{});
    editingSection=i;const s=clone(state.sections[i]);$('#sectionDialogTitle').textContent=s.label||typeMeta[s.type]?.[1]||'Editar sección';
    let html=`<div class="editor-card"><h3>Identidad del bloque</h3><div class="form-grid">${inputField('Nombre interno','label',s.label)}${inputField('Ancla','settings.anchor',s.settings?.anchor||s.id)}</div></div><div class="editor-card"><h3>Contenido</h3><div class="form-stack">`;
    Object.entries(s.content||{}).filter(([k,v])=>!['heroImage'].includes(k)&&['string','number'].includes(typeof v)).forEach(([k,v])=>html+=inputField(prettyLabel(k),`content.${k}`,v,{textarea:['body','note','emptyBody'].includes(k)}));
    html+=`</div></div><div class="editor-card"><h3>Medios del bloque</h3><p>Podés seleccionar un archivo de Supabase Storage o pegar una URL externa.</p>${mediaControl('Medio principal','media',s.media||{src:s.content?.heroImage||'',type:'image'})}<datalist id="cmsMediaUrls">${mediaAssetOptions()}</datalist></div>`;
    if(s.type==='heroForum'){
      const current=Array.isArray(s.heroSlides)&&s.heroSlides.length?s.heroSlides:[s.media?.src?s.media:{type:'image',src:s.content?.heroImage||'assets/images/hero-territorio.jpg'}];
      s.heroSlides=clone(current);s.heroOverlay??=34;s.heroInterval??=7;
      html+=`<div class="editor-card cms-hero-editor"><h3>Hero · carrusel multimedia</h3><p>Agregá varias imágenes o videos. También podés conservar uno solo. El orden determina la secuencia.</p>
      <div class="form-grid"><label class="field"><span>Superposición oscura: <output id="heroOverlayValue">${s.heroOverlay}%</output></span><input id="heroOverlayRange" type="range" min="0" max="100" step="1" value="${s.heroOverlay}"></label><label class="field"><span>Duración de cada diapositiva (segundos)</span><input id="heroSlideInterval" type="number" min="3" max="120" value="${s.heroInterval}"></label></div>
      <div id="heroSlideEditor"></div><button class="btn primary" type="button" id="heroAddSlide">+ Agregar imagen o video</button>
      <div class="cms-hero-preview-wrap"><strong>Vista previa de la superposición</strong><div id="heroOpacityPreview" class="cms-hero-opacity-preview"></div></div></div>`;
    }
    if(s.type==='conceptStatement' && Array.isArray(s.items)){
      html+=`<div class="editor-card"><h3>Imágenes de los elementos</h3><p>Opcional: podés colocar una imagen en cada sector. Si no asignás una, conservará su estilo de texto actual.</p>`;
      s.items.forEach((label,j)=>{html+=mediaControl(`${j+1}. ${label}`,`itemMedia.${j}`,s.itemMedia?.[j]||{})});
      html+=`</div>`;
    }
    if(Array.isArray(s.items)){
      html+=`<div class="editor-card"><h3>Elementos</h3><div class="form-stack">`;
      s.items.forEach((it,j)=>{
        if(typeof it==='string') html+=inputField(`Elemento ${j+1}`,`items.${j}`,it);
        else html+=`<div class="editor-card cms-item-editor"><h3>Elemento ${j+1}</h3><div class="form-stack">${Object.entries(it).filter(([k,v])=>['string','number'].includes(typeof v)&&!['mediaSrc','image','src'].includes(k)).map(([k,v])=>inputField(prettyLabel(k),`items.${j}.${k}`,v,{textarea:k==='body'})).join('')}</div>${mediaControl('Medio del elemento',`items.${j}.media`,it.media||{src:it.mediaSrc||it.image||it.src||''})}</div>`;
      });html+=`</div></div>`;
    }
    html+=`<div class="editor-card"><h3>Contenido adicional por bloques</h3><p>Agregá títulos, párrafos, imágenes, videos y listas a esta sección. Los bloques aparecen debajo del contenido habitual.</p>${richEditorHtml(s.extraHtml||'')}</div>`;
    html+=`<div class="editor-card"><h3>Configuración</h3><div class="form-grid">${Object.entries(s.settings||{}).filter(([k,v])=>['string','number'].includes(typeof v)).map(([k,v])=>inputField(prettyLabel(k),`settings.${k}`,v,{type:typeof v==='number'?'number':'text'})).join('')}</div></div>`;
    $('#sectionEditorBody').innerHTML=html;addEditorialTemplates($('#sectionEditorBody'));wireRich($('#sectionEditorBody'));$('#sectionDialog')._draft=s;$('#sectionDialog').showModal();refreshMediaPreviews($('#sectionEditorBody'));
    if(s.type==='heroForum'){
      const holder=$('#heroSlideEditor'),slideDefault=()=>({type:'image',src:'',autoplay:true,mute:true,loop:true,cleanEmbed:true,startAt:0,endAt:0});
      const preview=()=>{const m=s.heroSlides.find(x=>x.src)||{};$('#heroOpacityPreview').innerHTML=`${cmsMediaPreview(m)}<div style="position:absolute;inset:0;pointer-events:none;background:rgba(2,25,47,${Number(s.heroOverlay)/100})"></div>`};
      const draw=()=>{holder.innerHTML=s.heroSlides.map((m,j)=>`<div class="cms-slide-entry" data-slide-index="${j}"><div class="cms-slide-head"><strong>Medio ${j+1}</strong><button type="button" data-slide-up="${j}" ${j===0?'disabled':''}>↑</button><button type="button" data-slide-down="${j}" ${j===s.heroSlides.length-1?'disabled':''}>↓</button><button type="button" data-slide-delete="${j}">Eliminar</button></div>${mediaControl('Imagen o video',`heroSlides.${j}`,m)}</div>`).join('');
        holder.querySelectorAll('[data-media-key]').forEach(el=>{const onChange=()=>{const path=el.dataset.mediaKey;setPath(s,path,el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value);if(path.endsWith('.src')){const root=path.slice(0,-4);s.heroSlides[Number(root.split('.')[1])].type=mediaTypeFromUrl(el.value)}preview();};el.addEventListener('change',onChange);el.addEventListener('input',onChange)});
        holder.querySelectorAll('[data-open-media-library]').forEach(b=>b.onclick=()=>openVisualLibrary(b.dataset.openMediaLibrary,s));
        holder.querySelectorAll('[data-media-remove]').forEach(b=>b.onclick=()=>{setPath(s,b.dataset.mediaRemove+'.src','');draw()});
        holder.querySelectorAll('[data-slide-up],[data-slide-down]').forEach(b=>b.onclick=()=>{const j=Number(b.dataset.slideUp??b.dataset.slideDown),other=j+(b.hasAttribute('data-slide-up')?-1:1);[s.heroSlides[j],s.heroSlides[other]]=[s.heroSlides[other],s.heroSlides[j]];draw();preview()});
        holder.querySelectorAll('[data-slide-delete]').forEach(b=>b.onclick=()=>{if(s.heroSlides.length===1){s.heroSlides[0]=slideDefault()}else s.heroSlides.splice(Number(b.dataset.slideDelete),1);draw();preview()});
        refreshMediaPreviews(holder);preview();
      };
      $('#heroOverlayRange').oninput=e=>{s.heroOverlay=Number(e.target.value);$('#heroOverlayValue').textContent=s.heroOverlay+'%';preview()};
      $('#heroSlideInterval').oninput=e=>{s.heroInterval=Math.max(3,Number(e.target.value)||7)};
      $('#heroAddSlide').onclick=()=>{s.heroSlides.push(slideDefault());draw()};draw();
    }
    $$('[data-edit-path]',$('#sectionEditorBody')).forEach(el=>el.oninput=()=>setPath(s,el.dataset.editPath,el.type==='number'?Number(el.value):el.value));
    $$('[data-media-key]',$('#sectionEditorBody')).forEach(el=>{el.addEventListener('input',()=>refreshMediaPreviews($('#sectionEditorBody')));el.onchange=()=>{const key=el.dataset.mediaKey;setPath(s,key,el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value);if(key.endsWith('.src')){const base=key.slice(0,-4),url=el.value;setPath(s,base+'.type',mediaTypeFromUrl(url));const typeEl=$(`[data-media-key="${base}.type"]`,$('#sectionEditorBody'));if(typeEl)typeEl.value=mediaTypeFromUrl(url)}const block=el.closest('.cms-media-control');const preview=block?.querySelector('[data-media-preview]');if(preview&&key.endsWith('.src'))preview.innerHTML=el.value?`<span>Medio seleccionado: ${esc(el.value)}</span>`:'<span>Sin medio asignado</span>'};});
    $$('[data-open-media-library]',$('#sectionEditorBody')).forEach(b=>b.onclick=()=>openVisualLibrary(b.dataset.openMediaLibrary,s));
    $$('[data-media-remove]',$('#sectionEditorBody')).forEach(b=>b.onclick=()=>{const base=b.dataset.mediaRemove;setPath(s,base+'.src','');const el=$(`[data-media-key="${base}.src"]`,$('#sectionEditorBody'));if(el)el.value='';b.closest('.cms-media-control').querySelector('[data-media-preview]').innerHTML='<span>Sin medio asignado</span>'});
  }

  function openVisualLibrary(path,draft){
    const root=$('#sectionDialog');
    root.querySelector('.cms-library-overlay')?.remove();
    const overlay=document.createElement('div');overlay.className='cms-library-overlay';
    overlay.innerHTML=`<div class="cms-library-window" role="dialog" aria-label="Seleccionar medio de la biblioteca"><div class="cms-library-heading"><div><strong>Biblioteca multimedia</strong><p>Elegí una imagen o un video y comprobá su contenido antes de aplicarlo.</p></div><button type="button" class="cms-library-close" aria-label="Cerrar">×</button></div><div class="cms-library-content"><div class="cms-library-browser"><input type="search" class="cms-library-search" placeholder="Buscar por nombre…" aria-label="Buscar medios"><div class="cms-library-grid"></div></div><aside class="cms-library-detail"><div class="cms-library-large">Seleccioná un archivo</div><strong class="cms-library-name"></strong><small class="cms-library-mime"></small><button type="button" class="btn primary cms-library-apply" disabled>Usar este medio</button></aside></div></div>`;
    root.appendChild(overlay);
    const close=()=>overlay.remove();overlay.querySelector('.cms-library-close').onclick=close;
    overlay.onclick=e=>{if(e.target===overlay)close()};
    const valid=mediaAssets.filter(a=>/^(image|video)\//.test(a.mime_type||''));let selected=null;
    const detail=()=>{
      const preview=overlay.querySelector('.cms-library-large'),name=overlay.querySelector('.cms-library-name'),mime=overlay.querySelector('.cms-library-mime');
      if(!selected)return;
      preview.innerHTML=selected.mime_type.startsWith('video/')?`<video src="${esc(selected.url)}" controls playsinline preload="metadata"></video>`:`<img src="${esc(selected.url)}" alt="Vista previa de ${esc(selected.name)}">`;
      name.textContent=selected.name||'Archivo';mime.textContent=selected.mime_type||'';
      overlay.querySelector('.cms-library-apply').disabled=false;
    };
    const draw=()=>{const q=overlay.querySelector('.cms-library-search').value.toLocaleLowerCase();const list=valid.filter(a=>(a.name||'').toLocaleLowerCase().includes(q));
      overlay.querySelector('.cms-library-grid').innerHTML=list.map((a,i)=>`<button type="button" class="cms-library-item ${a.id===selected?.id?'is-selected':''}" data-asset-index="${i}">${(a.mime_type||'').startsWith('video/')?`<video src="${esc(a.url)}" muted preload="metadata"></video><span class="cms-library-video-tag">VIDEO</span>`:`<img src="${esc(a.url)}" loading="lazy" alt="">`}<span title="${esc(a.name)}">${esc(a.name)}</span></button>`).join('')||'<p class="cms-library-empty">No hay medios que coincidan. Subí archivos desde la sección Medios.</p>';
      overlay.querySelectorAll('[data-asset-index]').forEach(b=>b.onclick=()=>{selected=list[Number(b.dataset.assetIndex)];draw();detail()});
    };
    overlay.querySelector('.cms-library-search').oninput=draw;
    overlay.querySelector('.cms-library-apply').onclick=()=>{
      if(!selected)return;
      setPath(draft,path+'.src',selected.url);
      const type=selected.mime_type.startsWith('video/')?'video':'image';setPath(draft,path+'.type',type);
      const input=$(`[data-media-key="${path}.src"]`,$('#sectionEditorBody'));
      const dropdown=$(`[data-media-key="${path}.type"]`,$('#sectionEditorBody'));
      if(input)input.value=selected.url;if(dropdown)dropdown.value=type;
      refreshMediaPreviews($('#sectionEditorBody'));close();
    };
    draw();
    if(!valid.length && db.configured){loadMedia().then(()=>{close();openVisualLibrary(path,draft)})}
  }

  function renderPages(){
    const d=state.pages||{};let html='';
    const foro=d['el-foro'];
    html+=`<article class="page-editor-card"><h3>El Foro · Hero</h3><div class="form-stack">${inputField('Antetítulo','pages.el-foro.hero.eyebrow',foro.hero.eyebrow)}${inputField('Título','pages.el-foro.hero.title',foro.hero.title,{textarea:true})}${inputField('Descripción','pages.el-foro.hero.body',foro.hero.body,{textarea:true})}</div></article>`;
    html+=`<article class="page-editor-card"><h3>El Foro · Quiénes somos</h3><div class="form-stack">${inputField('Título','pages.el-foro.intro.title',foro.intro.title)}${inputField('Texto','pages.el-foro.intro.body',foro.intro.body,{textarea:true})}</div></article>`;
    html+=`<article class="page-editor-card"><h3>El Foro · Misión y visión</h3><div class="form-stack">${inputField('Título misión','pages.el-foro.mission.missionTitle',foro.mission.missionTitle)}${inputField('Misión','pages.el-foro.mission.missionBody',foro.mission.missionBody,{textarea:true})}${inputField('Título visión','pages.el-foro.mission.visionTitle',foro.mission.visionTitle)}${inputField('Visión','pages.el-foro.mission.visionBody',foro.mission.visionBody,{textarea:true})}</div></article>`;
    html+=`<article class="page-editor-card"><h3>El Foro · Objetivos</h3><div class="form-stack">${foro.objectives.map((x,i)=>inputField(`Objetivo ${i+1}`,`pages.el-foro.objectives.${i}`,x,{textarea:true})).join('')}</div></article>`;
    html+=`<article class="page-editor-card"><h3>El Foro · Metodología y Comisión</h3><div class="form-stack">${inputField('Título metodología','pages.el-foro.methodology.title',foro.methodology.title)}${inputField('Metodología','pages.el-foro.methodology.body',foro.methodology.body,{textarea:true})}${inputField('Título comisión','pages.el-foro.commission.title',foro.commission.title)}${inputField('Comisión','pages.el-foro.commission.body',foro.commission.body,{textarea:true})}</div></article>`;
    const sectionMeta=[['hero','Encabezado'],['quienes-somos','Quiénes somos'],['mision','Misión, visión y objetivos'],['metodologia','Metodología'],['comision','Comisión Promotora']];
    const sectionOrder=(foro.layoutOrder?.length?foro.layoutOrder:sectionMeta.map(x=>x[0]));
    html+=`<article class="page-editor-card"><h3>El Foro · Estructura de la página</h3><p>Ocultá bloques o cambiá el orden sin borrar el contenido. Se reflejará en la web al publicar.</p><div class="foro-page-order" id="foroPageOrder">${sectionOrder.map(k=>{const label=sectionMeta.find(x=>x[0]===k)?.[1]||k;return `<div class="foro-page-order-row" data-section-id="${k}" draggable="true"><span class="foro-order-handle">⠿</span><strong>${label}</strong><label><input type="checkbox" data-page-visibility="${k}" ${foro.hiddenSections?.includes(k)?'':'checked'}> Visible</label><button type="button" data-order-move="up">↑</button><button type="button" data-order-move="down">↓</button></div>`}).join('')}</div></article>`;
    const part=d.participa;
    html+=`<article class="page-editor-card"><h3>Participá · Encabezado</h3><div class="form-stack">${inputField('Antetítulo','pages.participa.hero.eyebrow',part.hero.eyebrow)}${inputField('Título','pages.participa.hero.title',part.hero.title,{textarea:true})}${inputField('Descripción','pages.participa.hero.body',part.hero.body,{textarea:true})}</div></article>`;
    html+=`<article class="page-editor-card"><h3>Participá · Opciones</h3><div class="form-stack">${part.options.map((x,i)=>`${inputField(`Opción ${i+1} · título`,`pages.participa.options.${i}.title`,x.title)}${inputField(`Opción ${i+1} · descripción`,`pages.participa.options.${i}.body`,x.body,{textarea:true})}`).join('')}</div></article>`;
    const editablePages=[['el-foro','El Foro'],['participa','Participá'],['conocimiento','Conocimiento'],['actividades','Actividades'],['voces','Voces'],['newsletter','Newsletter']];
    editablePages.forEach(([key,title])=>{html+=`<article class="page-editor-card"><h3>${title} · Bloques adicionales</h3><p>Creá secciones editoriales, títulos, texto, fotografías, entrevistas y videos. Podés reordenarlos dentro del editor.</p>${richEditorHtml(d[key]?.extraHtml||'')}</article>`});
    $('#pagesEditor').innerHTML=html;const reorder=$('#foroPageOrder');if(reorder){const persist=()=>{state.pages['el-foro'].layoutOrder=[...reorder.querySelectorAll('[data-section-id]')].map(el=>el.dataset.sectionId);state.pages['el-foro'].hiddenSections=[...reorder.querySelectorAll('[data-page-visibility]')].filter(el=>!el.checked).map(el=>el.dataset.pageVisibility);markDirty()};reorder.onchange=persist;reorder.onclick=e=>{const btn=e.target.closest('[data-order-move]');if(!btn)return;const row=btn.closest('[data-section-id]');if(btn.dataset.orderMove==='up'&&row.previousElementSibling)row.previousElementSibling.before(row);if(btn.dataset.orderMove==='down'&&row.nextElementSibling)row.nextElementSibling.after(row);persist()};let drag=null;reorder.addEventListener('dragstart',e=>{drag=e.target.closest('[data-section-id]')});reorder.addEventListener('dragover',e=>e.preventDefault());reorder.addEventListener('drop',e=>{e.preventDefault();const to=e.target.closest('[data-section-id]');if(drag&&to&&drag!==to){to.before(drag);persist()}})};$$('[data-rich-editor]',$('#pagesEditor')).forEach((ed,i)=>{wireRich(ed.closest('.page-editor-card'));ed.addEventListener('input',()=>{const key=editablePages[i][0];state.pages[key]??={};state.pages[key].extraHtml=ed.innerHTML;markDirty()})});$$('[data-edit-path]',$('#pagesEditor')).forEach(el=>el.oninput=()=>{setPath(state,el.dataset.editPath,el.value);markDirty()});
  }

  function renderDesign(){
    const labels={background:'Fondo',paper:'Superficie',ink:'Títulos',text:'Texto',muted:'Texto secundario',line:'Bordes',navy:'Azul institucional',navyDeep:'Azul profundo',cyan:'Celeste acento',cyanSoft:'Celeste suave',warm:'Gris cálido'};
    $('#themeColors').innerHTML=Object.entries(labels).map(([k,l])=>`<label class="field"><span>${l}</span><div class="color-field"><input type="color" data-theme="${k}" value="${esc(state.theme[k])}"><input data-theme-text="${k}" value="${esc(state.theme[k])}"></div></label>`).join('');
    const google = ["Instrument Serif","DM Sans","Inter","Manrope","Montserrat","Poppins","Lato","Roboto","Open Sans","Source Sans 3","Work Sans","Nunito Sans","Raleway","Outfit","Plus Jakarta Sans","Public Sans","IBM Plex Sans","Libre Franklin","Archivo","Urbanist","Mulish","Playfair Display","Cormorant Garamond","Libre Baskerville","Merriweather","Lora","EB Garamond","Source Serif 4","Spectral","Crimson Text","Newsreader","Bodoni Moda","DM Serif Display","Fraunces","Prata","Alegreya","Noto Serif","IBM Plex Serif"];
    const serif = new Set(["Instrument Serif","Playfair Display","Cormorant Garamond","Libre Baskerville","Merriweather","Lora","EB Garamond","Source Serif 4","Spectral","Crimson Text","Newsreader","Bodoni Moda","DM Serif Display","Fraunces","Prata","Alegreya","Noto Serif","IBM Plex Serif"]);
    const roles=[['headingFont','Títulos H1 / H2'],['subtitleFont','Subtítulos y bajadas'],['bodyFont','Textos generales'],['articleFont','Cuerpo editorial de artículos'],['navigationFont','Menú y navegación'],['buttonFont','Botones y acciones'],['eyebrowFont','Antetítulos y categorías']];
    const own=state.theme.customFonts||[];
    const all=[...google.map(name=>({name,group:serif.has(name)?'SERIF · Google Fonts':'SANS SERIF · Google Fonts'})),...own.map(x=>({name:x.name,group:'SUBIDAS · Personalizadas'}))];
    const selectFont=(key,label)=>{const selected=state.theme[key]||state.theme.bodyFont||'DM Sans';const groups=[...new Set(all.map(x=>x.group))];return `<label class="field"><span>${label}</span><select data-font-role="${key}">${groups.map(g=>`<optgroup label="${g}">${all.filter(x=>x.group===g).map(x=>`<option value="${esc(x.name)}" ${selected===x.name?'selected':''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}</select></label>`};
    $('#themeFonts').innerHTML=`<p style="font-size:12px;line-height:1.6;color:#47647b">Elegí cada familia por separado. Google Fonts se carga automáticamente en el sitio público. Las fuentes propias se alojan en Supabase Storage.</p>${roles.map(([key,label])=>selectFont(key,label)).join('')}<div class="font-preview-grid" id="fontPreviewGrid"></div><div class="editor-card"><h3>Mis tipografías</h3><p>Subí WOFF2, WOFF, TTF u OTF. Recomendamos WOFF2 para una carga más rápida.</p><label class="field"><span>Nombre de familia</span><input id="customFontName" placeholder="Ej.: Mi Tipografía Institucional"></label><label class="field"><span>Archivo de fuente</span><input id="customFontFile" type="file" accept=".woff2,.woff,.ttf,.otf"></label><button class="btn primary" type="button" id="uploadFont">Subir tipografía</button><div id="customFontList">${own.map((x,i)=>`<p style="display:flex;justify-content:space-between;gap:12px"><span>${esc(x.name)}</span><button class="btn ghost" type="button" data-remove-font="${i}">Quitar</button></p>`).join('')}</div></div>`;
    const renderSamples=()=>{const wrap=$('#fontPreviewGrid');if(!wrap)return;wrap.innerHTML=roles.map(([k,label])=>`<div class="font-preview"><small>${label}</small><div style="font-family:${JSON.stringify(state.theme[k]||'DM Sans')},sans-serif">Economía del visitante</div><span>${esc(state.theme[k]||'DM Sans')}</span></div>`).join('')};
    renderSamples();
    $$('[data-font-role]',$('#themeFonts')).forEach(el=>el.onchange=()=>{state.theme[el.dataset.fontRole]=el.value;markDirty();renderSamples()});
    $$('[data-remove-font]',$('#themeFonts')).forEach(btn=>btn.onclick=()=>{const idx=Number(btn.dataset.removeFont);if(!confirm('¿Quitar esta familia de las opciones?'))return;state.theme.customFonts.splice(idx,1);markDirty();renderDesign()});
    $('#uploadFont').onclick=async()=>{const file=$('#customFontFile').files?.[0],name=$('#customFontName').value.trim();const ext=file?.name.split('.').pop().toLowerCase();if(!file||!name){toast('Indicá un nombre y seleccioná un archivo');return}if(!['woff2','woff','ttf','otf'].includes(ext)||file.size>8*1024*1024){toast('Solo fuentes WOFF2, WOFF, TTF u OTF, hasta 8 MB');return}if(!/^[\p{L}\p{N} _-]{2,70}$/u.test(name)){toast('El nombre debe contener solo letras, números, espacios o guiones');return}try{const item=await db.uploadMedia(file);state.theme.customFonts=state.theme.customFonts||[];state.theme.customFonts.push({name,url:item.url,format:ext});markDirty();renderDesign();toast('Tipografía cargada. Publicá el sitio para aplicar los cambios.')}catch(e){toast('Error al subir fuente: '+e.message)}};
    $('#themeLayout').innerHTML=`${inputField('Ancho máximo','theme.maxWidth',state.theme.maxWidth,{type:'number'})}${inputField('Radio de bordes','theme.radius',state.theme.radius,{type:'number'})}${inputField('Espaciado de secciones','theme.sectionSpace',state.theme.sectionSpace,{type:'number'})}`;
    $$('[data-theme]').forEach(c=>c.oninput=()=>{state.theme[c.dataset.theme]=c.value;$(`[data-theme-text="${c.dataset.theme}"]`).value=c.value;markDirty()});$$('[data-theme-text]').forEach(t=>t.oninput=()=>{state.theme[t.dataset.themeText]=t.value;$(`[data-theme="${t.dataset.themeText}"]`).value=t.value;markDirty()});$$('[data-edit-path]',$('[data-view-panel="design"]')).forEach(el=>el.oninput=()=>{setPath(state,el.dataset.editPath,el.type==='number'?Number(el.value):el.value);markDirty()});
  }

  const navigationDestinations=[
    ['index.html','Inicio'],['el-foro.html','El Foro'],['el-foro.html#quienes-somos','Quiénes somos'],
    ['el-foro.html#mision','Misión y visión'],['conocimiento.html','Conocimiento'],
    ['conocimiento.html?tipo=article','Artículos'],['conocimiento.html?tipo=analysis','Análisis'],
    ['conocimiento.html?tipo=research','Investigaciones'],['conocimiento.html?tipo=report','Informes'],
    ['biblioteca-recursos.html','Biblioteca y recursos'],['actividades.html','Actividades'],
    ['voces.html','Voces'],['voces.html?tipo=interview','Entrevistas'],
    ['participa.html','Participá'],['newsletter.html','Newsletter'],['buscar.html','Buscar']];
  function validNavHref(href){
    const v=String(href||'').trim();
    if(!v||v==='#'||/^javascript:/i.test(v))return false;
    if(/^(https:\/\/|mailto:)/i.test(v))return true;
    const local=v.split(/[?#]/)[0];
    return navigationDestinations.some(([h])=>h.split(/[?#]/)[0]===local);
  }
  function renderNavigation(){
    const options=navigationDestinations.map(([href,label])=>`<option value="${esc(href)}">${esc(label)}</option>`).join('');
    const navs=state.navigation||[];
    $('#navList').innerHTML=`<div class="navigation-guidance">Elegí un destino existente para cada enlace. Cambiar una etiqueta no cambia la página de destino. Los enlaces que quites del menú siguen disponibles desde las demás secciones y el pie de página. <a href="biblioteca-recursos.html" target="_blank" rel="noopener">Ver Biblioteca y recursos ↗</a></div>`+
    navs.map((n,i)=>`<article class="repeater-card nav-editor-card" data-nav="${i}"><div class="repeater-head"><strong>${esc(n.label||`Enlace ${i+1}`)}</strong><div><button type="button" class="icon-btn" data-na="up" title="Subir">↑</button><button type="button" class="icon-btn" data-na="down" title="Bajar">↓</button><button type="button" class="icon-btn danger" data-na="delete" title="Quitar del menú">×</button></div></div>
      <div class="repeater-fields"><label class="field"><span>Nombre visible</span><input data-np="label" value="${esc(n.label||'')}"></label><label class="field"><span>Destino</span><input data-np="href" list="navDestinationList" value="${esc(n.href||'')}"></label><label class="field check-field"><input type="checkbox" data-np="featured" ${n.featured?'checked':''}><span>Destacar en el menú</span></label></div>
      <div class="nav-link-warning" ${validNavHref(n.href)?'hidden':''}>Revisá este enlace. Seleccioná una página existente del listado.</div>
      <div class="nav-children-head"><strong>Submenú (${(n.children||[]).length})</strong><button type="button" class="btn ghost" data-na="child-add">+ Agregar subsección</button></div>
      <div class="nav-children">${(n.children||[]).map((c,j)=>`<div class="nav-child" data-child="${j}"><input aria-label="Nombre de subsección" data-cp="label" value="${esc(c.label||'')}" placeholder="Nombre"><input aria-label="Destino de subsección" data-cp="href" list="navDestinationList" value="${esc(c.href||'')}" placeholder="Página de destino"><button type="button" data-ca="up" title="Subir">↑</button><button type="button" data-ca="down" title="Bajar">↓</button><button type="button" data-ca="delete" title="Eliminar">×</button><span class="nav-child-warning" ${validNavHref(c.href)?'hidden':''}>Destino no válido</span></div>`).join('')}</div>
    </article>`).join('')+`<datalist id="navDestinationList">${options}</datalist>`;
    $$('.nav-editor-card').forEach(card=>{const i=Number(card.dataset.nav),item=navs[i];
      $$('[data-np]',card).forEach(el=>{el.oninput=()=>{item[el.dataset.np]=el.type==='checkbox'?el.checked:el.value;card.querySelector('.nav-link-warning').hidden=validNavHref(item.href);markDirty()}});
      $$('[data-na]',card).forEach(b=>b.onclick=()=>{const a=b.dataset.na;if(a==='child-add'){item.children=item.children||[];item.children.push({label:'Nueva subsección',href:'biblioteca-recursos.html'})}else if(a==='up'&&i>0)[navs[i-1],navs[i]]=[navs[i],navs[i-1]];else if(a==='down'&&i<navs.length-1)[navs[i+1],navs[i]]=[navs[i],navs[i+1]];else if(a==='delete'&&confirm('¿Quitar este enlace del menú? La página no se elimina.'))navs.splice(i,1);markDirty();renderNavigation()});
      $$('.nav-child',card).forEach(child=>{const j=Number(child.dataset.child),c=item.children[j];$$('[data-cp]',child).forEach(el=>el.oninput=()=>{c[el.dataset.cp]=el.value;child.querySelector('.nav-child-warning').hidden=validNavHref(c.href);markDirty()});$$('[data-ca]',child).forEach(b=>b.onclick=()=>{const a=b.dataset.ca,arr=item.children;if(a==='up'&&j>0)[arr[j-1],arr[j]]=[arr[j],arr[j-1]];if(a==='down'&&j<arr.length-1)[arr[j+1],arr[j]]=[arr[j],arr[j+1]];if(a==='delete')arr.splice(j,1);markDirty();renderNavigation()})})
    });
  }

  function renderSettings(){
    const s=state.site;
    $('#siteIdentity').innerHTML=`${inputField('Nombre','site.name',s.name)}${inputField('Nombre corto','site.shortName',s.shortName)}${inputField('Frase institucional','site.phrase',s.phrase)}${inputField('Email de contacto','site.contactEmail',s.contactEmail,{type:'email'})}${inputField('Logo','site.logo',s.logo)}${inputField('Isotipo','site.icon',s.icon)}${inputField('Isotipo del footer','site.footerIcon',s.footerIcon||s.icon)}<datalist id="siteMediaList">${mediaAssetOptions()}</datalist>${inputField('Nota footer','site.footerNote',s.footerNote,{textarea:true})}`;
    $('#siteSeo').innerHTML=`${inputField('Título SEO','site.seo.title',s.seo.title)}${inputField('Descripción SEO','site.seo.description',s.seo.description,{textarea:true})}${inputField('Imagen social','site.seo.image',s.seo.image)}`;
    $('#siteSocial').innerHTML=`${inputField('LinkedIn','site.social.linkedin',s.social.linkedin)}${inputField('Instagram','site.social.instagram',s.social.instagram)}${inputField('YouTube','site.social.youtube',s.social.youtube)}${inputField('Google Analytics 4 · Measurement ID','site.analytics.gtagId',s.analytics?.gtagId||'')}`;
    $$('[data-edit-path]',$('[data-view-panel="settings"]')).forEach(el=>{if(['site.logo','site.icon','site.footerIcon','site.seo.image'].includes(el.dataset.editPath))el.setAttribute('list','siteMediaList');el.oninput=()=>{setPath(state,el.dataset.editPath,el.value);markDirty()}});
  }

  async function loadPosts(){try{posts=await db.listPosts({admin:true,limit:500})||[];renderPosts();renderDashboard();pushPreview()}catch(e){toast('Error cargando publicaciones: '+e.message)}}
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

  function renderResourcesAdmin(){
    const list=posts.filter(p=>p.type==='resource');
    const box=$('#resourceAdminList');if(!box)return;
    box.innerHTML=list.map(p=>`<div class="resource-admin-item"><div><strong>${esc(p.title)}</strong><small>${esc(effectiveStatus(p))} · ${esc(p.category||'Recurso')}</small></div><button type="button" class="btn ghost" data-edit-resource="${esc(p.id)}">Editar</button></div>`).join('')||'<p>Todavía no hay recursos. Creá uno para compartir documentos, enlaces o videos.</p>';
    $$('[data-edit-resource]',box).forEach(b=>b.onclick=()=>openPost(posts.find(p=>p.id===b.dataset.editResource)));
  }
  function mediaDatalist(){return `<datalist id="mediaUrlList">${mediaAssets.filter(a=>(a.mime_type||'').startsWith('image/')).map(a=>`<option value="${esc(a.url)}">${esc(a.name)}</option>`).join('')}</datalist>`}
  function richEditorHtml(content=''){
    return `<div class="rich-toolbar" data-rich-toolbar><button type="button" data-cmd="bold"><b>B</b></button><button type="button" data-cmd="italic"><i>I</i></button><button type="button" data-cmd="formatBlock" data-val="h2">H2</button><button type="button" data-cmd="formatBlock" data-val="h3">H3</button><button type="button" data-cmd="formatBlock" data-val="p">P</button><button type="button" data-cmd="insertUnorderedList">• Lista</button><button type="button" data-cmd="insertOrderedList">1. Lista</button><button type="button" data-cmd="formatBlock" data-val="blockquote">❝</button><button type="button" data-cmd="createLink">Link</button><button type="button" data-cmd="removeFormat">Limpiar</button></div><div class="block-add-bar"><span>Agregar bloque</span><button type="button" data-add-rich="h2">Título</button><button type="button" data-add-rich="h3">Subtítulo</button><button type="button" data-add-rich="p">Párrafo</button><button type="button" data-add-rich="image">Imagen</button><button type="button" data-add-rich="youtube">YouTube</button><button type="button" data-add-rich="video">Video propio</button><button type="button" data-add-rich="document">PDF / Word / Excel</button><button type="button" data-add-rich="map">Mapa</button><button type="button" data-add-rich="table">Tabla</button><button type="button" data-add-rich="callout">Cuadro destacado</button><button type="button" data-add-rich="blockquote">Cita</button><button type="button" data-add-rich="hr">Separador</button><button type="button" data-add-rich="ul">Lista</button></div><div class="foro-layout-help"><strong>Composición de imágenes</strong><span>Seleccioná la imagen en el cuerpo y elegí ubicación y tamaño en la barra. Para un carrusel inferior, elegí «Carrusel inferior» en dos o más imágenes consecutivas. Podés combinar una imagen lateral con otras abajo.</span></div><div class="rich-editor" contenteditable="true" data-rich-editor aria-label="Editor de bloques">${content||''}</div>`;
  }
  function richYouTubeId(value=''){
    const raw=String(value||'').trim();
    if(/^[\w-]{11}$/.test(raw))return raw;
    try {
      const u=new URL(raw.startsWith('//')?'https:'+raw:raw);
      const host=u.hostname.toLowerCase().replace(/^www\./,'');
      let id='';
      if(host==='youtu.be')id=u.pathname.split('/').filter(Boolean)[0]||'';
      else if(host==='youtube.com'||host==='m.youtube.com'||host==='music.youtube.com'||host==='youtube-nocookie.com'){
        id=u.searchParams.get('v')||'';
        if(!id){const bits=u.pathname.split('/').filter(Boolean);if(['embed','shorts','live','v'].includes(bits[0]))id=bits[1]||'';}
      }
      return /^[\w-]{11}$/.test(id)?id:'';
    }catch{return ''}
  }
  // Editor de bloques: estructura conservada como HTML para compatibilidad con el CMS anterior.
  function enhanceBlockEditor(root,ed) {
    const shell=ed.parentElement;
    shell.classList.add('foro-block-shell');
    const familyNames=[...new Set([state.theme?.headingFont,state.theme?.subtitleFont,state.theme?.bodyFont,'Instrument Serif','DM Sans','Inter','Lora','Playfair Display','Cormorant Garamond','Libre Baskerville','Montserrat','Manrope','Georgia','Arial'].filter(Boolean))];
    const bar=document.createElement('div');bar.className='foro-context-bar';
    bar.innerHTML=`<span class="foro-block-label">Seleccioná un bloque</span><select data-block-font aria-label="Tipografía"><option value="">Fuente global</option>${familyNames.map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join('')}</select><select data-block-size aria-label="Tamaño"><option value="">Tamaño</option>${[14,16,18,20,24,28,32,40,48,56,64,80].map(v=>`<option value="${v}px">${v}px</option>`).join('')}</select><select data-block-leading aria-label="Interlineado">${['1','1.2','1.4','1.6','1.8','2'].map(v=>`<option value="${v}">${v} interlínea</option>`).join('')}</select><button data-block-action="bold" title="Negrita"><b>B</b></button><button data-block-action="italic" title="Cursiva"><i>I</i></button><button data-block-action="left" title="Izquierda">⇤</button><button data-block-action="center" title="Centrar">≡</button><button data-block-action="right" title="Derecha">⇥</button><button data-block-action="undo" title="Deshacer (Ctrl+Z)">↶</button><button data-block-action="redo" title="Rehacer (Ctrl+Y / Ctrl+Shift+Z)">↷</button><select data-image-placement title="Ubicación de imagen"><option value="">Posición de imagen</option><option value="foro-image-right">Al lado del texto · derecha</option><option value="foro-image-excerpt-right">Junto al extracto · derecha</option><option value="foro-image-left">Al lado del texto · izquierda</option><option value="foro-image-below">Debajo · independiente</option><option value="foro-gallery-item">Carrusel inferior · agrupar</option></select><select data-image-size title="Ancho de imagen"><option value="">Imagen: tamaño</option><option value="foro-media-small">Compacta</option><option value="foro-media-medium">Mediana</option><option value="foro-media-wide">Ancho completo</option></select><label class="foro-scale-control">Escala <input type="number" min="0" max="100" step="1" value="100" data-image-scale aria-label="Escala de imagen en porcentaje">%</label><select data-image-mobile title="Orden en celular"><option value="text-first">Móvil: texto primero</option><option value="image-first">Móvil: imagen primero</option></select><button data-block-action="document-title" title="Mostrar título del documento">Título documento</button><button data-block-action="document-caption" title="Mostrar descripción del documento">Descripción</button><button data-block-action="move-up" title="Mover bloque hacia arriba">↑</button><button data-block-action="move-down" title="Mover bloque hacia abajo">↓</button><button data-block-action="duplicate" title="Duplicar">⧉</button><button data-block-action="delete" title="Eliminar">×</button>`;
    bar.insertAdjacentHTML('beforeend','<select data-block-columns title="Distribución de columnas"><option value="">Columnas</option><option value="50/50">2 columnas · mitad</option><option value="65/35">2 columnas · 65/35</option><option value="35/65">2 columnas · 35/65</option><option value="100">1 columna</option></select><span class="foro-select-count" data-select-count>0 seleccionados</span><button type="button" data-bulk-action="up" title="Subir selección">↑ Grupo</button><button type="button" data-bulk-action="down" title="Bajar selección">↓ Grupo</button><button type="button" data-bulk-action="delete" title="Eliminar selección">Eliminar selección</button>');
    shell.insertBefore(bar,ed);
    bar.querySelector('[data-block-columns]').addEventListener('change',event=>{
      const container=ed.querySelector('.foro-template-columns');
      if(!container){toast('Para ajustar columnas, aplicá primero la plantilla «Dos columnas».');return;}
      const mode=event.target.value;
      container.dataset.columns=mode;
      container.style.gridTemplateColumns=mode==='65/35'?'minmax(0, 1.86fr) minmax(0, 1fr)':mode==='35/65'?'minmax(0, 1fr) minmax(0, 1.86fr)':mode==='100'?'minmax(0, 1fr)':'repeat(2, minmax(0, 1fr))';
      ed.dispatchEvent(new Event('input',{bubbles:true}));
    });

    let active=null;
    const selected=new Set();
    const syncSelection=()=>{selected.forEach(el=>{if(!ed.contains(el))selected.delete(el)});ed.querySelectorAll('.foro-edit-block').forEach(el=>el.classList.toggle('foro-multi-selected',selected.has(el)));const count=bar.querySelector('[data-select-count]');if(count)count.textContent=selected.size+' seleccionados'};
    // Casillas en cada bloque: selección múltiple sin perder la edición del texto.
    const addChecks=()=>{ed.querySelectorAll('.foro-edit-block').forEach(el=>{if(el.querySelector(':scope > .foro-block-check'))return;const check=document.createElement('input');check.type='checkbox';check.className='foro-block-check';check.setAttribute('aria-label','Seleccionar bloque');check.contentEditable='false';check.draggable=false;check.checked=selected.has(el);check.addEventListener('mousedown',e=>e.stopPropagation());check.addEventListener('click',e=>e.stopPropagation());check.addEventListener('change',()=>{check.checked?selected.add(el):selected.delete(el);syncSelection()});el.prepend(check)})};
    bar.querySelectorAll('[data-bulk-action]').forEach(btn=>btn.onclick=()=>{const ordered=[...ed.children].filter(el=>selected.has(el));if(!ordered.length)return;const action=btn.dataset.bulkAction;
      if(action==='delete'){if(!confirm('¿Eliminar '+ordered.length+' bloques seleccionados?'))return;ordered.forEach(el=>el.remove());selected.clear()}
      else if(action==='up'){const prev=ordered[0].previousElementSibling;if(prev&&!selected.has(prev))prev.before(...ordered)}
      else if(action==='down'){const next=ordered.at(-1).nextElementSibling;if(next&&!selected.has(next))next.after(...ordered)}
      normalize();dispatch();syncSelection()});

    const snapshots=[ed.innerHTML], future=[];
    const remember=()=>{const html=ed.innerHTML;if(snapshots[snapshots.length-1]!==html){snapshots.push(html);if(snapshots.length>80)snapshots.shift();future.length=0}};
    const restore=(html)=>{ed.innerHTML=html;active=null;normalize();ed.dispatchEvent(new Event('input',{bubbles:true}));ed.focus()};
    const undoBlock=()=>{if(snapshots.length<2)return false;future.push(snapshots.pop());restore(snapshots[snapshots.length-1]);return true};
    const redoBlock=()=>{if(!future.length)return false;const html=future.pop();snapshots.push(html);restore(html);return true};
    const dispatch=()=>{remember();ed.dispatchEvent(new Event('input',{bubbles:true}))};
    const normalize=()=>{
      [...ed.childNodes].forEach(node=>{
        if(node.nodeType===3 && node.textContent.trim()){const q=document.createElement('p');q.textContent=node.textContent;node.replaceWith(q)}
        else if(node.nodeType===1 && !['P','H2','H3','H4','UL','OL','BLOCKQUOTE','HR','FIGURE','DIV','TABLE','ASIDE'].includes(node.tagName)){
          const q=document.createElement('p');q.innerHTML=node.outerHTML;node.replaceWith(q);
        }
      });
      [...ed.children].forEach(el=>{el.draggable=true;el.classList.add('foro-edit-block');if(!el.hasAttribute('tabindex'))el.tabIndex=0});
      addChecks();
    };
    normalize();
    ed.addEventListener('click',e=>{const block=e.target.closest('.foro-edit-block');if(block && ed.contains(block)){active?.classList.remove('is-selected');active=block;active.classList.add('is-selected');bar.querySelector('.foro-block-label').textContent=block.tagName==='FIGURE'?'Medio':block.tagName==='P'?'Párrafo':block.tagName==='H2'?'Título':block.tagName==='H3'?'Subtítulo':block.tagName;bar.querySelector('[data-block-leading]').value=block.style.lineHeight||'1.6';}});
    ed.addEventListener('focusin',e=>{const block=e.target.closest('.foro-edit-block');if(block){active?.classList.remove('is-selected');active=block;active.classList.add('is-selected')}});
    ed.addEventListener('dragstart',e=>{const block=e.target.closest('.foro-edit-block');if(!block)return;active=block;block.classList.add('is-dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','reorder')});
    let dragScrollTimer=null,dragScrollSpeed=0;
    const scrollContainer=()=>ed.closest('.dialog-body')||ed;
    function stopDragScroll(){if(dragScrollTimer){clearInterval(dragScrollTimer);dragScrollTimer=null;}dragScrollSpeed=0;}
    ed.addEventListener('dragover',e=>{
      e.preventDefault();const sc=scrollContainer(),rect=sc.getBoundingClientRect(),edge=100;
      dragScrollSpeed=e.clientY<rect.top+edge?-Math.max(8,(rect.top+edge-e.clientY)/3):e.clientY>rect.bottom-edge?Math.max(8,(e.clientY-(rect.bottom-edge))/3):0;
      if(dragScrollSpeed&&!dragScrollTimer)dragScrollTimer=setInterval(()=>{sc.scrollTop+=dragScrollSpeed},30);
      if(!dragScrollSpeed)stopDragScroll();
      const target=e.target.closest('.foro-edit-block');if(target&&target!==active){const midpoint=target.getBoundingClientRect().top+target.getBoundingClientRect().height/2;ed.insertBefore(active,e.clientY<midpoint?target:target.nextSibling)}
    });
    ed.addEventListener('drop',e=>{stopDragScroll();e.preventDefault();active?.classList.remove('is-dragging');normalize();dispatch()});
    ed.addEventListener('dragend',()=>{stopDragScroll();active?.classList.remove('is-dragging');dispatch()});
    ed.addEventListener('input',normalize);
    ed.addEventListener('focusout',()=>{queueMicrotask(()=>{if(!ed.contains(document.activeElement))remember()})});
    ed.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey)return;const key=e.key.toLowerCase();if(key==='z'&&!e.shiftKey){if(snapshots.length>1){e.preventDefault();undoBlock()}}else if(key==='y'||(key==='z'&&e.shiftKey)){if(future.length){e.preventDefault();redoBlock()}}});
    ed.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.shiftKey)return;const block=window.getSelection()?.anchorNode?.parentElement?.closest('.foro-edit-block');if(block&&['H2','H3','BLOCKQUOTE'].includes(block.tagName)){e.preventDefault();const para=document.createElement('p');para.append(document.createElement('br'));block.after(para);normalize();const range=document.createRange();range.selectNodeContents(para);range.collapse(true);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);dispatch()}});

    const imagePlacement=bar.querySelector('[data-image-placement]');
    const positions=['foro-image-right','foro-image-left','foro-image-below','foro-gallery-item'];
    imagePlacement.onchange=()=>{if(!active||!active.matches('figure')||!active.querySelector('img')){toast('Seleccioná primero una imagen del artículo');return;} active.classList.remove(...positions);if(imagePlacement.value)active.classList.add(imagePlacement.value);dispatch();};
    const originalClickSelection=()=>{if(active?.matches('figure')&&active.querySelector('img')){const found=positions.find(x=>active.classList.contains(x))||'';imagePlacement.value=found;}else imagePlacement.value='';};
    ed.addEventListener('click',()=>setTimeout(originalClickSelection,0));
    const scaleControl=bar.querySelector('[data-image-scale]');
    const mobileControl=bar.querySelector('[data-image-mobile]');
    function syncMediaControls(){
      const media=active?.matches('figure')&&active.querySelector('img');
      scaleControl.disabled=!media;mobileControl.disabled=!media;
      if(media){scaleControl.value=active.dataset.imageScale||'100';mobileControl.value=active.dataset.mobileOrder||'text-first'}
      const font=bar.querySelector('[data-block-font]'),size=bar.querySelector('[data-block-size]');
      if(active){font.value=[...font.options].some(x=>x.value===active.style.fontFamily)?active.style.fontFamily:'';size.value=active.style.fontSize||''}
    }
    ed.addEventListener('click',()=>setTimeout(syncMediaControls,0));
    scaleControl.addEventListener('input',()=>{if(!active?.matches('figure')||!active.querySelector('img'))return;active.dataset.imageScale=scaleControl.value;active.style.setProperty('--image-scale',scaleControl.value+'%');dispatch()});
    mobileControl.addEventListener('change',()=>{if(!active?.matches('figure'))return;active.dataset.mobileOrder=mobileControl.value;dispatch()});
    // No disparar submit al presionar herramientas dentro del formulario de publicación.
    bar.querySelectorAll('button').forEach(button=>button.type='button');
    const imageSize=bar.querySelector('[data-image-size]');
    imageSize.onchange=()=>{if(!active)return;active.classList.remove('foro-media-small','foro-media-medium','foro-media-wide');if(imageSize.value)active.classList.add(imageSize.value);dispatch()};
    bar.querySelectorAll('select:not([data-image-size]):not([data-image-placement])').forEach(select=>select.onchange=()=>{if(!active)return;const attr=select.hasAttribute('data-block-font')?'fontFamily':select.hasAttribute('data-block-size')?'fontSize':'lineHeight';(selected.size?[...selected]:[active]).forEach(block=>{block.style[attr]=select.value});dispatch();active.focus()});
    bar.querySelectorAll('[data-block-action]').forEach(btn=>btn.onclick=()=>{const op=btn.dataset.blockAction;if(!active&&!['undo','redo'].includes(op))return;if(op==='undo'){undoBlock();return}if(op==='redo'){redoBlock();return}remember();if(['left','center','right'].includes(op))active.style.textAlign=op;else if(op==='bold')active.style.fontWeight=active.style.fontWeight==='bold'?'normal':'bold';else if(op==='italic')active.style.fontStyle=active.style.fontStyle==='italic'?'normal':'italic';else if(op==='document-title' && active.matches('figure.foro-document')){let title=active.querySelector('.foro-document-heading strong');if(title){title.closest('.foro-document-heading').remove()}else{const value=window.prompt('Título público del documento (opcional):','');if(value?.trim()){const el=document.createElement('div');el.className='foro-document-heading';const strong=document.createElement('strong');strong.contentEditable='true';strong.textContent=value.trim();el.append(strong);active.prepend(el)}}}else if(op==='document-caption' && active.matches('figure.foro-document')){let caption=active.querySelector('figcaption');if(caption)caption.remove();else{caption=document.createElement('figcaption');caption.contentEditable='true';caption.textContent='Escribí una descripción…';active.append(caption)}}else if(op==='move-up'){const prev=active.previousElementSibling;if(prev){prev.before(active);active.scrollIntoView({block:'nearest'});}}else if(op==='move-down'){const next=active.nextElementSibling;if(next){next.after(active);active.scrollIntoView({block:'nearest'});}}else if(op==='duplicate'){const node=active.cloneNode(true);active.after(node);active=node;normalize()}else if(op==='delete'){const next=active.nextElementSibling||active.previousElementSibling;active.remove();active=next}dispatch()});
    // Block inserts after the selected block instead of at the end.
    ed.foroAddBlock=(el)=>{remember();if(active&&ed.contains(active))active.after(el);else ed.append(el);normalize();active?.classList.remove('is-selected');active=el;active.classList.add('is-selected');dispatch();el.scrollIntoView({block:'nearest',behavior:'smooth'})};
    return ed;
  }

  const isOfficeOrPdf=(name='')=>/\.(pdf|docx?|xlsx?|pptx?|odt|ods|csv)$/i.test(String(name));
  // Selector integrado: nunca interrumpe la edición con window.prompt.
  function chooseRichMedia(kind,onChoose){
    {const prev=document.getElementById('foro-media-picker');if(prev?.open)prev.close();prev?.remove();}
    const modal=document.createElement('dialog');modal.id='foro-media-picker';modal.className='foro-media-picker-overlay foro-nested-dialog';
    modal.innerHTML=`<div class="foro-media-picker-dialog" role="dialog" aria-modal="true" aria-label="Seleccionar medio"><header><div><small>BIBLIOTECA MULTIMEDIA</small><h2>${kind==='youtube'?'Insertar video de YouTube':kind==='video'?'Seleccionar video':kind==='document'?'Seleccionar documento':'Seleccionar imagen'}</h2></div><button type="button" data-close aria-label="Cerrar">✕</button></header><div class="foro-media-picker-body"><label>URL de ${kind==='youtube'?'YouTube':kind==='document'?'documento':'imagen o video'}<input data-url type="url" placeholder="https://..." autocomplete="off"></label><label class="foro-picker-upload">O subir desde tu computadora <input type="file" data-local-file accept="${kind==='image'?'image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml':kind==='video'?'video/mp4,video/webm,video/ogg,video/quicktime':'.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.csv'}" /></label><div data-preview class="foro-picker-preview">Pegá un enlace o seleccioná un archivo para ver una vista previa.</div><div class="foro-picker-tools"><strong>Archivos de tu biblioteca</strong><input type="search" data-filter placeholder="Buscar por nombre…"></div><div data-grid class="foro-picker-grid"></div></div><footer><button type="button" data-close>Cancelar</button><button type="button" data-insert disabled>Insertar medio</button></footer></div>`;
    document.body.append(modal);modal.showModal();
    const input=modal.querySelector('[data-url]'),preview=modal.querySelector('[data-preview]'),grid=modal.querySelector('[data-grid]'),insert=modal.querySelector('[data-insert]');
    const close=()=>{if(modal.open)modal.close();modal.remove()};modal.addEventListener('close',()=>modal.remove());modal.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
    const renderPreview=()=>{const raw=input.value.trim();preview.replaceChildren();insert.disabled=true;
      if(!raw){preview.textContent='Seleccioná un archivo o pegá una URL.';return}
      let node;
      if(kind==='youtube') {const id=richYouTubeId(raw);if(!id){preview.textContent='El enlace no es válido.';return}node=document.createElement('iframe');node.src=`https://www.youtube-nocookie.com/embed/${id}?rel=0&controls=1`;node.title='Vista previa YouTube';node.allow='encrypted-media; picture-in-picture';node.allowFullscreen=true}
      else {try{const u=new URL(raw,location.href);if(!['http:','https:'].includes(u.protocol))throw Error('protocolo')}catch{preview.textContent='Ingresá una URL válida.';return}if(kind==='document'){const pdf=/\.pdf(?:[?#]|$)/i.test(raw);node=document.createElement('div');node.className='foro-document-preview';if(pdf){const iframe=document.createElement('iframe');iframe.src=raw;iframe.title='Vista previa PDF';node.append(iframe)}else{const note=document.createElement('p');note.textContent='Documento Word / Excel / PowerPoint: vista previa online disponible si el archivo está publicado y el servicio de Microsoft lo admite.';node.append(note);const iframe=document.createElement('iframe');iframe.src='https://view.officeapps.live.com/op/embed.aspx?src='+encodeURIComponent(raw);iframe.title='Vista previa Office';node.append(iframe)}}else{node=document.createElement(kind==='image'?'img':'video');node.src=raw;if(kind==='video'){node.controls=true;node.preload='metadata';node.playsInline=true}}}
      preview.append(node);insert.disabled=false;
    };
    input.addEventListener('input',renderPreview);
    insert.onclick=()=>{if(!insert.disabled){onChoose(input.value.trim());close()}};
    const draw=()=>{const filter=(modal.querySelector('[data-filter]').value||'').toLowerCase();const assets=mediaAssets.filter(a=>(kind==='image'?(a.mime_type||'').startsWith('image/'):kind==='document'?(isOfficeOrPdf(a.name)||/pdf|word|sheet|excel|powerpoint|csv/.test(a.mime_type||'')):(a.mime_type||'').startsWith('video/'))&&(!filter||(a.name||'').toLowerCase().includes(filter)));
      grid.replaceChildren();if(kind==='youtube'){grid.textContent='Los videos de YouTube se incorporan mediante el enlace y se previsualizan arriba.';return}
      if(!assets.length){grid.textContent='No hay archivos de este tipo en la biblioteca.';return}
      assets.forEach(a=>{const card=document.createElement('button');card.type='button';card.className='foro-picker-item';const media=document.createElement(kind==='document'?'span':kind==='image'?'img':'video');if(kind==='document'){media.textContent='▤ '+(a.name||'Documento').split('.').pop().toUpperCase();media.className='foro-file-thumb'}else{media.src=a.url;if(kind==='video')media.preload='metadata';}const label=document.createElement('span');label.textContent=a.name||'Archivo';card.append(media,label);card.onclick=()=>{grid.querySelectorAll('.selected').forEach(x=>x.classList.remove('selected'));card.classList.add('selected');input.value=a.url;renderPreview()};grid.append(card)});
    };modal.querySelector('[data-filter]').addEventListener('input',draw);draw();
    if(!mediaAssets.length&&db.configured){loadMedia().then(()=>{if(modal.isConnected)draw()}).catch(()=>{})}
    const local=modal.querySelector('[data-local-file]');if(kind==='youtube')local.closest('label').hidden=true;
    local?.addEventListener('change',async()=>{const file=local.files?.[0];if(!file)return;if(!(kind==='image'?file.type.startsWith('image/'):kind==='video'?file.type.startsWith('video/'):isOfficeOrPdf(file.name))||file.size>(kind==='video'?150:50)*1024*1024){toast('Formato inválido o archivo demasiado grande');return}preview.textContent='Subiendo '+file.name+'…';local.disabled=true;insert.disabled=true;try{const asset=await db.uploadMedia(file);mediaAssets.unshift(asset);input.value=asset.url;renderPreview();draw();toast('Archivo disponible en la biblioteca')}catch(e){preview.textContent='No se pudo subir: '+e.message}finally{local.disabled=false}});
    input.focus();
  }

  function openRichMap(onChoose){
    {const prev=document.getElementById('foro-map-picker');if(prev?.open)prev.close();prev?.remove();}const cover=document.createElement('dialog');cover.id='foro-map-picker';cover.className='foro-media-picker-overlay';cover.innerHTML='<div class="foro-media-picker-dialog" role="dialog" aria-modal="true"><header><div><small>INSERTAR MAPA</small><h2>Ubicación o dirección</h2></div><button type="button" data-close>✕</button></header><div class="foro-media-picker-body"><label>Dirección, lugar o coordenadas<input data-query placeholder="Ej.: Buenos Aires, Argentina"></label><div class="foro-picker-preview"><iframe data-map-preview title="Vista previa del mapa" loading="lazy"></iframe></div></div><footer><button type="button" data-close>Cancelar</button><button type="button" data-confirm>Insertar mapa</button></footer></div>';document.body.append(cover);cover.classList.add('foro-nested-dialog');cover.showModal();cover.addEventListener('close',()=>cover.remove());const input=cover.querySelector('[data-query]'),iframe=cover.querySelector('[data-map-preview]');input.addEventListener('input',()=>{iframe.src=input.value.trim()?'https://www.google.com/maps?q='+encodeURIComponent(input.value.trim())+'&output=embed':'about:blank'});cover.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>cover.close());cover.querySelector('[data-confirm]').onclick=()=>{if(input.value.trim()){onChoose(input.value.trim());cover.close()}};input.focus();
  }
  function wireRich(root){
    const ed=$('[data-rich-editor]',root);if(!ed)return null;
    $$('[data-cmd]',root).forEach(b=>b.onclick=()=>{ed.focus();let val=b.dataset.val||null;if(b.dataset.cmd==='createLink'){val=prompt('URL del enlace:','https://');if(!val||!/^https?:\/\//i.test(val))return;}if(b.dataset.cmd==='formatBlock')val=`<${val}>`;document.execCommand(b.dataset.cmd,false,val);ed.dispatchEvent(new Event('input',{bubbles:true}));});
    $$('[data-add-rich]',root).forEach(b=>b.onclick=()=>{
      const type=b.dataset.addRich;let element=document.createElement(['image','video','youtube','document','map'].includes(type)?'figure':type);
      if(type==='table'){element=window.ForoDocumentImport?.configureTable?.(element)||element;ed.foroAddBlock?ed.foroAddBlock(element):(ed.append(element),ed.dispatchEvent(new Event('input',{bubbles:true})));return;}
      if(type==='callout'){element=document.createElement('div');element.className='foro-info-box';element.innerHTML='<h3>Idea destacada</h3><p>Escribí aquí un dato, conclusión o información relevante.</p>';ed.foroAddBlock?ed.foroAddBlock(element):(ed.append(element),ed.dispatchEvent(new Event('input',{bubbles:true})));return;}
      if(type==='map'){
        openRichMap(raw=>{const safe=String(raw||'').trim();if(!safe)return;const embed='https://www.google.com/maps?q='+encodeURIComponent(safe)+'&output=embed';element.className='rich-media foro-map-embed';element.innerHTML=`<iframe title="Mapa: ${esc(safe)}" src="${esc(embed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe><figcaption>Mapa: ${esc(safe)}</figcaption>`;ed.foroAddBlock?ed.foroAddBlock(element):(ed.append(element),ed.dispatchEvent(new Event('input',{bubbles:true}))) });return;
      }
      if(type==='image'||type==='video'||type==='youtube'||type==='document'){
        chooseRichMedia(type, (raw)=>{
          if(type==='document'){
            const pdf=/\.pdf(?:[?#]|$)/i.test(raw);element.className='rich-media foro-document';const view=pdf?raw:'https://view.officeapps.live.com/op/embed.aspx?src='+encodeURIComponent(raw);const name=(raw.split('/').pop()||'Documento').split('?')[0];element.innerHTML=`<iframe src="${esc(view)}" title="Previsualización del documento" loading="lazy"></iframe><a class="foro-download" href="${esc(raw)}" target="_blank" rel="noopener noreferrer" download>↓ Descargar documento</a>`;
          }else if(type==='youtube'){
            const id=richYouTubeId(raw);if(!id){toast('Enlace de YouTube inválido');return;}
            element.className='rich-media rich-youtube';element.dataset.youtube=id;
            element.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&controls=1" title="Video de YouTube" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
          }else{
            element.className='rich-media';const media=document.createElement(type==='image'?'img':'video');media.src=raw;
            if(type==='video'){media.controls=true;media.playsInline=true;media.preload='metadata'}else media.alt='Imagen del artículo';
            element.append(media);const cap=document.createElement('figcaption');cap.contentEditable='true';cap.textContent='';cap.setAttribute('data-empty-caption','');element.append(cap);
          }
          ed.foroAddBlock?ed.foroAddBlock(element):(ed.append(element),ed.dispatchEvent(new Event('input',{bubbles:true})));
        });return;
      }else if(type==='hr'){}else if(type==='ul'){element.innerHTML='<li>Primer elemento</li>';}else{element.textContent=type==='p'?'Escribí tu párrafo…':type==='blockquote'?'Escribí una cita…':type==='h2'?'Nuevo título':'Nuevo subtítulo';}
      ed.foroAddBlock?ed.foroAddBlock(element):(ed.append(element),ed.dispatchEvent(new Event('input',{bubbles:true})));
    });enhanceBlockEditor(root,ed);window.ForoDocumentImport?.attach?.(root,ed);return ed;
  }

  function wireFeaturedPicker(prefix){
    const field=document.getElementById(prefix+'Image'),box=document.getElementById(prefix+'ImagePreview');
    if(!field||!box)return;
    const update=()=>{const url=field.value.trim();box.replaceChildren();if(!url){box.textContent='Sin imagen destacada';return}const img=document.createElement('img');img.src=url;img.alt='Vista previa de imagen destacada';img.loading='lazy';img.onerror=()=>{box.textContent='No se pudo cargar la imagen. Comprobá su URL.'};box.append(img)};
    field.addEventListener('input',update);
    document.getElementById(prefix+'ChooseImage').onclick=()=>chooseRichMedia('image',url=>{field.value=url;field.dispatchEvent(new Event('input',{bubbles:true}))});
    document.getElementById(prefix+'ClearImage').onclick=()=>{field.value='';field.dispatchEvent(new Event('input',{bubbles:true}))};
    update();
  }
  function openPost(post=null){
    editingPost=post?clone(post):{title:'',slug:'',excerpt:'',content_html:'',type:'article',category:'',tags:[],author_name:state.site.shortName,author_role:'',status:'draft',published_at:new Date().toISOString().slice(0,16),featured:false,featured_image:'',references:[],seo_title:'',seo_description:''};
    $('#postDialogTitle').textContent=post?'Editar publicación':'Nueva publicación';
    const p=editingPost;
    const storedExcerptPhoto=new DOMParser().parseFromString(p.content_html||'','text/html').querySelector('figure.foro-image-excerpt-right img');
    const excerptPhotoUrl=storedExcerptPhoto?.getAttribute('src')||'';
    const bodyWithoutExcerpt=(p.content_html||'').replace(/<figure\b(?=[^>]*\bforo-image-excerpt-right\b)[^>]*>[\s\S]*?<\/figure>/gi,'');
    const bioDoc=new DOMParser().parseFromString(p.content_html||'','text/html');
    const existingBio=bioDoc.querySelector('.foro-author-bio');
    const bioInitial=existingBio?.querySelector('.foro-author-bio-text')?.innerHTML||'';
    const bioVisible=!!existingBio&&!existingBio.classList.contains('foro-author-bio-hidden');
    const bioImageUrl=existingBio?.querySelector('.foro-author-bio-photo img')?.getAttribute('src')||'';
    const bioPhotoSide=existingBio?.classList.contains('foro-bio-photo-right')?'right':'left';
    const bioPhotoSize=existingBio?.classList.contains('foro-bio-photo-large')?'large':'normal';
    const bioBodyDoc=new DOMParser().parseFromString('<main>'+bodyWithoutExcerpt+'</main>','text/html');bioBodyDoc.querySelectorAll('.foro-author-bio').forEach(el=>el.remove());const bodyWithoutBio=bioBodyDoc.querySelector('main')?.innerHTML||bodyWithoutExcerpt;
    $('#postEditorBody').innerHTML=`<div class="dialog-grid"><div class="editor-main"><div class="editor-card"><h3>Contenido</h3><div class="form-stack"><label class="field"><span>Título</span><input id="peTitle" value="${esc(p.title)}"></label><label class="field"><span>Extracto</span><textarea id="peExcerpt">${esc(p.excerpt||'')}</textarea></label><label class="field"><span>Cuerpo</span>${richEditorHtml(bodyWithoutBio)}</label></div></div><div class="editor-card"><h3>SEO</h3><div class="form-stack"><label class="field"><span>Título SEO</span><input id="peSeoTitle" value="${esc(p.seo_title||'')}"></label><label class="field"><span>Descripción SEO</span><textarea id="peSeoDesc">${esc(p.seo_description||'')}</textarea></label></div></div></div><aside class="editor-side"><div class="editor-card"><h3>Publicación</h3><div class="form-stack"><label class="field"><span>Estado</span><select id="peStatus"><option value="draft" ${p.status==='draft'?'selected':''}>Borrador</option><option value="published" ${p.status==='published'?'selected':''}>Publicado</option><option value="scheduled" ${p.status==='scheduled'?'selected':''}>Programado</option><option value="archived" ${p.status==='archived'?'selected':''}>Archivado</option></select></label><label class="field"><span>Fecha de publicación</span><input id="peDate" type="datetime-local" value="${esc((p.published_at||'').slice(0,16))}"></label><label class="field check-field"><input id="peFeatured" type="checkbox" ${p.featured?'checked':''}><span>Destacada</span></label></div></div><div class="editor-card"><h3>Organización</h3><div class="form-stack"><label class="field"><span>Tipo</span><select id="peType">${Object.entries(postTypes).map(([k,v])=>`<option value="${k}" ${p.type===k?'selected':''}>${v}</option>`).join('')}</select></label><label class="field"><span>Categoría</span><input id="peCategory" value="${esc(p.category||'')}"></label><label class="field"><span>Etiquetas (separadas por coma)</span><input id="peTags" value="${esc((p.tags||[]).join(', '))}"></label><label class="field"><span>Slug</span><input id="peSlug" value="${esc(p.slug||'')}"></label></div></div><div class="editor-card"><h3>Autoría</h3><div class="form-stack"><label class="field"><span>Nombre del autor (firma pública)</span><input id="peAuthor" value="${esc(p.author_name||'')}"></label><label class="field"><span>Profesión / organización (opcional)</span><input id="peRole" value="${esc(p.author_role||'')}"></label><small>Podés indicar cualquier autor, aunque todavía no tenga cuenta para ingresar al CMS.</small></div></div><div class="editor-card"><h3>Imagen destacada del listado</h3><small>Se muestra en las tarjetas de Conocimiento. Para incluir una imagen dentro del artículo, usá el bloque Imagen en el cuerpo.</small><div class="form-stack"><label class="field"><span>URL o medio</span><input id="peImage" type="url" placeholder="URL de imagen" value="${esc(p.featured_image||'')}"></label><div class="foro-featured-preview" id="peImagePreview"></div><div class="foro-featured-actions"><button type="button" class="btn ghost" id="peChooseImage">Elegir o subir imagen</button><button type="button" class="btn ghost" id="peClearImage">Quitar imagen</button></div></div></div><div class="editor-card"><h3>Fuentes / referencias</h3><label class="field"><span>Una por línea</span><textarea id="peReferences">${esc((p.references||[]).join('\n'))}</textarea></label></div></aside></div>`;
    let saveFeedback=document.getElementById('postSaveFeedback');
    if(!saveFeedback){saveFeedback=document.createElement('div');saveFeedback.id='postSaveFeedback';saveFeedback.className='foro-post-save-feedback';saveFeedback.setAttribute('role','alert');saveFeedback.hidden=true;document.querySelector('#postEditorBody .editor-main')?.prepend(saveFeedback);}
    const excerptPanel=document.createElement('div');
    excerptPanel.className='editor-card foro-excerpt-editor';
    excerptPanel.innerHTML=`<h3>Imagen junto al extracto</h3><p>Opcional e independiente de la imagen destacada y del cuerpo. La previsualización utiliza la misma disposición que el artículo.</p><div class="foro-excerpt-editor-grid"><div><label class="field"><span>Imagen</span><input type="url" id="peExcerptImage" placeholder="Elegir una imagen" value="${esc(excerptPhotoUrl)}"></label><div class="foro-featured-actions"><button class="btn ghost" type="button" id="peExcerptChoose">Elegir o subir imagen</button><button class="btn ghost" type="button" id="peExcerptClear">Quitar</button></div><label class="field"><span>Ancho en escritorio</span><input id="peExcerptWidth" type="range" min="0" max="100" step="1" value="35"><output id="peExcerptWidthLabel">35 %</output></label><label class="field"><span>En celulares</span><select id="peExcerptMobile"><option value="text-first">Primero texto y luego foto</option><option value="image-first">Primero foto y luego texto</option></select></label></div><div class="foro-excerpt-media-preview" id="peExcerptImagePreview">Sin imagen para el extracto</div></div>`;
    const firstContent=$('.editor-main .editor-card',$('#postEditorBody'));
    firstContent.after(excerptPanel);
    const bioCard=document.createElement('div');
    bioCard.className='editor-card foro-bio-editor';
    bioCard.innerHTML=`<h3>Biografía del autor · firma final</h3><p>Opcional. Se muestra al terminar el artículo; podés ocultarla sin borrar el texto.</p><label class="field check-field"><input type="checkbox" id="peBioVisible" ${bioVisible?'checked':''}><span>Mostrar biografía al final de esta publicación</span></label><div class="foro-bio-toolbar"><button type="button" data-bio-cmd="bold" title="Negrita"><b>B</b></button><button type="button" data-bio-cmd="italic" title="Cursiva"><i>I</i></button><button type="button" data-bio-cmd="underline" title="Subrayado"><u>U</u></button><select id="peBioAlign" aria-label="Alineación"><option value="left">Izquierda</option><option value="center">Centrada</option><option value="right">Derecha</option></select><select id="peBioSize" aria-label="Tamaño"><option value="">Tamaño normal</option><option value="14">14 px</option><option value="16">16 px</option><option value="18">18 px</option><option value="20">20 px</option></select><button type="button" id="peBioClear">Eliminar texto</button></div><label for="peBioText" class="foro-bio-label">Escribí la biografía del autor</label><div id="peBioText" class="foro-bio-input" contenteditable="true" role="textbox" aria-multiline="true" tabindex="0" aria-label="Biografía editable" data-placeholder="Breve presentación profesional del autor...">${bioInitial}</div><small>Podés seleccionar palabras para aplicar negrita, cursiva o subrayado. La previsualización se actualiza automáticamente.</small><div class="foro-bio-photo-controls"><h4>Foto del autor · opcional</h4><div class="foro-bio-photo-editor-grid"><div><label class="field check-field"><input type="checkbox" id="peBioPhotoVisible" ${bioImageUrl?'checked':''}><span>Mostrar foto en la biografía</span></label><div class="foro-featured-actions"><button type="button" class="btn ghost" id="peBioChoosePhoto">Elegir o subir foto</button><button type="button" class="btn ghost" id="peBioRemovePhoto">Quitar foto</button></div><label class="field"><span>Posición</span><select id="peBioPhotoSide"><option value="left" ${bioPhotoSide==='left'?'selected':''}>A la izquierda del texto</option><option value="right" ${bioPhotoSide==='right'?'selected':''}>A la derecha del texto</option></select></label><label class="field"><span>Tamaño</span><select id="peBioPhotoSize"><option value="normal" ${bioPhotoSize==='normal'?'selected':''}>Retrato compacto</option><option value="large" ${bioPhotoSize==='large'?'selected':''}>Retrato amplio</option></select></label></div><div><div class="foro-bio-photo-preview" id="peBioPhotoPreview"></div><small>Vista previa de la ficha; podés cambiar la foto y su disposición antes de guardar.</small></div></div><input id="peBioPhotoUrl" type="hidden" value="${esc(bioImageUrl)}"></div>`;
    const authorCard=$('#peAuthor')?.closest('.editor-card');
    (authorCard||excerptPanel).after(bioCard);
    bioCard.querySelectorAll('[data-bio-cmd]').forEach(b=>b.addEventListener('mousedown',e=>e.preventDefault()));
    bioCard.querySelectorAll('[data-bio-cmd]').forEach(b=>b.onclick=()=>{document.getElementById('peBioText').focus();document.execCommand(b.dataset.bioCmd,false,null);renderLivePostPreview()});
    $('#peBioAlign').onchange=e=>{$('#peBioText').style.textAlign=e.target.value;renderLivePostPreview()};
    $('#peBioSize').onchange=e=>{if(e.target.value){$('#peBioText').style.fontSize=e.target.value+'px'}else{$('#peBioText').style.removeProperty('font-size')}renderLivePostPreview()};
    $('#peBioClear').onclick=()=>{$('#peBioText').innerHTML='';renderLivePostPreview()};
    const photoPreview=$('#peBioPhotoPreview');
    function refreshBioPhotoPreview(){
      const url=$('#peBioPhotoUrl').value.trim(),visible=$('#peBioPhotoVisible').checked;
      photoPreview.replaceChildren();photoPreview.classList.toggle('foro-bio-preview-right',$('#peBioPhotoSide').value==='right');
      photoPreview.classList.toggle('foro-bio-preview-large',$('#peBioPhotoSize').value==='large');
      if(!url){photoPreview.textContent='Sin foto: la biografía se mostrará solo con texto.';renderLivePostPreview();return;}
      const image=document.createElement('img');image.src=url;image.alt='Previsualización de foto de autor';image.onerror=()=>{photoPreview.textContent='No se puede cargar la fotografía.'};
      const sample=document.createElement('div');sample.textContent=($('#peBioText').textContent||'').trim().slice(0,190)||'Aquí se verá la presentación del autor.';
      photoPreview.append(image,sample);photoPreview.style.opacity=visible?'1':'.48';renderLivePostPreview();
    }
    $('#peBioChoosePhoto').onclick=()=>chooseRichMedia('image',url=>{$('#peBioPhotoUrl').value=url;$('#peBioPhotoVisible').checked=true;refreshBioPhotoPreview()});
    $('#peBioRemovePhoto').onclick=()=>{$('#peBioPhotoUrl').value='';$('#peBioPhotoVisible').checked=false;refreshBioPhotoPreview()};
    ['peBioPhotoVisible','peBioPhotoSide','peBioPhotoSize'].forEach(id=>$('#'+id).addEventListener('change',refreshBioPhotoPreview));
    $('#peBioText').addEventListener('input',()=>{const sample=photoPreview.querySelector('div');if(sample)sample.textContent=($('#peBioText').textContent||'').trim().slice(0,190)||'Aquí se verá la presentación del autor.'});
    refreshBioPhotoPreview();
    if(existingBio){const original=existingBio.querySelector('.foro-author-bio-text');if(original){$('#peBioText').style.textAlign=original.style.textAlign||'left';$('#peBioText').style.fontSize=original.style.fontSize||'';}}

    const oldFigure=new DOMParser().parseFromString(p.content_html||'','text/html').querySelector('figure.foro-image-excerpt-right');
    const existingWidth=oldFigure?.getAttribute('data-excerpt-width')||'35';
    const existingMobile=oldFigure?.getAttribute('data-mobile-order')||'text-first';
    $('#peExcerptWidth').value=existingWidth;$('#peExcerptWidthLabel').textContent=existingWidth+' %';
    $('#peExcerptMobile').value=existingMobile;
    const excerptImg=$('#peExcerptImage'),updateExcerptPreview=()=>{const el=$('#peExcerptImagePreview');el.replaceChildren();if(excerptImg.value.trim()){const img=document.createElement('img');img.src=excerptImg.value.trim();img.alt='Imagen junto al extracto';img.onerror=()=>{el.textContent='No se pudo cargar esta imagen'};el.append(img)}else el.textContent='Sin imagen para el extracto';renderLivePostPreview()};
    $('#peExcerptChoose').onclick=()=>chooseRichMedia('image',url=>{excerptImg.value=url;updateExcerptPreview()});
    $('#peExcerptClear').onclick=()=>{excerptImg.value='';updateExcerptPreview()};
    excerptImg.addEventListener('input',updateExcerptPreview);
    $('#peExcerptWidth').addEventListener('input',()=>{$('#peExcerptWidthLabel').textContent=$('#peExcerptWidth').value+' %';renderLivePostPreview()});
    $('#peExcerptMobile').addEventListener('change',renderLivePostPreview);
    updateExcerptPreview();
    addEditorialTemplates($('#postEditorBody'));
    wireRich($('#postEditorBody'));wirePostPreview();wireFeaturedPicker('pe');if(myRole==='author'){$('#peStatus').value='draft';$('#peStatus').disabled=true;}$('#peTitle').oninput=e=>{if(!$('#peSlug').dataset.manual)$('#peSlug').value=slugify(e.target.value)};$('#peSlug').oninput=e=>e.target.dataset.manual='1';$('#postDialog').showModal();renderLivePostPreview();
  }

  function cleanEditorHtml(ed){if(!ed)return '';const copy=ed.cloneNode(true);copy.querySelectorAll('.foro-block-check').forEach(el=>el.remove());copy.querySelectorAll('.is-selected,.foro-multi-selected,.is-dragging').forEach(el=>el.classList.remove('is-selected','foro-multi-selected','is-dragging'));copy.querySelectorAll('[contenteditable],[draggable],[tabindex]').forEach(el=>{el.removeAttribute('contenteditable');el.removeAttribute('draggable');el.removeAttribute('tabindex')});return copy.innerHTML}
  function authorBioHtml(){
    const ed=$('#peBioText');if(!ed)return '';
    const text=(ed.textContent||'').trim();if(!text)return '';
    const clean=ed.cloneNode(true);clean.querySelectorAll('script,iframe,object,style').forEach(n=>n.remove());
    const align=['center','right'].includes(ed.style.textAlign)?'text-align:'+ed.style.textAlign+';':'';
    const size=/^(14|16|18|20)px$/.test(ed.style.fontSize)?'font-size:'+ed.style.fontSize+';':'';
    const photo=$('#peBioPhotoVisible')?.checked?($('#peBioPhotoUrl')?.value||'').trim():'';
    const src=photo&&/^https?:\/\//i.test(photo)?`<figure class="foro-author-bio-photo"><img src="${esc(photo)}" alt="Fotografía del autor" loading="lazy"></figure>`:'';
    const side=$('#peBioPhotoSide')?.value==='right'?'foro-bio-photo-right':'foro-bio-photo-left';
    const dimension=$('#peBioPhotoSize')?.value==='large'?'foro-bio-photo-large':'foro-bio-photo-normal';
    return `<div class="foro-author-bio ${$('#peBioVisible')?.checked?'':'foro-author-bio-hidden'} ${src?side+' '+dimension:''}"><h2>Sobre el autor</h2><div class="foro-author-bio-content">${src}<div class="foro-author-bio-text" style="${align}${size}">${clean.innerHTML}</div></div></div>`;
  }
  function draftPostSnapshot(){return {title:$('#peTitle')?.value||'',excerpt:$('#peExcerpt')?.value||'',content_html:cleanEditorHtml($('[data-rich-editor]',$('#postEditorBody')))+authorBioHtml(),featured_image:$('#peImage')?.value||'',author_name:$('#peAuthor')?.value||'',category:$('#peCategory')?.value||'',status:$('#peStatus')?.value||'draft'}}
  // V20: reconstruir los párrafos sin perder los saltos originales del textarea.
  function excerptParagraphsPreview(value){
    const normalized=String(value||'').replace(/\r\n?/g,'\n');
    return normalized.split(/\n[\t ]*\n+/).map(part=>'<p>'+esc(part).replace(/\n/g,'<br>')+'</p>').join('');
  }
  // V27: la vista previa utiliza las mismas clases y la misma hoja CSS que la página publicada.
  // La imagen destacada SOLO corresponde a las tarjetas del listado.
  function renderLivePostPreview(){
    const frame=$('#postLivePreview');if(!frame)return;
    const p=draftPostSnapshot(),safe=v=>esc(v||'');
    const parsed=new DOMParser().parseFromString('<div>'+p.content_html+'</div>','text/html');
    const excerptFigure=parsed.querySelector('figure.foro-image-excerpt-right');
    const excerptMedia=($('#peExcerptImage')?.value||'').trim()?`<figure class="foro-image-excerpt-right" data-excerpt-width="${$('#peExcerptWidth').value}" data-mobile-order="${$('#peExcerptMobile').value}"><img src="${esc($('#peExcerptImage').value.trim())}" alt="Imagen junto al extracto"></figure>`:'';
    if(excerptFigure)excerptFigure.remove();
    const articleBodyHtml=parsed.body.firstElementChild?.innerHTML||'';
    const doc=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="../css/site.css"><style>
    body{margin:0;background:#f4f5f3;color:#052b4a} .v27-preview-shell{width:min(100% - 44px,1060px);margin:30px auto 90px}
    .v27-preview-head{max-width:900px;margin-bottom:42px}.v27-preview-head h1{font-size:clamp(34px,5vw,65px);line-height:1.08;margin:12px 0 16px}
    .v27-preview-meta{font:13px/1.5 'DM Sans',Arial,sans-serif;color:#526a7c;margin-bottom:22px}
    .v27-preview-intro{max-width:900px;line-height:1.75;margin-bottom:35px}
    .v27-preview-intro p{margin:0 0 1em}.v27-preview-excerpt-media{float:none;width:auto;margin:0}.v27-preview-excerpt-media img{width:100%;height:auto;display:block}.v27-preview-excerpt-wrap{display:flex;gap:32px;align-items:start}.v27-preview-excerpt-wrap .v27-preview-intro{flex:1;min-width:0}.v27-preview-excerpt-wrap .v27-preview-excerpt-media{width:var(--preview-excerpt-width,35%);flex:none;order:2}.v27-preview-excerpt-wrap .v27-preview-excerpt-media:has([data-excerpt-width="42"]){width:42%}.v27-preview-excerpt-wrap .v27-preview-excerpt-media:has([data-excerpt-width="48"]){width:48%}.article-body{width:100%;max-width:100%;min-height:180px;font-size:18px;line-height:1.65;display:flow-root}
    .article-body figure.foro-gallery-item:not(:first-child){display:none}
    .article-body figure.foro-gallery-item:first-child::after{content:'Carrusel · otras imágenes al desplazar';display:block;font:12px Arial;color:#42637b;margin-top:8px}
    .article-body figure.foro-image-right,.article-body figure.foro-image-left{position:relative}
    @media(max-width:700px){.v27-preview-shell{width:calc(100% - 30px)}.v27-preview-head h1{font-size:38px}.v27-preview-excerpt-wrap{flex-direction:column}.v27-preview-excerpt-wrap .v27-preview-excerpt-media{width:100%!important;order:2}.v27-preview-excerpt-wrap .v27-preview-excerpt-media:has([data-mobile-order="image-first"]){order:-1}}
    </style></head><body><main class="v27-preview-shell"><header class="v27-preview-head"><small>PUBLICACIÓN · VISTA PREVIA</small><h1>${safe(p.title||'Título de la publicación')}</h1><p class="v27-preview-meta">Escrito por: ${safe(p.author_name||'Autor')}</p><div class="v27-preview-excerpt-wrap">${excerptMedia?`<div class="v27-preview-excerpt-media" style="--preview-excerpt-width:${$('#peExcerptWidth')?.value||35}%">${excerptMedia}</div>`:""}<div class="v27-preview-intro excerpt-paragraphs">${excerptParagraphsPreview(p.excerpt)}</div></div></header><div class="article-body">${articleBodyHtml}</div></main></body></html>`;
    frame.srcdoc=doc;
  }
  function wirePostPreview(){const root=$('#postEditorBody');const panel=document.createElement('div');panel.className='editor-card post-preview-card';panel.innerHTML='<h3>Vista previa del artículo (sin publicar)</h3><p>Se actualiza mientras escribís. No guarda ni modifica el sitio público.</p><iframe id="postLivePreview" title="Previsualización de artículo" sandbox="allow-same-origin"></iframe>';$('.editor-main',root).appendChild(panel);root.addEventListener('input',renderLivePostPreview);root.addEventListener('change',renderLivePostPreview)}

  let savingPost=false;
  async function savePost(){
    if(savingPost)return;
    const p=editingPost, root=$('#postEditorBody'), ed=$('[data-rich-editor]',root);
    if(!p||!root||!ed)return;
    const errorNode=document.getElementById('postSaveFeedback');
    if(errorNode){errorNode.hidden=true;errorNode.textContent='';}
    const value=id=>document.getElementById(id)?.value||'';
    const headline=value('peTitle').trim();
    const slug=value('peSlug').trim()||slugify(headline);
    if(!headline||!slug){if(errorNode){errorNode.textContent='Ingresá título y URL (slug).';errorNode.hidden=false;}return;}
    let iso=null;
    try{iso=value('peDate')?new Date(value('peDate')).toISOString():null}
    catch{if(errorNode){errorNode.textContent='La fecha de publicación no es válida.';errorNode.hidden=false;}return;}
    Object.assign(p,{title:headline,slug,excerpt:value('peExcerpt').trim(),content_html:cleanEditorHtml(ed)+authorBioHtml()+(value('peExcerptImage').trim()?`<figure class="foro-image-excerpt-right" data-excerpt-width="${value('peExcerptWidth')}" data-mobile-order="${value('peExcerptMobile')}"><img src="${esc(value('peExcerptImage').trim())}" alt="Imagen del extracto"></figure>`:''),type:value('peType'),category:value('peCategory').trim(),tags:value('peTags').split(',').map(x=>x.trim()).filter(Boolean),author_name:value('peAuthor').trim(),author_role:value('peRole').trim(),status:myRole==='author'?'draft':value('peStatus'),published_at:iso,featured:document.getElementById('peFeatured')?.checked||false,featured_image:value('peImage').trim(),references:value('peReferences').split('\n').map(x=>x.trim()).filter(Boolean),seo_title:value('peSeoTitle').trim(),seo_description:value('peSeoDesc').trim()});
    const btn=$('#savePost');savingPost=true;btn.disabled=true;btn.textContent='Guardando…';
    try{
      const saved=await db.savePost(p);
      toast('Publicación guardada');$('#postDialog').close();editingPost=null;
      posts=posts.some(x=>x.id===saved.id)?posts.map(x=>x.id===saved.id?saved:x):[saved,...posts];
      renderPosts();renderDashboard();pushPreview();
    }catch(e){
      const reason=[e.message,e.details,e.hint].filter(Boolean).join(' · ');
      const text='No se pudo guardar la publicación: '+reason;
      if(errorNode){errorNode.textContent=text;errorNode.hidden=false;errorNode.scrollIntoView({block:'nearest'});}
      toast(text);console.error('Error guardando publicación:',e);
    }finally{savingPost=false;btn.disabled=false;btn.textContent='Guardar publicación'}
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
    $('#eventEditorBody').innerHTML=`<div class="dialog-grid"><div class="editor-main"><div class="editor-card"><h3>Actividad</h3><div class="form-stack"><label class="field"><span>Título</span><input id="eeTitle" value="${esc(x.title)}"></label><label class="field"><span>Resumen</span><textarea id="eeExcerpt">${esc(x.excerpt||'')}</textarea></label><label class="field"><span>Detalle</span>${richEditorHtml(x.content_html||'')}</label></div></div><div class="editor-card"><h3>SEO</h3><div class="form-stack"><label class="field"><span>Título SEO</span><input id="eeSeoTitle" value="${esc(x.seo_title||'')}"></label><label class="field"><span>Descripción SEO</span><textarea id="eeSeoDesc">${esc(x.seo_description||'')}</textarea></label></div></div></div><aside class="editor-side"><div class="editor-card"><h3>Publicación</h3><div class="form-stack"><label class="field"><span>Estado</span><select id="eeStatus"><option value="draft" ${x.status==='draft'?'selected':''}>Borrador</option><option value="published" ${x.status==='published'?'selected':''}>Publicado</option></select></label><label class="field"><span>Tipo</span><select id="eeType">${Object.entries(eventTypes).map(([k,v])=>`<option value="${k}" ${x.event_type===k?'selected':''}>${v}</option>`).join('')}</select></label><label class="field"><span>Slug</span><input id="eeSlug" value="${esc(x.slug||'')}"></label></div></div><div class="editor-card"><h3>Fecha y lugar</h3><div class="form-stack"><label class="field"><span>Inicio</span><input id="eeStart" type="datetime-local" value="${esc((x.starts_at||'').slice(0,16))}"></label><label class="field"><span>Fin</span><input id="eeEnd" type="datetime-local" value="${esc((x.ends_at||'').slice(0,16))}"></label><label class="field"><span>Lugar</span><input id="eeLocation" value="${esc(x.location||'')}"></label><label class="field"><span>Modalidad</span><input id="eeMode" value="${esc(x.mode||'')}"></label></div></div><div class="editor-card"><h3>Inscripción</h3><div class="form-stack"><label class="field check-field"><input id="eeReg" type="checkbox" ${x.registration_enabled?'checked':''}><span>Habilitar formulario</span></label><label class="field"><span>Nota de inscripción</span><textarea id="eeRegNote">${esc(x.registration_note||'')}</textarea></label></div></div><div class="editor-card"><h3>Imagen</h3><label class="field"><span>URL o medio</span><input id="eeImage" type="url" placeholder="URL de imagen" value="${esc(x.featured_image||'')}"></label><div class="foro-featured-preview" id="eeImagePreview"></div><div class="foro-featured-actions"><button type="button" class="btn ghost" id="eeChooseImage">Elegir o subir imagen</button><button type="button" class="btn ghost" id="eeClearImage">Quitar imagen</button></div></div></aside></div>`;
    wireRich($('#eventEditorBody'));$('#eeTitle').oninput=e=>{if(!$('#eeSlug').dataset.manual)$('#eeSlug').value=slugify(e.target.value)};$('#eeSlug').oninput=e=>e.target.dataset.manual='1';$('#eventDialog').showModal();wireFeaturedPicker('ee');
  }
  async function saveEvent(){const x=editingEvent;Object.assign(x,{title:$('#eeTitle').value.trim(),slug:$('#eeSlug').value.trim()||slugify($('#eeTitle').value),excerpt:$('#eeExcerpt').value.trim(),content_html:cleanEditorHtml($('[data-rich-editor]',$('#eventEditorBody'))),event_type:$('#eeType').value,status:$('#eeStatus').value,starts_at:$('#eeStart').value?new Date($('#eeStart').value).toISOString():null,ends_at:$('#eeEnd').value?new Date($('#eeEnd').value).toISOString():null,location:$('#eeLocation').value.trim(),mode:$('#eeMode').value.trim(),registration_enabled:$('#eeReg').checked,registration_note:$('#eeRegNote').value.trim(),featured_image:$('#eeImage').value.trim(),seo_title:$('#eeSeoTitle').value.trim(),seo_description:$('#eeSeoDesc').value.trim()});if(!x.title||!x.slug){toast('Título y slug son obligatorios');return}try{await db.saveEvent(x);toast('Actividad guardada');$('#eventDialog').close();editingEvent=null;loadEvents()}catch(e){toast('Error: '+e.message)}}

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

  async function loadCollaborators(){const target=$('#collaboratorsList');if(!target)return;try{const {data,error}=await db.client.from('cms_profiles').select('user_id,display_name,role,created_at').order('created_at',{ascending:false});if(error)throw error;target.innerHTML=(data||[]).map(p=>`<div class="table-row"><div class="table-title"><strong>${esc(p.display_name||p.user_id)}</strong><small>${esc(p.user_id)}</small></div><span class="badge">${esc(p.role)}</span><span>${esc(fmtDate(p.created_at))}</span><div>${false?'':`<select data-role-user="${esc(p.user_id)}"><option value="">Cambiar rol…</option>${['admin','editor','author'].map(r=>`<option value="${r}">${r}</option>`).join('')}</select>`}</div></div>`).join('')||'<p>No hay perfiles todavía.</p>';$$('[data-role-user]',target).forEach(el=>el.onchange=async()=>{if(!el.value)return;if(!confirm('¿Cambiar rol de este colaborador?'))return;try{await manageCollaborator({action:'set_role',user_id:el.dataset.roleUser,role:el.value});toast('Rol actualizado');loadCollaborators()}catch(e){toast(e.message)}})}catch(e){target.textContent='No se pudieron cargar los colaboradores: '+e.message}}
  async function manageCollaborator(payload){const {data:{session}}=await db.client.auth.getSession();if(!session)throw Error('Iniciá sesión');const endpoint=(window.FORO_SUPABASE?.url||'')+'/functions/v1/manage-collaborators';const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',apikey:window.FORO_SUPABASE.anonKey},body:JSON.stringify(payload)});const json=await response.json().catch(()=>({}));if(!response.ok)throw Error(json.error||'No se pudo completar la operación');return json}
  async function inviteCollaborator(){const email=$('#inviteEmail').value.trim(),role=$('#inviteRole').value,name=$('#inviteName').value.trim();if(!email)return toast('Ingresá un email');const btn=$('#inviteSubmit');btn.disabled=true;try{const result=await manageCollaborator({action:'invite',email,role,display_name:name});toast('Invitación creada');if(result.invite_url){$('#inviteResult').textContent='Enlace de invitación para compartir de forma privada: '+result.invite_url} else $('#inviteResult').textContent='La invitación se envió por correo.';loadCollaborators()}catch(e){toast(e.message)}finally{btn.disabled=false}}
  function renderAll(){renderDashboard();renderSections();renderPages();renderDesign();renderNavigation();renderSettings();renderPosts();renderEvents();renderMedia();renderInquiries();renderNewsletter();renderHistory();renderAdvanced()}

  async function publishSite(){const bad=(state.navigation||[]).some(n=>!validNavHref(n.href)||(n.children||[]).some(c=>!validNavHref(c.href)));if(bad){switchView('navigation');toast('Revisá los destinos marcados antes de publicar el menú');return}if(!db.configured){toast('Supabase no está configurado');return}try{$('#publishSite').disabled=true;$('#saveState').textContent='Publicando…';await db.saveSiteContent(state,'Publicación desde CMS');clearDirty();toast('Sitio publicado');pushPreview();loadHistory()}catch(e){toast('Error: '+e.message);$('#saveState').textContent='Error'}finally{$('#publishSite').disabled=false}}

  // V12 structured page builder: every item is independent and editable.
  let activeBuilderSection=0;
  let selectedBuilderBlock=-1;
  let builderPage='home';
  let visualArticle=null;
  let articleDraft=null;
  const builderTypes=[['h2','Título'],['h3','Subtítulo'],['p','Párrafo'],['blockquote','Cita'],['image','Imagen'],['video','Video propio'],['youtube','YouTube'],['divider','Separador']];
  function builderTarget(){if(builderPage==='home'){return state.sections[activeBuilderSection]||(state.sections[0]||{})}state.pages[builderPage]??={};return state.pages[builderPage]}
  function ensureBuilderBlocks(){const obj=builderTarget();obj.visualBlocks??=[];return obj.visualBlocks}
  function builderSync(){markDirty();pushPreview()}
  function articleVisualTree(){
    if(!visualArticle)return '';
    return `<div class="section-tree foro-article-tree"><strong>Artículo · edición visual</strong><p>Seleccioná el título, extracto o cuerpo directamente en la página de la derecha. Enter crea párrafos. Podés guardar sin salir del lienzo.</p><button type="button" data-article-back>← Volver a Conocimiento</button><button type="button" data-article-save class="btn primary">Guardar cambios del artículo</button><div class="foro-article-save-status" aria-live="polite"></div><strong>Elementos del artículo</strong><button type="button" data-article-jump=".article-header h1">Título</button><button type="button" data-article-jump=".article-excerpt">Extracto</button><button type="button" data-article-jump=".article-body">Cuerpo</button><div class="foro-visual-tools"><strong>Editar composición</strong><label>Bloque seleccionado<select data-article-structure><option value="p">Párrafo</option><option value="h2">Título</option><option value="h3">Subtítulo</option><option value="blockquote">Cita</option></select></label><label>Fuente<select data-article-font><option value="">Fuente del sitio</option><option>Instrument Serif</option><option>DM Sans</option><option>Inter</option><option>Georgia</option><option>Arial</option><option>Lora</option><option>Libre Baskerville</option></select></label><label>Tamaño de letra (px)<input data-article-size type="number" min="12" max="112" step="1" value="18"></label><label>Interlineado<select data-article-leading><option value="1.3">1.3</option><option value="1.5">1.5</option><option value="1.7" selected>1.7</option><option value="2">2</option></select></label><label>Alineación<select data-article-align><option value="left">Izquierda</option><option value="center">Centrada</option><option value="right">Derecha</option><option value="justify">Justificada</option></select></label><div class="foro-visual-action-grid"><button type="button" data-article-add="p">+ Párrafo</button><button type="button" data-article-add="h2">+ Título</button><button type="button" data-article-add="image">+ Imagen</button><button type="button" data-article-add="youtube">+ YouTube</button><button type="button" data-article-add="columns">+ Dos columnas</button><button type="button" data-article-block-up>↑ Bloque</button><button type="button" data-article-block-down>↓ Bloque</button><button type="button" data-article-block-delete>Eliminar bloque</button></div><small>Seleccioná un bloque dentro del artículo para ajustar sus propiedades. Guardá los cambios al finalizar.</small></div></div>`;
  }
  let activeVisualArticleBlock=null;
  function connectVisualArticle(){
    if(!visualArticle)return;
    const doc=$('#visualFrame')?.contentDocument;if(!doc)return;
    const heading=doc.querySelector('.article-header h1'),excerpt=doc.querySelector('.article-header .article-excerpt'),body=doc.querySelector('.article-body');
    if(!heading||!excerpt||!body)return;
    [[heading,'title'],[excerpt,'excerpt'],[body,'content_html']].forEach(([el,key])=>{
      if(el.dataset.visualArticleBound)return;el.dataset.visualArticleBound='1';el.contentEditable='true';el.setAttribute('spellcheck','true');el.classList.add('foro-article-inline-edit');
      el.addEventListener('input',()=>{
        if(!articleDraft)return;
        if(key==='content_html'){const cleaned=el.cloneNode(true);cleaned.querySelectorAll('.references').forEach(node=>node.remove());cleaned.querySelectorAll('.foro-visual-block-active').forEach(node=>node.classList.remove('foro-visual-block-active'));cleaned.removeAttribute('contenteditable');cleaned.removeAttribute('data-visual-article-bound');const excerptFigure=new DOMParser().parseFromString(visualArticle.content_html||'','text/html').querySelector('figure.foro-image-excerpt-right');articleDraft.content_html=cleaned.innerHTML+(excerptFigure?excerptFigure.outerHTML:'');}
        else if(key==='excerpt')articleDraft.excerpt=el.innerText;
        else articleDraft.title=el.innerText.trim();
        const status=document.querySelector('.foro-article-save-status');if(status)status.textContent='Cambios sin guardar';
      });
    });
    if(!doc.getElementById('foro-article-visual-style')){const st=doc.createElement('style');st.id='foro-article-visual-style';st.textContent='.foro-article-inline-edit{outline:2px dashed rgba(0,130,170,.5);outline-offset:5px;cursor:text}.foro-article-inline-edit:focus{outline:3px solid #0099c4;background:rgba(230,248,253,.18)}';doc.head.append(st)}
    doc.querySelectorAll('.foro-article-inline-edit').forEach(el=>el.addEventListener('focus',()=>el.classList.add('is-editing')));
    body.addEventListener('click',event=>{
      const block=event.target.closest('p,h2,h3,blockquote,figure,.foro-template-columns');
      if(!block||!body.contains(block))return;
      if(activeVisualArticleBlock)activeVisualArticleBlock.classList.remove('foro-visual-block-active');
      activeVisualArticleBlock=block;block.classList.add('foro-visual-block-active');
      const root=document.querySelector('.foro-article-tree');
      const size=root?.querySelector('[data-article-size]');if(size){size.value=Math.round(parseFloat(doc.defaultView.getComputedStyle(block).fontSize))||18;}
      const f=root?.querySelector('[data-article-font]');if(f)f.value=['Instrument Serif','DM Sans','Inter','Georgia','Arial','Lora','Libre Baskerville'].find(x=>block.style.fontFamily.includes(x))||'';
      const a=root?.querySelector('[data-article-align]');if(a)a.value=block.style.textAlign||'left';
      const st=root?.querySelector('[data-article-structure]');if(st&&['P','H2','H3','BLOCKQUOTE'].includes(block.tagName))st.value=block.tagName.toLowerCase();
    });
    // V32: Same contextual editing experience in article pages as institutional pages.
    // Toolbar lives in iframe and acts on the selected article element without navigating away.
    if(!doc.getElementById('foro-article-context-tools')){
      const bar=doc.createElement('div');bar.id='foro-article-context-tools';
      bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Formato y bloques del artículo');
      bar.innerHTML='<span class="foro-context-label">Editar artículo</span><select data-context-font aria-label="Tipografía"><option value="">Fuente institucional</option>'+['Instrument Serif','DM Sans','Inter','Playfair Display','Lora','Newsreader','Montserrat','Libre Baskerville','Georgia','Arial'].map(x=>'<option>'+x+'</option>').join('')+'</select><input data-context-size type="number" min="10" max="144" step="1" value="18" title="Tamaño de letra en píxeles" aria-label="Tamaño de letra"><select data-context-leading aria-label="Interlineado">'+['1','1.2','1.4','1.6','1.8','2'].map(x=>'<option value="'+x+'">'+x+' línea</option>').join('')+'</select><button type="button" data-context-align="left" title="Izquierda">⇤</button><button type="button" data-context-align="center" title="Centro">≡</button><button type="button" data-context-align="right" title="Derecha">⇥</button><button type="button" data-context-command="bold" title="Negrita"><b>B</b></button><button type="button" data-context-command="italic" title="Cursiva"><i>I</i></button><button type="button" data-context-command="underline" title="Subrayado"><u>U</u></button><button type="button" data-context-add="p" title="Nuevo párrafo">+ Párrafo</button><button type="button" data-context-add="image" title="Insertar imagen">+ Imagen</button><button type="button" data-context-add="youtube" title="Insertar YouTube">+ Video</button><button type="button" data-context-save title="Guardar cambios">Guardar</button>';
      doc.body.append(bar);
      const css=doc.createElement('style');css.id='foro-article-context-css';css.textContent='#foro-article-context-tools{position:fixed;z-index:2147483640;top:8px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 18px);display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px;padding:7px;background:white;border:1px solid #b6cbdb;box-shadow:0 6px 22px #001c3650;font:12px DM Sans,Arial,sans-serif;color:#052b4a}#foro-article-context-tools button,#foro-article-context-tools select,#foro-article-context-tools input{border:1px solid #b6cbdb;border-radius:3px;padding:5px;background:white;color:#052b4a;font:inherit;min-height:30px}#foro-article-context-tools button{cursor:pointer}#foro-article-context-tools button:focus-visible{outline:2px solid #008bc0}#foro-article-context-tools [data-context-size]{width:55px}#foro-article-context-tools [data-context-font]{max-width:132px}.foro-article-inline-edit:focus{outline:2px solid #008fbb!important}.foro-visual-block-active{outline:2px solid #008fbb!important;outline-offset:3px}@media(max-width:750px){#foro-article-context-tools{top:2px}.foro-context-label{display:none}}';doc.head.append(css);
      let selected=heading;let savedRange=null;
      const sync=()=>{const root=selected===heading?heading:selected===excerpt?excerpt:body;root.dispatchEvent(new Event('input',{bubbles:false}));};
      function currentBlock(){return selected&&body.contains(selected)?selected:selected===body?body:selected||heading;}
      function choose(el){selected=el;const st=doc.defaultView.getComputedStyle(el);bar.querySelector('[data-context-size]').value=Math.round(parseFloat(st.fontSize))||18;bar.querySelector('[data-context-leading]').value=['1','1.2','1.4','1.6','1.8','2'].find(x=>Math.abs(parseFloat(x)-parseFloat(st.lineHeight)/parseFloat(st.fontSize))<.11)||'1.6';const font=bar.querySelector('[data-context-font]');font.value=[...font.options].some(o=>o.value&&st.fontFamily.includes(o.value))?[...font.options].find(o=>o.value&&st.fontFamily.includes(o.value)).value:'';}
      [heading,excerpt,body].forEach(el=>el.addEventListener('click',e=>{const candidate=el===body?e.target.closest('p,h2,h3,h4,blockquote,figure,.foro-template-columns')||body:el;choose(candidate);}));
      bar.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault();const selection=doc.getSelection();if(selection?.rangeCount)savedRange=selection.getRangeAt(0).cloneRange();});
      bar.querySelector('[data-context-font]').onchange=e=>{currentBlock().style.fontFamily=e.target.value||'';sync()};
      bar.querySelector('[data-context-size]').onchange=e=>{currentBlock().style.fontSize=Math.max(10,Math.min(144,+e.target.value||18))+'px';sync()};
      bar.querySelector('[data-context-leading]').onchange=e=>{currentBlock().style.lineHeight=e.target.value;sync()};
      bar.querySelectorAll('[data-context-align]').forEach(btn=>btn.onclick=()=>{currentBlock().style.textAlign=btn.dataset.contextAlign;sync()});
      bar.querySelectorAll('[data-context-command]').forEach(btn=>btn.onclick=()=>{if(savedRange){const sel=doc.getSelection();sel.removeAllRanges();sel.addRange(savedRange);}doc.execCommand(btn.dataset.contextCommand,false,null);sync()});
      bar.querySelectorAll('[data-context-add]').forEach(btn=>btn.onclick=()=>{const corresponding=document.querySelector('[data-article-add="'+btn.dataset.contextAdd+'"]');if(corresponding)corresponding.click();else toast('No se pudo insertar el bloque');});
      bar.querySelector('[data-context-save]').onclick=()=>saveVisualArticle();
      choose(heading);
      // Avoid overlapping the older general toolbar with this article-specific editor.
      doc.querySelector('.cms-inline-toolbar')?.remove();
    }
    if(!doc.getElementById('foro-visual-block-outline')){const st=doc.createElement('style');st.id='foro-visual-block-outline';st.textContent='.foro-visual-block-active{outline:2px solid #00a3cf!important;outline-offset:4px}.foro-template-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2rem}@media(max-width:700px){.foro-template-columns{grid-template-columns:1fr!important}}';doc.head.append(st)}

  }
  async function saveVisualArticle(){
    if(!visualArticle||!articleDraft)return;
    const status=document.querySelector('.foro-article-save-status');
    try{
      if(status)status.textContent='Guardando…';
      const saved=await db.savePost(articleDraft);
      posts=posts.map(p=>p.id===saved.id?saved:p);
      visualArticle=saved;articleDraft=clone(saved);
      if(status)status.textContent='Artículo guardado. Los cambios se muestran en el sitio publicado.';
      toast('Artículo actualizado');
    }catch(error){if(status)status.textContent='No se pudo guardar: '+error.message;toast(error.message)}
  }
  function openVisualArticle(post){
    visualArticle=post;articleDraft=clone(post);activeVisualArticleBlock=null;
    builderPage='article';selectedBuilderBlock=-1;
    $('#visualFrame').src=`../articulo.html?slug=${encodeURIComponent(post.slug)}&cms_live_preview=1&cms_inline_edit=1&t=${Date.now()}`;
    renderBuilder();
  }
  function renderVisualSectionTree(){
    if(builderPage==='article')return articleVisualTree();
    const home=builderPage==='home',foro=builderPage==='el-foro';
    if(home){return `<div class="section-tree"><strong>Secciones de Inicio</strong>${(state.sections||[]).map((x,i)=>`<div class="section-tree-row ${i===activeBuilderSection?'active':''} ${x.enabled===false?'muted':''}" data-tree-i="${i}"><button class="tree-name" data-tree-select="${i}" title="Seleccionar sección">${i+1}. ${esc(x.label||x.type)}</button><button data-tree-op="edit" title="Editar sección">✎</button><button data-tree-op="toggle" title="Mostrar u ocultar">${x.enabled===false?'◉':'◌'}</button><button data-tree-op="up" title="Subir">↑</button><button data-tree-op="down" title="Bajar">↓</button><button data-tree-op="copy" title="Duplicar">⧉</button><button data-tree-op="delete" title="Eliminar">×</button></div>`).join('')}<p class="section-tree-note">Cada sección puede editarse, moverse, duplicarse, ocultarse o eliminarse. Los bloques nuevos se insertan dentro de la sección seleccionada.</p><button type="button" id="treeAddSection">+ Nueva sección</button></div>`}
    if(foro){const d=state.pages?.['el-foro']||{};const ids=['hero','quienes-somos','mision','metodologia','comision'];const labels={hero:'Portada institucional','quienes-somos':'Quiénes somos',mision:'Misión y visión',metodologia:'Metodología',comision:'Comisión promotora'};const order=[...new Set([...(d.layoutOrder||[]),...ids])].filter(id=>ids.includes(id));return `<div class="section-tree"><strong>Secciones de El Foro</strong>${order.map((id,i)=>`<div class="section-tree-row ${d.hiddenSections?.includes(id)?'muted':''}" data-foro-i="${i}" data-foro-id="${id}"><button class="tree-name" data-foro-focus="${id}">${i+1}. ${labels[id]}</button><button data-foro-op="toggle" title="Mostrar u ocultar">${d.hiddenSections?.includes(id)?'◉':'◌'}</button><button data-foro-op="up" title="Subir">↑</button><button data-foro-op="down" title="Bajar">↓</button></div>`).join('')}<p class="section-tree-note">Los bloques institucionales originales pueden ordenarse y ocultarse; sus textos se editan directamente sobre el lienzo o desde Páginas.</p></div>`}
    const pageTitles={conocimiento:'Conocimiento',actividades:'Actividades',voces:'Voces',participa:'Participá',newsletter:'Newsletter'};
    const nodes=Array.from($('#visualFrame')?.contentDocument?.querySelectorAll('#main > section, #main > article, #main > div')||[]);
    const labels=nodes.map((node,i)=>node.querySelector('h1,h2,h3')?.textContent?.trim().slice(0,55)||['Portada','Contenido','Publicaciones','Información'][i]||'Sección '+(i+1));
    return `<div class="section-tree"><strong>Secciones de ${esc(pageTitles[builderPage]||builderPage)}</strong>${labels.map((label,i)=>`<div class="section-tree-row" data-interior-index="${i}"><button type="button" class="tree-name" data-interior-focus="${i}" title="Ver sección">${i+1}. ${esc(label)}</button><button type="button" data-interior-edit="${i}" title="Editar contenido">✎</button></div>`).join('')}<p class="section-tree-note">Seleccioná la sección para verla en el lienzo. Podés editar sus textos haciendo clic en ellos; para agregar nuevos bloques, utilizá el constructor de abajo. Los contenidos originales también se administran desde Páginas.</p><div class="foro-interior-quick"><strong>Encabezado de página</strong><label>Título<input data-interior-field="title" value="${esc(state.pages?.[builderPage]?.collectionTitle||'') }" placeholder="Utiliza título institucional"></label><label>Descripción<textarea data-interior-field="description" placeholder="Utiliza descripción institucional">${esc(state.pages?.[builderPage]?.collectionDescription||'')}</textarea></label></div><button type="button" data-interior-page-edit>Editar contenido de esta página</button><button type="button" data-interior-clear-extra class="btn ghost">Eliminar contenido adicional de esta página</button><small class="section-tree-note">Esta acción elimina los bloques agregados fuera de la estructura principal, como imágenes sueltas debajo de Conocimiento.</small></div>`;
  }
  function wireVisualSectionTree(host){
    host.querySelectorAll('[data-interior-field]').forEach(field=>field.addEventListener('input',()=>{const page=state.pages[builderPage]||(state.pages[builderPage]={});if(field.dataset.interiorField==='title')page.collectionTitle=field.value;else page.collectionDescription=field.value;markDirty({preserveVisualFocus:true});pushPreview()}));
    host.querySelectorAll('[data-interior-focus]').forEach(btn=>btn.onclick=()=>{
      const index=Number(btn.dataset.interiorFocus);const doc=$('#visualFrame')?.contentDocument;
      const sections=doc?.querySelectorAll('#main > section, #main > article, #main > div');
      sections?.[index]?.scrollIntoView({behavior:'smooth',block:'start'});
      host.querySelectorAll('[data-interior-index]').forEach(row=>row.classList.toggle('is-current',Number(row.dataset.interiorIndex)===index));
    });
    host.querySelectorAll('[data-interior-edit]').forEach(btn=>btn.onclick=()=>{const index=Number(btn.dataset.interiorEdit);host.querySelector(`[data-interior-focus="${index}"]`)?.click();setView('pages')});
    host.querySelector('[data-interior-page-edit]')?.addEventListener('click',()=>setView('pages'));
    host.querySelector('[data-interior-clear-extra]')?.addEventListener('click',()=>{
      const page=state.pages?.[builderPage];if(!page)return;
      if(!confirm('¿Eliminar todos los bloques adicionales de esta página? No modifica artículos ni la sección principal.'))return;
      page.extraHtml='';page.visualBlocks=[];markDirty();pushPreview();renderBuilder();renderPages();toast('Contenido adicional quitado. Publicá el sitio para aplicar el cambio.');
    });
    host.querySelectorAll('[data-tree-select]').forEach(b=>b.onclick=()=>{activeBuilderSection=+b.dataset.treeSelect;selectedBuilderBlock=-1;renderBuilder();const frame=$('#visualFrame');try{frame.contentDocument.querySelector(`[data-section-index="${activeBuilderSection}"]`)?.scrollIntoView({behavior:'smooth',block:'start'})}catch(e){}});
    host.querySelectorAll('[data-tree-op]').forEach(b=>b.onclick=()=>{const row=b.closest('[data-tree-i]'),i=+row.dataset.treeI,op=b.dataset.treeOp;if(op==='edit'){openSectionEditor(i);return}if(op==='delete'){if(!confirm('¿Eliminar esta sección y sus contenidos?'))return;state.sections.splice(i,1)}else if(op==='copy'){const c=clone(state.sections[i]);c.id=uid('section');c.label=(c.label||'Sección')+' — copia';state.sections.splice(i+1,0,c)}else if(op==='toggle'){state.sections[i].enabled=state.sections[i].enabled===false}else{const j=i+(op==='up'?-1:1);if(j<0||j>=state.sections.length)return;[state.sections[i],state.sections[j]]=[state.sections[j],state.sections[i]]}activeBuilderSection=Math.min(activeBuilderSection,state.sections.length-1);selectedBuilderBlock=-1;builderSync();renderBuilder();renderSections()});
    host.querySelector('#treeAddSection')?.addEventListener('click',()=>$('#addSection')?.click());
    host.querySelectorAll('[data-foro-focus]').forEach(b=>b.onclick=()=>{try{const id=b.dataset.foroFocus;const doc=$('#visualFrame').contentDocument;const node=id==='hero'?doc.querySelector('.internal-hero'):doc.getElementById(id);node?.scrollIntoView({behavior:'smooth',block:'start'})}catch(e){}});
    host.querySelectorAll('[data-foro-op]').forEach(b=>b.onclick=()=>{const row=b.closest('[data-foro-id]'),id=row.dataset.foroId,op=b.dataset.foroOp;const d=state.pages['el-foro'];d.hiddenSections??=[];let order=[...new Set([...(d.layoutOrder||[]),'hero','quienes-somos','mision','metodologia','comision'])];if(op==='toggle'){d.hiddenSections=d.hiddenSections.includes(id)?d.hiddenSections.filter(x=>x!==id):[...d.hiddenSections,id]}else{const i=order.indexOf(id),j=i+(op==='up'?-1:1);if(j<0||j>=order.length)return;[order[i],order[j]]=[order[j],order[i]];d.layoutOrder=order}builderSync();renderBuilder();renderPages()});
  }
  function renderBuilder(){
    if(builderPage==='article'){
      const host=$('#foroBuilder');
      if(host){host.innerHTML=articleVisualTree();host.querySelector('[data-article-back]')?.addEventListener('click',()=>{visualArticle=null;articleDraft=null;builderPage='conocimiento';$('#visualPage').value='../conocimiento.html';renderBuilder();reloadVisual()});host.querySelector('[data-article-save]')?.addEventListener('click',saveVisualArticle);host.querySelectorAll('[data-article-jump]').forEach(btn=>btn.onclick=()=>$('#visualFrame')?.contentDocument?.querySelector(btn.dataset.articleJump)?.scrollIntoView({behavior:'smooth',block:'center'}));
        function applyVisualBlock(fn){const f=$('#visualFrame'),doc=f?.contentDocument,body=doc?.querySelector('.article-body');const block=activeVisualArticleBlock;if(!body||!block||!body.contains(block)){toast('Seleccioná un bloque dentro del cuerpo del artículo');return}fn(block,doc,body);body.dispatchEvent(new Event('input',{bubbles:true}));}
        for(const [attr,style] of [['data-article-font','fontFamily'],['data-article-size','fontSize'],['data-article-leading','lineHeight'],['data-article-align','textAlign']]){
          host.querySelector('['+attr+']')?.addEventListener('change',e=>applyVisualBlock(b=>{b.style[style]=style==='fontSize'?e.target.value+'px':e.target.value;}));
        }
        host.querySelector('[data-article-structure]')?.addEventListener('change',e=>applyVisualBlock((b,doc)=>{if(!['P','H2','H3','BLOCKQUOTE'].includes(b.tagName))return;const replacement=doc.createElement(e.target.value);replacement.innerHTML=b.innerHTML;replacement.style.cssText=b.style.cssText;b.replaceWith(replacement);activeVisualArticleBlock=replacement;}));
        host.querySelectorAll('[data-article-add]').forEach(btn=>btn.onclick=()=>{
          const kind=btn.dataset.articleAdd;
          const f=$('#visualFrame'),doc=f?.contentDocument,body=doc?.querySelector('.article-body');if(!body)return;
          const add=el=>{if(activeVisualArticleBlock&&body.contains(activeVisualArticleBlock))activeVisualArticleBlock.after(el);else body.append(el);el.scrollIntoView({behavior:'smooth',block:'center'});body.dispatchEvent(new Event('input',{bubbles:true}));};
          if(kind==='image'||kind==='youtube'){
            chooseRichMedia(kind,raw=>{
              const fig=doc.createElement('figure');fig.className='rich-media';
              if(kind==='youtube'){
                const id=richYouTubeId(raw);if(!id){toast('Enlace de YouTube inválido');return}fig.classList.add('rich-youtube');fig.dataset.youtube=id;
                const frame=doc.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+id+'?rel=0&controls=1';frame.title='Video de YouTube';frame.allowFullscreen=true;fig.append(frame);
              }else{const img=doc.createElement('img');img.src=raw;img.alt='Imagen del artículo';fig.append(img);}
              add(fig);
            });return;
          }
          let el;
          if(kind==='columns'){el=doc.createElement('div');el.className='foro-template-columns';el.innerHTML='<div><h3>Primera columna</h3><p>Editá este texto.</p></div><div><h3>Segunda columna</h3><p>Editá este texto.</p></div>';}
          else{el=doc.createElement(kind);el.textContent=kind==='h2'?'Nuevo título':'Nuevo párrafo';}
          add(el);
        });
        host.querySelector('[data-article-block-up]')?.addEventListener('click',()=>applyVisualBlock(b=>b.previousElementSibling?.before(b)));
        host.querySelector('[data-article-block-down]')?.addEventListener('click',()=>applyVisualBlock(b=>b.nextElementSibling?.after(b)));
        host.querySelector('[data-article-block-delete]')?.addEventListener('click',()=>applyVisualBlock(b=>{if(confirm('¿Eliminar este bloque del artículo?')){b.remove();activeVisualArticleBlock=null;}}));
}
      return;
    }

    const host=$('#foroBuilder');if(!host)return;
    const isHome=builderPage==='home';const blocks=builderPage==='article'?[]:ensureBuilderBlocks();
    const sections=(state.sections||[]).map((x,i)=>`<option value="${i}" ${i===activeBuilderSection?'selected':''}>${esc(x.name||x.content?.title||x.type||'Sección '+(i+1))}</option>`).join('');
    host.innerHTML=`${renderVisualSectionTree()}<div class="builder-bar"><div><b>Constructor visual · bloques independientes</b><small>Seleccioná una sección, insertá bloques y observá los cambios en el lienzo.</small></div>${isHome?`<select id="builderSection" aria-label="Sección">${sections}</select>`:'<small>Bloques adicionales de la página</small>'}</div><div class="builder-tools">${builderTypes.map(([id,n])=>`<button type="button" data-builder-add="${id}">+ ${n}</button>`).join('')}</div><div class="builder-workspace"><div class="builder-list" id="builderList">${blocks.length?blocks.map((b,i)=>`<button type="button" class="builder-item ${selectedBuilderBlock===i?'selected':''}" data-builder-item="${i}" draggable="true"><span class="builder-handle">⠿</span><span><strong>${esc(builderTypes.find(x=>x[0]===b.type)?.[1]||b.type)}</strong><small>${esc((b.text||b.src||'Sin contenido').slice(0,75))}</small></span><span class="builder-item-actions" data-builder-controls="${i}"><i data-builder-act="up" title="Subir">↑</i><i data-builder-act="down" title="Bajar">↓</i><i data-builder-act="duplicate" title="Duplicar">⧉</i><i data-builder-act="delete" title="Eliminar">×</i></span></button>`).join(''):'<p class="builder-empty">Insertá un bloque para comenzar a diseñar esta sección.</p>'}</div><div class="builder-inspector" id="builderInspector">${selectedBuilderBlock>=0&&blocks[selectedBuilderBlock]?renderBuilderInspector(blocks[selectedBuilderBlock]):'<p>Elegí un bloque para editar sus propiedades.</p>'}</div></div>`;
    wireVisualSectionTree(host);
    $('#builderSection')?.addEventListener('change',e=>{activeBuilderSection=Number(e.target.value);selectedBuilderBlock=-1;renderBuilder()});
    host.querySelectorAll('[data-builder-add]').forEach(el=>el.onclick=()=>{const type=el.dataset.builderAdd;blocks.push({id:uid('block'),type,text:['h2','h3','p','blockquote'].includes(type)?'Escribí acá…':'',src:'',alt:'',caption:'',style:{align:'left',lineHeight:1.5,fontFamily:'',fontSize:''}});selectedBuilderBlock=blocks.length-1;builderSync();renderBuilder()});
    host.querySelectorAll('[data-builder-item]').forEach(el=>{
      el.onclick=e=>{const act=e.target.closest('[data-builder-act]');let i=Number(el.dataset.builderItem);if(act){const op=act.dataset.builderAct;if(op==='delete'){if(!confirm('¿Eliminar este bloque?'))return;blocks.splice(i,1);selectedBuilderBlock=-1}else if(op==='duplicate'){blocks.splice(i+1,0,clone({...blocks[i],id:uid('block')}));selectedBuilderBlock=i+1}else{const j=i+(op==='up'?-1:1);if(j>=0&&j<blocks.length){[blocks[i],blocks[j]]=[blocks[j],blocks[i]];selectedBuilderBlock=j}}builderSync();renderBuilder();return}selectedBuilderBlock=i;renderBuilder()};
      el.ondragstart=e=>{e.dataTransfer.setData('text/x-foro-block-index',el.dataset.builderItem);e.dataTransfer.effectAllowed='move'};
      el.ondragover=e=>e.preventDefault();el.ondrop=e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/x-foro-block-index')),to=Number(el.dataset.builderItem);if(Number.isInteger(from)&&from>=0&&from<blocks.length&&to>=0&&to<blocks.length&&from!==to){const [item]=blocks.splice(from,1);blocks.splice(to,0,item);selectedBuilderBlock=to;builderSync();renderBuilder()}};
    });
    $('#builderInspector')?.querySelectorAll('[data-bprop]').forEach(el=>el.addEventListener('input',()=>{const b=blocks[selectedBuilderBlock];if(!b)return;const path=el.dataset.bprop.split('.');if(path.length===2){b[path[0]]??={};b[path[0]][path[1]]=el.value}else b[path[0]]=el.value;builderSync();const label=host.querySelector(`.builder-item.selected small`);if(label&&['text','src'].includes(path[0]))label.textContent=el.value.slice(0,75)}));
    $('#builderInspector')?.querySelector('[data-builder-library]')?.addEventListener('click',()=>{const type=blocks[selectedBuilderBlock]?.type;if(!['image','video'].includes(type))return;chooseRichMedia(type,url=>{blocks[selectedBuilderBlock].src=url;builderSync();renderBuilder()})});
    $('#builderInspector')?.querySelector('[data-builder-upload]')?.addEventListener('change',async e=>{
      const file=e.target.files?.[0];const index=selectedBuilderBlock;const block=blocks[index];
      const status=$('#builderInspector [data-builder-upload-status]');
      if(!file||!block)return;
      if(block.type==='image'&&!file.type.startsWith('image/')){if(status)status.textContent='Seleccioná una imagen válida.';return}
      if(block.type==='video'&&!file.type.startsWith('video/')){if(status)status.textContent='Seleccioná un video válido.';return}
      if(file.size>150*1024*1024){if(status)status.textContent='El archivo supera el límite de 150 MB.';return}
      e.target.disabled=true;if(status)status.textContent='Subiendo '+file.name+'…';
      try{const asset=await db.uploadMedia(file);mediaAssets.unshift(asset);block.src=asset.url;block.alt=block.alt||file.name;builderSync();renderBuilder();toast('Medio subido y agregado a la sección. Recordá publicar el sitio.');}
      catch(err){e.target.disabled=false;if(status)status.textContent='Error al subir: '+err.message;toast('No se pudo subir el archivo: '+err.message)}
    });
  }
  function renderBuilderInspector(b){const fonts=['','Instrument Serif','Newsreader','DM Sans','Inter','Lora','Libre Baskerville','Playfair Display','Montserrat','Manrope'];return `<div class="builder-inspector-title">Editar ${esc(builderTypes.find(x=>x[0]===b.type)?.[1]||b.type)}</div>${['p','h2','h3','blockquote'].includes(b.type)?`<label>Texto (Enter crea un párrafo visible)<textarea rows="5" data-bprop="text">${esc(b.text||'')}</textarea></label>`:''}${['image','video','youtube'].includes(b.type)?`<label>URL del medio<input data-bprop="src" value="${esc(b.src||'')}" placeholder="https://..."></label>${b.type!=='youtube'?'<button type="button" data-builder-library>Elegir desde biblioteca</button><label class="builder-inline-upload">Subir imagen o video desde mi PC<input type="file" data-builder-upload accept="image/*,video/mp4,video/webm"></label><div class="builder-inline-status" data-builder-upload-status role="status"></div>':''}<label>Texto alternativo / descripción<input data-bprop="alt" value="${esc(b.alt||'')}"></label><label>Epígrafe<input data-bprop="caption" value="${esc(b.caption||'')}"></label>`:''}${['p','h2','h3','blockquote'].includes(b.type)?`<label>Tipografía<select data-bprop="style.fontFamily">${fonts.map(f=>`<option value="${esc(f)}" ${b.style?.fontFamily===f?'selected':''}>${esc(f||'Tipografía global')}</option>`).join('')}</select></label><label>Alineación<select data-bprop="style.align">${['left','center','right','justify'].map(x=>`<option ${b.style?.align===x?'selected':''} value="${x}">${x}</option>`).join('')}</select></label><label>Interlineado<select data-bprop="style.lineHeight">${['1','1.2','1.4','1.5','1.6','1.8','2'].map(x=>`<option ${String(b.style?.lineHeight)===x?'selected':''} value="${x}">${x}</option>`).join('')}</select></label><label>Tamaño (px)<input type="number" data-bprop="style.fontSize" min="10" max="150" value="${esc(b.style?.fontSize||'')}"></label>`:''}`}
  function visualUrl(){const base=$('#visualPage').value;return `${base}${base.includes('?')?'&':'?'}cms_inline_edit=1&t=${Date.now()}`}
  function resizeVisual(){const stage=$('#visualStage'),frame=$('#visualFrame');if(!stage||!frame)return;const widths={desktop:1440,tablet:834,mobile:390};const target=widths[visualDevice];const scale=Math.min(1,Math.max(.3,(stage.clientWidth-10)/target));frame.style.width=`${target}px`;frame.style.height=`${Math.max(800,stage.clientHeight/scale)}px`;frame.style.transform=`scale(${scale})`;frame.style.left=`${Math.max(0,(stage.clientWidth-target*scale)/2)}px`}
  function pushPreview(){['visualFrame','previewFrame'].forEach(id=>{const f=$('#'+id);if(f?.contentWindow)f.contentWindow.postMessage({type:'foro:cms-preview',payload:state,posts:posts.filter(p=>p.status==='published'),events:events.filter(e=>e.status==='published')},'*')})}
  function reloadVisual(){const f=$('#visualFrame');f.src=visualUrl()}
  function refreshPreview(){const f=$('#previewFrame');f.src=`../index.html?cms_live_preview=1&t=${Date.now()}`}

  async function loadInitial(){try{const remote=await db.loadSiteContent();state=remote?migrateLegacyPalette(mergeDeep(clone(defaults),remote)):clone(defaults);clearDirty();await Promise.all([loadPosts(),loadEvents(),loadMedia(),loadInquiries(),loadNewsletter(),loadHistory()]);renderAll();pushPreview()}catch(e){toast('Error cargando CMS: '+e.message)}}
  async function applyRoleAccess(){try{const {data:{user}}=await db.client.auth.getUser();const {data}=await db.client.from('cms_profiles').select('role').eq('user_id',user.id).maybeSingle();if(!data?.role){toast('Este usuario no tiene acceso al CMS');await db.client.auth.signOut();return;}myRole=data.role;$$('[data-view="users"]').forEach(el=>el.style.display=myRole==='admin'?'':'none');const allowed=myRole==='admin'?null:myRole==='editor'?['dashboard','posts','events','media','visual','preview','pages','home','resources']:['dashboard','posts','media','preview'];$$('[data-view]',document).forEach(el=>{if(allowed&&!allowed.includes(el.dataset.view))el.style.display='none'});if(myRole!=='admin')$('#publishSite').style.display='none';$('#userRoleLabel').textContent='Rol: '+myRole}catch(e){console.warn('No fue posible determinar el rol',e)}}
  async function setSession(session){const logged=Boolean(session?.user);$('#authScreen').classList.toggle('hidden',logged);if(logged){$('#userEmail').textContent=session.user.email||'Usuario';$('#accountButton').textContent=(session.user.email||'A')[0].toUpperCase();await loadInitial();await applyRoleAccess()}}
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
  $('#applySection').onclick=()=>{const d=$('#sectionDialog')._draft;d.extraHtml=$('[data-rich-editor]',$('#sectionEditorBody'))?.innerHTML||'';state.sections[editingSection]=clone(d);$('#sectionDialog').close();editingSection=null;markDirty();renderSections();renderDashboard();toast('Bloque actualizado')};
  $('#resetTheme').onclick=()=>{if(confirm('¿Restaurar diseño por defecto?')){state.theme=clone(defaults.theme);markDirty();renderDesign()}};
  $('#addNav').onclick=()=>{state.navigation.push({id:uid('nav'),label:'Nuevo enlace',href:'biblioteca-recursos.html',featured:false,children:[]});markDirty();renderNavigation()};
  $('#newResource').onclick=()=>{openPost();editingPost.type='resource';const t=$('#peType');if(t)t.value='resource';};$('#inviteSubmit').onclick=inviteCollaborator;$('#newPost').onclick=()=>openPost();$('#savePost').onclick=savePost;$('#postSearch').oninput=renderPosts;$('#postStatusFilter').onchange=renderPosts;
  $('#newEvent').onclick=()=>openEvent();$('#saveEvent').onclick=saveEvent;
  $('#mediaSearch').oninput=renderMedia;$('#mediaUpload').onchange=async e=>{for(const file of [...e.target.files]){try{toast(`Subiendo ${file.name}…`);await db.uploadMedia(file)}catch(err){toast(`Error en ${file.name}: ${err.message}`)}}e.target.value='';await loadMedia();toast('Carga finalizada')};
  $('#refreshInquiries').onclick=loadInquiries;$('#inquiryFilter').onchange=renderInquiries;$('#saveInquiry').onclick=saveInquiry;
  $('#newCampaign').onclick=()=>openCampaign();$('#saveCampaign').onclick=saveCampaign;
  $('#refreshHistory').onclick=loadHistory;
  $('#reloadJson').onclick=()=>{renderAdvanced();toast('JSON recargado desde el estado local')};
  $('#applyJson').onclick=()=>{try{const parsed=JSON.parse($('#advancedJson').value);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('El JSON debe ser un objeto');state=mergeDeep(clone(defaults),parsed);markDirty();renderAll();pushPreview();toast('JSON válido y aplicado localmente')}catch(e){toast('JSON inválido: '+e.message)}};
  $('#visualPage').onchange=()=>{const lookup={'../index.html':'home','../el-foro.html':'el-foro','../participa.html':'participa','../conocimiento.html':'conocimiento','../actividades.html':'actividades','../voces.html':'voces','../newsletter.html':'newsletter'};builderPage=lookup[$('#visualPage').value]||'home';visualArticle=null;articleDraft=null;selectedBuilderBlock=-1;renderBuilder();reloadVisual()};$('#visualReload').onclick=reloadVisual;$$('[data-device]').forEach(b=>b.onclick=()=>{visualDevice=b.dataset.device;$$('[data-device]').forEach(x=>x.classList.toggle('active',x===b));resizeVisual()});$('#visualFrame').onload=()=>{resizeVisual();setTimeout(pushPreview,120);if(builderPage==='article'){setTimeout(connectVisualArticle,700);}else if(builderPage!=='home'&&builderPage!=='el-foro')setTimeout(renderBuilder,240);
    // La selección de un artículo en Conocimiento abre su editor completo sin perder el lienzo.
    try{const documentInFrame=$('#visualFrame').contentDocument;
      documentInFrame?.addEventListener('click',event=>{const link=event.target.closest('a[href*="articulo.html"]');if(!link)return;const url=new URL(link.href,documentInFrame.location.href);const slug=url.searchParams.get('slug');const post=posts.find(p=>p.slug===slug);if(post){event.preventDefault();openVisualArticle(post);}},true);
    }catch(error){console.warn('No se pudo conectar el editor de artículos al lienzo',error)}
  };
  $('#previewReload').onclick=refreshPreview;$('#previewFrame').onload=()=>setTimeout(pushPreview,100);
  if('ResizeObserver'in window)new ResizeObserver(resizeVisual).observe($('#visualStage'));else addEventListener('resize',resizeVisual);
  addEventListener('message',e=>{const m=e.data||{};if(m.type==='foro:inline-change'&&typeof m.path==='string'&&m.path.length<180){setPath(state,m.path,m.value);markDirty({preserveVisualFocus:true})}if(m.type==='foro:inline-rich'&&typeof m.path==='string'&&m.path.length<180&&typeof m.html==='string'&&m.html.length<150000){state.site.inlineRich??={};state.site.inlineRich[m.path]=m.html;markDirty({preserveVisualFocus:true})}if(m.type==='foro:inline-style'&&['fontFamily','fontSize','lineHeight','textAlign','fontWeight','fontStyle'].includes(m.key)&&typeof m.path==='string'&&typeof m.value==='string'){state.site.inlineStyles??={};state.site.inlineStyles[m.path]??={};state.site.inlineStyles[m.path][m.key]=m.value;markDirty({preserveVisualFocus:true})}if(m.type==='foro:section-select'&&Number.isInteger(m.index)){activeBuilderSection=m.index;selectedBuilderBlock=-1;renderBuilder();}
    if(m.type==='foro:section-delete'&&Number.isInteger(m.index)){
      if(builderPage==='home'){
        const idx=m.index;if(idx>=0&&idx<state.sections.length&&confirm('¿Eliminar esta sección completa? Podés recuperar una versión anterior desde Revisiones.')){state.sections.splice(idx,1);activeBuilderSection=Math.max(0,Math.min(idx,state.sections.length-1));markDirty();renderBuilder();renderSections()}
      }else if(builderPage==='el-foro'){
        const ids=['hero','quienes-somos','mision','metodologia','comision'],id=m.sectionId;
        if(ids.includes(id)&&confirm('¿Ocultar esta sección del sitio? El contenido se conserva y podés mostrarlo nuevamente desde el panel.')){const d=state.pages['el-foro'];d.hiddenSections??=[];if(!d.hiddenSections.includes(id))d.hiddenSections.push(id);markDirty();renderBuilder();renderPages()}
      }
    }
    if(m.type==='foro:edit-interior'&&m.page&&m.page===builderPage){renderBuilder();toast('Seleccioná el contenido desde el panel lateral o editá los textos directamente en la vista.')}if(m.type==='foro:open-pages')setView('pages');if(m.type==='foro:edit-section'&&Number.isInteger(m.index)){activeBuilderSection=m.index;builderPage='home';renderBuilder();openSectionEditor(m.index)}if(m.type==='foro:preview-ready')pushPreview()});
  addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
  boot();
})();
