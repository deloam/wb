const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Abre diálogo para selecionar o arquivo anterior.csv
  selectAnteriorCSV: () => ipcRenderer.invoke('select-anterior-csv'),

  // Abre diálogo genérico para seleção de arquivo CSV (caso precise)
  selectCsvFile: () => ipcRenderer.invoke('dialog:openCsvFile'),

  // Obtém a última data registrada no CSV passado pelo caminho
  getLastDateFromCSV: (path) => ipcRenderer.invoke('get-last-date-from-csv', path),

  // Exporta os dados (rows) para Excel, usando o CSV base para mesclagem
  exportToExcel: (rows, csvPath) => ipcRenderer.invoke('export-to-excel', rows, csvPath),

  // Abre a pasta onde o arquivo está salvo
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),

  // Recupera o caminho salvo do arquivo anterior.csv (persistência local)
  getAnteriorCSVPath: () => ipcRenderer.invoke('get-anterior-csv-path'),

  // Atualiza o arquivo anterior.csv com as novas linhas geradas
  updateAnteriorCSV: (rows, filePath) => ipcRenderer.invoke('update-anterior-csv', rows, filePath),
});
