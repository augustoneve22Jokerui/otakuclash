/**
 * OTAKU CLASH ANGOLA - USER DETAILS & ADMINISTRATION MODULE
 * Senior Frontend Engineer: 360-Degree User Management
 */

class UserDetailsModule {
    constructor() {
        this.userId = this._extractIdFromURL();
        this.endpoint = `/users/${this.userId}`;
        this.walletEndpoint = `/wallets/admin/user/${this.userId}`;
        this.historyEndpoint = `/transactions/me`; // No backend real, adaptado para ver via Admin
        
        this.userData = null;

        this.init();
    }

    async init() {
        if (!this.userId) {
            window.location.href = '/users';
            return;
        }

        console.log(`[UserDetails] Carregando perfil do usuário: ${this.userId}`);
        this.setupEventListeners();
        await this.loadAllUserData();
    }

    _extractIdFromURL() {
        const path = window.location.pathname;
        const parts = path.split('/');
        return parts[parts.length - 1];
    }

    setupEventListeners() {
        // Botão Editar Perfil (Redirecionamento)
        const btnEdit = document.getElementById('btn-edit-user');
        if (btnEdit) btnEdit.addEventListener('click', () => window.location.href = `/users/edit/${this.userId}`);

        // Botão Suspender/Ativar Conta
        const btnToggleStatus = document.getElementById('btn-toggle-status');
        if (btnToggleStatus) btnToggleStatus.addEventListener('click', () => this.handleToggleStatus());

        // Botão Alterar Role
        const btnChangeRole = document.getElementById('btn-change-role');
        if (btnChangeRole) btnChangeRole.addEventListener('click', () => this.handleChangeRole());

        // Botão Ajustar Saldo
        const btnAdjustBalance = document.getElementById('btn-adjust-balance');
        if (btnAdjustBalance) btnAdjustBalance.addEventListener('click', () => this.handleAdjustBalance());
    }

    /**
     * Carga massiva de dados em paralelo para otimização de tempo de carregamento
     */
    async loadAllUserData() {
        this.toggleLoading(true);
        try {
            const [userRes, walletRes, statsRes] = await Promise.all([
                window.API.get(this.endpoint),
                window.API.get(this.walletEndpoint),
                window.API.get(`${this.endpoint}/stats`) // Conforme ProfilesController.js
            ]);

            if (userRes.status === 'success') {
                this.userData = userRes.data;
                this.renderProfileHeader(this.userData);
                this.renderAccountInfo(this.userData.account);
                this.renderProfileDetails(this.userData.profile);
            }

            if (walletRes.status === 'success') {
                this.renderWalletInfo(walletRes.data);
            }

            if (statsRes.status === 'success') {
                this.renderGameplayStats(statsRes.data);
            }

            // Carrega histórico de transações recente deste usuário
            await this.loadUserTransactions();

        } catch (error) {
            console.error('[UserDetails] Erro ao carregar dados consolidados:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    renderProfileHeader(data) {
        document.getElementById('display-username').innerText = data.profile.username;
        document.getElementById('display-email').innerText = data.account.email;
        document.getElementById('display-avatar').src = data.profile.avatarUrl || '/assets/img/placeholders/avatar.png';
        
        const roleBadge = document.getElementById('display-role-badge');
        roleBadge.className = `oc-badge ${data.account.role === 'ADMIN' ? 'badge-danger' : 'badge-info'}`;
        roleBadge.innerText = data.account.role;

        const statusText = document.getElementById('display-status-text');
        const statusPulse = document.getElementById('display-status-pulse');
        const isOnline = data.profile.isOnline;
        
        statusPulse.className = isOnline ? 'status-pulse-green' : 'status-pulse-red';
        statusText.innerText = isOnline ? 'Online agora' : `Visto ${window.Formatters.timeAgo(data.profile.lastSeen)}`;
    }

    renderAccountInfo(account) {
        document.getElementById('acc-id').innerText = account.id;
        document.getElementById('acc-created').innerText = window.Formatters.date(account.createdAt, true);
        document.getElementById('acc-last-login').innerText = window.Formatters.date(account.lastLogin, true) || 'Nunca';
        document.getElementById('acc-confirmed').innerHTML = account.isConfirmed ? 
            '<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i> Confirmado</span>' : 
            '<span class="text-warning">Pendente</span>';
    }

    renderProfileDetails(profile) {
        document.getElementById('prof-fullname').innerText = profile.fullName || 'Não informado';
        document.getElementById('prof-level').innerText = profile.level;
        document.getElementById('prof-xp').innerText = `${window.Formatters.compactNumber(profile.xp)} XP`;
    }

    renderWalletInfo(wallet) {
        const available = parseFloat(wallet.balance.available);
        const locked = parseFloat(wallet.balance.locked);

        document.getElementById('wallet-available').innerText = window.Formatters.currency(available);
        document.getElementById('wallet-locked').innerText = window.Formatters.currency(locked);
        document.getElementById('wallet-total').innerText = window.Formatters.currency(available + locked);
    }

    renderGameplayStats(stats) {
        document.getElementById('stats-matches').innerText = stats.totalMatches;
        document.getElementById('stats-wins').innerText = stats.victories;
        document.getElementById('stats-winrate').innerText = `${stats.winRate}%`;
        document.getElementById('stats-guild').innerText = stats.guildName;
    }

    async loadUserTransactions() {
        try {
            // GET /api/v1/transactions/me?userId=... (Filtro simulado no admin)
            const response = await window.API.get('/transactions/admin/recent', { params: { userId: this.userId, limit: 5 } });
            const container = document.getElementById('user-recent-tx');
            
            if (response.data && response.data.length > 0) {
                container.innerHTML = response.data.map(tx => `
                    <div class="d-flex align-items-center mb-3 p-2 bg-dark rounded-sm border border-secondary">
                        <div class="me-3">${tx.direction === 'CREDIT' ? '<i class="bi bi-plus-circle text-success"></i>' : '<i class="bi bi-dash-circle text-danger"></i>'}</div>
                        <div class="flex-grow-1">
                            <div class="small fw-bold">${tx.type}</div>
                            <div class="text-dim" style="font-size: 10px;">${window.Formatters.date(tx.created_at)}</div>
                        </div>
                        <div class="fw-bold ${tx.direction === 'CREDIT' ? 'text-success' : 'text-danger'}">
                            ${tx.direction === 'CREDIT' ? '+' : '-'} ${window.Formatters.currency(tx.amount)}
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="text-muted small text-center py-3">Sem transações recentes.</p>';
            }
        } catch (err) {
            console.warn('[UserDetails] Erro ao carregar transações');
        }
    }

    /**
     * Ações Administrativas
     */
    async handleToggleStatus() {
        const currentStatus = this.userData.account.suspended ? 'Suspenso' : 'Ativo';
        const action = this.userData.account.suspended ? 'Ativar' : 'Suspender';

        const { value: reason } = await Swal.fire({
            title: `${action} Conta?`,
            text: `O usuário está atualmente ${currentStatus}.`,
            input: 'text',
            inputLabel: 'Motivo da ação',
            inputPlaceholder: 'Ex: Violação dos termos...',
            showCancelButton: true,
            confirmButtonColor: action === 'Ativar' ? 'var(--success)' : 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (reason) {
            try {
                await window.API.patch(`/users/${this.userId}/status`, {
                    suspended: action === 'Suspender',
                    reason: reason
                });
                window.showAlert('Sucesso', `Status do usuário atualizado para ${action}o.`, 'success');
                this.loadAllUserData();
            } catch (err) { console.error(err); }
        }
    }

    async handleChangeRole() {
        const { value: role } = await Swal.fire({
            title: 'Alterar Nível de Acesso',
            input: 'select',
            inputOptions: {
                'USER': 'Usuário Comum',
                'MODERATOR': 'Moderador',
                'ADMIN': 'Administrador'
            },
            inputValue: this.userData.account.role,
            showCancelButton: true,
            confirmButtonColor: 'var(--secondary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (role) {
            try {
                await window.API.patch(`/admin/users/${this.userId}/role`, { role });
                window.showAlert('Sucesso', `O usuário agora é um ${role}.`, 'success');
                this.loadAllUserData();
            } catch (err) { console.error(err); }
        }
    }

    async handleAdjustBalance() {
        const { value: formValues } = await Swal.fire({
            title: 'Ajuste Manual de Saldo',
            html: `
                <select id="adj-type" class="swal2-select mb-3" style="display: flex; width: 100%;">
                    <option value="CREDIT">Adicionar Saldo (Crédito)</option>
                    <option value="DEBIT">Remover Saldo (Débito)</option>
                </select>
                <input id="adj-amount" class="swal2-input" placeholder="Valor em AKZ">
                <input id="adj-desc" class="swal2-input" placeholder="Justificativa do ajuste">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Aplicar Ajuste',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            preConfirm: () => {
                return {
                    type: document.getElementById('adj-type').value,
                    amount: document.getElementById('adj-amount').value,
                    description: document.getElementById('adj-desc').value
                }
            }
        });

        if (formValues) {
            try {
                await window.API.post('/wallets/admin/adjust', {
                    userId: this.userId,
                    ...formValues
                });
                window.showAlert('Sucesso', 'Saldo ajustado e transação registrada.', 'success');
                this.loadAllUserData();
            } catch (err) { console.error(err); }
        }
    }

    toggleLoading(show) {
        const loader = document.getElementById('details-loader');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        const content = document.getElementById('user-details-content');
        if (content) content.style.opacity = show ? '0.3' : '1';
    }
}

// Inicializa o módulo
window.UserDetails = new UserDetailsModule();