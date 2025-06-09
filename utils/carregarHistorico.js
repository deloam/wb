const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

function carregarHistoricoCSV() {
  const dados = [];
  const caminhoCSV = path.join(__dirname, '../assets/anterior.csv');

  return new Promise((resolve, reject) => {
    fs.createReadStream(caminhoCSV)
      .pipe(csv())
      .on('data', (row) => {
        dados.push({
          data: row.Date,
          numeros: [row.N1, row.N2, row.N3, row.N4, row.N5],
          cashBall: row["Cash Ball"]
        });
      })
      .on('end', () => {
        resolve(dados);
      })
      .on('error', (err) => reject(err));
  });
}

module.exports = { carregarHistoricoCSV };
