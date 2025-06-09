const axios = require('axios');

async function buscarLoteria(startDate, endDate) {
  const url = `https://apim-website-prod-eastus.azure-api.net/drawgamesapp/searchgames`;
  const params = {
    id: 138,
    startDate,
    endDate
  };

  const headers = {
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Connection': 'keep-alive',
    'Origin': 'https://floridalottery.com',
    'Referer': 'https://floridalottery.com/',
    'User-Agent': 'Mozilla/5.0',
    'accept': 'application/json',
    'x-partner': 'web'
  };

  try {
    const res = await axios.get(url, { params, headers });
    return res.data || [];
  } catch (err) {
    console.error('Erro na API:', err.message);
    return null;
  }
}

module.exports = { buscarLoteria };
