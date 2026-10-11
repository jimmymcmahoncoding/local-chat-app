/* Authenticated media downloads: no bearer-token URLs enter the DOM. */
(function (root) {
  'use strict';
  root.createProtectedMedia = function ({bucket, getUser, getAppCheckToken, fetchImpl = fetch, endpoint = 'https://firebasestorage.googleapis.com'}) {
    if (!['https://firebasestorage.googleapis.com','http://127.0.0.1:9199'].includes(endpoint)) throw new Error('Untrusted media endpoint');
    let generation = 0;
    const urls = new Map();
    const pending = new Map();
    const controllers = new Set();
    async function download(value) {
      const location = root.ChatSecurity.mediaLocation(value, bucket);
      const user = getUser();
      if (!location || !user?.emailVerified) throw new Error('Media unavailable');
      const key = `${user.uid}:${location.object}`;
      if (urls.has(key)) return urls.get(key);
      if (pending.has(key)) return pending.get(key);
      const epoch = generation;
      const controller = new AbortController();
      controllers.add(controller);
      const deadline = setTimeout(() => controller.abort(), 30000);
      const task = (async () => {
        const headers = {Authorization: `Firebase ${await user.getIdToken()}`};
        const appCheck = await getAppCheckToken?.();
        if (appCheck) headers['X-Firebase-AppCheck'] = appCheck;
        if (epoch !== generation) throw new Error('Session changed');
        let response;
        for (let attempt = 0; attempt < 12; attempt++) {
          if (epoch !== generation || controller.signal.aborted) throw new Error('Session changed');
          response = await fetchImpl(`${endpoint}/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(location.object)}?alt=media`, {
            headers, credentials:'omit', cache:'no-store', redirect:'error', signal:controller.signal,
          });
          if (response.ok || ![403,404].includes(response.status)) break;
          if (epoch !== generation) throw new Error('Session changed');
          await new Promise(resolve => setTimeout(resolve,1000));
        }
        if (!response.ok) throw new Error('Media unavailable');
        const contentType = (response.headers.get('content-type') || '').split(';')[0];
        if (!['image/jpeg','image/png','image/webp','audio/webm','audio/mp4','audio/ogg'].includes(contentType)) throw new Error('Unsupported media');
        const reader = response.body.getReader();
        const chunks = [];
        let size = 0;
        try {
          while (true) {
            const {value:chunk,done} = await reader.read();
            if (done) break;
            size += chunk.length;
            if (size > 10 * 1024 * 1024) throw new Error('Media too large');
            chunks.push(chunk);
          }
        } finally { await reader.cancel(); }
        if (epoch !== generation || getUser()?.uid !== user.uid) throw new Error('Session changed');
        const url = URL.createObjectURL(new Blob(chunks,{type:contentType}));
        urls.set(key,url);
        return url;
      })().finally(() => { clearTimeout(deadline); if (pending.get(key) === task) pending.delete(key); controllers.delete(controller); });
      pending.set(key,task);
      return task;
    }
    function hydrate(container) {
      for (const element of container.querySelectorAll('[data-media]')) {
        if (element.dataset.mediaLoading) continue;
        element.dataset.mediaLoading = 'true';
        download(element.dataset.media).then(url => {
          if (!element.isConnected) return;
          if (element.tagName === 'A') element.href = url;
          else element.src = url;
        }).catch(() => {
          if (element.tagName === 'A') element.removeAttribute('href');
          else if (element.tagName === 'IMG') element.alt = 'Media unavailable';
        });
      }
    }
    const observer = new MutationObserver(() => hydrate(document));
    observer.observe(document.body,{childList:true,subtree:true});
    return {
      download,
      clear() {
        generation++;
        for (const controller of controllers) controller.abort();
        controllers.clear(); pending.clear();
        for (const url of urls.values()) URL.revokeObjectURL(url);
        urls.clear();
      },
    };
  };
})(globalThis);
