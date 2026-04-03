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
      <div class="kitten-card__img">
        <img src="${k.img}" alt="${k.name} — мейн-кун, питомник Maclen Ижевск"
             onerror="this.src='https://images.unsplash.com/photo-1561948955-570b270e7c36?w=600&q=80';this.onerror=null"
             loading="lazy">
        <span class="kitten-card__status kitten-card__status--${statusClass}">${statusLabel}</span>
      </div>
      <div class="kitten-card__body">
        <div class="kitten-card__name display">${k.name}</div>
        <div class="kitten-card__details">${k.details}</div>
        <div class="kitten-card__actions">
          <button onclick="openKittenModal(${i})" class="btn btn-primary" style="cursor:pointer;">
            Узнать подробности
          </button>
          <button onclick="bookKitten(${i})" class="btn btn-outline" style="cursor:pointer;">Оставить заявку</button>
        </div>
      </div>
    </div>`;
}

async function loadKittens() {
  const grid = document.getElementById('kittensGrid');
  if (!grid) return;

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
          vkUrl: item.market_url || `https://vk.com/maclen`
        };
      });
    }
  } catch (err) {
    console.warn('Failed to load market items:', err);
  }

  if (!kittens) kittens = FALLBACK_KITTENS.map(k => ({...k, photos: [k.img], longDesc: k.details, price: 'По запросу'}));
  
  globalKittensData = kittens;

  grid.innerHTML = kittens.map((k, i) => renderKittenCard(k, i)).join('');
  grid.querySelectorAll('.kitten-card').forEach(el => {
    el.classList.add('fade-up');
    observer.observe(el);
  });
}

function openKittenModal(index) {
  const k = globalKittensData[index];
  if (!k) return;

  document.getElementById('kModalName').innerText = k.name;
  document.getElementById('kModalPrice').innerText = k.price;
  document.getElementById('kModalStatus').innerText = k.status === 'free' ? 'Свободен' : 'Забронирован';
  document.getElementById('kModalStatus').style.color = k.status === 'free' ? 'var(--green)' : 'var(--text-muted)';
  document.getElementById('kModalDesc').innerText = k.longDesc;
  document.getElementById('kModalMainImg').src = k.photos[0];

  const thumbsContainer = document.getElementById('kModalThumbs');
  thumbsContainer.innerHTML = '';
  
  k.photos.forEach((src, idx) => {
    const img = document.createElement('img');
    img.src = src;
    img.loading = 'lazy';
    if (idx === 0) img.classList.add('active');
    img.onclick = () => {
      document.getElementById('kModalMainImg').src = src;
      thumbsContainer.querySelectorAll('img').forEach(i => i.classList.remove('active'));
      img.classList.add('active');
    };
    thumbsContainer.appendChild(img);
  });

  const modal = document.getElementById('kittenModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeKittenModal() {
  document.getElementById('kittenModal').classList.remove('active');
  document.body.style.overflow = '';
}

function bookKitten(index) {
  const k = globalKittensData[index];
  if (!k) return;
  const wishesField = document.getElementById('wishes');
  if (wishesField) {
    wishesField.value = 'Интересует котенок: ' + k.name;
  }
  window.location.hash = '#contacts';
}

function bookFromModal() {
  closeKittenModal();
  const name = document.getElementById('kModalName').innerText;
  const wishesField = document.getElementById('wishes');
  if (wishesField) {
    wishesField.value = 'Интересует котенок: ' + name;
  }
  window.location.hash = '#contacts';
}

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

function renderBlogCard(post) {
  const hasImg = post.img && post.img.length > 0;
  const cleanText = stripEmoji(post.text || '');
  return `
    <div class="blog-card">
      <div class="blog-card__img">
        ${hasImg
          ? `<img src="${post.img}" alt="Новости питомника Maclen мейн-кун Ижевск"
                  onerror="this.parentElement.innerHTML='<span class=&quot;blog-card__img-placeholder&quot;>🐾</span>';this.onerror=null"
                  loading="lazy">`
          : '<span class="blog-card__img-placeholder">🐾</span>'
        }
      </div>
      <div class="blog-card__body">
        <div class="blog-card__date">${formatDate(post.date)}</div>
        <div class="blog-card__text">${truncate(cleanText, 180)}</div>
        <a href="${post.url}" target="_blank" class="blog-card__link">Читать в ВКонтакте →</a>
      </div>
    </div>`;
}

async function loadBlog() {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  let posts = null;

  if (VK_TOKEN) {
    // Try Elena's personal wall first
    const res = await vkCall('wall.get', {
      owner_id: VK_OWNER_ID_ELENA,
      count: 6,
      filter: 'owner',
    });
    if (res && res.items && res.items.length) {
      posts = res.items
        .filter(p => p.text && p.text.length > 20)
        .slice(0, 6)
        .map(p => ({
          date: p.date,
          text: p.text,
          img: p.attachments
            ? getBestPhoto(p.attachments.find(a => a.type === 'photo')?.photo?.sizes)
            : null,
          url: `https://vk.com/id${VK_OWNER_ID_ELENA}?w=wall${VK_OWNER_ID_ELENA}_${p.id}`,
        }));
    }
  }

  if (!posts) posts = FALLBACK_POSTS;

  grid.innerHTML = posts.map(renderBlogCard).join('');
  grid.querySelectorAll('.blog-card').forEach(el => {
    el.classList.add('fade-up');
    observer.observe(el);
  });
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadKittens();
  loadBlog();
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
