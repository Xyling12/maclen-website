const fetch = require('node-fetch');
async function run() {
    const url = 'https://api.vk.com/method/video.get?owner_id=-225204095&count=20&access_token=' + process.env.VK_USER_TOKEN + '&v=5.199';
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
run();
