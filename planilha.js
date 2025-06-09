const XLSX = require('xlsx');
const fs = require('fs');

const fs = require('fs');

function salvarJSON(dados) {
  try {
    const caminho = 'dados-loteria.json';
    fs.writeFileSync(caminho, JSON.stringify(dados, null, 2), 'utf8');
    console.log(`JSON salvo com sucesso em: ${caminho}`);
  } catch (err) {
    console.error("Erro ao salvar JSON:", err);
  }
}

module.exports = { salvarJSON };


function gerarPlanilha(dados) {
  if (!Array.isArray(dados)) {
    console.error("Dados inválidos para planilha.");
    return;
  }

const dadosFormatados = dados.map(item => ({
  "Data do Sorteio": item.DrawDate,
  "Números Sorteados": item.DrawNumbers.map(n => n.NumberPick).join(", ")
}));


  const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Loteria');
  XLSX.writeFile(workbook, 'loteria.xlsx');
}

module.exports = { gerarPlanilha };
