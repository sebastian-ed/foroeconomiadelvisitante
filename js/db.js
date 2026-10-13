(function () {
  const cfg = window.FORO_SUPABASE || {};
  const configured = Boolean(
    cfg.url && cfg.anonKey &&
    !cfg.url.includes('YOUR_SUPABASE') &&
    !cfg.anonKey.includes('YOUR_SUPABASE')
  );

  let client = null;
  if (configured && window.supabase?.createClient) {
    client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  async function currentUserId() {
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data?.user?.id || null;
  }

  function cleanRecord(record) {
    return Object.fromEntries(Object.entries(record).filter(([,v]) => v !== undefined));
  }

  window.ForoDB = {
    configured,
    client,

    async loadSiteContent() {
      if (!client) return null;
      const { data, error } = await client.from('site_content').select('payload,updated_at').eq('slug', 'site').maybeSingle();
      if (error) throw error;
      return data?.payload && Object.keys(data.payload).length ? data.payload : null;
    },

    async saveSiteContent(payload, note = 'Publicación desde CMS') {
      if (!client) throw new Error('Supabase no está configurado');
      const updated_by = await currentUserId();
      const { error } = await client.from('site_content').upsert({ slug:'site', payload, updated_by }, { onConflict:'slug' });
      if (error) throw error;
      const { error: revisionError } = await client.from('content_revisions').insert({ slug:'site', payload, note, created_by:updated_by });
      if (revisionError) console.warn(revisionError);
    },

    async listRevisions(limit = 40) {
      if (!client) return [];
      const { data, error } = await client.from('content_revisions').select('id,note,created_at,created_by').eq('slug','site').order('created_at',{ascending:false}).limit(limit);
      if (error) throw error;
      return data || [];
    },

    async getRevision(id) {
      const { data, error } = await client.from('content_revisions').select('payload').eq('id',id).single();
      if (error) throw error;
      return data.payload;
    },

    async listPosts({ admin = false, type = '', limit = 100 } = {}) {
      if (!client) return null;
      let q = client.from('posts').select('*').order('published_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(limit);
      if (!admin) q = q.in('status',['published','scheduled']).lte('published_at', new Date().toISOString());
      if (type) q = q.eq('type', type);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },

    async getPostBySlug(slug) {
      if (!client) return null;
      const { data, error } = await client.from('posts').select('*').eq('slug',slug).in('status',['published','scheduled']).lte('published_at',new Date().toISOString()).maybeSingle();
      if (error) throw error;
      return data || null;
    },

    async savePost(post) {
      if (!client) throw new Error('Supabase no está configurado');
      const userId = await currentUserId();
      const payload = cleanRecord({ ...post, updated_by:userId, ...(!post.id?{created_by:userId}:{}) });
      // Un registro existente se actualiza por id. Evita conflictos de slug y claves primarias
      // provocados por upserts sobre otro índice único.
      let query;
      if (post.id) {
        const { id, created_at, created_by, ...patch } = payload;
        query = client.from('posts').update(patch).eq('id',id).select().single();
      } else {
        query = client.from('posts').insert(payload).select().single();
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async deletePost(id) {
      const { error } = await client.from('posts').delete().eq('id',id);
      if (error) throw error;
    },

    async listEvents({ admin = false, limit = 100 } = {}) {
      if (!client) return null;
      let q = client.from('events').select('*').order('starts_at',{ascending:true,nullsFirst:false}).limit(limit);
      if (!admin) q = q.eq('status','published');
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },

    async getEventBySlug(slug) {
      if (!client) return null;
      const { data, error } = await client.from('events').select('*').eq('slug',slug).eq('status','published').maybeSingle();
      if (error) throw error;
      return data || null;
    },

    async saveEvent(event) {
      const userId = await currentUserId();
      const { data, error } = await client.from('events').upsert(cleanRecord({...event,updated_by:userId}),{onConflict:'slug'}).select().single();
      if (error) throw error;
      return data;
    },

    async deleteEvent(id) {
      const { error } = await client.from('events').delete().eq('id',id);
      if (error) throw error;
    },

    async submitInquiry(payload) {
      if (!client) throw new Error('Supabase no está configurado');
      const { data, error } = await client.from('inquiries').insert(cleanRecord(payload)).select('id').single();
      if (error) throw error;
      try { await client.functions.invoke('contact-notification',{body:{inquiryId:data.id}}); } catch (e) { console.warn('Notificación por email no disponible', e); }
      return data;
    },

    async listInquiries(limit = 250) {
      if (!client) return [];
      const { data, error } = await client.from('inquiries').select('*').order('created_at',{ascending:false}).limit(limit);
      if (error) throw error;
      return data || [];
    },

    async updateInquiry(id, patch) {
      const { error } = await client.from('inquiries').update(patch).eq('id',id);
      if (error) throw error;
    },

    async registerEvent(payload) {
      if (!client) throw new Error('Supabase no está configurado');
      const { error } = await client.from('event_registrations').insert(payload);
      if (error) throw error;
    },

    async listRegistrations(limit = 500) {
      if (!client) return [];
      const { data, error } = await client.from('event_registrations').select('*,events(title,starts_at)').order('created_at',{ascending:false}).limit(limit);
      if (error) throw error;
      return data || [];
    },

    async subscribeNewsletter(email, name = '', source = 'website') {
      if (!client) throw new Error('Supabase no está configurado');
      const { data, error } = await client.rpc('subscribe_to_newsletter',{p_email:email,p_name:name,p_source:source});
      if (error) throw error;
      return data;
    },

    async unsubscribeNewsletter(email) {
      if (!client) throw new Error('Supabase no está configurado');
      const { data, error } = await client.rpc('unsubscribe_from_newsletter',{p_email:email});
      if (error) throw error;
      return data;
    },

    async listSubscribers(limit = 1000) {
      if (!client) return [];
      const { data, error } = await client.from('newsletter_subscribers').select('*').order('created_at',{ascending:false}).limit(limit);
      if (error) throw error;
      return data || [];
    },

    async updateSubscriber(id, patch) {
      const { error } = await client.from('newsletter_subscribers').update(patch).eq('id',id);
      if (error) throw error;
    },

    async listCampaigns(limit = 100) {
      if (!client) return [];
      const { data, error } = await client.from('newsletter_campaigns').select('*').order('created_at',{ascending:false}).limit(limit);
      if (error) throw error;
      return data || [];
    },

    async saveCampaign(campaign) {
      const userId = await currentUserId();
      const payload = cleanRecord({...campaign,updated_by:userId});
      if (!payload.created_by) payload.created_by = userId;
      const { data, error } = await client.from('newsletter_campaigns').upsert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async sendCampaign(campaignId) {
      if (!client) throw new Error('Supabase no está configurado');
      const { data, error } = await client.functions.invoke('send-newsletter',{body:{campaignId}});
      if (error) throw error;
      return data;
    },

    async uploadMedia(file) {
      if (!client) throw new Error('Supabase no está configurado');
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const base = file.name.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-|-$/g,'') || 'asset';
      const path = `site/${new Date().toISOString().slice(0,10)}/${Date.now()}-${base}.${ext}`;
      const { error } = await client.storage.from('foro-media').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
      if (error) throw error;
      const { data:publicData } = client.storage.from('foro-media').getPublicUrl(path);
      const userId = await currentUserId();
      const record = {name:file.name,path,url:publicData.publicUrl,mime_type:file.type||null,size_bytes:file.size||null,created_by:userId};
      const { data, error:recordError } = await client.from('media_assets').insert(record).select().single();
      if (recordError) throw recordError;
      return data;
    },

    async listMedia(limit = 500) {
      if (!client) return [];
      const { data, error } = await client.from('media_assets').select('*').order('created_at',{ascending:false}).limit(limit);
      if (error) throw error;
      return data || [];
    },

    async deleteMedia(asset) {
      if (asset?.path) {
        const { error } = await client.storage.from('foro-media').remove([asset.path]);
        if (error) throw error;
      }
      if (asset?.id) {
        const { error } = await client.from('media_assets').delete().eq('id',asset.id);
        if (error) throw error;
      }
    }
  };
})();
