(() => {
  const defaults = window.FORO_DEFAULT_CONTENT;
  const db = window.ForoDB;
  let state = structuredClone(defaults);
  let posts = structuredClone(window.FORO_STARTER_POSTS || []);
  let events = [];
  const qs = new URLSearchParams(location.search);
  const previewMode = qs.has('cms_live_preview') || qs.has('cms_inline_edit');
  const inlineMode = qs.has('cms_inline_edit');
  const page = document.body.dataset.page || 'home';

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = (v='') => String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const attr = esc;

  function mergeDeep(target, source) {
    if (!source || typeof source !== 'object') return target;
    Object.entries(source).forEach(([k,v]) => {
      if (Array.isArray(v)) target[k] = v;
      else if (v && typeof v === 'object') target[k] = mergeDeep(target[k] && typeof target[k] === 'object' ? target[k] : {}, v);
      else if (v !== undefined && v !== null) target[k] = v;
    });
    return target;
  }

  function setPath(obj, path, value) {
    const parts = path.split('.'); let cur = obj;
    parts.slice(0,-1).forEach(key => {
      const n = Number(key); const k = Number.isNaN(n) ? key : n;
      if (cur[k] == null) cur[k] = {};
      cur = cur[k];
    });
    const lastRaw = parts.at(-1); const last = Number(lastRaw); cur[Number.isNaN(last) ? lastRaw : last] = value;
  }

  function editable(tag, text, path, className='') {
    const edit = path ? ` data-cms-path="${attr(path)}"${inlineMode ? ' contenteditable="true" spellcheck="true"' : ''}` : '';
    return `<${tag}${className?` class="${className}"`:''}${edit}>${esc(text||'')}</${tag}>`;
  }

  function sanitizeRichHtml(html='') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const allowed = new Set(['P','H2','H3','H4','UL','OL','LI','STRONG','EM','B','I','A','BLOCKQUOTE','BR','HR','FIGURE','FIGCAPTION','IMG','CODE','PRE']);
    doc.body.querySelectorAll('*').forEach(el => {
      if (el.tagName === 'DIV' && el === doc.body.firstElementChild) return;
      if (!allowed.has(el.tagName)) { el.replaceWith(...el.childNodes); return; }
      [...el.attributes].forEach(a => {
        const safe = (el.tagName === 'A' && ['href','target','rel'].includes(a.name)) || (el.tagName === 'IMG' && ['src','alt','loading'].includes(a.name));
        if (!safe) el.removeAttribute(a.name);
      });
      if (el.tagName === 'A') {
        const href = el.getAttribute('href') || '';
        if (/^javascript:/i.test(href)) el.removeAttribute('href');
        el.setAttribute('rel','noopener noreferrer');
      }
      if (el.tagName === 'IMG') el.setAttribute('loading','lazy');
    });
    return doc.body.firstElementChild?.innerHTML || '';
  }

  function fmtDate(value, long=false) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('es-AR', long ? {day:'numeric',month:'long',year:'numeric'} : {day:'2-digit',month:'short',year:'numeric'}).format(d);
  }

  function slugify(v='') {
    return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }

  function applyTheme() {
    const t = state.theme || defaults.theme;
    const root = document.documentElement.style;
    Object.entries(t).forEach(([k,v]) => {
      const map = {background:'--bg',paper:'--paper',ink:'--ink',text:'--text',muted:'--muted',line:'--line',navy:'--navy',navyDeep:'--navy-deep',cyan:'--cyan',cyanSoft:'--cyan-soft',warm:'--warm',maxWidth:'--max-width',radius:'--radius',sectionSpace:'--section-space'};
      if (!map[k]) return;
      const unit = ['maxWidth','radius','sectionSpace'].includes(k) ? 'px' : '';
      root.setProperty(map[k], `${v}${unit}`);
    });
    root.setProperty('--font-body', `'${t.bodyFont || 'Manrope'}', system-ui, sans-serif`);
    root.setProperty('--font-heading', `'${t.headingFont || 'Source Serif 4'}', Georgia, serif`);
  }


  function setupAnalytics() {
    const id = (state.site?.analytics?.gtagId || '').trim();
    if (!id || document.querySelector('[data-foro-analytics]')) return;
    const s = document.createElement('script');
    s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`; s.dataset.foroAnalytics = '1';
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', id, { anonymize_ip: true });
  }
  function applySeo(meta={}) {
    const site = state.site || defaults.site;
    const title = meta.title || site.seo?.title || site.name;
    const description = meta.description || site.seo?.description || '';
    document.title = title;
    $('#metaDescription')?.setAttribute('content', description);
    $('#ogTitle')?.setAttribute('content', title);
    $('#ogDescription')?.setAttribute('content', description);
    $('#ogImage')?.setAttribute('content', new URL(meta.image || site.seo?.image || site.logo, location.href).href);
    $('#canonical')?.setAttribute('href', location.href.split('?')[0]);
  }

  function renderHeader() {
    const nav = state.navigation || [];
    const current = page;
    const navHtml = nav.map((n,i) => {
      const key = n.href?.split('.')[0] || '';
      const active = (current==='home' && key==='index') || current===key || (current==='post' && key==='conocimiento') || (current==='event' && key==='actividades');
      const children = (n.children||[]).length ? `<div class="nav-dropdown" role="group" aria-label="Subsecciones">${n.children.map(c=>`<a href="${attr(c.href)}">${esc(c.label)}</a>`).join('')}</div>` : '';
      return `<div class="nav-item ${active?'is-active':''} ${n.featured?'is-featured':''}"><a href="${attr(n.href)}">${esc(n.label)}${children?' <span class="chev">⌄</span>':''}</a>${children}</div>`;
    }).join('');
    $('#siteHeader').innerHTML = `
      <div class="header-inner shell">
        <a class="brand" href="index.html" aria-label="${attr(state.site?.name)}"><img src="${attr(state.site?.logo)}" alt="${attr(state.site?.name)}"></a>
        <nav class="desktop-nav" aria-label="Navegación principal">${navHtml}</nav>
        <div class="header-tools"><a class="search-link" href="buscar.html" aria-label="Buscar">⌕</a><button class="menu-toggle" id="menuToggle" aria-label="Abrir menú" aria-expanded="false"><span></span><span></span></button></div>
      </div>
      <div class="mobile-nav" id="mobileNav"><div class="mobile-nav-inner">${nav.map(n=>`<a class="${n.featured?'featured':''}" href="${attr(n.href)}">${esc(n.label)}</a>${(n.children||[]).map(c=>`<a class="sub" href="${attr(c.href)}">${esc(c.label)}</a>`).join('')}`).join('')}<a class="mobile-contact" href="mailto:${attr(state.site?.contactEmail)}">${esc(state.site?.contactEmail)}</a></div></div>`;
    const toggle = $('#menuToggle');
    toggle?.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    addEventListener('scroll', () => $('#siteHeader')?.classList.toggle('scrolled', scrollY > 18), {passive:true});
  }

  function renderFooter() {
    const s = state.site || defaults.site;
    const social = Object.entries(s.social || {}).filter(([,url])=>url);
    $('#siteFooter').innerHTML = `
      <div class="footer-top shell">
        <div class="footer-brand"><img src="assets/images/isotipo-blanco.png" alt=""><strong>${esc(s.shortName)}</strong><p>${esc(s.footerNote)}</p></div>
        <div class="footer-links"><div><span>Explorar</span><a href="el-foro.html">El Foro</a><a href="conocimiento.html">Conocimiento</a><a href="actividades.html">Actividades</a><a href="voces.html">Voces</a></div><div><span>Participar</span><a href="participa.html">Enviar una propuesta</a><a href="mailto:${attr(s.contactEmail)}">Contacto</a><a href="admin/">Administración</a></div></div>
        <div class="footer-newsletter"><span>BOLETÍN DEL FORO</span><h3>Ideas, informes y actividades en tu correo.</h3><form id="newsletterForm"><input type="email" name="email" placeholder="tu@email.com" required aria-label="Email"><button type="submit">Suscribirme</button><small id="newsletterStatus">Sin spam. <a href="newsletter.html">Gestioná tu suscripción</a> cuando quieras.</small></form></div>
      </div>
      <div class="footer-bottom shell"><span>© ${new Date().getFullYear()} ${esc(s.shortName)}</span><div>${social.map(([name,url])=>`<a href="${attr(url)}" target="_blank" rel="noopener">${esc(name)}</a>`).join('')}<a href="privacidad.html">Privacidad</a><a href="condiciones.html">Condiciones de uso</a></div></div>`;
    $('#newsletterForm')?.addEventListener('submit', async e => {
      e.preventDefault(); const email = new FormData(e.currentTarget).get('email')?.toString().trim(); const status = $('#newsletterStatus');
      if (!email) return;
      if (!db.configured) { status.textContent = `La suscripción quedará operativa al conectar Supabase. Mientras tanto podés escribir a ${s.contactEmail}.`; return; }
      try { status.textContent='Procesando…'; await db.subscribeNewsletter(email,'','footer'); e.currentTarget.reset(); status.textContent='Suscripción registrada.'; }
      catch (err) { status.textContent='No se pudo registrar. Intentá nuevamente.'; console.warn(err); }
    });
  }

  function sectionHead(s, i, width='wide') {
    return `<div class="section-head ${width}">${editable('span',s.content?.eyebrow,`sections.${i}.content.eyebrow`,'eyebrow')}${editable('h2',s.content?.title,`sections.${i}.content.title`)}${editable('p',s.content?.body,`sections.${i}.content.body`,'lead')}</div>`;
  }

  function renderHero(s,i) {
    const c=s.content||{};
    return `<section class="hero-forum" id="${attr(s.settings?.anchor||s.id)}" data-section-index="${i}">
      <div class="shell hero-editorial-layout">
        <div class="hero-heading-row"><span class="hero-side-index">FORO / ARGENTINA<br>ECONOMÍA DEL VISITANTE</span><div class="hero-headline">${editable('span',c.eyebrow,`sections.${i}.content.eyebrow`,'eyebrow')}${editable('h1',c.title,`sections.${i}.content.title`)}</div></div>
        <div class="hero-bottom-row"><div class="hero-abstract-mark"><img src="assets/images/isotipo-blanco.png" alt=""/><span>CONOCIMIENTO<br>ENCUENTRO<br>ACCIÓN</span></div><div class="hero-summary">${editable('p',c.body,`sections.${i}.content.body`,'hero-body')}<div class="hero-actions"><a class="btn primary" href="${attr(c.primaryHref)}">${esc(c.primaryLabel)} <span aria-hidden="true">↗</span></a><a class="btn text" href="${attr(c.secondaryHref)}">${esc(c.secondaryLabel)} <span aria-hidden="true">↗</span></a></div></div><span class="hero-vertical-id">UNA INICIATIVA ABIERTA Y COLABORATIVA</span></div>
      </div>
      <div class="hero-ribbon"><div class="shell"><span>Conocimiento</span><i></i><span>Encuentro</span><i></i><span>Acción</span></div></div>
    </section>`;
  }

  function renderConcept(s,i) {
    const c=s.content||{};
    return `<section class="section concept-section" id="${attr(s.settings?.anchor||s.id)}" data-section-index="${i}"><div class="shell concept-grid"><div>${editable('span',c.eyebrow,`sections.${i}.content.eyebrow`,'eyebrow')}${editable('h2',c.title,`sections.${i}.content.title`)}${editable('p',c.body,`sections.${i}.content.body`,'concept-lead')}${editable('p',c.note,`sections.${i}.content.note`,'concept-note')}</div><div class="sector-matrix">${(s.items||[]).map((x,j)=>`<div><span>${String(j+1).padStart(2,'0')}</span>${editable('strong',x,`sections.${i}.items.${j}`)}</div>`).join('')}</div></div></section>`;
  }

  function renderPillars(s,i) {
    return `<section class="section pillars-section" id="${attr(s.settings?.anchor||s.id)}" data-section-index="${i}"><div class="shell">${sectionHead(s,i)}<div class="pillar-grid">${(s.items||[]).map((x,j)=>`<a class="pillar-card" href="${attr(x.href||'#')}"><div class="pillar-number">${esc(x.number)}</div>${editable('h3',x.title,`sections.${i}.items.${j}.title`)}${editable('p',x.body,`sections.${i}.items.${j}.body`)}<span class="arrow">↗</span></a>`).join('')}</div></div></section>`;
  }

  const knowledgeTypes = new Set(['article','analysis','research','report','resource']);
  const voiceTypes = new Set(['interview','podcast','experience','case']);
  const typeNames = {article:'Artículo',analysis:'Análisis',research:'Investigación',report:'Informe',resource:'Recurso',interview:'Entrevista',podcast:'Podcast',experience:'Experiencia',case:'Caso territorial'};

  function postCard(p, large=false) {
    const href=`articulo.html?slug=${encodeURIComponent(p.slug)}`;
    return `<article class="post-card ${large?'large':''}"><a class="post-visual ${p.featured_image?'has-image':''}" href="${href}" ${p.featured_image?`style="background-image:url('${attr(p.featured_image)}')"`:''}><span>${esc(typeNames[p.type]||p.category||'Publicación')}</span>${!p.featured_image?`<div class="visual-mark">${esc((p.category||typeNames[p.type]||'FORO').slice(0,2).toUpperCase())}</div>`:''}</a><div class="post-copy"><div class="post-meta"><span>${esc(p.category||typeNames[p.type]||'Conocimiento')}</span><time>${esc(fmtDate(p.published_at))}</time></div><h3><a href="${href}">${esc(p.title)}</a></h3><p>${esc(p.excerpt||'')}</p><a class="read-link" href="${href}">Leer publicación <span>↗</span></a></div></article>`;
  }

  function renderCollection(s,i,kind='knowledge') {
    const pool = posts.filter(p => kind==='voices' ? voiceTypes.has(p.type) : knowledgeTypes.has(p.type));
    const list = pool.slice(0, Number(s.settings?.limit||3));
    const c=s.content||{};
    return `<section class="section feed-section" id="${attr(s.settings?.anchor||s.id)}" data-section-index="${i}"><div class="shell"><div class="feed-head">${sectionHead(s,i)}<a class="btn outline" href="${attr(c.ctaHref)}">${esc(c.ctaLabel)}</a></div>${list.length?`<div class="post-grid">${list.map((p,j)=>postCard(p,j===0&&list.length>2)).join('')}</div>`:`<div class="empty-state"><span>${esc(kind==='voices'?'VOCES':'CONOCIMIENTO')}</span><h3>${esc(c.emptyTitle||'Nuevos contenidos en preparación')}</h3><p>${esc(c.emptyBody||'Esta sección se actualizará con publicaciones confirmadas.')}</p></div>`}</div></section>`;
  }

  function eventCard(e) {
    const start=e.starts_at?new Date(e.starts_at):null;
    const day=start?String(start.getDate()).padStart(2,'0'):'—';
    const month=start?new Intl.DateTimeFormat('es-AR',{month:'short'}).format(start).replace('.','').toUpperCase():'PRÓX.';
    return `<article class="event-card"><div class="event-date"><strong>${day}</strong><span>${month}</span></div><div class="event-main"><div class="event-meta"><span>${esc(e.event_type||'Actividad')}</span>${e.location?`<span>${esc(e.location)}</span>`:''}</div><h3><a href="actividad.html?slug=${encodeURIComponent(e.slug)}">${esc(e.title)}</a></h3><p>${esc(e.excerpt||'')}</p></div><a class="event-arrow" href="actividad.html?slug=${encodeURIComponent(e.slug)}" aria-label="Ver actividad">↗</a></article>`;
  }

  function renderActivities(s,i) {
    const now=Date.now()-86400000;
    const list=events.filter(e=>!e.starts_at||new Date(e.starts_at).getTime()>=now).slice(0,Number(s.settings?.limit||3));
    const c=s.content||{};
    return `<section class="section agenda-section" id="${attr(s.settings?.anchor||s.id)}" data-section-index="${i}"><div class="shell"><div class="feed-head">${sectionHead(s,i)}<a class="btn outline light" href="${attr(c.ctaHref)}">${esc(c.ctaLabel)}</a></div>${list.length?`<div class="events-list">${list.map(eventCard).join('')}</div>`:`<div class="empty-state dark"><span>AGENDA ABIERTA</span><h3>${esc(c.emptyTitle)}</h3><p>${esc(c.emptyBody)}</p><a href="participa.html" class="read-link">Proponer una actividad <span>↗</span></a></div>`}</div></section>`;
  }

  function renderJoin(s,i) {
    const c=s.content||{};
    return `<section class="section join-section" id="${attr(s.settings?.anchor||s.id)}" data-section-index="${i}"><div class="shell join-grid"><div>${editable('span',c.eyebrow,`sections.${i}.content.eyebrow`,'eyebrow')}${editable('h2',c.title,`sections.${i}.content.title`)}${editable('p',c.body,`sections.${i}.content.body`)}</div><div class="join-actions"><a class="btn white" href="${attr(c.primaryHref)}">${esc(c.primaryLabel)}</a><a class="btn text light" href="${attr(c.secondaryHref)}">${esc(c.secondaryLabel)} <span>↗</span></a></div></div></section>`;
  }

  function renderHome() {
    const renderers = {heroForum:renderHero,conceptStatement:renderConcept,pillars:renderPillars,collectionFeed:(s,i)=>renderCollection(s,i,'knowledge'),activitiesFeed:renderActivities,voicesFeed:(s,i)=>renderCollection(s,i,'voices'),joinCta:renderJoin};
    $('#main').innerHTML = (state.sections||[]).map((s,i)=>s.enabled===false?'':(renderers[s.type]?.(s,i)||'')).join('');
  }

  function renderInternalHero(data, basePath) {
    return `<section class="internal-hero"><div class="shell internal-hero-grid"><div>${editable('span',data.eyebrow,`${basePath}.eyebrow`,'eyebrow')}${editable('h1',data.title,`${basePath}.title`)}${editable('p',data.body,`${basePath}.body`,'hero-body')}</div><div class="internal-mark"><img src="assets/images/isotipo-limpio.png" alt=""><span>ECONOMÍA DEL VISITANTE</span></div></div></section>`;
  }

  function renderForoPage() {
    const d=state.pages?.['el-foro']||defaults.pages['el-foro'];
    applySeo({title:`El Foro — ${state.site.shortName}`,description:d.hero.body});
    $('#main').innerHTML = `${renderInternalHero(d.hero,'pages.el-foro.hero')}
      <section class="section" id="quienes-somos"><div class="shell editorial-split"><div><span class="eyebrow">QUIÉNES SOMOS</span>${editable('h2',d.intro.title,'pages.el-foro.intro.title')}</div>${editable('p',d.intro.body,'pages.el-foro.intro.body','big-body')}</div></section>
      <section class="section mission-section" id="mision"><div class="shell"><div class="mission-grid"><div><span>01</span>${editable('h3',d.mission.missionTitle,'pages.el-foro.mission.missionTitle')}${editable('p',d.mission.missionBody,'pages.el-foro.mission.missionBody')}</div><div><span>02</span>${editable('h3',d.mission.visionTitle,'pages.el-foro.mission.visionTitle')}${editable('p',d.mission.visionBody,'pages.el-foro.mission.visionBody')}</div></div><div class="objectives"><div><span class="eyebrow">OBJETIVOS</span><h2>Qué busca impulsar el Foro</h2></div><ol>${(d.objectives||[]).map((x,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span>${editable('p',x,`pages.el-foro.objectives.${i}`)}</li>`).join('')}</ol></div></div></section>
      <section class="section method-section" id="metodologia"><div class="shell editorial-split"><div><span class="eyebrow">METODOLOGÍA</span>${editable('h2',d.methodology.title,'pages.el-foro.methodology.title')}</div>${editable('p',d.methodology.body,'pages.el-foro.methodology.body','big-body')}</div></section>
      <section class="section commission-section" id="comision"><div class="shell commission-card"><div><span class="eyebrow">GOBERNANZA</span>${editable('h2',d.commission.title,'pages.el-foro.commission.title')}</div>${editable('p',d.commission.body,'pages.el-foro.commission.body')}<a class="btn outline" href="participa.html">Contactar al Foro</a></div></section>`;
  }

  function collectionHeader(eyebrow,title,body) {
    return `<section class="collection-hero"><div class="shell"><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(body)}</p></div></section>`;
  }

  function renderKnowledgePage() {
    applySeo({title:`Conocimiento — ${state.site.shortName}`,description:'Artículos, análisis, investigaciones, informes y recursos sobre economía del visitante.'});
    const type=qs.get('tipo')||'';
    const valid=knowledgeTypes;
    const list=posts.filter(p=>!type||p.type===type).filter(p=>valid.has(p.type));
    const tabs=[['','Todo'],['article','Artículos'],['analysis','Análisis'],['research','Investigaciones'],['report','Informes'],['resource','Biblioteca']];
    $('#main').innerHTML = `${collectionHeader('CONOCIMIENTO','Ideas, datos y análisis para decidir mejor','Un espacio editorial para reunir investigaciones, perspectivas, informes y fuentes que ayuden a comprender la economía del visitante.')}
      <section class="section collection-section"><div class="shell"><div class="filter-tabs">${tabs.map(([k,l])=>`<a class="${type===k?'active':''}" href="conocimiento.html${k?`?tipo=${k}`:''}">${l}</a>`).join('')}</div><div class="post-grid collection-grid">${list.length?list.map(postCard).join(''):`<div class="empty-state"><span>EN PREPARACIÓN</span><h3>No hay publicaciones en esta categoría todavía</h3><p>El Foro prioriza publicar contenidos con autoría, fuentes y criterios editoriales definidos.</p></div>`}</div></div></section>`;
  }

  function renderVoicesPage() {
    applySeo({title:`Voces — ${state.site.shortName}`,description:'Entrevistas, podcast, experiencias y casos territoriales vinculados con la economía del visitante.'});
    const type=qs.get('tipo')||'';
    const list=posts.filter(p=>voiceTypes.has(p.type)&&(!type||p.type===type));
    const tabs=[['','Todo'],['interview','Entrevistas'],['podcast','Podcast'],['experience','Experiencias'],['case','Casos territoriales']];
    $('#main').innerHTML = `${collectionHeader('VOCES','Personas, experiencias y territorios','Perspectivas diversas para entender cómo se construye valor alrededor de quienes visitan y se desplazan entre territorios.')}
      <section class="section collection-section"><div class="shell"><div class="filter-tabs">${tabs.map(([k,l])=>`<a class="${type===k?'active':''}" href="voces.html${k?`?tipo=${k}`:''}">${l}</a>`).join('')}</div>${list.length?`<div class="post-grid collection-grid">${list.map(postCard).join('')}</div>`:`<div class="empty-state"><span>SECCIÓN ABIERTA</span><h3>Voces se construye con aportes reales</h3><p>No se publicarán entrevistas o casos ficticios para completar la portada. La sección crecerá con contenidos producidos y confirmados.</p><a class="btn primary" href="participa.html">Proponer una voz o experiencia</a></div>`}</div></section>`;
  }

  function renderActivitiesPage() {
    applySeo({title:`Actividades — ${state.site.shortName}`,description:'Agenda de encuentros, conversatorios, talleres, hackatones y proyectos del Foro.'});
    const type=qs.get('tipo')||'';
    const list=events.filter(e=>!type||e.event_type===type);
    const tabs=[['','Agenda'],['conversation','Conversatorios'],['workshop','Talleres'],['hackathon','Hackatones'],['project','Proyectos']];
    $('#main').innerHTML = `${collectionHeader('ACTIVIDADES','Encuentros para conectar conocimiento y acción','La agenda publica únicamente actividades confirmadas, con información clara de fecha, modalidad, responsables y forma de participación.')}
      <section class="section agenda-page"><div class="shell"><div class="filter-tabs light-tabs">${tabs.map(([k,l])=>`<a class="${type===k?'active':''}" href="actividades.html${k?`?tipo=${k}`:''}">${l}</a>`).join('')}</div>${list.length?`<div class="events-list page-list">${list.map(eventCard).join('')}</div>`:`<div class="empty-state dark"><span>AGENDA EN PREPARACIÓN</span><h3>No hay actividades públicas confirmadas todavía</h3><p>La web evita publicar fechas o encuentros sin confirmación. Podés proponer un tema o una actividad desde Participá.</p><a class="btn white" href="participa.html">Proponer una actividad</a></div>`}</div></section>`;
  }

  function renderParticipaPage() {
    const d=state.pages?.participa||defaults.pages.participa;
    applySeo({title:`Participá — ${state.site.shortName}`,description:d.hero.body});
    $('#main').innerHTML = `${renderInternalHero(d.hero,'pages.participa.hero')}
      <section class="section participation-options"><div class="shell"><div class="options-grid">${(d.options||[]).map((o,i)=>`<button class="option-card" data-option="${attr(o.type)}"><span>${String(i+1).padStart(2,'0')}</span>${editable('h3',o.title,`pages.participa.options.${i}.title`)}${editable('p',o.body,`pages.participa.options.${i}.body`)}<b>Elegir →</b></button>`).join('')}</div></div></section>
      <section class="section contact-section" id="formulario"><div class="shell contact-grid"><div><span class="eyebrow">CONTACTO</span><h2>Contanos qué querés aportar</h2><p>La consulta queda registrada en el panel del Foro y, al configurar la función de email, también genera una notificación en <strong>${esc(state.site.contactEmail)}</strong>.</p><div class="direct-mail"><span>Contacto directo</span><a href="mailto:${attr(state.site.contactEmail)}">${esc(state.site.contactEmail)}</a></div></div><form class="public-form" id="participationForm"><div class="form-row"><label>Nombre y apellido<input name="name" required maxlength="160"></label><label>Email<input name="email" type="email" required maxlength="240"></label></div><div class="form-row"><label>Organización<input name="organization" maxlength="200"></label><label>Tipo de aporte<select name="inquiry_type"><option value="general">Consulta general</option><option value="article">Artículo o investigación</option><option value="topic">Tema para debatir</option><option value="challenge">Desafío territorial</option><option value="collaboration">Colaboración</option></select></label></div><label>Asunto<input name="subject" required maxlength="240"></label><label>Mensaje<textarea name="message" required rows="7" maxlength="6000"></textarea></label><label>Enlace a documento o referencia <input name="reference_url" type="url" placeholder="https://"></label><label class="consent"><input type="checkbox" required> <span>Acepto que el Foro utilice estos datos para responder esta consulta.</span></label><button class="btn primary" type="submit">Enviar propuesta</button><p class="form-status" id="participationStatus"></p></form></div></section>`;
    $$('.option-card').forEach(b=>b.onclick=()=>{const sel=$('#participationForm select[name="inquiry_type"]');sel.value=b.dataset.option;$('#formulario').scrollIntoView({behavior:'smooth'});});
    $('#participationForm')?.addEventListener('submit',submitParticipation);
  }

  async function submitParticipation(e) {
    e.preventDefault(); const form=e.currentTarget; const status=$('#participationStatus'); const data=Object.fromEntries(new FormData(form));
    if (!db.configured) { status.innerHTML=`La base todavía no está conectada. Enviá tu consulta por email a <a href="mailto:${attr(state.site.contactEmail)}">${esc(state.site.contactEmail)}</a>.`; return; }
    try { status.textContent='Enviando…'; await db.submitInquiry({...data,source:'participa-web',status:'new'}); form.reset(); status.textContent='Recibimos tu propuesta. Quedó registrada para revisión.'; }
    catch (err) { console.warn(err); status.textContent='No se pudo enviar. Intentá nuevamente o escribí por email.'; }
  }

  function renderPostPage() {
    const slug=qs.get('slug')||'';
    let p=posts.find(x=>x.slug===slug);
    if (!p) { $('#main').innerHTML=notFound('Publicación no encontrada'); return; }
    applySeo({title:p.seo_title||`${p.title} — ${state.site.shortName}`,description:p.seo_description||p.excerpt,image:p.featured_image||state.site.seo?.image});
    const refs = Array.isArray(p.references) ? p.references : [];
    $('#main').innerHTML = `<article class="article-page"><header class="article-header"><div class="shell article-head-grid"><div><div class="article-kicker"><span>${esc(typeNames[p.type]||p.category||'Publicación')}</span><time>${esc(fmtDate(p.published_at,true))}</time></div><h1>${esc(p.title)}</h1><p>${esc(p.excerpt||'')}</p><div class="article-author"><strong>${esc(p.author_name||state.site.shortName)}</strong>${p.author_role?`<span>${esc(p.author_role)}</span>`:''}</div></div>${p.featured_image?`<div class="article-image" style="background-image:url('${attr(p.featured_image)}')"></div>`:`<div class="article-cover-abstract"><img src="${attr(state.site.icon)}" alt=""><span>${esc(p.category||'Conocimiento')}</span></div>`}</div></header><div class="shell article-layout"><aside><span>CONTENIDO</span><a href="#articulo">Artículo</a>${refs.length?'<a href="#fuentes">Fuentes</a>':''}<a href="participa.html">Enviar un aporte</a></aside><div class="article-body" id="articulo">${sanitizeRichHtml(p.content_html||'')}${refs.length?`<div class="references" id="fuentes"><h2>Fuentes y referencias</h2><ol>${refs.map(r=>`<li>${esc(r)}</li>`).join('')}</ol></div>`:''}</div></div></article>`;
  }

  function renderEventPage() {
    const slug=qs.get('slug')||''; const e=events.find(x=>x.slug===slug);
    if (!e) { $('#main').innerHTML=notFound('Actividad no encontrada'); return; }
    applySeo({title:e.seo_title||`${e.title} — ${state.site.shortName}`,description:e.seo_description||e.excerpt,image:e.featured_image||state.site.seo?.image});
    $('#main').innerHTML = `<article class="event-page"><header class="article-header event-detail"><div class="shell article-head-grid"><div><div class="article-kicker"><span>${esc(e.event_type||'Actividad')}</span><time>${esc(fmtDate(e.starts_at,true))}</time></div><h1>${esc(e.title)}</h1><p>${esc(e.excerpt||'')}</p><div class="event-facts"><div><span>Fecha y hora</span><strong>${esc(e.starts_at?new Intl.DateTimeFormat('es-AR',{dateStyle:'long',timeStyle:'short'}).format(new Date(e.starts_at)):'A confirmar')}</strong></div><div><span>Modalidad / lugar</span><strong>${esc(e.location||e.mode||'A confirmar')}</strong></div></div></div>${e.featured_image?`<div class="article-image" style="background-image:url('${attr(e.featured_image)}')"></div>`:`<div class="article-cover-abstract"><img src="${attr(state.site.icon)}" alt=""><span>ENCUENTRO</span></div>`}</div></header><div class="shell article-layout"><aside><span>ACTIVIDAD</span><a href="#detalle">Detalle</a>${e.registration_enabled?'<a href="#inscripcion">Inscripción</a>':''}<a href="actividades.html">Volver a agenda</a></aside><div class="article-body" id="detalle">${sanitizeRichHtml(e.content_html||'')}${e.registration_enabled?`<div class="registration-box" id="inscripcion"><h2>Inscripción</h2><p>${esc(e.registration_note||'Completá tus datos para registrar tu interés en esta actividad.')}</p><form id="eventRegistration" class="public-form compact"><input type="hidden" name="event_id" value="${attr(e.id)}"><div class="form-row"><label>Nombre<input name="name" required></label><label>Email<input name="email" type="email" required></label></div><label>Organización<input name="organization"></label><button class="btn primary" type="submit">Registrarme</button><p class="form-status" id="eventStatus"></p></form></div>`:''}</div></div></article>`;
    $('#eventRegistration')?.addEventListener('submit', async ev=>{
      ev.preventDefault(); const st=$('#eventStatus'); if(!db.configured){st.textContent='La inscripción quedará habilitada al conectar Supabase.';return;}try{st.textContent='Registrando…';await db.registerEvent(Object.fromEntries(new FormData(ev.currentTarget)));ev.currentTarget.reset();st.textContent='Inscripción registrada.';}catch(err){st.textContent='No se pudo registrar. Intentá nuevamente.';console.warn(err);}
    });
  }

  function renderSearchPage() {
    applySeo({title:`Buscar — ${state.site.shortName}`,description:'Buscador de contenidos del Foro.'});
    $('#main').innerHTML = `<section class="collection-hero search-hero"><div class="shell"><span class="eyebrow">BUSCAR</span><h1>Encontrá contenidos del Foro</h1><form id="searchForm"><input id="searchInput" type="search" placeholder="Buscar por tema, autor, categoría…" value="${attr(qs.get('q')||'')}"><button>Buscar</button></form></div></section><section class="section"><div class="shell"><div id="searchResults"></div></div></section>`;
    const run=()=>{const q=$('#searchInput').value.trim().toLowerCase();const hay=q?posts.filter(p=>[p.title,p.excerpt,p.category,p.author_name,...(p.tags||[])].join(' ').toLowerCase().includes(q)):[];$('#searchResults').innerHTML=q?(hay.length?`<p class="result-count">${hay.length} resultado${hay.length===1?'':'s'} para “${esc(q)}”</p><div class="post-grid collection-grid">${hay.map(postCard).join('')}</div>`:`<div class="empty-state"><h3>No encontramos resultados</h3><p>Probá con términos más amplios o revisá la sección Conocimiento.</p></div>`):`<div class="empty-state"><h3>Escribí un tema para empezar</h3><p>El buscador consulta publicaciones, etiquetas, categorías y autores.</p></div>`;};
    $('#searchForm').onsubmit=e=>{e.preventDefault();history.replaceState({},'',`buscar.html?q=${encodeURIComponent($('#searchInput').value)}`);run();};run();
  }

  function renderNewsletterPage() {
    applySeo({title:`Gestionar newsletter — ${state.site.shortName}`,description:'Alta y baja del boletín del Foro.'});
    const preset = qs.get('email') || '';
    $('#main').innerHTML = `${collectionHeader('BOLETÍN','Gestionar suscripción','Podés suscribirte o solicitar la baja del newsletter del Foro en cualquier momento.')}
      <section class="section"><div class="shell legal-copy newsletter-manage">
        <h2>Dar de baja una suscripción</h2>
        <p>Ingresá el correo que querés retirar de la base. La baja queda registrada en el sistema.</p>
        <form class="public-form compact-form" id="unsubscribeForm"><label>Email<input name="email" type="email" value="${attr(preset)}" required maxlength="240"></label><button class="btn primary" type="submit">Dar de baja</button><p class="form-status" id="unsubscribeStatus"></p></form>
      </div></section>`;
    $('#unsubscribeForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const email = new FormData(e.currentTarget).get('email')?.toString().trim();
      const status = $('#unsubscribeStatus');
      if (!email) return;
      if (!db.configured) { status.textContent='La gestión online estará disponible al conectar Supabase.'; return; }
      try {
        status.textContent='Procesando…';
        await db.unsubscribeNewsletter(email);
        status.textContent='Solicitud procesada. Si el correo estaba suscripto, quedó dado de baja.';
      } catch (err) { status.textContent='No se pudo procesar la baja. Intentá nuevamente.'; console.warn(err); }
    });
  }

  function renderLegal(kind) {
    const privacy=kind==='privacy';
    const title=privacy?'Política de privacidad':'Condiciones de uso';
    applySeo({title:`${title} — ${state.site.shortName}`,description:title});
    $('#main').innerHTML=`${collectionHeader('INFORMACIÓN LEGAL',title,privacy?'Criterios básicos sobre el tratamiento de datos recibidos a través del sitio.':'Condiciones generales para el uso del sitio y sus contenidos.')}
    <section class="section"><div class="shell legal-copy">${privacy?`<h2>Datos de contacto y participación</h2><p>Los datos enviados mediante formularios se utilizan para gestionar consultas, propuestas, inscripciones y suscripciones solicitadas por la persona usuaria. No se publican automáticamente.</p><h2>Boletín</h2><p>La suscripción al boletín puede cancelarse. La base debe utilizarse exclusivamente para comunicaciones del Foro.</p><h2>Administración</h2><p>El acceso al CMS requiere autenticación. La configuración recomendada utiliza Supabase con políticas de acceso a nivel de fila.</p>`:`<h2>Contenido editorial</h2><p>Las publicaciones deben identificar autoría, fecha, categoría y referencias cuando corresponda. Los datos deben distinguirse de las opiniones.</p><h2>Estado institucional</h2><p>El sitio no debe presentar al Foro como una asociación formal o una institución consolidada si esas condiciones no existen o no fueron confirmadas.</p><h2>Fuentes externas</h2><p>Los enlaces a terceros se incluyen con fines informativos. Cada fuente conserva la responsabilidad sobre sus contenidos.</p>`}<p>Contacto: <a href="mailto:${attr(state.site.contactEmail)}">${esc(state.site.contactEmail)}</a></p></div></section>`;
  }

  function notFound(title='No encontrado') { return `<section class="not-found"><div class="shell"><span class="eyebrow">404</span><h1>${esc(title)}</h1><p>El contenido que buscás no está disponible o cambió de ubicación.</p><a class="btn primary" href="index.html">Volver al inicio</a></div></section>`; }

  function setupInlineEditing() {
    if (!inlineMode) return;
    document.body.classList.add('cms-inline-mode');
    $$('[data-cms-path]').forEach(el => {
      el.addEventListener('focus',()=>el.classList.add('cms-editing'));
      el.addEventListener('blur',()=>{
        el.classList.remove('cms-editing');
        const value=el.innerText.trim();
        setPath(state,el.dataset.cmsPath,value);
        parent.postMessage({type:'foro:inline-change',path:el.dataset.cmsPath,value},'*');
      });
      el.addEventListener('keydown',e=>{if(e.key==='Enter'&&!['P'].includes(el.tagName)){e.preventDefault();el.blur();}});
    });
    $$('[data-section-index]').forEach(sec=>sec.addEventListener('dblclick',e=>{if(e.target.closest('[data-cms-path]'))return;parent.postMessage({type:'foro:edit-section',index:Number(sec.dataset.sectionIndex)},'*');}));
  }

  function renderCurrentPage() {
    applyTheme(); setupAnalytics(); renderHeader(); renderFooter();
    if (page==='home') renderHome();
    else if (page==='el-foro') renderForoPage();
    else if (page==='conocimiento') renderKnowledgePage();
    else if (page==='voces') renderVoicesPage();
    else if (page==='actividades') renderActivitiesPage();
    else if (page==='participa') renderParticipaPage();
    else if (page==='post') renderPostPage();
    else if (page==='event') renderEventPage();
    else if (page==='search') renderSearchPage();
    else if (page==='privacy') renderLegal('privacy');
    else if (page==='terms') renderLegal('terms');
    else if (page==='newsletter') renderNewsletterPage();
    else $('#main').innerHTML=notFound();
    setupInlineEditing();
  }

  addEventListener('message', e => {
    const m=e.data||{};
    if (m.type==='foro:cms-preview' && m.payload) { state=mergeDeep(structuredClone(defaults),m.payload); renderCurrentPage(); }
    if (m.type==='foro:cms-preview-focus' && m.anchor) document.getElementById(m.anchor)?.scrollIntoView({behavior:'smooth',block:'center'});
  });

  async function boot() {
    try {
      if (db.configured && !previewMode) {
        const [remote,remotePosts,remoteEvents] = await Promise.all([db.loadSiteContent(),db.listPosts({limit:250}),db.listEvents({limit:250})]);
        if (remote) state=mergeDeep(structuredClone(defaults),remote);
        if (Array.isArray(remotePosts)) posts=remotePosts;
        if (Array.isArray(remoteEvents)) events=remoteEvents;
      }
    } catch(err) { console.warn('Se usan contenidos locales por falla de conexión:',err); }
    renderCurrentPage();
    if (previewMode) parent.postMessage({type:'foro:preview-ready',page},'*');
  }
  boot();
})();
