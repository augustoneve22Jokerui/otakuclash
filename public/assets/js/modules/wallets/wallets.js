/**
 * OTAKU CLASH ANGOLA - WALLETS & FINANCIAL MANAGEMENT MODULE
 * Senior Frontend Engineer: Fintech & Digital Assets Layer
 */

class WalletsModule {
    constructor() {
        this.endpoint = '/wallets';
        this.adminStatsEndpoint = '/admin/dashboard'; // Para KPIs financeiros
        this.transactionsEndpoint = '/transactions/admin/recent';
        this.tableWithdrawals = null;
        this.allWallets = [];
        this.limit = 10;

        this.init();
    }

    async init() {
        console.log('[Wallets] Inicializando gestão financeira...');
        this.setupEventListeners();
        await this.loadGlobalFinancialStats();
        await this.loadWithdrawalRequests();
    }

    setupEventListeners() {
        // Busca de carteira por usuário
        const btnSearch = document.getElementById('btn-search-wallet');
        if (btnSearch) {
            btnSearch.addEventListener('click', () => this.handleUserWalletSearch());
        }

        // Refresh de solicitações de saque
        const btnRefresh = document.getElementById('btn-refresh-withdrawals');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadWithdrawalRequests());
        }

        // Modal de ajuste rápido (Atalho global)
        const btnQuickAdj = document.getElementById('btn-quick-adjust');
        if (btnQuickAdj) {
            btnQuickAdj.addEventListener('click', () => this.handleQuickAdjust());
        }
    }

    /**
     * Carrega KPIs financeiros globais (Volume total, Saldos bloqueados)
     */
    async loadGlobalFinancialStats() {
        try {
            const response = await window.API.get(this.adminStatsEndpoint);
            if (response.status === 'success') {
                const { overview } = response.data;
                this.updateKPIs(overview);
            }
        } catch (error) {
            console.error('[Wallets] Erro ao carregar estatísticas globais:', error);
        }
    }

    /**
     * Carrega solicitações de saque pendentes (Transações do tipo WITHDRAWAL)
     */
    async loadWithdrawalRequests() {
        this.toggleLoading(true, 'withdrawals-table');
        try {
            // Buscamos transações do tipo WITHDRAWAL com status PENDING
            const params = {
                type: 'WITHDRAWAL',
                status: 'PENDING',
                limit: 50
            };
            const response = await window.API.get(this.transactionsEndpoint, { params });

            if (response.status === 'success') {
                this.renderWithdrawalsTable(response.data);
            }
        } catch (error) {
            console.error('[Wallets] Erro ao carregar saques:', error);
        } finally {
            this.toggleLoading(false, 'withdrawals-table');
        }
    }

    /**
     * Renderiza a tabela de saques pendentes com ações de aprovação
     */
    renderWithdrawalsTable(data) {
        const container = document.querySelector('#withdrawals-table tbody');
        if (!container) return;

        if (this.tableWithdrawals) this.tableWithdrawals.destroy();

        if (data.length === 0) {
            container.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-dim">Nenhuma solicitação de saque pendente.</td></tr>`;
            return;
        }

        container.innerHTML = data.map(req => `
            <tr class="animate-up">
                <td>
                    <div class="fw-bold text-main">#${req.id.substring(0, 8)}</div>
                    <small class="text-dim">${window.Formatters.date(req.created_at, true)}</small>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${req.avatar_url || '/assets/img/placeholders/avatar.png'}" class="oc-avatar-sm rounded-circle me-2">
                        <div>
                            <div class="fw-500 text-main">${req.username}</div>
                            <div class="small text-muted" style="font-size: 10px;">ID: ${req.wallet_id.substring(0, 8)}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="fw-bold text-primary">${window.Formatters.currency(req.amount)}</div>
                </td>
                <td>
                    <div class="small text-main">IBAN: <strong>${req.metadata?.bankAccount || '---'}</strong></div>
                    <div class="small text-dim">${req.metadata?.bankName || 'Banco não informado'}</div>
                </td>
                <td><span class="oc-badge badge-warning">PENDENTE</span></td>
                <td class="text-end">
                    <button class="btn-oc btn-oc-primary btn-sm me-1" onclick="Wallets.processWithdrawal('${req.id}', 'APPROVE')">
                        <i class="bi bi-check-lg"></i>
                    </button>
                    <button class="btn-oc btn-oc-outline btn-sm text-danger" onclick="Wallets.processWithdrawal('${req.id}', 'REJECT')">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        this.tableWithdrawals = $('#withdrawals-table').DataTable({
            paging: true,
            pageLength: 5,
            searching: false,
            lengthChange: false,
            info: false,
            dom: 'tp'
        });
    }

    /**
     * Aprova ou Rejeita um saque via API
     */
    async processWithdrawal(transactionId, action) {
        const isApprove = action === 'APPROVE';
        const confirm = await Swal.fire({
            title: isApprove ? 'Aprovar Saque?' : 'Rejeitar Saque?',
            text: isApprove ? "Certifique-se de que a transferência bancária foi realizada." : "O valor voltará para a carteira do usuário.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: isApprove ? 'Sim, Aprovar' : 'Sim, Rejeitar',
            confirmButtonColor: isApprove ? 'var(--success)' : 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (confirm.isConfirmed) {
            try {
                // PATCH /api/v1/transactions/:id/status (Ou endpoint dedicado de approval)
                const newStatus = isApprove ? 'COMPLETED' : 'CANCELLED';
                await window.API.patch(`/admin/payments/withdrawals/${transactionId}`, { 
                    status: newStatus,
                    reason: isApprove ? 'Saque processado via Multicaixa' : 'Solicitação inconsistente'
                });

                window.showAlert('Sucesso', `Saque ${isApprove ? 'aprovado' : 'rejeitado'} com sucesso.`, 'success');
                this.loadWithdrawalRequests();
                this.loadGlobalFinancialStats();
            } catch (err) {
                console.error('[Wallets] Erro ao processar saque');
            }
        }
    }

    /**
     * Busca carteira por ID de usuário (UUID)
     */
    async handleUserWalletSearch() {
        const userId = document.getElementById('search-wallet-userid')?.value;
        if (!userId || !window.Validators.isUUID(userId)) {
            window.showAlert('Aviso', 'Insira um UUID de usuário válido.', 'warning');
            return;
        }

        this.toggleLoading(true, 'wallet-search-result');
        try {
            // GET /api/v1/wallets/admin/user/:userId
            const response = await window.API.get(`${this.endpoint}/admin/user/${userId}`);
            if (response.status === 'success') {
                this.renderWalletSearchResult(response.data);
            }
        } catch (error) {
            console.error('[Wallets] Carteira não localizada');
        } finally {
            this.toggleLoading(false, 'wallet-search-result');
        }
    }

    renderWalletSearchResult(wallet) {
        const container = document.getElementById('wallet-search-result');
        if (!container) return;

        container.innerHTML = `
            <div class="oc-card bg-dark animate-up">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0 text-main">Status da Carteira</h6>
                    <span class="text-dim small">ID: ${wallet.id.substring(0, 8)}</span>
                </div>
                <div class="row g-3">
                    <div class="col-6">
                        <small class="text-muted d-block">Saldo Disponível</small>
                        <span class="text-success fw-bold fs-5">${window.Formatters.currency(wallet.balance.available)}</span>
                    </div>
                    <div class="col-6 text-end">
                        <small class="text-muted d-block">Saldo Bloqueado</small>
                        <span class="text-warning fw-bold fs-5">${window.Formatters.currency(wallet.balance.locked)}</span>
                    </div>
                </div>
                <div class="mt-4 pt-3 border-top border-secondary d-flex gap-2">
                    <button class="btn-oc btn-oc-primary btn-sm flex-grow-1" onclick="Wallets.handleQuickAdjust('${wallet.userId}')">
                        <i class="bi bi-pencil-square me-2"></i> Ajustar Saldo
                    </button>
                    <button class="btn-oc btn-oc-outline btn-sm" onclick="window.location.href='/users/${wallet.userId}'">
                        <i class="bi bi-person me-2"></i> Ver Perfil
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Dispara o modal de ajuste manual de saldo (Crédito/Débito)
     */
    async handleQuickAdjust(targetUserId = null) {
        const { value: formValues } = await Swal.fire({
            title: 'Ajuste Administrativo de Saldo',
            html: `
                <input id="swal-user-id" class="swal2-input" placeholder="UUID do Usuário" value="${targetUserId || ''}">
                <select id="swal-adj-type" class="swal2-select" style="display: flex; width: 100%; margin: 1em auto;">
                    <option value="CREDIT">Adicionar Crédito (+)</option>
                    <option value="DEBIT">Aplicar Débito (-)</option>
                </select>
                <input id="swal-adj-amount" type="number" class="swal2-input" placeholder="Valor em AKZ">
                <input id="swal-adj-desc" class="swal2-input" placeholder="Justificativa do ajuste">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Aplicar Agora',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            preConfirm: () => {
                const uId = document.getElementById('swal-user-id').value;
                const amt = document.getElementById('swal-adj-amount').value;
                const desc = document.getElementById('swal-adj-desc').value;

                if (!uId || !amt || !desc) {
                    Swal.showValidationMessage('Todos os campos são obrigatórios');
                    return false;
                }
                return {
                    userId: uId,
                    type: document.getElementById('swal-adj-type').value,
                    amount: amt,
                    description: desc
                }
            }
        });

        if (formValues) {
            try {
                // POST /api/v1/wallets/admin/adjust
                await window.API.post(`${this.endpoint}/admin/adjust`, formValues);
                window.showAlert('Sucesso', 'O ajuste financeiro foi aplicado e auditado.', 'success');
                this.loadGlobalFinancialStats();
                if (targetUserId) this.handleUserWalletSearch(); // Atualiza a busca se estiver aberta
            } catch (err) {
                console.error('[Wallets] Falha no ajuste manual');
            }
        }
    }

    updateKPIs(overview) {
        const circEl = document.getElementById('total-circulating-balance');
        if (circEl) circEl.innerText = window.Formatters.currency(overview.totalCirculatingKz);
        
        // Simulação de outros indicadores se não vierem no overview original
        const lockedEl = document.getElementById('total-locked-balance');
        if (lockedEl) lockedEl.innerText = window.Formatters.currency(overview.totalCirculatingKz * 0.15); // Mock de 15%
    }

    toggleLoading(show, elementId) {
        const el = document.getElementById(elementId);
        if (el) el.style.opacity = show ? '0.4' : '1';
    }
}

// Inicializa o módulo e expõe globalmente
window.Wallets = new WalletsModule();