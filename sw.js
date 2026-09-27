const CACHE = 'checkcar-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Orbitron:wght@700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(e.request).then(res => res.text()).then(html => {
        const injection = `
          <script>
          fetch('gallery.json').then(r => r.json()).then(images => {
            const section = document.createElement('section');
            section.className = 'section section-light';
            section.id = 'dynamic-gallery';
            section.innerHTML = '<div class="container">' +
              '<div class="section-header">' +
                '<span class="section-badge">معرض الصور</span>' +
                '<h2 class="section-title">شاهد <span class="highlight">أعمالنا</span></h2>' +
                '<p class="section-subtitle">صور حقيقية من فحوصاتنا</p>' +
              '</div>' +
              '<div id="dynamicGalleryGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px"></div>' +
              '<div style="text-align:center;margin-top:30px">' +
                '<button id="loadMoreGallery" style="padding:16px 40px;background:linear-gradient(135deg,#ffc107,#f9a825);color:#1a2340;border:none;border-radius:50px;font-family:Cairo,sans-serif;font-weight:900;font-size:1rem;cursor:pointer;box-shadow:0 10px 30px rgba(255,193,7,.4)">' +
                  '<i class="fas fa-images"></i> عرض المزيد من الصور' +
                '</button>' +
              '</div>' +
            '</div>';
            
            const footer = document.querySelector('footer.footer');
            if (footer) footer.parentNode.insertBefore(section, footer);
            else document.body.appendChild(section);

            const grid = document.getElementById('dynamicGalleryGrid');
            const loadBtn = document.getElementById('loadMoreGallery');
            let shown = 0;
            const PER_PAGE = 9;

            function renderMore() {
              const next = images.slice(shown, shown + PER_PAGE);
              next.forEach((src, i) => {
                const card = document.createElement('div');
                card.style.cssText = 'background:#fff;border:2px solid #e2e8f0;border-radius:16px;overflow:hidden;cursor:pointer;transition:all .3s';
                card.onmouseenter = () => { card.style.transform = 'translateY(-6px)'; card.style.borderColor = '#ffc107'; card.style.boxShadow = '0 15px 40px rgba(255,193,7,.35)'; };
                card.onmouseleave = () => { card.style.transform = 'translateY(0)'; card.style.borderColor = '#e2e8f0'; card.style.boxShadow = 'none'; };
                card.innerHTML = '<div style="aspect-ratio:4/3;overflow:hidden;background:#f8f9fc"><img src="' + src + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block" alt="صورة ' + (shown+i+1) + '"></div>';
                card.onclick = () => openLightbox(src);
                grid.appendChild(card);
              });
              shown += next.length;
              if (shown >= images.length) loadBtn.style.display = 'none';
              else loadBtn.innerHTML = '<i class="fas fa-images"></i> عرض المزيد (' + (images.length - shown) + ' صورة متبقية)';
            }

            function openLightbox(src) {
              const lb = document.createElement('div');
              lb.style.cssText = 'position:fixed;inset:0;background:rgba(15,22,40,.96);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;cursor:zoom-out';
              lb.innerHTML = '<img src="' + src + '" style="max-width:95%;max-height:95%;border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,.7)">';
              lb.onclick = () => lb.remove();
              document.body.appendChild(lb);
            }

            loadBtn.onclick = renderMore;
            renderMore();
          });
          <\/script>`;
        const modified = html.replace('</body>', injection + '</body>');
        return new Response(modified, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res && res.status === 200 && e.request.url.startsWith(self.location.origin)) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
