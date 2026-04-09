const fs = require('fs');

async function testAI() {
  const AITUNNEL_KEY = process.env.AITUNNEL_KEY || 'sk-aitunnel-GEhq2XTu9QmIrrOZe2S1Di2WAdp7yQ0C';
  const text = "Интересно наблюдать как котейки радуются новым игрушкам.Когтеточка явно всем понравилась 😸 https://vk.com/video-225204095_456239023";

  const prompt = `Ты — профессиональный SMM-маркетолог элитного питомника мейн-кунов. 
Тебе дали сырые факты о котенке: "${text}".
Твоя задача — вернуть СТРОГИЙ JSON. Верни только объект.

Важнейшее правило: Текст постов должен быть разбит на короткие абзацы для легкости чтения!
Для переноса строки ОБЯЗАТЕЛЬНО используй конструкцию \\n\\n (с двумя экранированными слэшами, чтобы JSON парсер не сломался).

Структура:
{
  "postText": "Воздушный, эмоциональный пост для стены ВКонтакте с эмодзи и хештегами. Сделай его красивым, используй \\n\\n для разделения мыслей.",
  "marketTitle": "Название карточки товара (например: Котенок Энцо (окрас n22)). Заголовок до 100 символов.",
  "marketDescription": "ОЧЕНЬ КРАСИВОЕ, ДЕТАЛЬНОЕ описание для карточки товара. Используй эмодзи 😻, красивые речевые обороты. От 4 до 7 предложений. ОБЯЗАТЕЛЬНО разбей текст на 3 абзаца с помощью \\n\\n.",
  "price": 0
}
Важно: Если в тексте указана цена в рублях, запиши ее числом в поле price. Если цены нет или она не понятна, укажи 0. Верни исключительно чистый JSON.`;

  try {
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
    let aiResponseText = aiData.choices[0].message.content;
    aiResponseText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsedData = JSON.parse(aiResponseText);
    console.log("Parsed postText:", parsedData.postText);
  } catch (err) {
    console.error(err);
  }
}

testAI();
