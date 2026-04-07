const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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
const VK_USER_ID = '694180609'; // Elena Matrosova's ID
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

      // Ограничиваем вызов автопостера только для администраторов (Елена и разработчик)
      const ALLOWED_ADMINS = [694180609, 23912024];
      if (!ALLOWED_ADMINS.includes(message.from_id)) {
        return; // Игнорируем сообщения от обычных пользователей
      }
      
      // Ищем текст во всех возможных местах
      let text = message.text || '';
      if (!text && message.fwd_messages && message.fwd_messages.length > 0) {
          text = message.fwd_messages[0].text || '';
      }
      if (!text && message.reply_message) {
          text = message.reply_message.text || '';
      }

      // Собираем вложения из самого сообщения и всех пересланных сообщений
      let attachments = [];
      if (message.attachments) attachments = [...message.attachments];
      if (message.fwd_messages && message.fwd_messages.length > 0) {
          for (const fmsg of message.fwd_messages) {
              if (fmsg.attachments) attachments = [...attachments, ...fmsg.attachments];
          }
      }
      if (message.reply_message && message.reply_message.attachments) {
          attachments = [...attachments, ...message.reply_message.attachments];
      }

      if (!text || text.trim() === '') return;

      // ФОРСИРУЕМ ПЕРЕЗАПРОС СООБЩЕНИЯ (ВК Webhook обрезает массив + видео из приложения обрабатывается с задержкой!)
      let retries = 5;
      while (attachments.length === 0 && retries > 0) {
          try {
              const fetchMsgRes = await fetch(`https://api.vk.com/method/messages.getById?message_ids=${message.id}&group_id=${req.body.group_id}&access_token=${VK_TOKEN}&v=${VK_API_V}`);
              const fetchMsgData = await fetchMsgRes.json();
              if (fetchMsgData.response && fetchMsgData.response.items && fetchMsgData.response.items.length > 0) {
                  const fullMsg = fetchMsgData.response.items[0];
                  if (fullMsg.attachments && fullMsg.attachments.length > attachments.length) {
                      attachments = fullMsg.attachments; // Перезаписываем обрезанный массив полным
                      break;
                  }
              }
          } catch(e) { console.error('Refetch err:', e); }
          
          if (attachments.length === 0) {
              await new Promise(r => setTimeout(r, 2000));
              retries--;
          }
      }

    try {
      console.log('Got message to auto-process:', text);
      const group_id = req.body.group_id;
      
      let isClip = false;
      if (/#клип|#clip/i.test(text)) {
          isClip = true;
          text = text.replace(/#клип|#clip/ig, '').trim();
          console.log("Clip mode enabled via hashtag!");
      }
      
      const prompt = `Ты — профессиональный SMM-маркетолог элитного питомника мейн-кунов. 
Тебе дали сырые факты о котенке: "${text}".
Твоя задача — вернуть СТРОГИЙ JSON. Верни только объект.

Важнейшее правило: Текст постов должен быть разбит на короткие абзацы для легкости чтения!
Для переноса строки ОБЯЗАТЕЛЬНО используй конструкцию \\n\\n (с двумя экранированными слэшами, чтобы JSON парсер не сломался).

В конце поста добавь 2-4 уникальных по смыслу хэштега (например, #черныймрамор #рыжийкотенок #ласковыйкот). Постоянные хэштеги добавлять НЕ НУЖНО (они прикрепятся автоматически скриптом).

Структура:
{
  "postText": "Воздушный, эмоциональный пост для стены ВКонтакте с эмодзи и уникальными хештегами в конце. Сделай его красивым, используй \\n\\n для разделения мыслей.",
  "marketTitle": "Название карточки товара (например: Котенок Энцо (окрас n22)). Заголовок до 100 символов.",
  "marketDescription": "ОЧЕНЬ КРАСИВОЕ, ДЕТАЛЬНОЕ описание для карточки товара. Используй эмодзи 😻, красивые речевые обороты. От 4 до 7 предложений. ОБЯЗАТЕЛЬНО разбей текст на 3 абзаца с помощью \\n\\n.",
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

      // Прикрепляем постоянные хэштеги ко всем постам
      postText += '\n\n#мейнкун #котятамейнкун #питомникmaclen #купитьмейнкуна #ижевск';

      let vkAttachmentString = null;
      const vkAttachmentsArr = [];
      let photoUrls = [];
      let videoDownloadUrls = [];

      if (attachments && attachments.length > 0) {
        // Функция для извлечения медиа
        const extractMedia = (att) => {
          if (att.type === 'video' || att.type === 'clip') {
            const vObj = att.video || att.clip;
            if (vObj) {
              const access = vObj.access_key ? `_${vObj.access_key}` : '';
              const videoIdStr = `${vObj.owner_id}_${vObj.id}${access}`;
              vkAttachmentsArr.push(`video${videoIdStr}`);
              // Сохраняем как объект для удобства
              videoDownloadUrls.push({
                 type: 'vk_video',
                 targetVideo: videoIdStr,
                 owner_id: vObj.owner_id,
                 id: vObj.id,
                 access_key: vObj.access_key || ''
              });
            }
          } else if (att.type === 'doc' && att.doc && att.doc.url && isClip) {
            videoDownloadUrls.push({ type: 'doc', targetVideo: att.doc.url });
          } else if (att.type === 'photo') {
            if (att.photo && att.photo.sizes) {
               const bestSize = [...att.photo.sizes].sort((a,b) => b.width - a.width)[0];
               photoUrls.push(bestSize.url);
            }
          } else if (att.type === 'wall' && att.wall && att.wall.attachments) {
            // Если прислали репост стены, вытаскиваем фотки/видео из самого поста
            for (const subAtt of att.wall.attachments) extractMedia(subAtt);
          }
        };

        for (const att of attachments) {
          extractMedia(att);
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

           let targetCategoryId = 40532; // "Домашние животные" in VK Market (ID 40532)

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

           if (addedMarketData.error && addedMarketData.error.error_code === 15) {
               // Блок "Услуги" отключен в группе, используем базовую категорию 1 (Гардероб/Иное), которая точно работает
               addMarketQ.set('category_id', 1);
               addedMarketRes = await fetch(`https://api.vk.com/method/market.add`, { method: 'POST', body: addMarketQ.toString(), headers: {'Content-Type': 'application/x-www-form-urlencoded'}});
               addedMarketData = await addedMarketRes.json();
               marketDebugLog = 'Категория "Животные" недоступна (отключены Услуги в ВК). Товар временно помещен в базовую категорию.';
           }
           
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
      let wallDebugLog = '';
      if (photoUrls.length > 0) {
          try {
              const USER_TOKEN = process.env.VK_USER_TOKEN;
              const ACTIVE_TOKEN = USER_TOKEN || VK_TOKEN;

              let wallServerRes = await fetch(`https://api.vk.com/method/photos.getWallUploadServer?group_id=${group_id}&access_token=${ACTIVE_TOKEN}&v=${VK_API_V}`);
              let wallServerData = await wallServerRes.json();
              if (wallServerData.error) throw new Error('GetWallServer: ' + JSON.stringify(wallServerData.error));
              
              if (wallServerData.response && wallServerData.response.upload_url) {
                  let wallUrl = wallServerData.response.upload_url;
                  const upperLimit = Math.min(photoUrls.length, 10);
                  for (let i = 0; i < upperLimit; i++) {
                     let imgRes = await fetch(photoUrls[i]);
                     let imgBlob = await imgRes.blob();
                     const formData = new FormData();
                     formData.append('photo', imgBlob, 'photo.jpg');
                     let uploadedRes = await fetch(wallUrl, { method: 'POST', body: formData });
                     let uploadedText = await uploadedRes.text();
                     let uploadedData;
                     try { uploadedData = JSON.parse(uploadedText); } catch(e) { throw new Error('Wall upload not json: ' + uploadedText); }

                     if (!uploadedData.photo || uploadedData.photo === '[]') {
                         // Попробуем с file1, если photo не сработал
                         const fd2 = new FormData();
                         fd2.append('file1', imgBlob, 'photo.jpg');
                         let uRes2 = await fetch(wallUrl, { method: 'POST', body: fd2 });
                         uploadedData = await uRes2.json();
                     }
                     
                     let saveWallQ = new URLSearchParams({ group_id, photo: uploadedData.photo, server: uploadedData.server, hash: uploadedData.hash, access_token: ACTIVE_TOKEN, v: VK_API_V });
                     let savedWallRes = await fetch(`https://api.vk.com/method/photos.saveWallPhoto`, { method: 'POST', body: saveWallQ.toString(), headers: {'Content-Type': 'application/x-www-form-urlencoded'}});
                     let savedWallData = await savedWallRes.json();
                     
                     if (savedWallData.error) throw new Error('SaveWallPhoto: ' + JSON.stringify(savedWallData.error));
                     
                     if (savedWallData.response && savedWallData.response[0]) {
                         const newPhoto = savedWallData.response[0];
                         vkAttachmentsArr.push(`photo${newPhoto.owner_id}_${newPhoto.id}`);
                     }
                  }
              } else {
                  console.error('Wall upload server error:', wallServerData);
              }
          } catch(e) { console.error("Wall photo error:", e); }
      }

      vkAttachmentString = vkAttachmentsArr.join(',') || null;

      // ПУБЛИКАЦИЯ
      let reportMessage = '✨ Обработка завершена!';
      let postResponseData = {};

      if (isClip && videoDownloadUrls.length > 0) {
          // *** ПУБЛИКАЦИЯ КЛИПА ***
          const videoObj = videoDownloadUrls[0];
          const targetVideo = videoObj.targetVideo;
          
          try {
              const USER_TOKEN = process.env.VK_USER_TOKEN || VK_TOKEN;
              const tmpPath = path.join(__dirname, `clip_${Date.now()}.mp4`);
              
              if (videoObj.type === 'doc') {
                  // Прямая ссылка на документ
                  console.log(`Скачиваем документ-видео: ${targetVideo}`);
                  const vidRes = await fetch(targetVideo);
                  const arrayBuffer = await vidRes.arrayBuffer();
                  fs.writeFileSync(tmpPath, Buffer.from(arrayBuffer));
              } else {
                  // Это VK видео
                  console.log(`Попытка получить прямую ссылку для видео: ${targetVideo}`);
                  let fetchedDirect = false;
                  
                  // Пытаемся получить прямую ссылку через API
                  try {
                      const vGetUrl = `https://api.vk.com/method/video.get?videos=${targetVideo}&access_token=${USER_TOKEN}&v=${VK_API_V}`;
                      const vGetRes = await fetch(vGetUrl);
                      const vGetData = await vGetRes.json();
                      
                      if (vGetData.response && vGetData.response.items && vGetData.response.items.length > 0) {
                          const vItem = vGetData.response.items[0];
                          if (vItem.files) {
                              const bestResUrl = vItem.files.mp4_1080 || vItem.files.mp4_720 || vItem.files.mp4_480 || vItem.files.mp4_360 || vItem.files.mp4_240;
                              if (bestResUrl) {
                                  console.log(`Найдена прямая ссылка через API (${bestResUrl.split('?')[0]}), качаем...`);
                                  const vidRes = await fetch(bestResUrl);
                                  const arrayBuffer = await vidRes.arrayBuffer();
                                  fs.writeFileSync(tmpPath, Buffer.from(arrayBuffer));
                                  fetchedDirect = true;
                              }
                          }
                      }
                  } catch(e) { console.error('Ошибка video.get API:', e.message); }

                  // Если через API не удалось, пробуем yt-dlp через EXT (iframe) url!
                  if (!fetchedDirect) {
                       let hashParam = videoObj.access_key ? `&hash=${videoObj.access_key}` : '';
                       const embedUrl = `https://vk.com/video_ext.php?oid=${videoObj.owner_id}&id=${videoObj.id}${hashParam}`;
                       
                       console.log(`Прямая ссылка не найдена, используем yt-dlp iframe: ${embedUrl}`);
                       await execPromise(`yt-dlp "${embedUrl}" -o "${tmpPath}" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4`);
                  }
              }

              if (fs.existsSync(tmpPath)) {
                  const fileSize = fs.statSync(tmpPath).size;
                  console.log(`Видео скачано, размер: ${fileSize} байт. Загружаем в ВК Клипы...`);

                  // 1. Получаем сервер загрузки клипа
                  let createClipRes = await fetch(`https://api.vk.com/method/shortVideo.create?v=${VK_API_V}&access_token=${USER_TOKEN}&group_id=${group_id}&file_size=${fileSize}&description=${encodeURIComponent(postText)}&wallpost=1`);
                  let createClipData = await createClipRes.json();
                  
                  if (createClipData.error) {
                      throw new Error('ShortVideo Create Error: ' + JSON.stringify(createClipData.error));
                  }

                  const uploadUrl = createClipData.response.upload_url;
                  
                  // 2. Отправляем видео файл на сервер
                  const imgBlob = new Blob([fs.readFileSync(tmpPath)], { type: 'video/mp4' });
                  const formData = new FormData();
                  formData.append('file', imgBlob, 'clip.mp4');
                  
                  let uploadedRes = await fetch(uploadUrl, { method: 'POST', body: formData });
                  let uploadedData = await uploadedRes.json();
                  
                  console.log('Видео загружено на сервер Клипов:', uploadedData);
                  reportMessage = '✨ Клип успешно загружен и скоро появится в разделе Клипов (и на стене)!';
                  
                  // Чистим временный файл
                  fs.unlinkSync(tmpPath);
              } else {
                  throw new Error('Видео файл не был создан после скачивания');
              }
          } catch(err) {
              console.error('Ошибка загрузки клипа:', err);
              reportMessage = '❌ Ошибка загрузки клипа: ' + err.message;
          }
      } else {
          // *** ПУБЛИКАЦИЯ ОБЫЧНОГО ПОСТА НА СТЕНУ ***
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
          postResponseData = await postRes.json();

          reportMessage = '✨ Пост успешно опубликован на стене!';
          if (postResponseData.error) reportMessage = '❌ Ошибка публикации: ' + postResponseData.error.error_msg;
      }

      if (marketCreated) reportMessage += '\n🛍 Карточка товара успешно создана!';

      // ДОБАВЛЯЕМ ОТЛАДОЧНУУ ИНФОРМАЦИЮ ПРЯМО В ОТВЕТ
      const typesLog = attachments.map(a => a.type).join(', ');
      reportMessage += `\n\n[Отладка]: Фотка скачана: ${photoUrls.length > 0 ? 'Да' : 'Нет'}. Вложений: ${attachments.length} (${typesLog}).`;
      if (marketDebugLog) reportMessage += `\n⚠️ Ошибка маркета: ${marketDebugLog}`;
      if (wallDebugLog) reportMessage += `\n⚠️ Ошибка стены: ${wallDebugLog}`;

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
