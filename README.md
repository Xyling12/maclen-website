# 🐱 Maclen — Питомник мейн-кунов | Сайт

**Live demo:** https://maclen-website.vercel.app  
**Стек:** Vanilla HTML5 · CSS (Variables, Grid, Flexbox) · JavaScript (без фреймворков)  
**Дизайн:** "Light Natural" — шалфей, белый, песок  

---

## 📁 Структура проекта

```
maclen-website/
├── index.html          # Главная страница (11 секций)
├── thanks.html         # Страница "Спасибо" после отправки формы
├── 404.html            # Страница 404
├── robots.txt          # SEO: robots
├── sitemap.xml         # SEO: sitemap
├── css/
│   └── style.css       # Весь CSS (дизайн-система + анимации)
├── js/
│   └── main.js         # Логика: VK API, анимации, FAQ, счётчики
├── images/             # Локальные фото котов (cat1–6.png)
│   ├── cat1.png        # Hero main / Bolk Golden Glory
│   ├── cat2.png        # Hero sm / Глория / Blog
│   ├── cat3.png        # Hero sm / Энцо / Blog
│   ├── cat4.png        # Cassie SharmMuar / Blog
│   ├── cat5.png        # Adam Maclen / Эклипс / Blog
│   └── cat6.png        # О питомнике (Elena + cat)
└── PLAN.md             # Полный план разработки и следующие шаги
```

---

## ✅ Что реализовано

### Секции сайта
- **Hero** — заголовок, 3 фото, отзыв-badge, кнопки CTA
- **Trust Bar** — 5 иконок доверия (WCF, прививки, генетика, договор, доставка)
- **О питомнике** — текст + фото + статистика (счётчики) + кнопки
- **Котята** — VK Market API + fallback-карточки с ценами
- **Производители** — 3 карточки (Cassie, Adam, Bolk)
- **Как купить** — 4 шага
- **Отзывы** — 3 карточки + рейтинг 5.0
- **FAQ** — аккордеон с 5 вопросами
- **Блог** — VK Wall API + 6 fallback-постов
- **Форма заявки** — FormSubmit.co интеграция
- **Footer** — навигация, контакты, SEO-текст

### Функциональность
- ✅ Липкий хедер со сменой стиля при скролле
- ✅ Мобильное бургер-меню
- ✅ FAQ аккордеон
- ✅ Счётчики (animate on scroll)
- ✅ VK API интеграция (с fallback)
- ✅ FormSubmit.co форма
- ✅ Schema.org разметка (LocalBusiness, BreadcrumbList)
- ✅ Open Graph / Twitter Card мета-теги
- ✅ SEO: заголовки, мета-описания, canonical

### Анимации
- ✅ Fade-up при скролле (IntersectionObserver)
- ✅ Зелёная шторка (img-reveal) на всех фото
- ✅ Blur → резкость на фото в секции "О нас"
- ✅ Split-word: слова заголовков вылетают по одному
- ✅ Eyebrow-line: подчёркивание с анимированной чертой
- ✅ Swipe-in: надписи выезжают слева
- ✅ Floating: фото в Hero медленно покачиваются
- ✅ Shimmer: кнопка "Смотреть котят" переливается
- ✅ Pulse-ring: кнопка WhatsApp в навигации пульсирует
- ✅ Card hover lift + image zoom
- ✅ Nav underline slide
- ✅ Step icon bounce on hover

---

## 🔧 Конфигурация VK API

В `js/main.js` найди и заполни:

```javascript
const VK_TOKEN = '';  // Вставить Service Token из VK
const VK_OWNER_ID_ELENA  = 694180609;   // Личный профиль Елены
const VK_OWNER_ID_GROUP  = -225204095;  // Группа @maclen
```

**Как получить токен:**
1. Зайди на https://vk.com/apps → Создать приложение → Standalone
2. Настройки → Сервисный ключ доступа
3. Вставь токен в `VK_TOKEN`

При **пустом токене** сайт работает с fallback-данными.

---

## 🚀 Деплой

Проект задеплоен на **Vercel** через CLI:

```bash
# Превью
npx vercel

# Production
npx vercel --prod
```

**Связанный проект:** `xyling123-1085s-projects/maclen-website`  
**Production URL:** https://maclen-website.vercel.app

---

## 📧 Форма заявки

Использует [FormSubmit.co](https://formsubmit.co):
- Email: `matrosova67@internet.ru`
- Redirect: `https://maclen.ru/thanks.html`
- При первой отправке нужно **подтвердить email** через письмо от FormSubmit

---

## 📱 Контакты питомника

| Канал | Данные |
|-------|--------|
| WhatsApp Елена | +7 (912) 757-01-36 |
| WhatsApp Максим | +7 (922) 518-40-40 |
| ВКонтакте | vk.com/maclen |
| Email | matrosova67@internet.ru |
| Адрес | Ижевск, Удмуртская Республика |
