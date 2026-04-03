const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

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
    
    // Auto-Link Videos to Kittens by Title Match
    try {
        const vUrl = `https://api.vk.com/method/video.get?owner_id=-225204095&count=100&access_token=${USER_TOKEN}&v=${VK_API_V}`;
        const vRes = await fetch(vUrl);
        const vData = await vRes.json();

        if (vData.response && vData.response.items) {
          const videoMap = {};
          vData.response.items.forEach(v => {
            if (v.title) {
               videoMap[v.title.trim().toLowerCase()] = v.player;
            }
          });
          
          data.items = data.items.map(item => {
            const cleanTitle = item.title.trim().toLowerCase();
            // Try exact title matching or if video title contains the kitten name
            for (let [vidTitle, playerUrl] of Object.entries(videoMap)) {
               if (vidTitle === cleanTitle || vidTitle.includes(cleanTitle) || cleanTitle.includes(vidTitle)) {
                   item.videoIframeUrl = playerUrl;
                   break;
               }
            }
            return item;
          });
        }
    } catch (vidError) {
       console.error('Failed to auto-link videos by title:', vidError);
       // Fail silently and return normal items
    }

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
