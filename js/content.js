window.FORO_DEFAULT_CONTENT = {
  version: 1,
  site: {
    name: "Foro para el Desarrollo de la Economía del Visitante",
    shortName: "Foro Economía del Visitante",
    phrase: "Entender el turismo para tomar mejores decisiones",
    contactEmail: "foroeconomiadelvisitante@gmail.com",
    defaultLanguage: "es",
    logo: "assets/images/logo-foro.webp",
    icon: "assets/images/isotipo-limpio.png",
    footerIcon: "assets/images/isotipo-blanco.png",
    social: { linkedin: "", instagram: "", youtube: "" },
    analytics: { gtagId: "" },
    seo: {
      title: "Foro para el Desarrollo de la Economía del Visitante",
      description: "Espacio abierto y colaborativo para conectar actores, generar conocimiento y promover iniciativas que impulsen la economía del visitante en Argentina.",
      image: "assets/images/logo-foro.png"
    },
    footerNote: "Iniciativa abierta y colaborativa, con vocación nacional y proyección federal."
  },
  theme: {
    background: "#f4f5f3",
    paper: "#ffffff",
    ink: "#052b4a",
    text: "#16354b",
    muted: "#627487",
    line: "#d5dadd",
    navy: "#063e76",
    navyDeep: "#032b52",
    cyan: "#0d7ea6",
    cyanSoft: "#dff5fb",
    warm: "#e8edf0",
    bodyFont: "DM Sans",
    headingFont: "Instrument Serif",
    subtitleFont: "DM Sans",
    navigationFont: "DM Sans",
    buttonFont: "DM Sans",
    eyebrowFont: "DM Sans",
    articleFont: "Instrument Serif",
    customFonts: [],
    maxWidth: 1380,
    radius: 0,
    sectionSpace: 124
  },
  navigation: [
    { id: "nav-home", label: "Inicio", href: "index.html" },
    { id: "nav-foro", label: "El Foro", href: "el-foro.html", children: [
      { label: "Quiénes somos", href: "el-foro.html#quienes-somos" },
      { label: "Misión, visión y objetivos", href: "el-foro.html#mision" },
      { label: "Ejes y metodología", href: "el-foro.html#metodologia" },
      { label: "Comisión Promotora", href: "el-foro.html#comision" }
    ] },
    { id: "nav-knowledge", label: "Conocimiento", href: "conocimiento.html", children: [
      { label: "Artículos y ensayos", href: "conocimiento.html?tipo=article" },
      { label: "Datos y análisis", href: "conocimiento.html?tipo=analysis" },
      { label: "Investigaciones", href: "conocimiento.html?tipo=research" },
      { label: "Informes", href: "conocimiento.html?tipo=report" },
      { label: "Biblioteca y recursos", href: "biblioteca-recursos.html" }
    ] },
    { id: "nav-activities", label: "Actividades", href: "actividades.html", children: [
      { label: "Agenda", href: "actividades.html" },
      { label: "Conversatorios", href: "actividades.html?tipo=conversation" },
      { label: "Talleres", href: "actividades.html?tipo=workshop" },
      { label: "Hackatones", href: "actividades.html?tipo=hackathon" },
      { label: "Proyectos", href: "actividades.html?tipo=project" }
    ] },
    { id: "nav-voices", label: "Voces", href: "voces.html", children: [
      { label: "Entrevistas", href: "voces.html?tipo=interview" },
      { label: "Podcast y audiovisual", href: "voces.html?tipo=podcast" },
      { label: "Experiencias", href: "voces.html?tipo=experience" },
      { label: "Casos territoriales", href: "voces.html?tipo=case" }
    ] },
    { id: "nav-join", label: "Participá", href: "participa.html", featured: true }
  ],
  sections: [
    {
      id: "hero",
      type: "heroForum",
      label: "Hero institucional",
      enabled: true,
      settings: { anchor: "inicio", tone: "light" },
      content: {
        eyebrow: "ECONOMÍA · TERRITORIO · CONOCIMIENTO",
        title: "Entender el turismo para tomar mejores decisiones",
        body: "Un espacio abierto y colaborativo para comprender el valor que generan los visitantes, conectar actores y transformar conocimiento en iniciativas concretas para los territorios.",
        primaryLabel: "Conocé el Foro",
        primaryHref: "el-foro.html",
        secondaryLabel: "Participá",
        secondaryHref: "participa.html"
      }
    },
    {
      id: "concepto",
      type: "conceptStatement",
      label: "Concepto de economía del visitante",
      enabled: true,
      settings: { anchor: "economia-del-visitante" },
      content: {
        eyebrow: "UNA MIRADA MÁS AMPLIA",
        title: "¿Qué es la economía del visitante?",
        body: "La economía del visitante comprende mucho más que las actividades tradicionalmente asociadas al turismo. Integra los atractivos, la infraestructura, los servicios y las experiencias que hacen que un territorio sea elegido, recorrido y disfrutado por quienes lo visitan.\n\nSu desarrollo involucra a múltiples sectores económicos y actores del territorio, desde la gastronomía y el comercio hasta la cultura, la movilidad, la tecnología y la calidad de los espacios públicos.",
        note: "Pensar la economía del visitante significa comprender al territorio como un sistema integrado, en el que sus atractivos, infraestructura, servicios e instituciones contribuyen a la experiencia de quienes lo visitan. Esta perspectiva permite articular decisiones públicas, privadas y comunitarias para generar mayor valor económico y social."
      },
      items: ["Gastronomía", "Comercio", "Cultura", "Eventos", "Transporte", "Tecnología", "Servicios", "Entorno y territorio"]
    },
    {
      id: "turismo-vs-visitante",
      type: "editorialInsight",
      label: "Del turismo a la economía del visitante",
      enabled: true,
      settings: { anchor: "turismo-y-economia-del-visitante", variant: "comparison" },
      content: {
        eyebrow: "DOS MIRADAS COMPLEMENTARIAS",
        title: "Del turismo a la economía del visitante",
        body: "El turismo permite identificar y medir las actividades realizadas por quienes viajan. La economía del visitante propone ampliar esa mirada para comprender el conjunto de condiciones que hacen posible la experiencia de visitar un territorio.\n\nUn destino no depende únicamente de sus hoteles, excursiones o atractivos turísticos. También depende de la calidad de sus espacios públicos, su movilidad, su oferta cultural, sus comercios, sus servicios y la participación de sus instituciones y comunidades.\n\nPasar de una mirada sectorial a una perspectiva territorial permite comprender cómo estas actividades se relacionan y contribuyen al desarrollo económico y social.",
        leftTitle: "Turismo",
        leftBody: "Actividades de quienes viajan: desplazamientos, estadías y consumos vinculados al viaje.",
        rightTitle: "Economía del visitante",
        rightBody: "La experiencia en su conjunto: atractivos, infraestructura, servicios, actores y calidad del territorio."
      }
    },
    {
      id: "conocer-al-visitante",
      type: "editorialInsight",
      label: "Conocer al visitante para desarrollar el territorio",
      enabled: true,
      settings: { anchor: "conocer-al-visitante", variant: "feature" },
      content: {
        eyebrow: "INFORMACIÓN PARA DECIDIR",
        title: "Conocer al visitante para desarrollar el territorio",
        body: "Comprender quiénes visitan un territorio, qué buscan, cómo se desplazan y qué experiencias valoran permite tomar mejores decisiones.\n\nEl análisis de información ayuda a identificar oportunidades, orientar inversiones, mejorar servicios y desarrollar experiencias que respondan a las necesidades de los distintos públicos.\n\nEl desafío no consiste solamente en atraer más visitantes, sino en generar mayor valor a través de experiencias de calidad que beneficien al territorio y sus comunidades."
      }
    },
    {
      id: "pilares",
      type: "pillars",
      label: "Pilares de trabajo",
      enabled: true,
      settings: { anchor: "pilares" },
      content: {
        eyebrow: "CÓMO TRABAJAMOS",
        title: "Conocimiento. Encuentro. Acción.",
        body: "Tres pilares para pasar de la información aislada a una agenda compartida con capacidad de producir impacto."
      },
      items: [
        { number: "01", title: "Conocimiento", body: "Datos, investigaciones, artículos, informes, tendencias y análisis de la economía del visitante.", href: "conocimiento.html" },
        { number: "02", title: "Encuentro", body: "Conversaciones, entrevistas, mesas de debate, formación y vinculación entre actores públicos, privados, académicos y comunitarios.", href: "actividades.html" },
        { number: "03", title: "Acción", body: "Proyectos colaborativos, desafíos territoriales y propuestas que puedan convertirse en experiencias piloto.", href: "participa.html" }
      ]
    },
    {
      id: "publicaciones",
      type: "collectionFeed",
      label: "Publicaciones destacadas",
      enabled: true,
      settings: { anchor: "publicaciones", limit: 3, collection: "knowledge" },
      content: {
        eyebrow: "CONOCIMIENTO",
        title: "Ideas y evidencia para decidir mejor",
        body: "Artículos, informes, investigaciones y recursos para ampliar la conversación sobre la economía del visitante.",
        ctaLabel: "Ver todo el conocimiento",
        ctaHref: "conocimiento.html"
      }
    },
    {
      id: "agenda",
      type: "activitiesFeed",
      label: "Próximas actividades",
      enabled: true,
      settings: { anchor: "agenda", limit: 3 },
      content: {
        eyebrow: "AGENDA",
        title: "Conversaciones que conectan actores",
        body: "Encuentros, talleres, mesas de debate, desafíos y proyectos. Solo se publican actividades confirmadas.",
        ctaLabel: "Ver agenda",
        ctaHref: "actividades.html",
        emptyTitle: "La agenda pública está en preparación",
        emptyBody: "Cuando haya encuentros o convocatorias confirmadas, van a aparecer en esta sección."
      }
    },
    {
      id: "voces",
      type: "voicesFeed",
      label: "Voces y experiencias",
      enabled: true,
      settings: { anchor: "voces", limit: 3 },
      content: {
        eyebrow: "VOCES",
        title: "Perspectivas para entender el territorio",
        body: "Entrevistas, experiencias empresariales, casos territoriales y buenas prácticas que ayuden a construir una conversación plural.",
        ctaLabel: "Explorar Voces",
        ctaHref: "voces.html",
        emptyTitle: "Voces es una sección abierta",
        emptyBody: "El Foro incorporará entrevistas y casos a medida que sean producidos y confirmados."
      }
    },
    {
      id: "participa",
      type: "joinCta",
      label: "Convocatoria a participar",
      enabled: true,
      settings: { anchor: "participa" },
      content: {
        eyebrow: "SUMATE AL FORO",
        title: "Una plataforma se vuelve valiosa cuando más actores pueden aportar.",
        body: "Podés enviar un artículo o investigación, proponer un tema, acercar un desafío territorial o participar como profesional, institución, empresa o especialista.",
        primaryLabel: "Quiero participar",
        primaryHref: "participa.html",
        secondaryLabel: "Escribir al Foro",
        secondaryHref: "mailto:foroeconomiadelvisitante@gmail.com"
      }
    }
  ],
  pages: {
    "el-foro": {
      hero: { eyebrow: "EL FORO", title: "Un espacio para ampliar la mirada sobre el turismo", body: "El Foro nace para comprender el valor económico, social y territorial que generan los visitantes y convertir ese conocimiento en mejores conversaciones, decisiones e iniciativas." },
      intro: { title: "Quiénes somos", body: "El Foro para el Desarrollo de la Economía del Visitante nace con el propósito de proponer una nueva mirada sobre la actividad turística nacional y regional, entendiendo al turismo no solo como un sector de servicios, sino como una actividad estratégica para el desarrollo económico, social, cultural y territorial.\nBuscamos generar un espacio de encuentro, reflexión y acción, capaz de articular ideas, producir información útil y promover diálogos interdisciplinarios que contribuyan al desarrollo de una economía del visitante más competitiva, sostenible e inclusiva. Nuestra mirada incorpora no solo a las empresas vinculadas directa o indirectamente con el turismo, sino también a las comunidades y al impacto que esta actividad genera sobre sus oportunidades y calidad de vida.\nEntendemos al visitante como un actor central en la dinámica de los territorios. Conocer sus tendencias, comportamientos y necesidades —ya sea en el turismo nacional, regional e internacional o en los desplazamientos de excursionistas— permite tomar mejores decisiones, identificar oportunidades y diseñar estrategias de desarrollo con mayor impacto.\nAl mismo tiempo, promovemos que los propios residentes redescubran sus territorios, reconozcan su patrimonio y fortalezcan su identidad a partir de nuevas formas de experimentar y valorar su entorno.\nEl Foro impulsa la circulación y el intercambio de conocimiento a través de ensayos, artículos de opinión, análisis de actualidad, información, investigaciones y diálogos interdisciplinarios sobre la evolución de la economía del visitante y su impacto en las distintas regiones del país. La Comisión Promotora recibirá y promoverá contenidos que contribuyan al debate de ideas y a la construcción de propuestas concretas para un turismo sostenible, capaz de generar un impacto económico, cultural y social positivo.\nEn definitiva, buscamos conectar actores, conocimiento, datos, innovación y experiencias para transformar ideas en iniciativas que impulsen el desarrollo de los territorios y el bienestar de sus comunidades.\nComisión Promotora del Foro para el Desarrollo de la Economía del Visitante\n[Nombres]" },
      mission: {
        missionTitle: "Misión", missionBody: "Conectar actores, generar conocimiento y promover iniciativas que impulsen el desarrollo de la economía del visitante y su impacto positivo en los territorios.",
        visionTitle: "Visión", visionBody: "Consolidarse como un espacio de referencia nacional para el análisis, el intercambio de ideas y la generación de soluciones vinculadas con la economía del visitante."
      },
      objectives: [
        "Generar y difundir información útil para la toma de decisiones.",
        "Promover investigaciones, publicaciones y análisis interdisciplinarios.",
        "Facilitar el intercambio entre los sectores público, privado, académico y comunitario.",
        "Identificar oportunidades de desarrollo, innovación e inversión.",
        "Impulsar encuentros, actividades formativas y desafíos colaborativos.",
        "Visibilizar experiencias y buenas prácticas de diferentes territorios.",
        "Contribuir a un desarrollo turístico competitivo, inclusivo y sostenible."
      ],
      methodology: { title: "Metodología y principios", body: "El Foro distingue datos de opiniones, identifica fuentes, promueve perspectivas diversas y busca transformar análisis en conversaciones y acciones concretas. Su lógica de trabajo combina rigor, apertura, colaboración, mirada federal y orientación a impacto." },
      commission: { title: "Comisión Promotora", body: "La Comisión Promotora se encuentra en etapa de conformación. Este espacio publicará únicamente integrantes y roles que hayan sido formalmente confirmados." }
    },
    "participa": {
      hero: { eyebrow: "PARTICIPÁ", title: "Traé una idea, una evidencia o un desafío", body: "El Foro está pensado para recibir aportes de personas, instituciones, empresas, especialistas y territorios. Elegí la forma de participación que mejor represente tu propuesta." },
      options: [
        { title: "Enviar un artículo o investigación", body: "Compartí una publicación, estudio o línea de análisis para evaluación editorial.", type: "article" },
        { title: "Proponer un tema para debatir", body: "Sugerí una conversación, una pregunta o un enfoque que valga la pena poner en agenda.", type: "topic" },
        { title: "Presentar un desafío territorial", body: "Acercá una problemática concreta que pueda trabajarse de manera colaborativa.", type: "challenge" },
        { title: "Colaborar con el Foro", body: "Sumate como profesional, institución, empresa, investigador o especialista.", type: "collaboration" }
      ]
    }
  }
};

window.FORO_STARTER_POSTS = [
  {
    id: "starter-1",
    slug: "economia-del-visitante-una-mirada-mas-amplia",
    title: "Economía del visitante: una mirada más amplia sobre el desarrollo territorial",
    excerpt: "Un marco inicial para observar cómo el movimiento de visitantes impacta en actividades que exceden la oferta turística tradicional.",
    content_html: "<p>Hablar de economía del visitante implica ampliar el foco. El desarrollo de un destino no depende exclusivamente de hoteles, atractivos o excursiones. También involucra a la gastronomía, el comercio, la cultura, los eventos, el transporte, la tecnología, los servicios y la calidad del entorno urbano y natural.</p><p>El Foro propone observar esas relaciones como un sistema. Esa mirada permite formular mejores preguntas, conectar información dispersa y construir conversaciones entre actores que muchas veces trabajan sobre un mismo territorio desde agendas diferentes.</p><h2>Una herramienta para decidir mejor</h2><p>El objetivo no es reemplazar el concepto de turismo, sino complementarlo con una perspectiva capaz de reconocer la diversidad de impactos que produce la presencia y el desplazamiento de visitantes. A partir de allí, el desafío es transformar conocimiento en iniciativas concretas y medibles.</p>",
    type: "article",
    category: "Marco conceptual",
    tags: ["economía del visitante", "territorio", "desarrollo"],
    author_name: "Foro para el Desarrollo de la Economía del Visitante",
    status: "published",
    published_at: "2026-10-09T12:00:00-03:00",
    featured: true,
    featured_image: "",
    seo_title: "Economía del visitante: una mirada más amplia",
    seo_description: "Marco inicial del Foro para comprender la economía del visitante y su relación con el desarrollo territorial."
  },
  {
    id: "starter-2",
    slug: "conocimiento-encuentro-accion",
    title: "Conocimiento, encuentro y acción: los tres pilares del Foro",
    excerpt: "Por qué el Foro organiza su trabajo en tres capas que conectan información, conversación y proyectos.",
    content_html: "<p>El Foro organiza su propuesta alrededor de tres pilares complementarios: conocimiento, encuentro y acción.</p><h2>Conocimiento</h2><p>Datos, investigaciones, artículos, informes, tendencias y análisis que permitan entender mejor los fenómenos vinculados con la economía del visitante.</p><h2>Encuentro</h2><p>Conversaciones, entrevistas, mesas de debate, actividades de formación y espacios de vinculación entre actores públicos, privados, académicos y comunitarios.</p><h2>Acción</h2><p>Proyectos colaborativos, hackatones, desafíos territoriales y propuestas que puedan transformarse en experiencias piloto.</p>",
    type: "article",
    category: "Institucional",
    tags: ["foro", "conocimiento", "colaboración"],
    author_name: "Foro para el Desarrollo de la Economía del Visitante",
    status: "published",
    published_at: "2026-10-09T12:05:00-03:00",
    featured: false,
    featured_image: "",
    seo_title: "Conocimiento, encuentro y acción",
    seo_description: "Los tres pilares de trabajo del Foro para el Desarrollo de la Economía del Visitante."
  },
  {
    id: "starter-3",
    slug: "convocatoria-abierta-a-aportes",
    title: "Convocatoria abierta a artículos, investigaciones y desafíos territoriales",
    excerpt: "El Foro abre un canal para recibir aportes que ayuden a construir una agenda plural y fundamentada.",
    content_html: "<p>El Foro está abierto a profesionales, instituciones, empresas, investigadores, organismos públicos y comunidades que quieran aportar conocimiento o acercar un desafío concreto.</p><p>Se pueden proponer artículos, investigaciones, temas para debate, casos territoriales, experiencias empresariales y desafíos que requieran articulación entre actores.</p><p>Las contribuciones deben identificar autoría, fuentes cuando corresponda y distinguir con claridad los datos de las opiniones.</p>",
    type: "article",
    category: "Participación",
    tags: ["convocatoria", "participación"],
    author_name: "Foro para el Desarrollo de la Economía del Visitante",
    status: "published",
    published_at: "2026-10-09T12:10:00-03:00",
    featured: false,
    featured_image: "",
    seo_title: "Convocatoria abierta a aportes",
    seo_description: "Canal abierto para enviar artículos, investigaciones, temas y desafíos territoriales al Foro."
  }
];

// V38: incorporación conservadora al contenido guardado anteriormente en Supabase.
// No cambia textos personalizados ni vuelve a crear bloques eliminados luego de publicar V38.
window.FORO_UPGRADE_CONTENT_V38 = function upgradeContentV38(data) {
  if (!data || !Array.isArray(data.sections)) return data;
  data.site ||= {};
  if (data.site.contentRevision38) return data;
  const old = data.sections.find(s => s.id === 'concepto');
  const current = window.FORO_DEFAULT_CONTENT.sections.find(s => s.id === 'concepto');
  const oldTexts = {
    title: 'El visitante activa mucho más que turismo.',
    body: 'El desarrollo de un destino también involucra a la gastronomía, el comercio, la cultura, los eventos, el transporte, la tecnología, los servicios y la calidad del entorno urbano y natural.',
    note: 'La economía del visitante permite observar esas relaciones como un sistema y discutir mejores decisiones públicas, privadas y comunitarias.'
  };
  if (old?.content) for (const key of Object.keys(oldTexts)) {
    if (old.content[key] === oldTexts[key]) old.content[key] = current.content[key];
  }
  const start = data.sections.findIndex(s => s.id === 'concepto');
  if (start !== -1) {
    let position = start + 1;
    for (const id of ['turismo-vs-visitante','conocer-al-visitante']) {
      if (!data.sections.some(s => s.id === id)) {
        const block = window.FORO_DEFAULT_CONTENT.sections.find(s => s.id === id);
        data.sections.splice(position,0,structuredClone(block));
      }
      position++;
    }
  }
  data.site.contentRevision38 = true;
  return data;
};
