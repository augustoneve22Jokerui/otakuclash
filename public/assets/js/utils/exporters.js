/**
 * OTAKU CLASH ANGOLA - DATA EXPORTERS
 * Senior Frontend Engineer: Reporting & Data Portability Layer
 */

const Exporters = {
    /**
     * Exporta um array de objetos para formato CSV e inicia o download
     * @param {Array} data - Lista de objetos a serem exportados
     * @param {string} fileName - Nome do arquivo (sem extensão)
     * @param {Array} columns - Opcional: lista de chaves específicas e labels [{key: 'id', label: 'ID'}]
     */
    exportToCSV(data, fileName, columns = null) {
        if (!data || !data.length) {
            window.showAlert('Aviso', 'Não há dados disponíveis para exportação.', 'warning');
            return;
        }

        // Determina os headers (chaves)
        const headers = columns ? columns.map(col => col.label) : Object.keys(data[0]);
        const keys = columns ? columns.map(col => col.key) : Object.keys(data[0]);

        // Constrói as linhas do CSV
        const csvRows = [];
        
        // Adiciona cabeçalho
        csvRows.push(headers.join(','));

        // Adiciona os dados formatados
        for (const row of data) {
            const values = keys.map(key => {
                let val = row[key];
                
                // Tratamento para valores nulos ou indefinidos
                if (val === null || val === undefined) val = '';
                
                // Tratamento para strings que contenham vírgulas (aspas duplas)
                const escaped = ('' + val).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        
        // Adiciona BOM (Byte Order Mark) para compatibilidade com Excel (UTF-8)
        const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
        
        this._triggerDownload(blob, `${fileName}_${new Date().getTime()}.csv`);
    },

    /**
     * Exporta um array de objetos para formato JSON
     * @param {Array|Object} data 
     * @param {string} fileName 
     */
    exportToJSON(data, fileName) {
        if (!data) return;

        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        this._triggerDownload(blob, `${fileName}_${new Date().getTime()}.json`);
    },

    /**
     * Helper para capturar dados de uma tabela HTML e exportar para CSV
     * @param {string} tableId 
     * @param {string} fileName 
     */
    exportTableToCSV(tableId, fileName) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const data = [];
        const rows = table.querySelectorAll('tr');

        // Ignora linhas de cabeçalho ou busca chaves automaticamente
        for (let i = 0; i < rows.length; i++) {
            const row = [], cols = rows[i].querySelectorAll('td, th');
            for (let j = 0; j < cols.length; j++) {
                // Remove espaços em branco e quebras de linha
                row.push(cols[j].innerText.trim().replace(/\n/g, ' '));
            }
            data.push(row.join(','));
        }

        const csvString = data.join('\n');
        const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
        
        this._triggerDownload(blob, `${fileName}_from_table.csv`);
    },

    /**
     * Imprime a área de conteúdo atual (Print to PDF nativo)
     * O CSS deve tratar o @media print para esconder sidebar/navbar
     */
    printReport() {
        window.print();
    },

    /**
     * Lógica interna para disparar o download no navegador
     * @private
     */
    _triggerDownload(blob, fileName) {
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Log de atividade local
            console.log(`[Export] Arquivo gerado: ${fileName}`);
        }
    }
};

// Expor globalmente
window.Exporters = Exporters;