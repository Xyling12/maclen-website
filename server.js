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
  
  if (req.body.type === 'confirmation') {
    return res.send(VK_CONFIRMATION_CODE);
  }

  if (req.body.type === 'message_new') {
    res.send('ok');

    const message = req.body.object.message || req.body.object;
    const text = message.text;
    const attachments = message.attachments;

    if (!text || text.trim() === '') return;

    try {
      console.log('Got message to auto-process:', text);
      const group_id = req.body.group_id;
      
      const prompt = `Ты — профессиональный SMM-маркетолог элитного питомника мейн-кунов. 
Тебе дали факты о котенке: "${text}".
Твоя задача — вернуть СТРОГИЙ JSON без markdown разметки (\`\`\`json). Верни только объект.
Структура:
{
  "postText": "Эмоциональный пост для стены ВКонтакте с эмодзи и хештегами",
  "marketTitle": "Название карточки товара (например: Котенок Энцо (окрас n22)). Заголовок до 100 символов.",
  "marketDescription": "ОЧЕНЬ КРАСИВОЕ, ДЕТАЛЬНОЕ И ПРОДАЮЩЕЕ описание для карточки товара. Используй эмодзи 😻, красивые речевые обороты. Опиши характер, ласку, красоту, чтобы клиент захотел купить. От 4 до 7 предложений. ВАЖНО: используй \\n для абзацев, ЗАПРЕЩЕНО писать реальные переносы строк в JSON, иначе он сломается!",
  "price": 0
}
Важно: Если в тексте указана цена в рублях, запиши ее числом в поле price. Если цены нет или она не понятна, укажи 0. Верни исключительно чистый JSON.`;

      const aiRes = await fetch('https://api.aitunnel.ru/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AITUNNEL_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', 
          messages: [{ role: 'system', content: 'You are a helpful assistant serving JSON objects only.' }, { role: 'user', content: prompt }],
          temperature: 0.7,
          response_format: { type: "json_object" }
        })
      });

      const aiData = await aiRes.json();
      if (!aiData.choices || !aiData.choices[0]) {
          throw new Error('AI Generate failed: ' + JSON.stringify(aiData));
      }
      
      let aiResponseText = aiData.choices[0].message.content;
      
      // Защищаем от возможных маркдаун тегов на случай если API проигнорирует формат
      aiResponseText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();

      console.log("Safe AI JSON:", aiResponseText);
      const parsedData = JSON.parse(aiResponseText);
      
      let { postText, marketTitle, marketDescription, price } = parsedData;

      let vkAttachmentString = null;
      const vkAttachmentsArr = [];
      let photoUrls = [];

      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          if (att.type === 'video') {
            const access = att.video.access_key ? `_${att.video.access_key}` : '';
            vkAttachmentsArr.push(`video${att.video.owner_id}_${att.video.id}${access}`);
          } else if (att.type === 'photo') {
            const bestSize = [...att.photo.sizes].sort((a,b) => b.width - a.width)[0];
            photoUrls.push(bestSize.url);
          }
        }
      }

      // СОЗДАНИЕ ТОВАРА В МАРКЕТЕ С КАРОУСЕЛЬЮ ФОТО
      let marketCreated = false;
      let marketDebugLog = '';
      let marketId = null;

      if (price > 0 && photoUrls.length > 0) {
        try {
           const USER_TOKEN = process.env.VK_USER_TOKEN;
           const ACTIVE_TOKEN = USER_TOKEN || VK_TOKEN;

           let targetCategoryId = 1;
           const catRes = await fetch(`https://api.vk.com/method/market.getCategories?count=1000&access_token=${ACTIVE_TOKEN}&v=${VK_API_V}`);
           const catData = await catRes.json();
           if (catData.response && catData.response.items) {
             const cat = catData.response.items.find(c => c.name.includes('Животн') || c.name.includes('Кошк') || c.name.includes('Питомц'));
             targetCategoryId = cat ? cat.id : catData.response.items[0].id;
           }

           // Обложка (первое фото)
           let uploadUrlRes = await fetch(`https://api.vk.com/method/photos.getMarketUploadServer?group_id=${group_id}&main_photo=1&access_token=${ACTIVE_TOKEN}&v=${VK_API_V}`);
           let uploadUrlData = await uploadUrlRes.json();
           let uploadUrl = uploadUrlData.response.upload_url;

           let imgRes = await fetch(photoUrls[0]);
           let imgBlob = await imgRes.blob();
           const formData = new FormData();
           formData.append('file', imgBlob, 'cover.jpg');
           let uploadedRes = await fetch(uploadUrl, { method: 'POST', body: formData });
           let uploadedData = await uploadedRes.json();

           let saveQ = new URLSearchParams({ group_id, photo: uploadedData.photo, server: uploadedData.server, hash: uploadedData.hash, access_token: ACTIVE_TOKEN, v: VK_API_V });
           if (uploadedData.crop_data) saveQ.append('crop_data', uploadedData.crop_data);
           if (uploadedData.crop_hash) saveQ.append('crop_hash', uploadedData.crop_hash);
           let savedPhotoRes = await fetch(`https://api.vk.com/method/photos.saveMarketPhoto`, { method: 'POST', body: saveQ.toString(), headers: {'Content-Type': 'application/x-www-form-urlencoded'}});
           let savedPhotoData = await savedPhotoRes.json();
           let mainPhotoId = savedPhotoData.response[0].id;

           // Дополнительные фото (Market API поддерживает до 4 дополнительных фото)
           const extraPhotoIds = [];
           const extraUrls = photoUrls.slice(1, 5); 
           if (extraUrls.length > 0) {
               let extraUploadUrlRes = await fetch(`https://api.vk.com/method/photos.getMarketUploadServer?group_id=${group_id}&main_photo=0&access_token=${ACTIVE_TOKEN}&v=${VK_API_V}`);
               let extraUploadUrlData = await extraUploadUrlRes.json();
               let extraUrl = extraUploadUrlData.response.upload_url;
               
               for (const url of extraUrls) {
                   let eImgRes = await fetch(url);
                   let eImgBlob = await eImgRes.blob();
                   const eFormData = new FormData();
                   eFormData.append('file', eImgBlob, 'extra.jpg');
                   let eUploadedRes = await fetch(extraUrl, { method: 'POST', body: eFormData });
                   let eUploadedData = await eUploadedRes.json();

                   let eSaveQ = new URLSearchParams({ group_id, photo: eUploadedData.photo, server: eUploadedData.server, hash: eUploadedData.hash, access_token: ACTIVE_TOKEN, v: VK_API_V });
                   let eSavedRes = await fetch(`https://api.vk.com/method/photos.saveMarketPhoto`, { method: 'POST', body: eSaveQ.toString(), headers: {'Content-Type': 'application/x-www-form-urlencoded'}});
                   let eSavedData = await eSavedRes.json();
                   if (eSavedData.response && eSavedData.response[0]) {
                       extraPhotoIds.push(eSavedData.response[0].id);
                   }
               }
           }

           const marketVideoIds = [];
           for (const att of attachments || []) {
             if (att.type === 'video') marketVideoIds.push(att.video.id);
           }

           let addMarketQ = new URLSearchParams({
             owner_id: `-${group_id}`,
             name: marketTitle || 'Котенок Maclen',
             description: marketDescription || 'Описание котенка',
             category_id: targetCategoryId,
             price: price,
             main_photo_id: mainPhotoId,
             access_token: ACTIVE_TOKEN,
             v: VK_API_V
           });
           if (marketVideoIds.length > 0) addMarketQ.append('video_ids', marketVideoIds.join(','));
           if (extraPhotoIds.length > 0) addMarketQ.append('photo_ids', extraPhotoIds.join(','));
           
           let addedMarketRes = await fetch(`https://api.vk.com/method/market.add`, { method: 'POST', body: addMarketQ.toString(), headers: {'Content-Type': 'application/x-www-form-urlencoded'}});
           let addedMarketData = await addedMarketRes.json();
           
           if (addedMarketData.response && addedMarketData.response.market_item_id) {
               marketCreated = true;
               marketId = addedMarketData.response.market_item_id;
               postText += `\n\n🛍 Подробности и полная карточка котенка: https://vk.com/market-${group_id}?w=product-${group_id}_${marketId}`;
           } else {
               marketDebugLog = JSON.stringify(addedMarketData.error);
           }
        } catch (e) {
          marketDebugLog = e.message;
        }
      }

      // СОБИРАЕМ КАРУСЕЛЬ НА СТЕНУ (грузим ВСЕ фотки на сервер стены)
      if (photoUrls.length > 0) {
          try {
              let wallServerRes = await fetch(`https://api.vk.com/method/photos.getWallUploadServer?group_id=${group_id}&access_token=${VK_TOKEN}&v=${VK_API_V}`);
              let wallServerData = await wallServerRes.json();
              if (wallServerData.response && wallServerData.response.upload_url) {
                  let wallUrl = wallServerData.response.upload_url;
                  const upperLimit = Math.min(photoUrls.length, 10);
                  for (let i = 0; i < upperLimit; i++) {
                     let imgRes = await fetch(photoUrls[i]);
                     let imgBlob = await imgRes.blob();
                     const formData = new FormData();
                     formData.append('photo', imgBlob, 'photo.jpg');
                     let uploadedRes = await fetch(wallUrl, { method: 'POST', body: formData });
                     let uploadedData = await uploadedRes.json();
                     
                     let saveWallQ = new URLSearchParams({ group_id, photo: uploadedData.photo, server: uploadedData.server, hash: uploadedData.hash, access_token: VK_TOKEN, v: VK_API_V });
                     let savedWallRes = await fetch(`https://api.vk.com/method/photos.saveWallPhoto`, { method: 'POST', body: saveWallQ.toString(), headers: {'Content-Type': 'application/x-www-form-urlencoded'}});
                     let savedWallData = await savedWallRes.json();
                     
                     if (savedWallData.response && savedWallData.response[0]) {
                         const newPhoto = savedWallData.response[0];
                         vkAttachmentsArr.push(`photo${newPhoto.owner_id}_${newPhoto.id}`);
                     }
                  }
              }
          } catch(e) { console.error("Wall photo error:", e); }
      }

      vkAttachmentString = vkAttachmentsArr.join(',') || null;

      // ПУБЛИКАЦИЯ НА СТЕНУ
      const wallQuery = new URLSearchParams({
        owner_id: `-${group_id}`,
        from_group: '1',
        message: postText,
        access_token: VK_TOKEN,
        v: VK_API_V
      });
      if (vkAttachmentString) wallQuery.append('attachments', vkAttachmentString);

      const postRes = await fetch('https://api.vk.com/method/wall.post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: wallQuery.toString()
      });
      const postResponseData = await postRes.json();

      let reportMessage = '✨ Пост успешно опубликован на стене!';
      if (marketCreated) reportMessage += '\n🛍 Карточка товара успешно создана!';
      if (postResponseData.error) reportMessage = '❌ Ошибка публикации: ' + postResponseData.error.error_msg;

      // ДОБАВЛЯЕМ ОТЛАДОЧНУУ ИНФОРМАЦИЮ ПРЯМО В ОТВЕТ
      reportMessage += `\n\n[Отладка]: Найдена цена = ${price}. Фото обнаружено = ${mainPhotoUrl ? 'Да' : 'Нет'}. Вложений: ${attachments ? attachments.length : 0}`;
      if (marketDebugLog) {
         reportMessage += `\n⚠️ Ошибка маркета: ${marketDebugLog}`;
      }

      const replyQuery = new URLSearchParams({
        user_id: message.peer_id,
        message: reportMessage,
        random_id: Math.floor(Math.random() * 2000000000),
        access_token: VK_TOKEN,
        v: VK_API_V
      });
      await fetch('https://api.vk.com/method/messages.send', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: replyQuery.toString() });

    } catch (err) {
      console.error('VK Webhook error:', err);
      // Пытаемся отправить текст ошибки Елене
      try {
        const errorQuery = new URLSearchParams({
          user_id: req.body.object.message ? req.body.object.message.peer_id : req.body.object.peer_id,
          message: '❌ Ошибка скрипта: ' + err.toString(),
          random_id: Math.floor(Math.random() * 2000000000),
          access_token: VK_TOKEN,
          v: VK_API_V
        });
        await fetch('https://api.vk.com/method/messages.send', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: errorQuery.toString() });
      } catch(e) {}
    }
    return;
  }
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
