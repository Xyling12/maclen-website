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

    const messageText = `🐾 Новая заявка с сайта Maclen.ru!\n\nИмя: ${name || '—'}\nТелефон: ${phone || '—'}\nГород: ${city || '—'}\nКомментарий: ${extraInfo || '—'}`;

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

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = 80;
app.listen(PORT, () => {
  console.log(`Maclen server running on port ${PORT}`);
});
