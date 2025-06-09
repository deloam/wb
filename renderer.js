function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const monthAbbr = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][+month - 1];
  return `${+day}-${monthAbbr}-${year}`;
}

let anteriorFilePath = '';
let startDate = '';

window.addEventListener('DOMContentLoaded', async () => {
  const endInput = document.getElementById('endDate');
  const exportBtn = document.getElementById('exportBtn');
  const selectAnteriorBtn = document.getElementById('selectAnteriorBtn');

  endInput.valueAsDate = new Date();

  try {
    // Obtém o caminho do CSV interno salvo
    const savedPath = await window.electronAPI.getAnteriorCSVPath();
    if (savedPath) {
      anteriorFilePath = savedPath;
      document.getElementById('anteriorPath').textContent = savedPath;

      // Obtém a última data do CSV para usar como startDate
      startDate = await window.electronAPI.getLastDateFromCSV(savedPath);
      console.log('Data inicial (startDate) carregada do CSV salvo:', startDate);
    }
  } catch (err) {
    console.error('Erro ao carregar caminho salvo:', err);
  }

  selectAnteriorBtn.addEventListener('click', async () => {
    // Abre diálogo para selecionar novo CSV anterior
    const filePath = await window.electronAPI.selectAnteriorCSV();
    if (filePath) {
      anteriorFilePath = filePath;
      document.getElementById('anteriorPath').textContent = filePath;

      // Atualiza a data inicial baseada no novo CSV
      startDate = await window.electronAPI.getLastDateFromCSV(filePath);
      console.log('Data inicial (startDate) obtida do novo CSV:', startDate);
    }
  });

  exportBtn.addEventListener('click', fetchAndExport);
});

function showSuccessModal(filePath) {
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '1000';

  const box = document.createElement('div');
  box.style.background = 'white';
  box.style.padding = '20px 30px';
  box.style.borderRadius = '10px';
  box.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
  box.style.textAlign = 'center';
  box.style.maxWidth = '350px';
  box.style.fontFamily = "'Inter', sans-serif";

  box.innerHTML = `
    <div style="text-align:center; margin-bottom: 12px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#3b82f6" viewBox="0 0 24 24">
        <path d="M17 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-4-4zM7 19V5h7v4h4v10H7z"/>
        <path d="M9 7h6v2H9z"/>
      </svg>
    </div>
    <p>Planilha salva em:<br><strong>${filePath}</strong></p>
    <button id="openFolderBtn" style="margin: 10px 5px 0 5px; padding: 10px 20px; background-color: #3b82f6; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 1rem;">Abrir pasta</button>
    <button id="closeModalBtn" style="margin: 10px 5px 0 5px; padding: 10px 20px; background-color: #ccc; border: none; border-radius: 8px; color: #333; cursor: pointer; font-weight: 600; font-size: 1rem;">Fechar</button>
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  document.getElementById('openFolderBtn').addEventListener('click', () => {
    window.electronAPI.openFolder(filePath);
  });

  document.getElementById('closeModalBtn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

async function fetchValidStartDate(originalDateStr, endDateFormatted) {
  let date = new Date(originalDateStr);

  for (let i = 0; i < 200; i++) {
    const tryDateStr = date.toISOString().split('T')[0];
    const tryDateFormatted = formatDate(tryDateStr);
    const url = 'https://apim-website-prod-eastus.azure-api.net/drawgamesapp/searchgames?' +
      new URLSearchParams({
        id: 138,
        startDate: tryDateFormatted,
        endDate: endDateFormatted
      });

    const response = await fetch(url, {
      headers: {
        'x-partner': 'web',
        'Origin': 'https://floridalottery.com',
        'Referer': 'https://floridalottery.com/'
      }
    });

    if (response.ok) {
      const json = await response.json();
      return { data: json, validDate: tryDateFormatted };
    } else if (response.status === 400) {
      date.setDate(date.getDate() - 1);
    } else {
      throw new Error(`Erro inesperado: ${response.status}`);
    }
  }

  throw new Error("Nenhuma data válida encontrada nos últimos 200 dias.");
}

async function fetchAndExport() {
  const endDateRaw = document.getElementById('endDate').value;

  if (!anteriorFilePath) {
    alert('Selecione o arquivo anterior.csv primeiro.');
    return;
  }

  if (!startDate) {
    // tenta obter novamente se startDate não estiver carregada
    startDate = await window.electronAPI.getLastDateFromCSV(anteriorFilePath);
    if (!startDate) {
      alert('Não foi possível obter a data inicial do arquivo CSV anterior.');
      return;
    }
  }

  const endDate = formatDate(endDateRaw);

  try {
    const { data, validDate } = await fetchValidStartDate(startDate, endDate);
    console.log('Data inicial válida usada:', validDate);
    console.log('Resposta JSON da API:', data);

    const rows = data.map(item => {
      const date = item.DrawDate.split(' ')[0];
      const numbers = item.DrawNumbers.map(n => n.NumberPick).join(", ");
      return { data: date, numeros: numbers };
    }).reverse();

    // Exporta para Excel, informando o CSV interno para atualizar
    const filePath = await window.electronAPI.exportToExcel(rows, anteriorFilePath);

    if (filePath) {
      // Atualiza o CSV anterior interno com as novas linhas
      await window.electronAPI.updateAnteriorCSV(rows, anteriorFilePath);
      showSuccessModal(filePath);
    } else {
      alert('Operação cancelada.');
    }

  } catch (err) {
    alert('Erro ao buscar dados: ' + err.message);
  }
}
