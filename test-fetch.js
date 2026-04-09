const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const tokenMatch = env.match(/VK_GROUP_TOKEN=(.+)/);
const token = tokenMatch ? tokenMatch[1].trim() : '';
fetch('https://api.vk.com/method/market.getCategories?count=1000&access_token=' + token + '&v=5.131')
.then(r=>r.json()).then(d=>{
    const cats = d.response.items.filter(c => c.name.toLowerCase().includes('животн'));
    console.log(JSON.stringify(cats, null, 2));
});
