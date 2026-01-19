const https = require('https');

const API_KEY = 'sk_car_JmdGRhBt1ocwhqmrxy2gaa';
const VERSION = '2025-04-16';

async function fetchPage(cursor) {
  return new Promise((resolve, reject) => {
    const path = '/voices?limit=100' + (cursor ? '&starting_after=' + cursor : '');
    const options = {
      hostname: 'api.cartesia.ai',
      path: path,
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Cartesia-Version': VERSION
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error('Status code: ' + res.statusCode));
            return;
          }
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  let allVoices = [];
  let cursor = null;
  let hasMore = true;
  let page = 1;

  while (hasMore) {
    try {
      const resp = await fetchPage(cursor);
      if (resp.data) {
        allVoices = allVoices.concat(resp.data);
      }
      
      hasMore = resp.has_more;
      if (hasMore) {
        cursor = resp.next_page; // ID of the last item usually, or explicit next_page token
        // Cartesia returns 'next_page' as the cursor value (ID)
        // See previous output: "next_page":"79f8b5fb..." 
      }
      page++;
    } catch (err) {
      console.error('Error fetching page ' + page, err);
      break;
    }
  }

  console.log(JSON.stringify(allVoices, null, 2));
}

main();
