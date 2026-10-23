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

  function migrateLegacyPalette(data) {
    if (!data?.theme) return data;
    const bg = String(data.theme.background || '').toLowerCase();
    if (['#05080c', '#050505', '#05090d'].includes(bg)) {
      const colors = ['background','paper','ink','text','muted','line','navy','navyDeep','cyan','cyanSoft','warm'];
      colors.forEach(key => { data.theme[key] = defaults.theme[key]; });
    }
    return data;
  }
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
    const rich=state.site?.inlineRich?.[path]; const isRich=tag==='div' || tag==='p'; const content=isRich&&typeof rich==='string'?sanitizeInlineRich(rich):esc(text||'').replace(/\n/g,'<br>'); return `<${tag}${className?` class="${className}"`:''}${edit}>${content}</${tag}>`;
  }

  // Sanitization of inline editorial formatting: no scripts, arbitrary classes or event handlers.
  function sanitizeInlineRich(html='') {
    const root=document.createElement('template');root.innerHTML=String(html);
    const allowed=new Set(['BR','B','STRONG','EM','I','U','P','DIV','SPAN']);
    const clean=(node)=>{for(const child of [...node.childNodes]){
      if(child.nodeType===8){child.remove();continue}
      if(child.nodeType!==1){if(child.nodeType!==3)child.remove();continue}
      clean(child);
      if(!allowed.has(child.tagName)){child.replaceWith(...child.childNodes);continue}
      [...child.attributes].forEach(attr=>child.removeAttribute(attr.name));
    }};
    clean(root.content);return root.innerHTML;
  }

  function sanitizeRichHtml(html='') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const allowed = new Set(['P','H2','H3','H4','UL','OL','LI','STRONG','EM','B','I','A','BLOCKQUOTE','BR','HR','FIGURE','FIGCAPTION','IMG','VIDEO','SOURCE','IFRAME','CODE','PRE','DIV','SPAN','TABLE','THEAD','TBODY','TFOOT','TR','TD','TH','CAPTION','ASIDE']);
    doc.body.querySelectorAll('*').forEach(el => {
      if (el.tagName === 'DIV' && el === doc.body.firstElementChild) return;
      if (!allowed.has(el.tagName)) { el.replaceWith(...el.childNodes); return; }
      // Conservar solo clases editoriales conocidas; nunca clases arbitrarias del contenido.
      const allowedClasses = new Set(['foro-document','foro-map-embed','rich-media','rich-youtube','foro-document-heading','foro-download','foro-media-image','foro-media-small','foro-media-medium','foro-media-wide','foro-image-right','foro-image-excerpt-right','foro-image-left','foro-image-below','foro-gallery-item','foro-info-box','foro-imported-table','foro-author-bio','foro-author-bio-hidden','foro-author-bio-text','foro-author-bio-content','foro-author-bio-photo','foro-bio-photo-right','foro-bio-photo-left','foro-bio-photo-large','foro-bio-photo-normal','foro-author-bio-extra','foro-author-bio-name','foro-author-bio-role','foro-byline-hidden','foro-byline-independent','foro-byline-dependent']);
      const safeClasses = [...el.classList].filter(c=>allowedClasses.has(c));
      el.removeAttribute('class');
      if (safeClasses.length) el.className=safeClasses.join(' ');
      [...el.attributes].forEach(a => {
        const safe = (a.name==='class' && !!el.className) || (el.tagName === 'A' && ['href','target','rel','download'].includes(a.name)) || (el.tagName === 'IMG' && ['src','alt','loading'].includes(a.name)) || (el.tagName === 'VIDEO' && ['src','controls','playsinline','preload','poster'].includes(a.name)) || (el.tagName === 'SOURCE' && ['src','type'].includes(a.name)) || (el.tagName === 'IFRAME' && ['src','title','loading','allow','allowfullscreen'].includes(a.name)) || (['TH','TD'].includes(el.tagName) && ['colspan','rowspan','scope'].includes(a.name));
        if (a.name==='style' && ['P','H2','H3','H4','BLOCKQUOTE','FIGURE','DIV','SPAN','UL','OL','TABLE','TD','TH','ASIDE'].includes(el.tagName)) {
          const styles = new Map();
          ['text-align','line-height','font-family','font-size','font-weight','font-style','margin-top','margin-bottom'].forEach(k=>{const value=el.style.getPropertyValue(k).trim();if(value && !/[;{}<>]/.test(value) && value.length<140 && ((k==='font-family' && /^[a-z0-9 ,"'_-]+$/i.test(value)) || (k==='text-align' && /^(left|right|center|justify)$/.test(value)) || (k==='line-height' && /^(1|1\.[0-9]{1,2}|2|2\.[0-5])$/.test(value)) || (k==='font-size' && /^(?:[1-9][0-9]?|1[0-5][0-9])px$/.test(value)) || (k==='font-weight' && /^(normal|bold|[1-9]00)$/.test(value)) || (k==='font-style' && /^(normal|italic)$/.test(value)) || (k.startsWith('margin-') && /^\d{1,3}px$/.test(value))))styles.set(k,value)});
          el.removeAttribute('style');styles.forEach((v,k)=>el.style.setProperty(k,v));return;
        }
        if (!safe) el.removeAttribute(a.name);
      });
      if (el.tagName === 'A') {
        const href = el.getAttribute('href') || '';
        if (!/^(https?:\/\/|mailto:|\/|#)/i.test(href)) el.removeAttribute('href');
        el.setAttribute('rel','noopener noreferrer');
      }
      if (el.tagName === 'IMG') { if (!/^https?:\/\//i.test(el.getAttribute('src')||'') && !(el.getAttribute('src')||'').startsWith('/')) el.removeAttribute('src'); el.setAttribute('loading','lazy'); }
      if (['VIDEO','SOURCE'].includes(el.tagName) && !/^https?:\/\//i.test(el.getAttribute('src')||'')) el.removeAttribute('src');
      if (el.tagName === 'IFRAME') {const src=el.getAttribute('src')||'';if (!(/^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}(?:\?|$)/.test(src) || /^https:\/\/www\.google\.com\/maps\?q=[^<>]+&output=embed$/.test(src) || /^https:\/\/view\.officeapps\.live\.com\/op\/embed\.aspx\?src=https%3A%2F%2F/i.test(src) || /^https:\/\/[^\s<>]+\.pdf(?:[?#]|$)/i.test(src))) {el.remove();return;} el.setAttribute('loading','lazy');el.setAttribute('referrerpolicy','strict-origin-when-cross-origin');}
    });
    // No mostrar epígrafes de ejemplo de versiones anteriores.
    doc.querySelectorAll('figure figcaption').forEach(c=>{if(!c.textContent.trim()||/^(?:Epígrafe \(opcional\)|Descripción del archivo \(opcional\))$/i.test(c.textContent.trim()))c.remove()});
    // Compatibilidad con documentos insertados en versiones anteriores.
    doc.querySelectorAll('figure.foro-document').forEach(figure=>{
      const heading=figure.querySelector('.foro-document-heading');
      const link=heading?.querySelector('a[href]');
      const text=heading?.querySelector('strong')?.textContent?.trim()||'';
      const generic=/^(?:\d{10,}-)?[^\s]+\.(?:pdf|docx?|xlsx?|pptx?)$/i.test(text)||text==='Documento';
      if (heading && generic) heading.querySelector('strong')?.remove();
      if (heading && !heading.querySelector('strong')?.textContent?.trim()) heading.remove();
      const caption=figure.querySelector('figcaption');
      if(caption && /^(?:Descripción del archivo \(opcional\)|Epígrafe \(opcional\))$/i.test(caption.textContent.trim()))caption.remove();
      if(link){link.classList.add('foro-download');link.textContent='↓ Descargar documento';figure.append(link)}
    });
    return doc.body.firstElementChild?.innerHTML || '';
  }

  function configureArticleGalleries(){
    document.querySelectorAll('.article-body').forEach(body=>{
      const items=[...body.children];let batch=[];
      const flush=()=>{if(!batch.length)return;const wrap=document.createElement('div');wrap.className='foro-article-carousel';const track=document.createElement('div');track.className='foro-article-carousel-track';batch[0].before(wrap);wrap.append(track);batch.forEach(el=>track.append(el));if(batch.length>1){const controls=document.createElement('div');controls.className='foro-article-carousel-actions';controls.innerHTML='<button type="button" data-dir="-1" aria-label="Imagen anterior">←</button><span></span><button type="button" data-dir="1" aria-label="Imagen siguiente">→</button>';wrap.append(controls);let index=0;const show=()=>{track.style.transform=`translateX(-${index*100}%)`;controls.querySelector('span').textContent=`${index+1} / ${batch.length}`};controls.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{index=(index+Number(btn.dataset.dir)+batch.length)%batch.length;show()}));show()}batch=[]};
      items.forEach(el=>{if(el.matches('figure.foro-gallery-item')) batch.push(el);else flush()});flush();
    });
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


  // Registro controlado de familias Google Fonts y archivos alojados en Supabase.
  const GOOGLE_FONT_FAMILIES = ["Instrument Serif", "DM Sans", "Inter", "Manrope", "Montserrat", "Poppins", "Lato", "Roboto", "Open Sans", "Source Sans 3", "Work Sans", "Nunito Sans", "Raleway", "Outfit", "Plus Jakarta Sans", "Public Sans", "IBM Plex Sans", "Libre Franklin", "Archivo", "Urbanist", "Mulish", "Playfair Display", "Cormorant Garamond", "Libre Baskerville", "Merriweather", "Lora", "EB Garamond", "Source Serif 4", "Spectral", "Crimson Text", "Newsreader", "Bodoni Moda", "DM Serif Display", "Fraunces", "Prata", "Alegreya", "Noto Serif", "IBM Plex Serif"];
  function installFonts(theme) {
    const custom = Array.isArray(theme.customFonts) ? theme.customFonts : [];
    let style=document.getElementById('foro-dynamic-fonts');
    if(!style){style=document.createElement('style');style.id='foro-dynamic-fonts';document.head.appendChild(style)}
    const safeName=v=>String(v||'').replace(/[^\w\s-]/g,'').slice(0,70);
    const safeUrl=v=>/^https:\/\//i.test(v||'') ? v : '';
    style.textContent=custom.filter(f=>safeUrl(f.url)).map(f=>`@font-face{font-family:"${safeName(f.name)}";src:url("${safeUrl(f.url).replace(/"/g,'%22')}") format("${f.format||'woff2'}");font-display:swap;font-style:normal;font-weight:100 900}`).join('\n');
    const keys=['bodyFont','headingFont','subtitleFont','navigationFont','buttonFont','eyebrowFont','articleFont'];
    const requested=[...new Set(keys.map(k=>theme[k]).filter(f=>GOOGLE_FONT_FAMILIES.includes(f)))];
    const linkId='foro-google-fonts';let link=document.getElementById(linkId);
    if(!link){link=document.createElement('link');link.id=linkId;link.rel='stylesheet';document.head.appendChild(link)}
    // Cada familia se carga de forma independiente: algunas serif no admiten los pesos 500–700.
    // Una petición combinada inválida podía hacer fallar TODAS las fuentes elegidas.
    link.remove();
    document.querySelectorAll('link[data-foro-font-family]').forEach(el=>el.remove());
    requested.forEach((family,index)=>{
      const el=document.createElement('link');
      el.rel='stylesheet';
      el.dataset.foroFontFamily=family;
      el.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(family).replace(/%20/g,'+')+'&display=swap';
      document.head.appendChild(el);
    });
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
    installFonts(t);
    const fontStack=(name,fallback)=>`"${String(name||fallback).replace(/["\\]/g,'')}",${fallback.includes('Serif')||fallback==='Georgia'?'Georgia,serif':'Arial,sans-serif'}`;
    root.setProperty('--font-subtitle',fontStack(t.subtitleFont || t.bodyFont,'Arial'));
    root.setProperty('--font-nav',fontStack(t.navigationFont || t.bodyFont,'Arial'));
    root.setProperty('--font-button',fontStack(t.buttonFont || t.bodyFont,'Arial'));
    root.setProperty('--font-eyebrow',fontStack(t.eyebrowFont || t.bodyFont,'Arial'));
    root.setProperty('--font-article',fontStack(t.articleFont || t.headingFont,'Georgia'));
    root.setProperty('--font-body',fontStack(t.bodyFont || 'DM Sans','Arial'),'important');
    root.setProperty('--font-heading',fontStack(t.headingFont || 'Instrument Serif','Georgia'),'important');
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
    const isPost = page === 'post', isEvent = page === 'event';
    const slug = (isPost || isEvent) ? qs.get('slug') : null;
    const canonicalUrl = new URL(location.pathname, location.origin);
    if (slug && (isPost || isEvent)) canonicalUrl.searchParams.set('slug', slug);
    if (page==='custom' && qs.get('slug')) canonicalUrl.searchParams.set('slug', qs.get('slug'));
    if (page === 'home') canonicalUrl.pathname = '/';
    $('#canonical')?.setAttribute('href', canonicalUrl.href);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalUrl.href);
    const robots = document.querySelector('#seoRobots');
    if (robots && ((isPost && posts.some(p=>p.slug===slug)) || (isEvent && events.some(e=>e.slug===slug)))) {
      robots.setAttribute('content', 'index,follow,max-image-preview:large');
    }
    const schemaEl = document.getElementById('dynamicStructuredData');
    if (schemaEl) schemaEl.remove();
    if (meta.schema) {
      const script=document.createElement('script');
      script.type='application/ld+json'; script.id='dynamicStructuredData';
      script.textContent=JSON.stringify(meta.schema).replace(/</g,'\\u003c');
      document.head.appendChild(script);
    }
  }

  function renderHeader() {
    const configured = Array.isArray(state.navigation) ? state.navigation.filter(n=>n && n.href && n.label && !n.hidden) : [];
    // Editable navigation is authoritative. Required destinations remain discoverable in the footer.
    const nav = configured.length ? configured : [
      {label:'Inicio',href:'index.html'}, {label:'El Foro',href:'el-foro.html'},
      {label:'Conocimiento',href:'conocimiento.html'},
      {label:'Biblioteca y recursos',href:'biblioteca-recursos.html'},
      {label:'Actividades',href:'actividades.html'},
      {label:'Voces',href:'voces.html'}, {label:'Participá',href:'participa.html',featured:true}
    ];
    const current = page;
    const navHtml = nav.map(n => {
      const key = String(n.href).split('.')[0];
      const active = (current==='home' && key==='index') || current===key || (current==='post' && key==='conocimiento') || (current==='event' && key==='actividades');
      const children = (n.children||[]).filter(c=>!c.hidden).length ? `<div class="nav-dropdown" role="group" aria-label="Subsecciones de ${attr(n.label)}">${n.children.filter(c=>!c.hidden).map(c=>`<a href="${attr(c.href)}">${esc(c.label)}</a>`).join('')}</div>` : '';
      return `<div class="nav-item ${active?'is-active':''} ${n.featured?'is-featured':''}"><a href="${attr(n.href)}">${esc(n.label)}${children?' <span class="chev">⌄</span>':''}</a>${children}</div>`;
    }).join('');
    $('#siteHeader').innerHTML = `
      <div class="header-inner shell">
        <a class="brand" href="index.html" aria-label="${attr(state.site?.name)}"><img src="${attr(state.site?.logo)}" alt="${attr(state.site?.name)}"></a>
        <nav class="desktop-nav" aria-label="Navegación principal">${navHtml}</nav>
        <div class="header-tools"><a class="search-link" href="buscar.html" aria-label="Buscar">⌕</a><button class="menu-toggle" id="menuToggle" type="button" aria-label="Abrir menú de navegación" aria-controls="mobileNav" aria-expanded="false"><span></span><span></span></button></div>
      </div>`;
    document.getElementById('mobileNav')?.remove();
    const mobile = document.createElement('nav'); mobile.id='mobileNav';mobile.className='mobile-nav';
    mobile.setAttribute('aria-label','Menú de navegación móvil');mobile.setAttribute('aria-hidden','true');
    mobile.innerHTML=`<div class="mobile-nav-inner"><div class="mobile-nav-top"><span>EXPLORAR EL FORO</span><button type="button" class="mobile-close" aria-label="Cerrar menú">✕</button></div>
      ${nav.map(n => { const children=(n.children||[]).filter(c=>c.href&&c.label&&!c.hidden);
        return `<div class="mobile-nav-group ${n.featured?'mobile-featured':''}"><div class="mobile-nav-row"><a href="${attr(n.href)}">${esc(n.label)}</a>${children.length?`<button type="button" class="mobile-sub-toggle" aria-expanded="false" aria-label="Ver subsecciones de ${attr(n.label)}">+</button>`:''}</div>${children.length?`<div class="mobile-submenu" hidden>${children.map(c=>`<a href="${attr(c.href)}">${esc(c.label)}</a>`).join('')}</div>`:''}</div>`;
      }).join('')}
      <div class="mobile-nav-bottom"><a href="buscar.html">Buscar contenidos ↗</a><a href="mailto:${attr(state.site?.contactEmail||'foroeconomiadelvisitante@gmail.com')}">Contacto ↗</a></div></div>`;
    document.body.appendChild(mobile);
    const toggle=$('#menuToggle');
    const close=()=>{document.body.classList.remove('menu-open');toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label','Abrir menú de navegación');mobile.setAttribute('aria-hidden','true');};
    const open=()=>{document.body.classList.add('menu-open');toggle?.setAttribute('aria-expanded','true');toggle?.setAttribute('aria-label','Cerrar menú de navegación');mobile.setAttribute('aria-hidden','false');mobile.querySelector('.mobile-close')?.focus();};
    toggle?.addEventListener('click',()=>document.body.classList.contains('menu-open')?close():open());
    mobile.querySelector('.mobile-close')?.addEventListener('click',close);
    mobile.querySelectorAll('.mobile-sub-toggle').forEach(button=>button.addEventListener('click',()=>{
      const panel=button.closest('.mobile-nav-group').querySelector('.mobile-submenu');const expanded=button.getAttribute('aria-expanded')==='true';
      button.setAttribute('aria-expanded',String(!expanded)); button.textContent=expanded?'+':'−';panel.hidden=expanded;
    }));
    mobile.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('menu-open')){close();toggle?.focus();}});
    window.addEventListener('resize',()=>{if(window.innerWidth>1120) close();});
    addEventListener('scroll', () => $('#siteHeader')?.classList.toggle('scrolled', scrollY > 18), {passive:true});
  }

  function renderFooter() {
    const s = state.site || defaults.site;
    const social = Object.entries(s.social || {}).filter(([,url])=>url);
    $('#siteFooter').innerHTML = `
      <div class="footer-top shell">
        <div class="footer-brand"><img src="${attr(s.footerIcon||s.icon)}" alt=""><strong>${esc(s.shortName)}</strong><p>${esc(s.footerNote)}</p></div>
        <div class="footer-links"><div><span>Explorar</span><a href="el-foro.html">El Foro</a><a href="conocimiento.html">Conocimiento</a><a href="biblioteca-recursos.html">Biblioteca y recursos</a><a href="actividades.html">Actividades</a><a href="voces.html">Voces</a></div><div><span>Participar</span><a href="participa.html">Enviar una propuesta</a><a href="mailto:${attr(s.contactEmail)}">Contacto</a><a href="admin/">Administración</a></div></div>
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

  function mediaHtml(media={}, fallback='', cls='section-media') {
    const m={type:'image',src:'',poster:'',fit:'cover',positionX:'center',positionY:'center',zoom:100,autoplay:true,mute:true,loop:true,controls:false,startAt:0,endAt:0,cleanEmbed:true,...media};
    const src=m.src||fallback; if(!src)return '';
    const type=m.type==='image'&&/(?:youtu\.be|youtube\.com)/i.test(src)?'youtube':m.type;
    const pos=`object-fit:${m.fit==='contain'?'contain':'cover'};object-position:${['left','center','right'].includes(m.positionX)?m.positionX:'center'} ${['top','center','bottom'].includes(m.positionY)?m.positionY:'center'};transform:scale(${Math.max(.7,Math.min(2.2,Number(m.zoom||100)/100))})`;
    if(type==='youtube'){
      let id='';try{const u=new URL(src,location.href);id=u.hostname.includes('youtu.be')?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.split('/').at(-1)}catch(e){return ''}
      if(!/^[A-Za-z0-9_-]{11}$/.test(id))return '';
      const start=Math.max(0,Number(m.startAt)||0),end=Math.max(0,Number(m.endAt)||0);
      const qs=new URLSearchParams({autoplay:m.autoplay?'1':'0',mute:m.mute?'1':'0',controls:m.controls&&!m.cleanEmbed?'1':'0',playsinline:'1',rel:'0',modestbranding:'1',iv_load_policy:'3',fs:'0',disablekb:'1',loop:m.loop?'1':'0',playlist:id,start:String(start)});
      if(end>start)qs.set('end',String(end));if(m.captions)qs.set('cc_load_policy','1');
      return `<iframe class="${cls} media-video ${m.cleanEmbed?'youtube-cropped':''}" src="https://www.youtube-nocookie.com/embed/${id}?${qs}" title="Video del Foro" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" style="border:0;${m.cleanEmbed?'pointer-events:none;':''}"></iframe>`;
    }
    if(type==='video')return `<video class="${cls} media-video" src="${attr(src)}" ${m.poster?`poster="${attr(m.poster)}"`:''} ${m.autoplay?'autoplay':''} ${m.mute?'muted':''} ${m.loop?'loop':''} ${m.controls?'controls':''} playsinline preload="metadata" style="${pos}" data-start="${Math.max(0,Number(m.startAt)||0)}" data-end="${Math.max(0,Number(m.endAt)||0)}"></video>`;
    return `<img class="${cls}" src="${attr(src)}" alt="Imagen del Foro" loading="lazy" style="${pos}">`;
  }
  function enhanceMediaPlayback(){document.querySelectorAll('video[data-start]').forEach(v=>{const a=Number(v.dataset.start)||0,b=Number(v.dataset.end)||0;if(a>0){v.addEventListener('loadedmetadata',()=>{if(v.duration>a)v.currentTime=a},{once:true})}if(b>a)v.addEventListener('timeupdate',()=>{if(v.currentTime>=b){if(v.loop)v.currentTime=a;else v.pause()}})})}
  function renderHero(s,i) {
    const c=s.content||{};
    const image = c.heroImage || 'assets/images/hero-territorio.jpg';
    const media=(s.media?.src)?s.media:{type:"image",src:image};
    const slides=(Array.isArray(s.heroSlides)&&s.heroSlides.length?s.heroSlides:[media]).filter(x=>x?.src);
    const overlay=Math.min(100,Math.max(0,Number(s.heroOverlay??34)))/100;
    const interval=Math.max(3,Number(s.heroInterval)||7);
    const slideMarkup=slides.map((slide,k)=>`<div class="forum-hero-slide ${k===0?'is-active':''}" data-slide="${k}">${mediaHtml(slide,image,'hero-media-content')}</div>`).join('');
    return `<section class="hero-forum cinematic-hero" id="${attr(s.settings?.anchor||s.id)}" data-section-index="${i}">
      <div class="hero-media cms-hero-media" data-hero-carousel data-interval="${interval}">${slideMarkup||mediaHtml(media,image,'hero-media-content')}<div class="hero-media-shade" style="--hero-overlay:${overlay}"></div>${slides.length>1?`<div class="hero-slide-controls" aria-label="Diapositivas">${slides.map((_,k)=>`<button type="button" data-hero-go="${k}" class="${k===0?'active':''}" aria-label="Mostrar diapositiva ${k+1}">${String(k+1).padStart(2,'0')}</button>`).join('')}</div>`:''}</div>
      <div class="shell cinematic-layout"><div class="hero-kicker"><span>ARGENTINA · PERSPECTIVA FEDERAL</span><span>FORO / ECONOMÍA DEL VISITANTE</span></div>
        <div class="cinematic-title">${editable('span',c.eyebrow,`sections.${i}.content.eyebrow`,'eyebrow')}${editable('h1',c.title,`sections.${i}.content.title`)}</div>
        <div class="cinematic-bottom"><div class="cinematic-index"><span>01 — 03</span><span>CONOCIMIENTO · ENCUENTRO · ACCIÓN</span></div><div class="cinematic-intro">${editable('p',c.body,`sections.${i}.content.body`,'hero-body')}<div class="hero-actions"><a class="btn primary" href="${attr(c.primaryHref)}">${esc(c.primaryLabel)} <span>↗</span></a><a class="btn text light" href="${attr(c.secondaryHref)}">${esc(c.secondaryLabel)} <span>↗</span></a></div></div><a class="scroll-cue" href="#economia-del-visitante" aria-label="Explorar el Foro">DESLIZÁ PARA EXPLORAR ↓</a></div>
      </div>
      <div class="hero-ribbon"><div class="shell"><span>Conocimiento</span><i></i><span>Encuentro</span><i></i><span>Acción</span></div></div>
    </section>`;
  }

  function setupHeroCarousels(){
    document.querySelectorAll('[data-hero-carousel]').forEach(carousel=>{
      const slides=[...carousel.querySelectorAll('.forum-hero-slide')];if(slides.length<2)return;
      let current=slides.findIndex(x=>x.classList.contains('is-active'));if(current<0)current=0;
      const buttons=[...carousel.querySelectorAll('[data-hero-go]')];
      const go=n=>{slides[current]?.classList.remove('is-active');slides[current]?.querySelectorAll('video').forEach(v=>v.pause());current=(n+slides.length)%slides.length;slides[current].classList.add('is-active');buttons.forEach(b=>b.classList.toggle('active',+b.dataset.heroGo===current));slides[current].querySelectorAll('video').forEach(v=>{try{v.currentTime=Number(v.dataset.start)||0;v.play().catch(()=>{})}catch(e){}})};
      buttons.forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.heroGo))));
      if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const timer=setInterval(()=>{if(!document.hidden&&document.contains(carousel))go(current+1);else if(!document.contains(carousel))clearInterval(timer)},Math.max(3,+carousel.dataset.interval||7)*1000)}
    });
  }
  function renderConcept(s,i) {
    const c=s.content||{};
    return `<section class="section concept-section" id="${attr(s.settings?.anchor||s.id)}" data-section-index="${i}"><div class="shell concept-grid"><div>${editable('span',c.eyebrow,`sections.${i}.content.eyebrow`,'eyebrow')}${editable('h2',c.title,`sections.${i}.content.title`)}${editable('p',c.body,`sections.${i}.content.body`,'concept-lead')}${editable('p',c.note,`sections.${i}.content.note`,'concept-note')}</div><div class="sector-matrix">${(s.items||[]).map((x,j)=>`<div class="sector-item">${s.itemMedia?.[j]?.src?`<div class="sector-item-media">${mediaHtml(s.itemMedia[j],'','sector-item-image')}</div>`:''}<span>${String(j+1).padStart(2,'0')}</span>${editable('strong',x,`sections.${i}.items.${j}`)}</div>`).join('')}</div></div></section>`;
  }

  function renderEditorialInsight(s,i) {
    const c=s.content||{}, path=`sections.${i}.content`;
    const paras=String(c.body||'').split(/\n\s*\n/).filter(Boolean).map((p,j)=>editable('p',p,`${path}.body`,'insight-paragraph')).join('');
    const comparison=s.settings?.variant==='comparison';
    return `<section class="section editorial-insight ${comparison?'insight-comparison':'insight-feature'}" id="${attr(s.settings?.anchor||s.id)}" data-section-index="${i}"><div class="shell insight-layout"><div class="insight-heading">${editable('span',c.eyebrow,`${path}.eyebrow`,'eyebrow')}${editable('h2',c.title,`${path}.title`)}</div><div class="insight-copy"><div class="insight-paragraphs" data-cms-path="${attr(path+'.body')}" ${inlineMode?'contenteditable="true" spellcheck="true"':''}>${String(c.body||'').split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join('')}</div>${comparison?`<div class="insight-cards"><div class="insight-card"><span>01 / ENFOQUE</span>${editable('h3',c.leftTitle,`${path}.leftTitle`)}${editable('p',c.leftBody,`${path}.leftBody`)}</div><div class="insight-card"><span>02 / ENFOQUE</span>${editable('h3',c.rightTitle,`${path}.rightTitle`)}${editable('p',c.rightBody,`${path}.rightBody`)}</div></div>`:''}</div></div></section>`;
  }

  function renderPillars(s,i) {
    return `<section class="section pillars-section" id="${attr(s.settings?.anchor||s.id)}" data-section-index="${i}"><div class="shell">${sectionHead(s,i)}<div class="pillar-grid">${(s.items||[]).map((x,j)=>`<a class="pillar-card" href="${attr(x.href||'#')}"><div class="pillar-number">${esc(x.number)}</div>${editable('h3',x.title,`sections.${i}.items.${j}.title`)}${editable('p',x.body,`sections.${i}.items.${j}.body`)}<span class="arrow">↗</span></a>`).join('')}</div></div></section>`;
  }

  const knowledgeTypes = new Set(['article','analysis','research','report','resource']);
  const voiceTypes = new Set(['interview','podcast','experience','case']);
  const typeNames = {article:'Artículo',analysis:'Análisis',research:'Investigación',report:'Informe',resource:'Recurso',interview:'Entrevista',podcast:'Podcast',experience:'Experiencia',case:'Caso territorial'};

  // V20: misma representación de extractos en tarjetas y artículos que en el editor.
  function excerptParagraphs(value){
    const normalized=String(value||'').replace(/\r\n?/g,'\n');
    return normalized.split(/\n[\t ]*\n+/).map(part=>'<p>'+esc(part).replace(/\n/g,'<br>')+'</p>').join('');
  }
  function cardIntro(value,max=185){
    const text=String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    if(text.length<=max)return esc(text);
    let cut=text.slice(0,max);const space=cut.lastIndexOf(' ');if(space>max*.6)cut=cut.slice(0,space);
    return esc(cut)+'…';
  }
  function postCard(p, large=false) {
    const href=`articulo.html?slug=${encodeURIComponent(p.slug)}`;
    return `<article class="post-card ${large?'large':''}"><a class="post-visual ${p.featured_image?'has-image':''}" href="${href}" ${p.featured_image?`style="--foro-featured-image:url('${attr(p.featured_image)}')"`:''}><span>${esc(typeNames[p.type]||p.category||'Publicación')}</span>${!p.featured_image?`<div class="visual-mark">${esc((p.category||typeNames[p.type]||'FORO').slice(0,2).toUpperCase())}</div>`:''}</a><div class="post-copy"><div class="post-meta"><span>${esc(p.category||typeNames[p.type]||'Conocimiento')}</span><time>${esc(fmtDate(p.published_at))}</time></div><h3><a href="${href}">${esc(p.title)}</a></h3><p class="post-intro">${cardIntro(p.excerpt)}</p>${(p.content_html||'').includes('foro-byline-hidden')?'':`<div class="post-byline">Por ${esc(p.author_name||state.site.shortName)}</div>`}<a class="read-link" href="${href}">Leer publicación <span>↗</span></a></div></article>`;
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
    return `<article class="event-card"><div class="event-date"><strong>${day}</strong><span>${month}</span></div><div class="event-main"><div class="event-meta"><span>${esc(e.event_type||'Actividad')}</span>${e.location?`<span>${esc(e.location)}</span>`:''}</div><h3><a href="actividad.html?slug=${encodeURIComponent(e.slug)}">${esc(e.title)}</a></h3><div class="article-excerpt excerpt-paragraphs">${excerptParagraphs(e.excerpt)}</div></div><a class="event-arrow" href="actividad.html?slug=${encodeURIComponent(e.slug)}" aria-label="Ver actividad">↗</a></article>`;
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
    const renderers = {heroForum:renderHero,conceptStatement:renderConcept,editorialInsight:renderEditorialInsight,pillars:renderPillars,collectionFeed:(s,i)=>renderCollection(s,i,'knowledge'),activitiesFeed:renderActivities,voicesFeed:(s,i)=>renderCollection(s,i,'voices'),joinCta:renderJoin};
    $('#main').innerHTML = (state.sections||[]).map((s,i)=>{if(s.enabled===false)return '';let html=renderers[s.type]?.(s,i)||'';if(s.type!=='heroForum'&&s.media?.src){const visual=`<div class="cms-section-media">${mediaHtml(s.media,'','cms-section-media-content')}</div>`;html=html.replace(/(<section\b[^>]*>)/,`$1${visual}`)}if(s.extraHtml){const extra=`<div class="shell cms-extra-content article-body">${sanitizeRichHtml(s.extraHtml)}</div>`;html=html.replace(/<\/section>\s*$/,extra+'</section>')}return html}).join('');
  }

  function renderInternalHero(data, basePath) {
    return `<section class="internal-hero"><div class="shell internal-hero-grid"><div>${editable('span',data.eyebrow,`${basePath}.eyebrow`,'eyebrow')}${editable('h1',data.title,`${basePath}.title`)}${editable('p',data.body,`${basePath}.body`,'hero-body')}</div><div class="internal-mark"><img src="assets/images/isotipo-limpio.png" alt=""><span>ECONOMÍA DEL VISITANTE</span></div></div></section>`;
  }

  function renderForoPage() {
    const d=state.pages?.['el-foro']||defaults.pages['el-foro'];
    applySeo({title:`El Foro — ${state.site.shortName}`,description:d.hero.body});
    $('#main').innerHTML = `${renderInternalHero(d.hero,'pages.el-foro.hero')}
      <section class="section" id="quienes-somos"><div class="shell editorial-split"><div><span class="eyebrow">QUIÉNES SOMOS</span>${editable('h2',d.intro.title,'pages.el-foro.intro.title')}</div>${editable('div',d.intro.body,'pages.el-foro.intro.body','big-body about-copy')}</div></section>
      <section class="section mission-section" id="mision"><div class="shell"><div class="mission-grid"><div><span>01</span>${editable('h3',d.mission.missionTitle,'pages.el-foro.mission.missionTitle')}${editable('p',d.mission.missionBody,'pages.el-foro.mission.missionBody')}</div><div><span>02</span>${editable('h3',d.mission.visionTitle,'pages.el-foro.mission.visionTitle')}${editable('p',d.mission.visionBody,'pages.el-foro.mission.visionBody')}</div></div><div class="objectives"><div><span class="eyebrow">OBJETIVOS</span><h2>Qué busca impulsar el Foro</h2></div><ol>${(d.objectives||[]).map((x,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span>${editable('p',x,`pages.el-foro.objectives.${i}`)}</li>`).join('')}</ol></div></div></section>
      <section class="section method-section" id="metodologia"><div class="shell editorial-split"><div><span class="eyebrow">METODOLOGÍA</span>${editable('h2',d.methodology.title,'pages.el-foro.methodology.title')}</div>${editable('p',d.methodology.body,'pages.el-foro.methodology.body','big-body')}</div></section>
      <section class="section commission-section" id="comision"><div class="shell commission-card"><div><span class="eyebrow">GOBERNANZA</span>${editable('h2',d.commission.title,'pages.el-foro.commission.title')}</div>${editable('p',d.commission.body,'pages.el-foro.commission.body')}<a class="btn outline" href="participa.html">Contactar al Foro</a></div></section>`;
    reorderForoSections();
  }

  function reorderForoSections(){
    const d=state.pages?.['el-foro']||{};
    const ids=['hero','quienes-somos','mision','metodologia','comision'];
    const nodes={'hero':$('#main .internal-hero'),'quienes-somos':$('#quienes-somos'),'mision':$('#mision'),'metodologia':$('#metodologia'),'comision':$('#comision')};
    (d.hiddenSections||[]).forEach(id=>{if(nodes[id])nodes[id].hidden=true});
    const order=[...new Set([...(d.layoutOrder||[]),...ids])];
    order.forEach(id=>{if(nodes[id])$('#main').append(nodes[id])});
  }
  function collectionHeader(eyebrow,title,body) {
    const base='pages.'+page;const custom=state.pages?.[page]||{};
    return `<section class="collection-hero" id="cabecera-${attr(page)}"><div class="shell"><span class="eyebrow">${esc(eyebrow)}</span>${editable('h1',custom.collectionTitle||title,base+'.collectionTitle')}${editable('p',custom.collectionDescription||body,base+'.collectionDescription')}</div></section>`;
  }

  function navigationFilters(page){
    const found=[],seen=new Set();
    const visit=n=>{if(!n)return;
      try{const url=new URL(String(n.href||''),location.href);
        if(url.origin===location.origin&&url.pathname.split('/').pop()===page+'.html'){
          const key=(url.searchParams.get('tipo')||'').trim().toLowerCase();
          if(/^[a-z0-9_-]{2,64}$/.test(key)&&!seen.has(key)){
            found.push([key,String(n.label||key)]);seen.add(key)
          }
        }
      }catch{}
      (n.children||[]).forEach(visit)
    };
    (state.navigation||[]).forEach(visit);return found
  }
  // La sección es el destino editorial exclusivo. El tipo solo define el formato
  // y se utiliza para publicaciones anteriores sin una sección explícita del menú.
  function editorialSection(post,group){
    const section=String(post.category||'').trim().toLowerCase();
    if(section.startsWith('route:'))return '';
    const options=navigationFilters(group);
    if(options.some(([key])=>key===section))return section;
    const legacy={article:'article',analysis:'analysis',research:'research',report:'report',resource:'resource',interview:'interview',podcast:'podcast',experience:'experience',case:'case'};
    return legacy[post.type]||'';
  }
  function editorialTabs(group,builtin){
    const actual=navigationFilters(group);
    const result=[['','Todo']];const seen=new Set(['']);
    [...actual,...builtin.filter(([key])=>!actual.some(([k])=>k===key))].forEach(([key,label])=>{
      if(!seen.has(key)){result.push([key,label]);seen.add(key)}
    });
    return result;
  }
  function currentRoute(){return (location.pathname.split('/').pop()||'index.html')+location.search}
  function routeCategory(href){return 'route:'+encodeURIComponent(href)}
  function belongsToRoute(p,href){
    const category=String(p.category||'');
    if(category.startsWith('route:'))return category===routeCategory(href);
    // Compatibilidad exclusiva con publicaciones previas, que carecían de ruta.
    if(href.startsWith('conocimiento.html?tipo='))return knowledgeTypes.has(p.type)&&editorialSection(p,'conocimiento')===new URLSearchParams(href.split('?')[1]).get('tipo');
    if(href.startsWith('voces.html?tipo='))return voiceTypes.has(p.type)&&editorialSection(p,'voces')===new URLSearchParams(href.split('?')[1]).get('tipo');
    return false;
  }
  function renderCustomPage(){
    const slug=(qs.get('slug')||'').trim();const info=state.pages?.customPages?.[slug];
    if(!info){$('#main').innerHTML=notFound();return}
    applySeo({title:(info.title||slug)+' — '+state.site.shortName,description:info.description||''});
    const href='pagina.html?slug='+encodeURIComponent(slug);
    const list=posts.filter(p=>belongsToRoute(p,href));
    $('#main').innerHTML=`${collectionHeader('FORO',info.title||slug,info.description||'')}<section class="section collection-section"><div class="shell">${info.body?`<div class="article-body">${sanitizeRichHtml(info.body)}</div>`:''}<div class="post-grid collection-grid">${list.map(postCard).join('')||'<div class="empty-state"><h3>Esta página todavía no tiene publicaciones.</h3></div>'}</div></div></section>`;
  }
  function addRoutePosts(){
    if(['post','event','search','privacy','terms','custom'].includes(page))return;
    const href=currentRoute();if((page==='conocimiento'||page==='voces')&&href.includes('?tipo='))return;
    const list=posts.filter(p=>belongsToRoute(p,href));
    if(!list.length)return;
    const block=document.createElement('section');block.className='section collection-section';
    block.innerHTML=`<div class="shell"><h2>Publicaciones de esta sección</h2><div class="post-grid collection-grid">${list.map(postCard).join('')}</div></div>`;
    $('#main').append(block);
  }
  function renderKnowledgePage() {
    applySeo({title:`Conocimiento — ${state.site.shortName}`,description:'Artículos, análisis, investigaciones, informes y recursos sobre economía del visitante.'});
    const type=(qs.get('tipo')||'').trim().toLowerCase();
    const builtin=[['article','Artículos'],['analysis','Análisis'],['research','Investigaciones'],['report','Informes'],['resource','Biblioteca y recursos']];
    const tabs=editorialTabs('conocimiento',builtin);
    const list=posts.filter(p=>knowledgeTypes.has(p.type)&&(type?belongsToRoute(p,'conocimiento.html?tipo='+encodeURIComponent(type)):(!String(p.category||'').startsWith('route:')||String(p.category).startsWith('route:conocimiento.html%3Ftipo%3D'))));
    $('#main').innerHTML = `${collectionHeader('CONOCIMIENTO','Ideas, datos y análisis para decidir mejor','Un espacio editorial para reunir investigaciones, perspectivas, informes y fuentes que ayuden a comprender la economía del visitante.')}
      <section class="section collection-section"><div class="shell"><div class="filter-tabs">${tabs.map(([k,l])=>`<a class="${type===k?'active':''}" href="conocimiento.html${k?`?tipo=${encodeURIComponent(k)}`:''}">${esc(l)}</a>`).join('')}</div><div class="post-grid collection-grid">${list.length?list.map(postCard).join(''):`<div class="empty-state"><span>EN PREPARACIÓN</span><h3>No hay publicaciones en esta categoría todavía</h3><p>El Foro prioriza publicar contenidos con autoría, fuentes y criterios editoriales definidos.</p></div>`}</div></div></section>`;
  }

  function renderResourcesPage() {
    applySeo({title:`Biblioteca y recursos — ${state.site.shortName}`,description:'Documentos, publicaciones, videos y enlaces seleccionados sobre la economía del visitante.'});
    const resources=posts.filter(p=>p.type==='resource' && (!String(p.category||'').startsWith('route:') || belongsToRoute(p,'biblioteca-recursos.html')));
    const url=new URLSearchParams(location.search);
    const kind=url.get('formato')||'';
    const formats=[['','Todos'],['documento','Documentos'],['video','Videos'],['enlace','Enlaces']];
    const getKind=p=>{const html=String(p.content_html||'');if(/<iframe|<video|youtube.com|youtu.be|data-foro-video/i.test(html))return 'video';if(/\.pdf|\.docx?|\.xlsx?|\.pptx?|data-foro-document/i.test(html))return 'documento';return 'enlace'};
    const list=resources.filter(p=>!kind||getKind(p)===kind);
    $('#main').innerHTML=`${collectionHeader('RECURSOS','Biblioteca y recursos','Documentos, videos y enlaces para investigar, comprender y compartir conocimiento sobre la economía del visitante.')}
      <section class="section collection-section"><div class="shell"><div class="filter-tabs">${formats.map(([k,l])=>`<a class="${k===kind?'active':''}" href="biblioteca-recursos.html${k?'?formato='+k:''}">${l}</a>`).join('')}</div>
      <label class="resource-search-label">Buscar recursos <input type="search" id="resourceSearch" placeholder="Título, autor, tema o etiqueta…" autocomplete="off"></label>
      <div class="post-grid collection-grid" id="resourceGrid">${list.map(postCard).join('')||'<div class="empty-state"><h3>Próximamente, recursos para consultar</h3><p>Las publicaciones incorporadas desde el CMS aparecerán aquí.</p></div>'}</div></div></section>`;
    $('#resourceSearch')?.addEventListener('input',e=>{const q=e.target.value.toLocaleLowerCase('es');const matched=list.filter(p=>[p.title,p.excerpt,p.author_name,p.category,...(p.tags||[])].join(' ').toLocaleLowerCase('es').includes(q));$('#resourceGrid').innerHTML=matched.map(postCard).join('')||'<p>No se encontraron recursos.</p>'});
  }

  function renderVoicesPage() {
    applySeo({title:`Voces — ${state.site.shortName}`,description:'Entrevistas, podcast, experiencias y casos territoriales vinculados con la economía del visitante.'});
    const type=(qs.get('tipo')||'').trim().toLowerCase();
    const builtin=[['interview','Entrevistas'],['podcast','Podcast'],['experience','Experiencias'],['case','Casos territoriales']];
    const tabs=editorialTabs('voces',builtin);
    const list=posts.filter(p=>voiceTypes.has(p.type)&&(type?belongsToRoute(p,'voces.html?tipo='+encodeURIComponent(type)):(!String(p.category||'').startsWith('route:')||String(p.category).startsWith('route:voces.html%3Ftipo%3D'))));
    $('#main').innerHTML = `${collectionHeader('VOCES','Personas, experiencias y territorios','Perspectivas diversas para entender cómo se construye valor alrededor de quienes visitan y se desplazan entre territorios.')}
      <section class="section collection-section"><div class="shell"><div class="filter-tabs">${tabs.map(([k,l])=>`<a class="${type===k?'active':''}" href="voces.html${k?`?tipo=${encodeURIComponent(k)}`:''}">${esc(l)}</a>`).join('')}</div>${list.length?`<div class="post-grid collection-grid">${list.map(postCard).join('')}</div>`:`<div class="empty-state"><span>SECCIÓN ABIERTA</span><h3>Voces se construye con aportes reales</h3><p>No se publicarán entrevistas o casos ficticios para completar la portada. La sección crecerá con contenidos producidos y confirmados.</p><a class="btn primary" href="participa.html">Proponer una voz o experiencia</a></div>`}</div></section>`;
  }

  function renderActivitiesPage() {
    applySeo({title:`Actividades — ${state.site.shortName}`,description:'Agenda de encuentros, conversatorios, talleres, hackatones y proyectos del Foro.'});
    const type=qs.get('tipo')||'';
    const builtin=[['','Agenda'],['conversation','Conversatorios'],['workshop','Talleres'],['hackathon','Hackatones'],['project','Proyectos']];
    const tabs=[...builtin,...navigationFilters('actividades').filter(([key])=>!builtin.some(([k])=>k===key))];
    const list=events.filter(e=>!type||e.event_type===type);
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

  function setMissingPageNoindex() {
    let node=document.querySelector('meta[name="robots"]');
    if (!node) { node=document.createElement('meta');node.name='robots';document.head.appendChild(node) }
    node.content='noindex,follow';
  }

  function renderPostPage() {
    const slug=qs.get('slug')||'';
    let p=posts.find(x=>x.slug===slug);
    if (!p) { setMissingPageNoindex(); $('#main').innerHTML=notFound('Publicación no encontrada'); return; }
    applySeo({title:p.seo_title||`${p.title} — ${state.site.shortName}`,description:p.seo_description||p.excerpt,image:p.featured_image||state.site.seo?.image,schema:{'@context':'https://schema.org','@type':'Article',headline:p.title,description:p.seo_description||p.excerpt||'',inLanguage:'es-AR',mainEntityOfPage:new URL(`articulo.html?slug=${encodeURIComponent(p.slug)}`,location.href).href,datePublished:p.published_at||undefined,dateModified:p.updated_at||p.published_at||undefined,author:{'@type':'Person',name:p.author_name||state.site.shortName},publisher:{'@type':'Organization',name:state.site.name,url:location.origin},...(p.featured_image?{image:[new URL(p.featured_image,location.href).href]}:{})}});
    const refs = Array.isArray(p.references) ? p.references : [];
    const showPublicByline=!new DOMParser().parseFromString(p.content_html||'','text/html').querySelector('.foro-byline-hidden');
    $('#main').innerHTML = `<article class="article-page"><header class="article-header"><div class="shell article-head-grid"><div><div class="article-kicker"><span>${esc(typeNames[p.type]||p.category||'Publicación')}</span><time>${esc(fmtDate(p.published_at,true))}</time></div><h1>${esc(p.title)}</h1>${showPublicByline?`<div class="article-byline">Escrito por: <strong>${esc(p.author_name||state.site.shortName).replaceAll(' · ', ', ')}</strong>${p.author_role?`<span> · ${esc(p.author_role)}</span>`:''}</div>`:''}<div class="article-excerpt excerpt-paragraphs">${excerptParagraphs(p.excerpt)}</div></div></div></header><div class="shell article-layout"><aside><span>CONTENIDO</span><a href="#articulo">Artículo</a>${refs.length?'<a href="#fuentes">Fuentes</a>':''}<a href="participa.html">Enviar un aporte</a></aside><div class="article-body" id="articulo">${sanitizeRichHtml(p.content_html||'')}${refs.length?`<div class="references" id="fuentes"><h2>Fuentes y referencias</h2><ol>${refs.map(r=>`<li>${esc(r)}</li>`).join('')}</ol></div>`:''}</div></div></article>`;
    const excerptPhoto=$('#articulo figure.foro-image-excerpt-right');
    if(excerptPhoto){
      const parent=$('.article-header .article-head-grid > div');
      const excerpt=parent?.querySelector('.article-excerpt');
      if(excerpt){
        const row=document.createElement('div');row.className='foro-excerpt-row';
        const imgWrap=document.createElement('div');imgWrap.className='foro-excerpt-row-image';
        imgWrap.append(excerptPhoto);
        const percentage=Math.min(100,Math.max(0,Number(excerptPhoto.dataset.excerptWidth) ?? 35));
        row.style.setProperty('--excerpt-photo-width',percentage+'%');
        row.dataset.mobileOrder=excerptPhoto.dataset.mobileOrder||'text-first';
        excerpt.before(row);row.append(excerpt,imgWrap);
      }
    }
  }

  function renderEventPage() {
    const slug=qs.get('slug')||''; const e=events.find(x=>x.slug===slug);
    if (!e) { setMissingPageNoindex(); $('#main').innerHTML=notFound('Actividad no encontrada'); return; }
    applySeo({title:e.seo_title||`${e.title} — ${state.site.shortName}`,description:e.seo_description||e.excerpt,image:e.featured_image||state.site.seo?.image,schema:{'@context':'https://schema.org','@type':'Event',name:e.title,description:e.seo_description||e.excerpt||'',startDate:e.starts_at||undefined,endDate:e.ends_at||undefined,eventAttendanceMode:e.mode?.toLowerCase().includes('virtual')?'https://schema.org/OnlineEventAttendanceMode':'https://schema.org/OfflineEventAttendanceMode',url:new URL(`actividad.html?slug=${encodeURIComponent(e.slug)}`,location.href).href,organizer:{'@type':'Organization',name:state.site.name,url:location.origin}}});
    $('#main').innerHTML = `<article class="event-page"><header class="article-header event-detail"><div class="shell article-head-grid"><div><div class="article-kicker"><span>${esc(e.event_type||'Actividad')}</span><time>${esc(fmtDate(e.starts_at,true))}</time></div><h1>${esc(e.title)}</h1><div class="article-excerpt excerpt-paragraphs">${excerptParagraphs(e.excerpt)}</div><div class="event-facts"><div><span>Fecha y hora</span><strong>${esc(e.starts_at?new Intl.DateTimeFormat('es-AR',{dateStyle:'long',timeStyle:'short'}).format(new Date(e.starts_at)):'A confirmar')}</strong></div><div><span>Modalidad / lugar</span><strong>${esc(e.location||e.mode||'A confirmar')}</strong></div></div></div>${e.featured_image?`<div class="article-image" style="background-image:url('${attr(e.featured_image)}')"></div>`:`<div class="article-cover-abstract"><img src="${attr(state.site.icon)}" alt=""><span>ENCUENTRO</span></div>`}</div></header><div class="shell article-layout"><aside><span>ACTIVIDAD</span><a href="#detalle">Detalle</a>${e.registration_enabled?'<a href="#inscripcion">Inscripción</a>':''}<a href="actividades.html">Volver a agenda</a></aside><div class="article-body" id="detalle">${sanitizeRichHtml(e.content_html||'')}${e.registration_enabled?`<div class="registration-box" id="inscripcion"><h2>Inscripción</h2><p>${esc(e.registration_note||'Completá tus datos para registrar tu interés en esta actividad.')}</p><form id="eventRegistration" class="public-form compact"><input type="hidden" name="event_id" value="${attr(e.id)}"><div class="form-row"><label>Nombre<input name="name" required></label><label>Email<input name="email" type="email" required></label></div><label>Organización<input name="organization"></label><button class="btn primary" type="submit">Registrarme</button><p class="form-status" id="eventStatus"></p></form></div>`:''}</div></div></article>`;
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
    const inlineStyles=state.site?.inlineStyles||{};
    $$('[data-cms-path]').forEach(el=>{const st=inlineStyles[el.dataset.cmsPath]||{};['fontFamily','fontSize','lineHeight','textAlign','fontWeight','fontStyle'].forEach(k=>{if(st[k])el.style[k]=st[k]})});
    const toolbar=document.createElement('div');toolbar.className='cms-inline-toolbar';toolbar.innerHTML=`<span>Editar texto</span><select aria-label="Tipografía" data-inline-font><option value="">Fuente institucional</option>${['Instrument Serif','DM Sans','Inter','Playfair Display','Lora','Newsreader','Montserrat','Libre Baskerville','Georgia'].map(f=>`<option>${f}</option>`).join('')}</select><select aria-label="Tamaño" data-inline-size><option value="">Tamaño</option>${[14,16,18,22,26,32,40,48,64,80,100].map(n=>`<option value="${n}px">${n}px</option>`).join('')}</select><select aria-label="Interlineado" data-inline-line>${['1','1.2','1.4','1.6','1.8','2'].map(n=>`<option value="${n}">${n} línea</option>`).join('')}</select><button type="button" data-inline="left" title="Izquierda">⇤</button><button type="button" data-inline="center" title="Centro">≡</button><button type="button" data-inline="right" title="Derecha">⇥</button><button type="button" data-inline="bold" title="Negrita"><b>B</b></button><button type="button" data-inline="italic" title="Cursiva"><i>I</i></button><button type="button" data-inline="underline" title="Subrayado"><u>U</u></button><button type="button" data-inline="add" title="Agregar bloques">＋ Bloques</button>`;
    document.body.appendChild(toolbar);
    let selected=null;
    let selectedSection=null;
    function selectSection(sec){if(selectedSection)selectedSection.classList.remove('cms-section-selected');selectedSection=sec;sec?.classList.add('cms-section-selected');if(sec){const index=Number(sec.dataset.sectionIndex);if(Number.isInteger(index))parent.postMessage({type:'foro:section-select',index},'*')}}
    function changeInline(key,value){if(!selected)return;selected.style[key]=value;const path=selected.dataset.cmsPath;state.site.inlineStyles??={};state.site.inlineStyles[path]??={};state.site.inlineStyles[path][key]=value;parent.postMessage({type:'foro:inline-style',path,key,value},'*')}
    $$('select',toolbar).forEach(sel=>sel.onchange=()=>{if(sel.dataset.inlineFont!==undefined)changeInline('fontFamily',sel.value);else if(sel.dataset.inlineSize!==undefined)changeInline('fontSize',sel.value);else changeInline('lineHeight',sel.value)});
    // Preserve the browser selection when using a formatting control.
    toolbar.addEventListener('mousedown',e=>{if(e.target.closest('button[data-inline]'))e.preventDefault()});
    const sendRich=(el)=>{if(!el || !['DIV','P'].includes(el.tagName))return;const html=sanitizeInlineRich(el.innerHTML);state.site.inlineRich??={};state.site.inlineRich[el.dataset.cmsPath]=html;parent.postMessage({type:'foro:inline-rich',path:el.dataset.cmsPath,html},'*')};
    $$('[data-inline]',toolbar).forEach(btn=>btn.onclick=()=>{const op=btn.dataset.inline;if(op==='add'){const section=selected?.closest('[data-section-index]');if(section)parent.postMessage({type:'foro:edit-section',index:Number(section.dataset.sectionIndex)},'*');else parent.postMessage({type:'foro:open-pages'},'*');return}if(['left','center','right'].includes(op))changeInline('textAlign',op);if(['bold','italic','underline'].includes(op)){
       if(!selected)return;
       const sel=window.getSelection();
       const range=sel?.rangeCount?sel.getRangeAt(0):null;
       if(range && !sel.isCollapsed && selected.contains(range.commonAncestorContainer)){
          selected.focus();document.execCommand(op,false,null);sendRich(selected);
       }else if(op!=='underline')changeInline(op==='bold'?'fontWeight':'fontStyle',op==='bold'?(selected.style.fontWeight==='bold'?'normal':'bold'):(selected.style.fontStyle==='italic'?'normal':'italic'));
     }});
    $$('[data-cms-path]').forEach(el => {
      el.addEventListener('click',()=>{selected=el;selectSection(el.closest('[data-section-index]') || el.closest('#main section[id]') || el.closest('#main .internal-hero')); toolbar.classList.add('is-visible');toolbar.querySelector('[data-inline-line]').value=el.style.lineHeight||'1.6'});

      el.addEventListener('focus',()=>el.classList.add('cms-editing'));
      el.addEventListener('blur',()=>{
        el.classList.remove('cms-editing');
        const value=el.innerText.replace(/\r/g,'').replace(/\n$/,'');
        setPath(state,el.dataset.cmsPath,value);
        parent.postMessage({type:'foro:inline-change',path:el.dataset.cmsPath,value},'*');sendRich(el);
      });
      el.addEventListener('input',()=>{
        const value=el.innerText.replace(/\r/g,'').replace(/\n$/,'');
        setPath(state,el.dataset.cmsPath,value);
        parent.postMessage({type:'foro:inline-change',path:el.dataset.cmsPath,value},'*');sendRich(el);
      });
      el.addEventListener('keydown',e=>{
        if(e.key==='Enter'){
          e.preventDefault();
          // A line break inside the same editable field, including headings.
          document.execCommand('insertLineBreak',false,null);
          el.dispatchEvent(new Event('input',{bubbles:true}));
        }
      });
    });
    $$(page==='home'?'[data-section-index]':'#main > section, #main > article').forEach((sec,interiorIndex)=>{
      const b=document.createElement('button');b.type='button';b.className='cms-section-edit-button';b.textContent='✎ Editar sección / medios';b.onclick=e=>{e.preventDefault();e.stopPropagation();parent.postMessage(page==='home'?{type:'foro:edit-section',index:Number(sec.dataset.sectionIndex)}:{type:'foro:edit-interior',page,index:interiorIndex},'*')};sec.appendChild(b);
      sec.addEventListener('click',e=>{if(e.target.closest('button,a,input,textarea,select,[data-cms-path]'))return;selected=null;selectSection(sec)});
      sec.addEventListener('dblclick',e=>{if(e.target.closest('[data-cms-path]'))return;parent.postMessage(page==='home'?{type:'foro:edit-section',index:Number(sec.dataset.sectionIndex)}:{type:'foro:edit-interior',page,index:interiorIndex},'*')});
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape' && selectedSection){document.activeElement?.blur?.();selected=null;selectSection(selectedSection);return}
      if(!selectedSection || !['Delete','Backspace'].includes(e.key))return;
      const el=document.activeElement;
      if(el?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(el?.tagName))return;
      e.preventDefault();const index=Number(selectedSection.dataset.sectionIndex);
      if(page==='home') parent.postMessage({type:'foro:section-delete',index},'*');
      else if(page==='el-foro'){
        const id=selectedSection.id;if(id)parent.postMessage({type:'foro:section-delete',index,sectionId:id},'*');
      }
    });
  }

  // V12: independent, typed page components (stored as JSON, never executable HTML).
  function renderVisualBlocks(blocks=[]){
    const safeStyle=b=>{const o=b.style||{};return `style="text-align:${/^(center|right|justify)$/.test(o.align)?o.align:'left'};line-height:${/^(1|1\.[0-9]{1,2}|2|2\.[0-5])$/.test(String(o.lineHeight))?o.lineHeight:'1.5'};${o.fontFamily&&/^[a-z0-9 ,'-]+$/i.test(o.fontFamily)?`font-family:'${attr(o.fontFamily)}';`:''}${o.fontSize&&/^\d{1,3}$/.test(String(o.fontSize))?`font-size:${o.fontSize}px;`:''}${o.bold?'font-weight:700;':''}"`};
    return (Array.isArray(blocks)?blocks:[]).filter(b=>b&&!b.hidden).map((b,i)=>{
      const t=esc(b.text||'').replace(/\n/g,'<br>');const style=safeStyle(b);
      if(['h2','h3','p','blockquote'].includes(b.type))return `<${b.type} class="foro-visual-block" ${style}>${t||'&nbsp;'}</${b.type}>`;
      if(b.type==='image'&&/^https?:\/\//i.test(b.src||''))return `<figure class="foro-visual-block"><img loading="lazy" src="${attr(b.src)}" alt="${attr(b.alt||'')}"><figcaption>${esc(b.caption||'')}</figcaption></figure>`;
      if(b.type==='video'&&/^https?:\/\//i.test(b.src||''))return `<figure class="foro-visual-block"><video controls playsinline preload="metadata" src="${attr(b.src)}"></video><figcaption>${esc(b.caption||'')}</figcaption></figure>`;
      if(b.type==='youtube'){const id=(String(b.src||'').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)||[])[1];return id?`<figure class="foro-visual-block"><iframe title="Video YouTube" loading="lazy" allowfullscreen src="https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1"></iframe></figure>`:'';}
      if(b.type==='divider')return `<hr class="foro-visual-block">`;
      return '';
    }).join('');
  }
  function appendVisualBlocks(){
    if(page==='home'){
      (state.sections||[]).forEach((section,i)=>{
        const target=document.querySelector(`[data-section-index="${i}"]`);
        if(target&&section.visualBlocks?.length){const node=document.createElement('div');node.className='shell cms-structured-blocks article-body';node.innerHTML=renderVisualBlocks(section.visualBlocks);target.append(node)}
      });
    }else if(!['post','event','privacy','terms'].includes(page)){
      const blocks=state.pages?.[page]?.visualBlocks;
      if(blocks?.length){const node=document.createElement('section');node.className='section cms-page-extra';node.innerHTML=`<div class="shell cms-structured-blocks article-body">${renderVisualBlocks(blocks)}</div>`;document.querySelector('#main')?.append(node)}
    }
  }
  function renderCurrentPage() {
    applyTheme(); setupAnalytics(); renderHeader(); renderFooter();
    if (page==='home') renderHome();
    else if (page==='el-foro') renderForoPage();
    else if (page==='conocimiento') renderKnowledgePage();
    else if (page==='custom') renderCustomPage();
    else if (page==='resources') renderResourcesPage();
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
    if(page!=='home' && state.pages?.[page]?.extraHtml && !['post','event'].includes(page)){
      const extra=document.createElement('section');extra.className='section cms-page-extra';extra.innerHTML=`<div class="shell article-body">${sanitizeRichHtml(state.pages[page].extraHtml)}</div>`;$('#main').append(extra);
    }
    Object.entries(state.site?.inlineStyles||{}).forEach(([path,styles])=>{document.querySelectorAll('[data-cms-path]').forEach(el=>{if(el.dataset.cmsPath!==path)return;['fontFamily','fontSize','lineHeight','textAlign','fontWeight','fontStyle'].forEach(k=>{if(styles[k])el.style[k]=styles[k]})})});
    appendVisualBlocks();
    addRoutePosts();
    setupInlineEditing();
    configureArticleGalleries();
    enhanceMediaPlayback();
    setupHeroCarousels();
  }

  addEventListener('message', e => {
    const m=e.data||{};
    if (m.type==='foro:cms-preview' && m.payload) {
      if(Array.isArray(m.posts))posts=m.posts;
      if(Array.isArray(m.events))events=m.events;
      state=window.FORO_UPGRADE_CONTENT_V38(mergeDeep(structuredClone(defaults),m.payload));
      const focused=document.activeElement;
      if(inlineMode && focused?.isContentEditable && focused.matches('[data-cms-path]')){
        // Never replace a live contenteditable node during typing.
        return;
      }
      const oldScroll=window.scrollY;
      renderCurrentPage();
      window.scrollTo(0,oldScroll);
    }
    if (m.type==='foro:cms-preview-focus' && m.anchor) document.getElementById(m.anchor)?.scrollIntoView({behavior:'smooth',block:'center'});
  });

  async function boot() {
    try {
      if (db.configured) {
        const [remote,remotePosts,remoteEvents] = await Promise.all([previewMode?Promise.resolve(null):db.loadSiteContent(),db.listPosts({limit:250}),db.listEvents({limit:250})]);
        if (remote && !previewMode) state=window.FORO_UPGRADE_CONTENT_V38(migrateLegacyPalette(mergeDeep(structuredClone(defaults),remote)));
        if (Array.isArray(remotePosts)) posts=remotePosts;
        if (Array.isArray(remoteEvents)) events=remoteEvents;
      }
    } catch(err) { console.warn('Se usan contenidos locales por falla de conexión:',err); }
    renderCurrentPage();
    if (previewMode) parent.postMessage({type:'foro:preview-ready',page},'*');
  }
  boot();
})();
