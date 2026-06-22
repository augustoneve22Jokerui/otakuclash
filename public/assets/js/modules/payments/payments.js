/**
 * OTAKU CLASH ANGOLA - PAYMENTS MANAGEMENT MODULE
 * Senior Frontend Engineer: Financial Gateways & Settlement UI
 */

class PaymentsModule {
    constructor() {
        this.endpoint = '/payments';
        this.transactionsEndpoint = '/transactions/admin/recent';
        this.methods = [];
        this.table = null;

        this.init();
    }

    async init() {
        console.log('[Payments] Inicializando gestão de gateways...');
        this.setupEventListeners();
        await this.loadMethods();
        await this.loadPaymentTransactions();
    }

    setupEventListeners() {
        // Refresh de Transações
        const btnRefresh = document.getElementById('btn-refresh-payments');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadPaymentTransactions());
        }

        // Filtro de Método
        const methodFilter = document.getElementById('filter-payment-method');
        if (methodFilter) {
            methodFilter.addEventListener('change', () => this.loadPaymentTransactions());
        }
    }

    /**
     * Carrega os métodos de pagamento ativos no backend (MCX Express, etc)
     */
    async loadMethods() {
        try {
            const response = await window.API.get(`${this.endpoint}/methods`);
            if (response.status === 'success') {
                this.methods = response.data;
                this.renderMethodsUI(this.methods);
            }
        } catch (error) {
            console.error('[Payments] Erro ao carregar métodos:', error);
        }
    }

    /**
     * Carrega as transações financeiras específicas de depósito (vinda do módulo Transactions)
     */
    async loadPaymentTransactions() {
        this.toggleLoading(true);
        try {
            // Buscamos transações do tipo DEPOSIT para auditoria de pagamentos
            const response = await window.API.get(this.transactionsEndpoint, { 
                params: { type: 'DEPOSIT', limit: 50 } 
            });

            if (response.status === 'success') {
                this.renderTransactionsTable(response.data);
            }
        } catch (error) {
            console.error('[Payments] Erro ao carregar transações:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza os cards de status dos Gateways
     */
    renderMethodsUI(methods) {
        const container = document.getElementById('gateways-status-container');
        if (!container) return;

        container.innerHTML = methods.map(method => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="oc-card animate-up">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="gateway-logo-bg p-2 rounded-sm bg-dark border border-secondary">
                            <i class="bi bi-bank fs-4 text-primary"></i>
                        </div>
                        <span class="oc-badge ${method.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
                            ${method.status}
                        </span>
                    </div>
                    <h5 class="mb-1">${method.name}</h5>
                    <p class="text-muted small mb-3">Moeda Aceita: <strong>${method.currency}</strong></p>
                    
                    <div class="d-flex justify-content-between text-dim small mb-2">
                        <span>Min. Depósito:</span>
                        <span class="text-main">${window.Formatters.currency(method.minAmount)}</span>
                    </div>
                    <div class="d-flex justify-content-between text-dim small mb-4">
                        <span>Taxa do Provedor:</span>
                        <span class="text-main">3.5%</span>
                    </div>

                    <button class="btn-oc btn-oc-outline w-100 btn-sm" onclick="Payments.configureGateway('${method.id}')">
                        <i class="bi bi-gear me-2"></i> Configurar Gateway
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Renderiza a tabela de depósitos com ações de sincronização
     */
    renderTransactionsTable(data) {
        const container = document.querySelector('#payments-table tbody');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = `<tr><td colspan="6" class="text-center py-5">Nenhum pagamento registrado.</td></tr>`;
            return;
        }

        container.innerHTML = data.map(tx => {
            const statusClass = this._getStatusClass(tx.status);
            return `
                <tr class="animate-up">
                    <td>
                        <div class="fw-bold text-main">${tx.reference_id || 'N/A'}</div>
                        <small class="text-dim">ID OC: ${tx.id.substring(0, 8)}</small>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${tx.avatar_url || '/assets/img/placeholders/avatar.png'}" class="oc-avatar-sm rounded-circle me-2">
                            <span class="fw-500">${tx.username}</span>
                        </div>
                    </td>
                    <td>
                        <div class="fw-bold text-primary">${window.Formatters.currency(tx.amount)}</div>
                    </td>
                    <td>
                        <span class="oc-badge ${statusClass}">${tx.status}</span>
                    </td>
                    <td>
                        <div class="small text-muted">${window.Formatters.date(tx.created_at, true)}</div>
                    </td>
                    <td class="text-end">
                        <button class="btn-oc btn-oc-outline btn-sm" 
                                onclick="Payments.syncTransaction('${tx.id}')" 
                                ${tx.status !== 'PENDING' ? 'disabled' : ''} 
                                title="Sincronizar com Provedor">
                            <i class="bi bi-arrow-repeat"></i>
                        </button>
                        <button class="btn-oc btn-oc-outline btn-sm ms-1" onclick="Payments.viewTxDetails('${tx.id}')">
                            <i class="bi bi-info-circle"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Sincroniza manualmente o status de uma transação pendente com o Multicaixa Express
     */
    async syncTransaction(transactionId) {
        Swal.fire({
            title: 'Verificando Status',
            text: 'Consultando API do provedor de pagamento...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            // GET /api/v1/payments/status/:transactionId
            const response = await window.API.get(`${this.endpoint}/status/${transactionId}`);
            
            if (response.status === 'success') {
                await this.loadPaymentTransactions();
                Swal.fire({
                    title: 'Sincronizado!',
                    text: `O novo status da transação é: ${response.data.status}`,
                    icon: 'success',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    confirmButtonColor: 'var(--primary-color)'
                });
            }
        } catch (error) {
            console.error('[Payments] Erro na sincronização:', error);
        }
    }

    async viewTxDetails(id) {
        // Busca detalhes via API de transações
        try {
            const response = await window.API.get(`/transactions/${id}`);
            if (response.status === 'success') {
                const tx = response.data;
                const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;

                Swal.fire({
                    title: 'Detalhes do Pagamento',
                    html: `
                        <div class="text-start small">
                            <div class="mb-2"><strong>Referência Provedor:</strong> ${tx.reference_id || 'Pendente'}</div>
                            <div class="mb-2"><strong>Telefone do Cliente:</strong> ${metadata?.phoneNumber || 'Não informado'}</div>
                            <div class="mb-2"><strong>Valor Bruto:</strong> ${window.Formatters.currency(tx.amount)}</div>
                            <div class="mb-4"><strong>Descrição:</strong> ${tx.description}</div>
                            <label class="oc-label">Logs do Gateway:</label>
                            <pre class="bg-dark p-2 text-dim rounded-sm border border-secondary" style="font-size: 10px; max-height: 150px;">${JSON.stringify(metadata?.providerResponse || {}, null, 2)}</pre>
                        </div>
                    `,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    confirmButtonColor: 'var(--secondary-color)'
                });
            }
        } catch (err) {
            console.error('[Payments] Erro ao buscar detalhes');
        }
    }

    configureGateway(id) {
        window.showAlert('Módulo em Desenvolvimento', `A interface de configuração direta do gateway ${id} estará disponível na v2.2.`, 'info');
    }

    _getStatusClass(status) {
        switch (status) {
            case 'COMPLETED': return 'badge-success';
            case 'PENDING': return 'badge-warning';
            case 'FAILED': return 'badge-danger';
            case 'CANCELLED': return 'badge-danger';
            default: return 'badge-info';
        }
    }

    toggleLoading(show) {
        const loader = document.getElementById('payments-loader');
        const table = document.getElementById('payments-table');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        if (table) table.style.opacity = show ? '0.4' : '1';
    }
}

// Inicializa o módulo
window.Payments = new PaymentsModule();