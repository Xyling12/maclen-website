<div align="center">
  <h1>🐱 Maclen</h1>
  <p><b>Официальный сайт монопородного питомника мейн-кунов</b></p>

  [![HTML5](https://img.shields.io/badge/HTML5-Semantic-E34F26.svg?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/ru/docs/Web/HTML)
  [![CSS3](https://img.shields.io/badge/CSS3-Animations-1572B6.svg?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/ru/docs/Web/CSS)
  [![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E.svg?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/ru/docs/Web/JavaScript)
  [![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000.svg?style=flat&logo=vercel&logoColor=white)](https://vercel.com)
</div>

---

## 📖 О проекте

Современный, быстрый и отзывчивый веб-сайт для питомника "Maclen". Написан на чистом (Vanilla) HTML/CSS/JS без использования тяжелых фреймворков для обеспечения 100 баллов PageSpeed и идеального SEO. Дизайн-система "Light Natural" (шалфей, белый, песочный цвета) с планарными и параллакс анимациями.

*   **Live demo:** [https://maclen-website.vercel.app](https://maclen-website.vercel.app)

### 🌟 Ключевые модули

*   **Динамическая витрина:** Интеграция с `VK Market API` для автоматической выгрузки списка котят и цен. При недоступности ВКонтакте подставляются fallback-карточки.
*   **Новостной блог:** Вставка постов из паблика ВК через `VK Wall API`.
*   **Глубокое SEO:** Schema.org (LocalBusiness), Open Graph, сжатые изображения (WebP), sitemap и robots.txt.
*   **Анимации (Scroll Reveal):** Липкий хедер, выезжающие слова (split-word), параллакс фото, плавающие карточки.

---

## 🛠 Структура и Меню сайта

Сайт состоит из одной длинной Landing Page с якорями и отдельных служебных страниц.

| Секция в меню | Что отображает |
| :--- | :--- |
| **О питомнике** | Текстовый блок о философии питомника, статистические счетчики (лет работы, котят). |
| **Котята** | Динамическая витрина доступных котят (тянется из раздела "Товары" ВК). |
| **Производители** | Раздел с элитными производителями-чемпионами питомника. |
| **Как купить** | Пошаговый гайд (Резерв → Договор → Переезд). |
| **Отзывы и Блог**| Карусель реальных отзывов, FAQ и последние новости из группы ВК. |

```text
📁 maclen-website
├── index.html          # Главная страница (11 UI-секций)
├── thanks.html         # Страница благодарности (после отправки лида)
├── 404.html            # Страница ошибки + редирект
├── 📂 css/style.css    # Вся модульная дизайн-система и анимации
├── 📂 js/main.js       # Логика: VK API, IntersectionObserver, FAQ
└── 📂 images/          # Оптимизированные медиа-ассеты
```

---

## ⚙️ Настройка и Подключение ВКонтакте

Для живой витрины требуется **Service Token VK API**. Настройки находятся в начале `js/main.js`:

```javascript
const VK_TOKEN = '';            // Вставить Service Token
const VK_OWNER_ID_ELENA  = 694180609;   // Профиль Елены (откуда тянуть котят)
const VK_OWNER_ID_GROUP  = -225204095;  // Паблик (откуда тянуть посты)
```
> **Внимание:** без токена сайт не сломается — просто покажет старые сохраненные fallback-посты и шаблонных котят.

---

## 🚀 Запуск и Деплоймент

Не требует `npm install`. Для локальной проверки можно использовать любой Live Server (VS Code).

### Деплой на Vercel

```bash
npx vercel          # Опубликовать Preview
npx vercel --prod   # Выпустить в Production
```

### Форма заявок
Интегрирован шлюз **FormSubmit.co**. Заявки улетают на почту напрямую из HTML-кода (без бэкенда). Базовая почта для приема: `matrosova67@internet.ru`.
