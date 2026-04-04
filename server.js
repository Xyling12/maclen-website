const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

app.get('/api/testVideo', async (req, res) => {
  try {
    const USER_TOKEN = process.env.VK_USER_TOKEN;
    const vUrl = `https://api.vk.com/method/video.get?owner_id=-225204095&count=5&access_token=${USER_TOKEN}&v=${VK_API_V}`;
    const vRes = await fetch(vUrl);
    const vData = await vRes.json();
    return res.status(200).json(vData);
  } catch (err) {
    return res.status(500).json({ error: err.toString() });
  }
});

const VK_TOKEN = process.env.VK_GROUP_TOKEN;
const VK_USER_ID = '23912024'; // Maxim's ID temporarily
const VK_API_V = '5.131';

app.post('/api/submit', async (req, res) => {
  try {
    const { name, phone, city, extraInfo } = req.body;
    
    if (!VK_TOKEN) {
      console.error('Missing VK_GROUP_TOKEN environment variable');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const messageText = `🐾 Новая заявка с сайта Maclencat.ru!\n\nИмя: ${name || '—'}\nТелефон: ${phone || '—'}\nГород: ${city || '—'}\nКомментарий: ${extraInfo || '—'}`;

    const randomId = Math.floor(Math.random() * 2000000000);

    const query = new URLSearchParams({
      user_id: VK_USER_ID,
      message: messageText,
      random_id: randomId,
      access_token: VK_TOKEN,
      v: VK_API_V
    });

    const url = `https://api.vk.com/method/messages.send`;

    const vkRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: query.toString()
    });

    const vkData = await vkRes.json();
    
    if (vkData.error) {
      console.error('VK API Error:', vkData.error);
      return res.status(500).json({ error: 'Failed to send message to VK' });
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
app.post('/api/vk-webhook', async (req, res) => {
  const AITUNNEL_KEY = process.env.AITUNNEL_KEY || 'sk-aitunnel-GEhq2XTu9QmIrrOZe2S1Di2WAdp7yQ0C';
  const VK_CONFIRMATION_CODE = process.env.VK_CONFIRMATION_CODE || '9ed5321c';
  // Если захотите повысить безопасность, можете проверять req.body.secret === 'aaQ13axAPQEcczQa'
  
  // 1. Подтверждение сервера Callback API
  if (req.body.type === 'confirmation') {
    return res.send(VK_CONFIRMATION_CODE);
  }

  // 2. Обработка нового сообщения (от Елены)
  if (req.body.type === 'message_new') {
    // ВКонтакте требует сразу вернуть 'ok', иначе будет слать дубли сообщений
    res.send('ok');

    const message = req.body.object.message || req.body.object;
    const text = message.text;
    const attachments = message.attachments;

    // Если нет текста, ничего не генерируем
    if (!text || text.trim() === '') return;

    try {
      console.log('Got message to auto-process:', text);
      
      // 3. Генерация поста через AI (AITunnel)
      const prompt = `Ты — профессиональный SMM-маркетолог элитного питомника мейн-кунов. 
Тебе дали сухие факты о котенке: "${text}".
Напиши ОДИН очень красивый, эмоциональный и душевный пост для стены ВКонтакте об этом котенке, чтобы его захотели купить.
Используй переносы строк и релевантные эмодзи.
В конце добавь призыв написать в ЛС группы для бронирования.
И добавь хештеги: #мейнкунижевск #питомникмейнкунов #купитьмейнкуна #мейнкункотята`;

      // Endpoint AITunnel (обычно он совместим с форматом OpenAI v1)
      const aiRes = await fetch('https://api.aitunnel.ru/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AITUNNEL_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // или любая модель, доступная в вашей подписке AITunnel
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      });

      const aiData = await aiRes.json();
      if (!aiData.choices || !aiData.choices[0]) {
          throw new Error('AI Generate failed: ' + JSON.stringify(aiData));
      }
      
      const generatedPostText = aiData.choices[0].message.content;
      console.log('AI Generated text length:', generatedPostText.length);

      // 4. Подхватываем видео и фото из сообщения Елены, чтобы прикрепить к будущему посту
      const vkAttachmentsArr = [];
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          if (att.type === 'video') {
            vkAttachmentsArr.push(`video${att.video.owner_id}_${att.video.id}`);
          } else if (att.type === 'photo') {
            vkAttachmentsArr.push(`photo${att.photo.owner_id}_${att.photo.id}`);
          }
        }
      }
      const vkAttachmentString = vkAttachmentsArr.join(',') || null;

      // 5. Публикуем готовый пост на стене от имени группы
      const wallQuery = new URLSearchParams({
        owner_id: `-${req.body.group_id}`,
        from_group: '1',
        message: generatedPostText,
        access_token: VK_TOKEN,
        v: VK_API_V
      });
      // Если было видео, прикрепляем его к посту
      if (vkAttachmentString) {
        wallQuery.append('attachments', vkAttachmentString);
      }

      const postRes = await fetch('https://api.vk.com/method/wall.post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: wallQuery.toString()
      });
      
      const postResponseData = await postRes.json();
      console.log('Post Wall Response:', postResponseData);

      // 6. Отвечаем Елене в личку, что все прошло успешно
      let reportMessage = '✨ Готово! Красивый продающий пост о котенке успешно сгенерирован и опубликован на стене группы.';
      if (postResponseData.error) {
         reportMessage = '❌ Ошибка публикации: ' + postResponseData.error.error_msg;
      }

      const replyQuery = new URLSearchParams({
        user_id: message.peer_id,
        message: reportMessage,
        random_id: Math.floor(Math.random() * 2000000000),
        access_token: VK_TOKEN,
        v: VK_API_V
      });
      
      await fetch('https://api.vk.com/method/messages.send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: replyQuery.toString()
      });

    } catch (err) {
      console.error('VK Webhook AI error:', err);
      // Можно отправить Елене уведомление об ошибке
    }
    return;
  }

  // Для остальных системных событий (например, печать)
  res.send('ok');
});

app.get('/api/market', async (req, res) => {
  try {
    const USER_TOKEN = process.env.VK_USER_TOKEN;
    if (!USER_TOKEN) {
      console.error('Missing VK_USER_TOKEN environment variable');
      return res.status(500).json({ error: 'Market API misconfiguration' });
    }

    const query = new URLSearchParams({
      owner_id: '-225204095',
      count: '9',
      extended: '1',
      access_token: USER_TOKEN,
      v: VK_API_V
    });

    const url = `https://api.vk.com/method/market.get?${query}`;
    const vkRes = await fetch(url);
    const vkData = await vkRes.json();
    
    if (vkData.error) {
      console.error('VK Market Error:', vkData.error);
      return res.status(500).json({ error: 'Failed to fetch market from VK' });
    }

    const data = vkData.response;
    
    // Auto-Link Videos directly attached to the Market items
    data.items = data.items.map(item => {
      if (item.videos && item.videos.length > 0) {
          // Construct the iframe URL using the native video attachment
          item.videoIframeUrl = `https://vk.com/video_ext.php?oid=${item.owner_id}&id=${item.videos[0].id}&hd=2`;
      }
      return item;
    });

    return res.status(200).json(data);
  } catch (error) {
    console.error('Market API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/wall', async (req, res) => {
  try {
    const USER_TOKEN = process.env.VK_USER_TOKEN;
    if (!USER_TOKEN) {
      console.error('Missing VK_USER_TOKEN environment variable');
      return res.status(500).json({ error: 'Wall API misconfiguration' });
    }

    const query = new URLSearchParams({
      owner_id: '-225204095',
      count: '15',
      extended: '1',
      access_token: USER_TOKEN,
      v: VK_API_V
    });

    const url = `https://api.vk.com/method/wall.get?${query}`;
    const vkRes = await fetch(url);
    const vkData = await vkRes.json();
    
    if (vkData.error) {
      console.error('VK Wall Error:', vkData.error);
      return res.status(500).json({ error: 'Failed to fetch wall from VK' });
    }

    return res.status(200).json(vkData.response);
  } catch (error) {
    console.error('Wall API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = 80;
app.listen(PORT, () => {
  console.log(`Maclen server running on port ${PORT}`);
});
