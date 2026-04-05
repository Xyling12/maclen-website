/* ============================================================
   maclen.ru — main.js
   VK API blog feed, kittens, animations, FAQ accordion, nav
   ============================================================ */

// ------ CONFIG ------
(function() {
  'use strict';

  const VK_OWNER_ID_ELENA  = 694180609;   // Elena's personal profile
const VK_OWNER_ID_GROUP  = -225204095;  // @maclen group
const VK_API_V            = '5.131';

// TODO: Replace with real token after Elena creates VK app
// Get it at: https://vk.com/apps → Create Standalone App → Service token
const VK_TOKEN = '';  // Leave empty to use fallback static content

// ============================================================
// NAV: scroll effect + mobile menu
// ============================================================
const nav        = document.getElementById('nav');
const burgerBtn  = document.getElementById('burgerBtn');
const mobileNav  = document.getElementById('mobileNav');
const navClose   = document.getElementById('navClose');

let isScrolling = false;
window.addEventListener('scroll', () => {
  if (!isScrolling) {
    window.requestAnimationFrame(() => {
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
      isScrolling = false;
    });
    isScrolling = true;
  }
}, { passive: true });

burgerBtn?.addEventListener('click', () => {
  mobileNav.classList.add('open');
  document.body.style.overflow = 'hidden';
});
const closeMobileNav = () => {
  mobileNav.classList.remove('open');
  document.body.style.overflow = '';
};
navClose?.addEventListener('click', closeMobileNav);
document.querySelectorAll('.nav-mob-link').forEach(l => l.addEventListener('click', closeMobileNav));

// ============================================================
// INTERSECTION OBSERVER — all reveal animations
// ============================================================
const revealClasses = [
  '.fade-up',
  '.img-reveal',
  '.blur-reveal',
  '.swipe-in',
  '.eyebrow-line',
  '.reveal-line',
];
const revealEls = document.querySelectorAll(revealClasses.join(','));

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible', 'revealed');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => observer.observe(el));

// ============================================================
// SPLIT WORD — hero title words appear one‑by‑one
// ============================================================
function splitWords(el) {
  if (!el || el.dataset.split) return;
  el.dataset.split = '1';

  // Walk only TEXT nodes so <br>, <em> etc. are untouched
  function walkTextNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (!text.trim()) return;
      const frag = document.createDocumentFragment();
      // split on whitespace, preserve spaces
      text.split(/(\s+)/).forEach(part => {
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
        } else if (part) {
          const outer = document.createElement('span');
          outer.className = 'split-word';
          const inner = document.createElement('span');
          inner.textContent = part;
          outer.appendChild(inner);
          frag.appendChild(outer);
        }
      });
      node.parentNode.replaceChild(frag, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // recurse into child elements (including <em>)
      Array.from(node.childNodes).forEach(child => walkTextNodes(child));
    }
  }

  walkTextNodes(el);
  requestAnimationFrame(() => setTimeout(() => el.classList.add('split-ready'), 80));
}

// Apply to hero title on page load
splitWords(document.querySelector('.hero__title'));

// Apply to section titles as they scroll into view
const splitTitles = document.querySelectorAll('.section-title.display');
const splitObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      splitWords(e.target);
      splitObs.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
splitTitles.forEach(el => {
  if (!el.classList.contains('hero__title')) splitObs.observe(el);
});

// ============================================================
// COUNTER ANIMATION
// ============================================================
function animateCounters() {
  document.querySelectorAll('.counter').forEach(el => {
    const target = parseInt(el.dataset.target);
    const suffix = el.dataset.suffix || '+';
    let current = 0;
    const step  = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = current + suffix;
    }, 40);
  });
}
const statsSection = document.querySelector('.about__stats');
if (statsSection) {
  const statsObs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { animateCounters(); statsObs.disconnect(); }
  }, { threshold: 0.5 });
  statsObs.observe(statsSection);
}

// ============================================================
// FAQ ACCORDION
// ============================================================
document.querySelectorAll('.faq__question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item     = btn.closest('.faq__item');
    const isOpen   = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq__item.open').forEach(i => i.classList.remove('open'));
    // Open clicked (unless was already open)
    if (!isOpen) item.classList.add('open');
  });
});

// ============================================================
// UTILS
// ============================================================
function formatDate(unixTimestamp) {
  const d = new Date(unixTimestamp * 1000);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function stripEmoji(str) {
  return str.replace(/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g, '').trim();
}

function truncate(str, maxLen = 160) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, str.lastIndexOf(' ', maxLen)) + '…';
}

function getBestPhoto(sizes) {
  if (!sizes || !sizes.length) return null;
  const order = ['w', 'z', 'y', 'x', 'r'];
  for (const type of order) {
    const s = sizes.find(s => s.type === type);
    if (s) return s.url;
  }
  return sizes[sizes.length - 1].url;
}

// ============================================================
// VK API CALL (with JSONP-free fetch)
// ============================================================
async function vkCall(method, params = {}) {
  if (!VK_TOKEN) return null;
  const query = new URLSearchParams({
    ...params,
    v: VK_API_V,
    access_token: VK_TOKEN,
  });
  const url = `https://api.vk.com/method/${method}?${query}`;
  try {
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) { console.warn('VK error:', data.error); return null; }
    return data.response;
  } catch (e) {
    console.warn('VK fetch failed:', e);
    return null;
  }
}

// ====================================================
// VK POST MODAL
// ====================================================
window.openPostModal = function(index) {
  const post = window.VK_POSTS && window.VK_POSTS[index];
  if (!post) return;
  const container = document.getElementById('postModalContainer');
  
  if (post.isVideo) {
    container.style.aspectRatio = '16/9';
    container.innerHTML = `<iframe src="https://vk.com/video_ext.php?oid=${post.videoOwnerId}&id=${post.videoId}&hd=2" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`;
  } else {
    container.style.aspectRatio = 'auto';

    // Format text beautifully for mobile reading
    const formattedText = (post.text || '')
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map(p => `<p style="margin-bottom: 1.25rem;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; max-height:85vh; background:#fff; overflow-y:auto; overflow-x:hidden;">
        ${post.img ? `<div style="width: 100%; background: #111; text-align: center; border-bottom: 2px solid var(--green);"><img src="${post.img}" style="max-width: 100%; max-height: 60vh; object-fit: contain; display: inline-block; vertical-align: bottom;"></div>` : ''}
        <div style="padding: 1.5rem 1.25rem; color:#222; font-size:1.05rem; line-height:1.7; font-family:var(--font-sans);">
          <div style="color:var(--text-light); font-size:0.875rem; margin-bottom:1.5rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">${formatDate(post.date)}</div>
          <div style="color:#222;">
            ${post.text ? formattedText : ''}
          </div>
          <div style="margin-top:0.5rem; padding-top:1.5rem; border-top: 1px solid #eee;">
            <a href="${post.url}" target="_blank" style="display:inline-flex; align-items:center; gap:0.5rem; color:white; background:var(--green); font-weight:600; padding:12px 20px; border-radius:8px; text-decoration:none; box-shadow:0 4px 10px rgba(84,113,83,0.3); transition: transform 0.2s;">
              <span>Открыть в ВКонтакте</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </div>
    `;
  }
  document.getElementById('postModal').classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closePostModal = function() {
  document.getElementById('postModal').classList.remove('active');
  document.getElementById('postModalContainer').innerHTML = '';
  document.body.style.overflow = '';
};

// ============================================================
// KITTENS — VK Market
// ============================================================
const FALLBACK_KITTENS = [
  { name: 'Глория', details: 'Кошка · Окрас g09 · Рождена 05.11.2025', status: 'free', img: '/images/cat2.webp', vkUrl: 'https://vk.com/market/product/gloria-225204095-14442146' },
  { name: 'Энцо', details: 'Кот · Окрас n 22 · 5 месяцев', status: 'free', img: '/images/cat3.webp', vkUrl: 'https://vk.com/maclen' },
  { name: 'Эклипс', details: 'Кот · 5 месяцев', status: 'free', img: '/images/cat5.webp', vkUrl: 'https://vk.com/maclen' },
];

let globalKittensData = [];

function renderKittenCard(k, i) {
  const statusLabel = k.status === 'free' ? 'Свободен' : 'Забронирован';
  const statusClass = k.status === 'free' ? 'free' : 'reserved';
  return `
    <div class="kitten-card">
    <div class="kitten-card__img" onclick="openKittenModal(${i})" style="cursor:pointer">
        <img src="${k.img}" alt="${k.name} — мейн-кун, питомник Maclen Ижевск"
             onerror="this.src='https://images.unsplash.com/photo-1561948955-570b270e7c36?w=600&q=80';this.onerror=null"
             loading="lazy">
        ${k.videoIframeUrl ? '<div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 5px 10px; border-radius: 20px; font-size: 0.8rem; display: flex; align-items: center; gap: 5px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Видео</div>' : ''}
        <div class="kitten-card__img-overlay"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg></div>
        <span class="kitten-card__status kitten-card__status--${statusClass}">${statusLabel}</span>
      </div>
      <div class="kitten-card__body">
        <div class="kitten-card__name display">${k.name}</div>
        <div class="kitten-card__details">${k.details}</div>
        <div class="kitten-card__actions" style="flex-direction: column; display: flex; gap: 0.5rem;">
          <button onclick="openKittenModal(${i})" class="btn btn-primary" style="cursor:pointer; width: 100%; justify-content: center;">
            Узнать подробности
          </button>
          <button onclick="bookKitten(${i})" class="btn btn-outline" style="cursor:pointer; width: 100%; justify-content: center;">Оставить заявку</button>
        </div>
      </div>
    </div>`;
}

// Show skeleton placeholder cards while API loads
function showKittenSkeletons(grid, count = 3) {
  grid.innerHTML = Array.from({length: count}, () => `
    <div class="kitten-card kitten-skeleton">
      <div class="kitten-card__img kitten-skeleton__img"></div>
      <div class="kitten-card__body">
        <div class="kitten-skeleton__line" style="width:60%;height:1.2rem;margin-bottom:.75rem"></div>
        <div class="kitten-skeleton__line" style="width:85%;height:.8rem;margin-bottom:.5rem"></div>
        <div class="kitten-skeleton__line" style="width:40%;height:.8rem;margin-bottom:1.25rem"></div>
        <div class="kitten-skeleton__line" style="width:100%;height:2.4rem;border-radius:8px"></div>
      </div>
    </div>`).join('');
}

async function loadKittens() {
  const grid = document.getElementById('kittensGrid');
  if (!grid) return;

  // Show skeletons immediately — no spinner
  showKittenSkeletons(grid, 3);

  let kittens = null;

  try {
    const res = await fetch('/api/market');
    const data = await res.json();
    
    if (data && data.items && data.items.length) {
      kittens = data.items.map(item => {
        let photos = [item.thumb_photo];
        if (item.photos && item.photos.length > 0) {
           photos = item.photos.map(p => getBestPhoto(p.sizes) || item.thumb_photo);
        }
        
        return {
          name: item.title,
          price: item.price?.text || 'Уточните цену',
          details: item.description ? truncate(item.description, 60) : 'Мейн-кун',
          longDesc: item.description || 'Нет подробного описания',
          status: item.availability === 0 ? 'free' : 'reserved',
          img: item.thumb_photo || '/images/cat_placeholder.jpg',
          photos: photos,
          videoIframeUrl: item.videoIframeUrl || null,
          vkUrl: item.market_url || `https://vk.com/maclen`
        };
      });

      // Smoothly swap Hero Collage images only when new ones are loaded
      const heroImgs = document.querySelectorAll('.hero__circle img');
      if (heroImgs && heroImgs.length > 0) {
        kittens.slice(0, heroImgs.length).forEach((k, idx) => {
          if (!k.img) return;
          const tempImg = new Image();
          tempImg.onload = () => {
            heroImgs[idx].style.transition = 'opacity 0.4s ease';
            heroImgs[idx].style.opacity = '0';
            setTimeout(() => {
              heroImgs[idx].src = k.img;
              heroImgs[idx].alt = k.name;
              heroImgs[idx].style.opacity = '1';
            }, 200);
          };
          tempImg.src = k.img;
        });
      }
    }
  } catch (err) {
    console.warn('Failed to load market items:', err);
  }

  if (!kittens) kittens = FALLBACK_KITTENS.map(k => ({...k, photos: [k.img], longDesc: k.details, price: 'По запросу'}));
  
  globalKittensData = kittens;

  grid.innerHTML = kittens.map((k, i) => renderKittenCard(k, i)).join('');
  grid.querySelectorAll('.kitten-card').forEach((el, i) => {
    el.classList.add('fade-up');
    // First 3 cards load eagerly
    const img = el.querySelector('img');
    if (img && i < 3) img.loading = 'eager';
    observer.observe(el);
  });
}

window.openKittenModal = function(index) {
  const k = globalKittensData[index];
  if (!k) return;

  document.getElementById('kModalName').innerText = k.name;
  document.getElementById('kModalPrice').innerText = k.price;
  document.getElementById('kModalStatus').innerText = k.status === 'free' ? 'Свободен' : 'Забронирован';
  document.getElementById('kModalStatus').style.color = k.status === 'free' ? 'var(--green)' : 'var(--text-muted)';
  document.getElementById('kModalDesc').innerText = k.longDesc;
  
  const mainImgContainer = document.getElementById('kModalMainImg').parentElement;
  if (k.videoIframeUrl) {
      if (!document.getElementById('kModalVideoFrame')) {
          const iframe = document.createElement('iframe');
          iframe.id = 'kModalVideoFrame';
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.position = 'absolute';
          iframe.style.top = '0';
          iframe.style.left = '0';
          iframe.style.border = 'none';
          iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
          mainImgContainer.appendChild(iframe);
      }
      document.getElementById('kModalVideoFrame').src = k.videoIframeUrl;
      document.getElementById('kModalVideoFrame').style.display = 'block';
      document.getElementById('kModalMainImg').style.display = 'none';
  } else {
      if (document.getElementById('kModalVideoFrame')) {
          document.getElementById('kModalVideoFrame').style.display = 'none';
          document.getElementById('kModalVideoFrame').src = '';
      }
      document.getElementById('kModalMainImg').style.display = 'block';
      document.getElementById('kModalMainImg').src = k.photos[0];
  }

  const thumbsContainer = document.getElementById('kModalThumbs');
  thumbsContainer.innerHTML = '';
  
  if (k.videoIframeUrl) {
    const vThumbWrapper = document.createElement('div');
    vThumbWrapper.style.position = 'relative';
    vThumbWrapper.style.cursor = 'pointer';
    vThumbWrapper.style.width = '60px'; // Matching CSS thumb width roughly
    vThumbWrapper.style.height = '60px';
    
    const vImg = document.createElement('img');
    vImg.src = k.photos[0]; // Use first photo as video thumbnail background
    vImg.style.width = '100%';
    vImg.style.height = '100%';
    vImg.style.objectFit = 'cover';
    vImg.style.borderRadius = '6px';
    vImg.classList.add('active'); // active by default if video present
    
    // Play overlay icon
    const playIcon = document.createElement('div');
    playIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>`;
    playIcon.style.position = 'absolute';
    playIcon.style.top = '50%';
    playIcon.style.left = '50%';
    playIcon.style.transform = 'translate(-50%, -50%)';
    playIcon.style.background = 'rgba(0,0,0,0.5)';
    playIcon.style.borderRadius = '50%';
    playIcon.style.padding = '8px';
    playIcon.style.display = 'flex';
    playIcon.style.pointerEvents = 'none';

    vThumbWrapper.appendChild(vImg);
    vThumbWrapper.appendChild(playIcon);
    
    vThumbWrapper.onclick = () => {
       document.getElementById('kModalMainImg').style.display = 'none';
       document.getElementById('kModalVideoFrame').style.display = 'block';
       document.getElementById('kModalVideoFrame').src = k.videoIframeUrl;
       
       thumbsContainer.querySelectorAll('img').forEach(i => i.classList.remove('active'));
       vImg.classList.add('active');
    };
    thumbsContainer.appendChild(vThumbWrapper);
  }

  k.photos.forEach((src, idx) => {
    const img = document.createElement('img');
    img.src = src;
    img.loading = 'lazy';
    if (idx === 0 && !k.videoIframeUrl) img.classList.add('active');
    
    img.onclick = () => {
      if (document.getElementById('kModalVideoFrame')) {
          document.getElementById('kModalVideoFrame').style.display = 'none';
          document.getElementById('kModalVideoFrame').src = ''; // stop audio
      }
      document.getElementById('kModalMainImg').style.display = 'block';
      document.getElementById('kModalMainImg').src = src;
      
      thumbsContainer.querySelectorAll('img').forEach(i => i.classList.remove('active'));
      img.classList.add('active');
    };
    thumbsContainer.appendChild(img);
  });

  const modal = document.getElementById('kittenModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeKittenModal = function() {
  document.getElementById('kittenModal').classList.remove('active');
  document.body.style.overflow = '';
  if (document.getElementById('kModalVideoFrame')) {
      document.getElementById('kModalVideoFrame').src = ''; // stop audio playback
  }
};

window.bookKitten = function(index) {
  const k = globalKittensData[index];
  if (!k) return;
  const wishesField = document.getElementById('wishes');
  if (wishesField) {
    wishesField.value = 'Интересует котенок: ' + k.name;
  }
  window.location.hash = '#contacts';
};

window.bookFromModal = function() {
  window.closeKittenModal();
  const name = document.getElementById('kModalName').innerText;
  const wishesField = document.getElementById('wishes');
  if (wishesField) {
    wishesField.value = 'Интересует котенок: ' + name;
  }
  window.location.hash = '#contacts';
};

// ============================================================
// BLOG — VK Wall (Elena's profile)
// ============================================================
const FALLBACK_POSTS = [
  { date: 1711400000, text: '🐾 Наши малыши растут! Знакомьтесь — Энцо и Эклипс уже исследуют весь дом.', img: '/images/cat2.webp', url: 'https://vk.com/id694180609' },
  { date: 1710800000, text: '🏆 Вернулись с выставки кошек в Ижевске! Наша Кэсси снова показала класс.', img: '/images/cat4.webp', url: 'https://vk.com/id694180609' },
  { date: 1710200000, text: '💌 Привет от Гарфилда! Новые хозяева пишут, что он уже освоился и познакомился со всей семьёй 💕', img: '/images/cat3.webp', url: 'https://vk.com/id694180609' },
  { date: 1709600000, text: '💡 Совет заводчика: мейн-куны очень умные! Легко приучаются к командам и умеют открывать двери 😄', img: '/images/cat5.webp', url: 'https://vk.com/id694180609' },
  { date: 1709000000, text: '🐱 Новый помёт планируем на май! Можно оставить заявку на бронирование.', img: '/images/cat1.webp', url: 'https://vk.com/id694180609' },
  { date: 1708400000, text: '🌟 Питание мейн-куна — самый частый вопрос! Кормим цельным сухим кормом + натуральные добавки.', img: '/images/cat6.webp', url: 'https://vk.com/id694180609' },
];

function renderBlogCard(post, index) {
  const hasImg = post.img && post.img.length > 0;
  const cleanText = stripEmoji(post.text || '');
  const linkText = post.isVideo ? 'Смотреть видео' : 'Читать полностью';
  
  const linkAction = `onclick="openPostModal(${index}); return false;"`;

  const imgContent = hasImg
    ? `<a href="${post.url}" ${linkAction} style="display: block; position: relative; width: 100%; height: 100%; text-decoration: none; cursor: pointer;">
         <img src="${post.img}" alt="Новости питомника Maclen мейн-кун Ижевск"
              onerror="this.parentElement.innerHTML='<span class=&quot;blog-card__img-placeholder&quot;>🐾</span>';this.onerror=null"
              loading="lazy" style="width:100%;height:100%;object-fit:cover;">
         ${post.isVideo ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.6);border-radius:50%;width:60px;height:60px;display:flex;align-items:center;justify-content:center;color:white;font-size:28px;padding-left:6px;transition:0.2s;">▶</div>` : ''}
         ${!post.isVideo && post.is_pinned ? `<div style="position:absolute;top:10px;right:10px;background:var(--green);color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;box-shadow:0 2px 5px rgba(0,0,0,0.2);">📌 Закреплено</div>` : ''}
       </a>`
    : '<span class="blog-card__img-placeholder">🐾</span>';

  return `
    <div class="blog-card">
      <div class="blog-card__img">
        ${imgContent}
      </div>
      <div class="blog-card__body">
        <div class="blog-card__date">${formatDate(post.date)}</div>
        ${cleanText ? `<div class="blog-card__text">${truncate(cleanText, 180)}</div>` : ''}
        <a href="#" ${linkAction} class="blog-card__link" style="margin-top:auto;">${linkText}</a>
      </div>
    </div>`;
}

async function loadBlog() {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  let posts = null;

  try {
    const res = await fetch('/api/wall');
    const data = await res.json();
    if (data && data.items && data.items.length) {
      posts = data.items
        .filter(p => (p.text && p.text.length > 5) || (p.attachments && p.attachments.length > 0))
        .map(p => {
          let photoUrl = null;
          let isVideo = false;
          let videoOwnerId = null;
          let videoId = null;
          if (p.attachments) {
            const photoAtt = p.attachments.find(a => a.type === 'photo');
            if (photoAtt && photoAtt.photo && photoAtt.photo.sizes) {
              photoUrl = getBestPhoto(photoAtt.photo.sizes);
            } else {
              // Video thumbnail fallback
              const videoAtt = p.attachments.find(a => a.type === 'video');
              if (videoAtt && videoAtt.video && videoAtt.video.image) {
                photoUrl = videoAtt.video.image[videoAtt.video.image.length - 1].url;
                isVideo = true;
                videoOwnerId = videoAtt.video.owner_id;
                videoId = videoAtt.video.id;
              }
            }
          }
          return {
            date: p.date,
            text: p.text || '',
            img: photoUrl,
            isVideo: isVideo,
            is_pinned: p.is_pinned === 1,
            videoOwnerId: videoOwnerId,
            videoId: videoId,
            url: `https://vk.com/maclen?w=wall-225204095_${p.id}`,
          };
        })
        .sort((a, b) => (b.is_pinned === true ? 1 : 0) - (a.is_pinned === true ? 1 : 0))
        .slice(0, 6);
    }
  } catch (err) {
    console.warn('Failed to load wall items:', err);
  }

  if (!posts || posts.length === 0) posts = FALLBACK_POSTS;
  window.VK_POSTS = posts;

  grid.innerHTML = posts.map((post, index) => renderBlogCard(post, index)).join('');
  grid.querySelectorAll('.blog-card').forEach(el => {
    el.classList.add('fade-up');
    observer.observe(el);
  });
}

// Generic Image Lightbox (reusing postModal)
window.openImageZoom = function(src, alt) {
  const container = document.getElementById('postModalContainer');
  container.style.aspectRatio = 'auto';
  container.innerHTML = `<img src="${src}" alt="${alt}" style="width:100%; max-height:85vh; object-fit:contain; display:block; background:#000;">`;
  document.getElementById('postModal').classList.add('active');
  document.body.style.overflow = 'hidden';
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadKittens();
  loadBlog();
  
  // Make parent and alumni images clickable
  document.querySelectorAll('.parent-card__img').forEach(el => {
    el.style.cursor = 'pointer';
    const img = el.querySelector('img');
    if(img) {
      el.onclick = () => window.openImageZoom(img.src, img.alt || '');
    }
    // Add hover overlay hint
    const overlay = document.createElement('div');
    overlay.className = 'parent-card__img-overlay';
    overlay.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>';
    el.appendChild(overlay);
  });
});

// ============================================================
// FORM: API submission
// ============================================================
document.getElementById('leadForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('.form-submit');
  const originalText = btn.textContent;
  btn.textContent = 'Отправляем…';
  btn.disabled = true;

  try {
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      btn.textContent = 'Заявка отправлена! ✨';
      btn.classList.add('success');
      this.reset();
    } else {
      throw new Error('Server error');
    }
  } catch (err) {
    btn.textContent = 'Ошибка. Попробуйте позже';
    btn.disabled = false;
    setTimeout(() => { btn.textContent = originalText; }, 3000);
  }
});

// ============================================================
// FORM: Phone mask
// ============================================================
const phoneInput = document.getElementById('phone');
if (phoneInput) {
  phoneInput.addEventListener('input', function (e) {
    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
    if (!x[2] && x[1] !== '') {
      e.target.value = '+7';
    } else {
      e.target.value = '+7' + (x[2] ? ' (' + x[2] : '') + (x[3] ? ') ' + x[3] : '') + (x[4] ? '-' + x[4] : '') + (x[5] ? '-' + x[5] : '');
    }
  });

  phoneInput.addEventListener('keydown', function(e) {
    if (e.key === 'Backspace' && e.target.value.length <= 4) {
      e.target.value = '';
    }
  });
}

})();
