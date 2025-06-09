const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const ExcelJS = require('exceljs');
const moment = require('moment');
const Store = require('electron-store').default;

const store = new Store();

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  win.loadFile('index.html');
}

// Caminho da pasta interna e do arquivo copiado
const userDataPath = app.getPath('userData');
const internalCsvPath = path.join(userDataPath, 'anterior.csv');

// Garante que o arquivo CSV interno exista, se não, pede para selecionar e copia para a pasta interna
async function ensureInternalCSV() {
  if (fs.existsSync(internalCsvPath)) {
    // Já existe arquivo interno
    return internalCsvPath;
  }

  // Se não existir, pede para selecionar
  const result = await dialog.showOpenDialog({
    title: 'Selecione o arquivo anterior.csv',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    throw new Error('Nenhum arquivo CSV selecionado.');
  }

  const selectedPath = result.filePaths[0];
  
  // Copia para pasta interna
  await fsp.mkdir(userDataPath, { recursive: true });
  await fsp.copyFile(selectedPath, internalCsvPath);
  store.set('anteriorCSVPath', internalCsvPath);

  return internalCsvPath;
}

// Função para ler e parsear CSV, idêntica à sua original
function parseCSVtoRowsAdjusted(csvText) {
  const lines = csvText.trim().split('\n');
  const header = lines.shift().split(',');

  const headerMap = {
    'Date': 'Data',
    'N1': 'n1',
    'N2': 'n2',
    'N3': 'n3',
    'N4': 'n4',
    'N5': 'n5',
    'Cash Ball': 'cash ball'
  };

  const rows = lines.map(line => {
    const cols = line.split(',');
    const obj = {};

    header.forEach((h, i) => {
      const key = headerMap[h.trim()];
      if (!key) return;

      if (key === 'Data') {
        const parsedDate = moment(cols[i].trim(), 'MM/DD/YY', true);
        obj[key] = parsedDate.isValid() ? parsedDate.format('YYYY-MM-DD') : null;
      } else {
        obj[key] = cols[i].trim();
      }
    });

    return obj;
  }).filter(row => row.Data !== null);

  return rows;
}

// Obtém última data do CSV interno
async function getLastDateFromCSV(csvPath) {
  if (!fs.existsSync(csvPath)) return null;

  const data = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSVtoRowsAdjusted(data);

  if (rows.length === 0){
    console.error('⚠️ Nenhuma linha válida encontrada no CSV!');
    return null;
  }

  const sorted = rows.sort((a, b) => (b.Data.localeCompare(a.Data)));
  console.log('✅ Última data encontrada no CSV:', sorted[0].Data);
  return sorted[0].Data;
}

// Handler para exportar para Excel (usa arquivo interno)
ipcMain.handle('export-to-excel', async (event, newRows) => {
  try {
    const csvPath = store.get('anteriorCSVPath') || internalCsvPath;
    if (!newRows || newRows.length === 0) throw new Error('Sem dados para exportar.');

    let previousRows = [];
    if (csvPath && fs.existsSync(csvPath)) {
      const csvData = fs.readFileSync(csvPath, 'utf8');
      previousRows = parseCSVtoRowsAdjusted(csvData);
    }

    const newRowsFormatted = newRows.map(({ data, numeros }) => {
      const parsedDate = moment(data.trim(), 'MM/DD/YYYY', true);
      const dataFormatada = parsedDate.isValid() ? parsedDate.format('YYYY-MM-DD') : null;
      if (!dataFormatada) return null;

      const nums = numeros.split(',').map(n => n.trim());

      return {
        Data: dataFormatada,
        n1: nums[0] || '',
        n2: nums[1] || '',
        n3: nums[2] || '',
        n4: nums[3] || '',
        n5: nums[4] || '',
        'cash ball': nums[5] || ''
      };
    }).filter(row => row !== null);

    const allRows = [...previousRows, ...newRowsFormatted];

    const uniqueMap = new Map();
    allRows.forEach(row => {
      uniqueMap.set(row.Data, row);
    });

    const finalRows = Array.from(uniqueMap.values()).sort((a, b) =>
      a.Data.localeCompare(b.Data)
    );


    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Resultados');

    sheet.columns = [
      { header: 'Data', key: 'Data', width: 15 },
      { header: 'n1', key: 'n1', width: 8 },
      { header: 'n2', key: 'n2', width: 8 },
      { header: 'n3', key: 'n3', width: 8 },
      { header: 'n4', key: 'n4', width: 8 },
      { header: 'n5', key: 'n5', width: 8 },
      { header: 'cash ball', key: 'cash ball', width: 10 },
    ];

    finalRows.forEach(row => {
      sheet.addRow({
        ...row,
        Data: moment(row.Data, 'YYYY-MM-DD').format('DD/MM/YYYY')
      });
    });

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Salvar planilha Excel',
      defaultPath: 'resultados.xlsx',
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });

    if (canceled || !filePath) return null;
    await workbook.xlsx.writeFile(filePath);

    return filePath;

  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    throw error;
  }
});

// Handler para seleção manual do CSV (substitui o arquivo interno)
ipcMain.handle('select-anterior-csv', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Selecione o arquivo CSV',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const selectedPath = result.filePaths[0];

  try {
    await fsp.copyFile(selectedPath, internalCsvPath);
    console.log(`✅ Arquivo anterior.csv copiado para: ${internalCsvPath}`);
    store.set('anteriorCSVPath', internalCsvPath);
    return internalCsvPath;
  } catch (err) {
    console.error('Erro ao copiar arquivo selecionado:', err);
    return null;
  }
});

ipcMain.handle('get-anterior-csv-path', () => {
  return store.get('anteriorCSVPath') || null;
});

ipcMain.handle('get-last-date-from-csv', async (event, csvPath) => {
  try {
    return await getLastDateFromCSV(csvPath);
  } catch (error) {
    console.error('Erro ao obter última data do CSV:', error);
    return null;
  }
});

// Abre pasta do arquivo salvo
ipcMain.handle('open-folder', async (event, filePath) => {
  try {
    if (filePath) {
      const folder = path.dirname(filePath);
      await shell.openPath(folder);
    }
  } catch (error) {
    console.error('Erro ao abrir pasta:', error);
    throw error;
  }
});

// Atualiza o CSV interno com novas linhas (append com cabeçalho)
ipcMain.handle('update-anterior-csv', async (event, newRows) => {
  if (!newRows || newRows.length === 0) return null;

  try {
    const exists = fs.existsSync(internalCsvPath);
    let existingLines = [];

    if (exists) {
      const content = fs.readFileSync(internalCsvPath, 'utf8').trim();
      existingLines = content.split('\n');
    }

    // Remove header da parte existente para evitar duplicidade
    const hasHeader = existingLines.length > 0 && existingLines[0].startsWith('Date');
    const dataLines = hasHeader ? existingLines.slice(1) : existingLines;

    const formattedRows = newRows.map(row => {
      const date = new Date(row.data);
      const formattedDate = date.toLocaleDateString('en-US', {
        timeZone: 'UTC',
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      });

      const [n1, n2, n3, n4, n5, cashBall] = row.numeros.split(',').map(s => s.trim());
      return `${formattedDate},${n1},${n2},${n3},${n4},${n5},${cashBall}`;
    });

    const header = 'Date,N1,N2,N3,N4,N5,Cash Ball';
    const allLines = [header, ...formattedRows, ...dataLines];

    await fsp.writeFile(internalCsvPath, allLines.join('\n'), 'utf8');
    console.log(`✅ Arquivo anterior.csv atualizado com novos dados em: ${internalCsvPath}`);
    return internalCsvPath;

  } catch (err) {
    console.error('Erro ao atualizar CSV interno:', err);
    return null;
  }
});

// Inicialização da aplicação
app.whenReady().then(async () => {
  try {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (err) {
    console.error('Erro na inicialização do app:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
