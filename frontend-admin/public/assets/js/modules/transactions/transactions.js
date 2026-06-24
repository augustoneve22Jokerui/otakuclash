/**
 * OTAKU CLASH ANGOLA - FINANCIAL TRANSACTIONS MODULE
 * Senior Frontend Engineer: Financial Audit & Cash Flow UI
 */

class TransactionsModule {
    constructor() {
        this.endpoint = '/transactions';
        this.adminEndpoint = '/transactions/admin/recent';
        this.table = null;
        this.allTransactions = [];
        this.currentPage = 1;
        this.limit = 20;

        this.init();
    }

    async init() {
        console.log('[Transactions] Inicializando auditoria financeira...');
        this.setupEventListeners();
        await this.loadTransactions();
    }

    setupEventListeners() {
        // Filtros de Tipo e Status
        ['filter-tx-type', 'filter-tx-status'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => {
                this.currentPage = 1;
                this.loadTransactions();
            });
        });

        // Refresh Manual
        const btnRefresh = document.getElementById('btn-refresh-tx');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadTransactions());
        }

        // Botão Exportar CSV
        const btnExport = document.getElementById('btn-export-tx');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.handleExport());
        }
    }

    /**
     * Carrega transações do backend real
     */
    async loadTransactions() {
        this.toggleLoading(true);

        const params = {
            page: this.currentPage,
            limit: this.limit,
            type: document.getElementById('filter-tx-type')?.value || undefined,
            status: document.getElementById('filter-tx-status')?.value || undefined
        };

        try {
            // Utilizamos o endpoint administrativo para visão global do cashflow
            const response = await window.API.get(this.adminEndpoint, { params });
            
            if (response.status === 'success') {
                this.allTransactions = response.data;
                this.renderTable(this.allTransactions);
                this.renderPagination(response.pagination);
                this.updateTotals();
            }
        } catch (error) {
            console.error('[Transactions] Erro ao carregar extrato:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza a tabela de movimentações (Design Enterprise)
     */
    renderTable(data) {
        const container = document.querySelector('#transactions-table tbody');
        if (!container) return;

        if (this.table) this.table.destroy();

        if (data.length === 0) {
            container.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-dim">Nenhuma movimentação financeira localizada.</td></tr>`;
            return;
        }

        container.innerHTML = data.map(tx => {
            const directionIcon = tx.direction === 'CREDIT' 
                ? '<i class="bi bi-arrow-down-left text-success"></i>' 
                : '<i class="bi bi-arrow-up-right text-danger"></i>';
            
            const amountClass = tx.direction === 'CREDIT' ? 'text-success' : 'text-danger';
            const sign = tx.direction === 'CREDIT' ? '+' : '-';

            return `
                <tr class="animate-up">
                    <td>
                        <div class="fw-bold text-main">#${tx.id.substring(0, 8)}</div>
                        <small class="text-dim">${window.Formatters.date(tx.created_at, true)}</small>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${tx.avatar_url || '/assets/img/placeholders/avatar.png'}" class="oc-avatar-sm rounded-circle me-2 border border-secondary">
                            <div>
                                <div class="fw-500 text-main">${tx.username || 'Sistema'}</div>
                                <div style="font-size: 10px;" class="text-dim">ID: ${tx.wallet_id.substring(0, 8)}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            ${directionIcon}
                            <span class="oc-badge badge-soft-primary" style="font-size: 10px;">${tx.type}</span>
                        </div>
                    </td>
                    <td>
                        <div class="fw-bold ${amountClass}">${sign} ${window.Formatters.currency(tx.amount)}</div>
                    </td>
                    <td>
                        <span class="oc-badge ${this._getStatusClass(tx.status)}">${tx.status}</span>
                    </td>
                    <td>
                        <div class="small text-muted text-truncate" style="max-width: 150px;" title="${tx.description}">
                            ${tx.description || '---'}
                        </div>
                    </td>
                    <td class="text-end">
                        <button class="btn-oc btn-oc-outline btn-sm" onclick="Transactions.viewDetails('${tx.id}')">
                            <i class="bi bi-receipt me-1"></i> Recibo
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.table = $('#transactions-table').DataTable({
            paging: false,
            searching: false,
            info: false,
            ordering: false
        });
    }

    /**
     * Exibe recibo detalhado com metadados JSON
     */
    async viewDetails(id) {
        const tx = this.allTransactions.find(t => t.id === id);
        if (!tx) return;

        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;

        Swal.fire({
            title: '<i class="bi bi-shield-check text-primary me-2"></i> Detalhes da Transação',
            html: `
                <div class="text-start mt-3">
                    <div class="oc-card bg-dark border-secondary p-3 mb-4">
                        <div class="row g-2">
                            <div class="col-6">
                                <small class="text-dim d-block">Tipo</small>
                                <span class="text-main fw-bold">${tx.type}</span>
                            </div>
                            <div class="col-6 text-end">
                                <small class="text-dim d-block">Valor</small>
                                <span class="text-primary fw-bold fs-5">${window.Formatters.currency(tx.amount)}</span>
                            </div>
                            <div class="col-12 mt-2">
                                <small class="text-dim d-block">Referência Externa</small>
                                <code class="text-secondary">${tx.reference_id || 'NÃO POSSUI'}</code>
                            </div>
                        </div>
                    </div>

                    <label class="oc-label">Descrição da Operação</label>
                    <p class="text-main small mb-4">${tx.description || 'Nenhuma descrição fornecida.'}</p>

                    <label class="oc-label">Metadados de Auditoria (JSON)</label>
                    <pre class="bg-dark p-2 text-dim rounded border border-secondary small" style="font-size: 10px; max-height: 150px; overflow: auto;">${JSON.stringify(metadata || {}, null, 2)}</pre>
                    
                    <div class="mt-4 text-center">
                        <button class="btn-oc btn-oc-outline btn-sm" onclick="window.print()">
                            <i class="bi bi-printer me-2"></i> Imprimir Recibo
                        </button>
                    </div>
                </div>
            `,
            width: '550px',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            showConfirmButton: false,
            showCloseButton: true
        });
    }

    /**
     * Exportação para conformidade fiscal/administrativa
     */
    handleExport() {
        const exportData = this.allTransactions.map(t => ({
            ID: t.id,
            Data: window.Formatters.date(t.created_at, true),
            Usuario: t.username,
            Tipo: t.type,
            Valor: t.amount,
            Direcao: t.direction,
            Status: t.status,
            Referencia: t.reference_id
        }));
        
        window.Exporters.exportToCSV(exportData, 'finance_audit_export');
    }

    /**
     * Paginação Dinâmica
     */
    renderPagination(meta) {
        const container = document.getElementById('tx-pagination');
        if (!container) return;

        let html = `
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === 1 ? 'disabled' : ''} onclick="Transactions.changePage(${meta.page - 1})">
                <i class="bi bi-chevron-left"></i>
            </button>
            <span class="text-dim small mx-3">Página ${meta.page} de ${meta.totalPages}</span>
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === meta.totalPages ? 'disabled' : ''} onclick="Transactions.changePage(${meta.page + 1})">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;
        container.innerHTML = html;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadTransactions();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Atualiza indicadores de volume financeiro na tela
     */
    updateTotals() {
        const totalVolume = this.allTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        const el = document.getElementById('session-volume-stat');
        if (el) el.innerText = window.Formatters.currency(totalVolume);
    }

    _getStatusClass(status) {
        switch (status) {
            case 'COMPLETED': return 'badge-success';
            case 'PENDING': return 'badge-warning';
            case 'FAILED': 
            case 'CANCELLED': return 'badge-danger';
            case 'REFUNDED': return 'badge-info';
            default: return 'badge-soft-primary';
        }
    }

    toggleLoading(show) {
        const loader = document.getElementById('tx-loader');
        const table = document.getElementById('transactions-table');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        if (table) table.style.opacity = show ? '0.3' : '1';
    }
}

// Inicializa o módulo e expõe globalmente
window.Transactions = new TransactionsModule();