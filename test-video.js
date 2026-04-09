const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const tokenMatch = env.match(/VK_USER_TOKEN=(.+)/);
const USER_TOKEN = tokenMatch ? tokenMatch[1].trim() : '';

async function checkVideo() {
    const vUrl = `https://api.vk.com/method/video.get?owner_id=-225204095&count=1&access_token=${USER_TOKEN}&v=5.131`;
    const res = await fetch(vUrl);
    const data = await res.json();
    console.log(JSON.stringify(data.response.items[0], null, 2));
}

checkVideo();
