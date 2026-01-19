const https = require('https');

const options = {
  hostname: 'api.cartesia.ai',
  path: '/v1/voices',
  method: 'GET',
  headers: {
    'X-API-Key': 'sk_car_JmdGRhBt1ocwhqmrxy2gaa',
    'Cartesia-Version': '2025-04-16'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const voices = JSON.parse(data);
      console.log(JSON.stringify(voices, null, 2));
    } catch (e) {
      console.error(e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.end();
