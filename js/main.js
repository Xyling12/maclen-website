/* ============================================================
   maclen.ru — main.js
   VK API blog feed, kittens, animations, FAQ accordion, nav
   ============================================================ */

// ------ CONFIG ------
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

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

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

function renderKittenCard(k) {
  const waText = encodeURIComponent(`Здравствуйте! Интересует котёнок ${k.name}. Расскажите подробнее.`);
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
          <a href="https://wa.me/79127570136?text=${waText}" target="_blank" class="btn btn-primary">
            Узнать подробности
          </a>
          <a href="${k.vkUrl}" target="_blank" class="btn btn-outline">В ВК →</a>
        </div>
      </div>
    </div>`;
}

async function loadKittens() {
  const grid = document.getElementById('kittensGrid');
  if (!grid) return;

  let kittens = null;

  if (VK_TOKEN) {
    const res = await vkCall('market.get', {
      owner_id: VK_OWNER_ID_GROUP,
      count: 9,
      extended: 1,
    });
    if (res && res.items && res.items.length) {
      kittens = res.items.map(item => ({
        name: item.title,
        price: item.price?.text || 'Уточните цену',
        details: stripEmoji(item.description).slice(0, 80) || 'Мейн-кун · питомник Maclen',
        status: item.availability === 0 ? 'free' : 'reserved',
        img: getBestPhoto(item.photos?.[0]?.sizes) || '',
        vkUrl: `https://vk.com/market/product/${Math.abs(VK_OWNER_ID_GROUP)}-${item.id}`,
      }));
    }
  }

  if (!kittens) kittens = FALLBACK_KITTENS;

  grid.innerHTML = kittens.map(renderKittenCard).join('');
  // Re-observe new elements for fade-in
  grid.querySelectorAll('.kitten-card').forEach((el, i) => {
    el.style.animationDelay = `${i * 0.1}s`;
    el.classList.add('fade-up');
    observer.observe(el);
  });
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
                  onerror="this.parentElement.innerHTML='<span class=\\"blog-card__img-placeholder\\">🐾</span>';this.onerror=null"
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
// FORM: confirmation toast
// ============================================================
document.getElementById('leadForm')?.addEventListener('submit', function(e) {
  const btn = this.querySelector('.form-submit');
  btn.textContent = 'Отправляем…';
  btn.disabled = true;
  // FormSubmit handles redirect to thanks.html
});
