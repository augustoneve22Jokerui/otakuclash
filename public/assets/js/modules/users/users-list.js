/**
 * OTAKU CLASH ANGOLA - USERS LIST MODULE
 * Senior Frontend Engineer: User Directory & Access Control UI
 */

class UsersListModule {
    constructor() {
        this.endpoint = '/users';
        this.table = null;
        this.currentPage = 1;
        this.limit = 10;
        this.allUsers = [];
        this.filters = {
            search: '',
            role: '',
            status: ''
        };

        this.init();
    }

    async init() {
        console.log('[UsersList] Inicializando diretório de usuários...');
        this.setupEventListeners();
        await this.loadUsers();
    }

    setupEventListeners() {
        // Busca com Debounce (Mínimo 3 caracteres para otimização de rede)
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            let timeout = null;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                const value = e.target.value;
                timeout = setTimeout(() => {
                    this.filters.search = value;
                    this.currentPage = 1;
                    this.loadUsers();
                }, 500);
            });
        }

        // Filtros Rápidos (Role, Status)
        ['filter-user-role', 'filter-user-status'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', (e) => {
                    const key = id.replace('filter-user-', '');
                    this.filters[key] = e.target.value;
                    this.currentPage = 1;
                    this.loadUsers();
                });
            }
        });

        // Botão Adicionar Novo Usuário
        const btnNewUser = document.getElementById('btn-new-user');
        if (btnNewUser) {
            btnNewUser.addEventListener('click', () => {
                window.location.href = '/users/new';
            });
        }

        // Botão Exportar Usuários
        const btnExport = document.getElementById('btn-export-users');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.handleExport());
        }

        // Refresh Manual
        const btnRefresh = document.getElementById('btn-refresh-users');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadUsers());
        }
    }

    /**
     * Consome a API Real de usuários com paginação e filtros
     */
    async loadUsers() {
        this.toggleLoading(true);

        const params = {
            page: this.currentPage,
            limit: this.limit,
            search: this.filters.search || undefined,
            role: this.filters.role || undefined,
            status: this.filters.status || undefined
        };

        try {
            const response = await window.API.get(this.endpoint, { params });
            
            if (response.status === 'success') {
                this.allUsers = response.data;
                this.renderTable(this.allUsers);
                this.renderPagination(response.pagination);
                this.updateCounters(response.pagination.total);
            }
        } catch (error) {
            console.error('[UsersList] Erro ao carregar lista de usuários:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza a tabela de usuários com suporte a avatares e badges dinâmicos
     */
    renderTable(data) {
        const container = document.querySelector('#users-table tbody');
        if (!container) return;

        if (this.table) this.table.destroy();

        if (data.length === 0) {
            container.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-dim">Nenhum usuário localizado no banco de dados.</td></tr>`;
            return;
        }

        container.innerHTML = data.map(user => {
            const roleBadge = this._getRoleBadge(user.role);
            const statusBadge = this._getStatusBadge(user.status || (user.isConfirmed ? 'Ativo' : 'Pendente'));
            const onlineClass = user.isOnline ? 'status-pulse-green' : 'status-pulse-red';

            return `
                <tr class="animate-up">
                    <td class="ps-4">
                        <div class="form-check">
                            <input class="form-check-input user-select-checkbox" type="checkbox" value="${user.id}">
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="position-relative">
                                <img src="${user.avatarUrl || '/assets/img/placeholders/avatar.png'}" 
                                     class="oc-avatar rounded-circle me-3" alt="Avatar">
                                <span class="${onlineClass} position-absolute bottom-0 end-0" style="margin-right: 12px;"></span>
                            </div>
                            <div>
                                <div class="fw-bold text-main">${user.username}</div>
                                <small class="text-muted d-block">ID: ${user.id.substring(0, 8)}</small>
                            </div>
                        </div>
                    </td>
                    <td>${roleBadge}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="text-dim small">Último Acesso</div>
                        <div class="small">${window.Formatters.timeAgo(user.lastLogin || user.createdAt)}</div>
                    </td>
                    <td>
                        <div class="text-dim small">Registro</div>
                        <div class="small">${window.Formatters.date(user.createdAt)}</div>
                    </td>
                    <td class="text-end pe-4">
                        <div class="dropdown">
                            <button class="btn-oc btn-oc-outline btn-sm" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow-lg border-secondary">
                                <li><a class="dropdown-item" href="/users/${user.id}"><i class="bi bi-eye me-2"></i> Detalhes</a></li>
                                <li><a class="dropdown-item" href="/users/edit/${user.id}"><i class="bi bi-pencil me-2"></i> Editar</a></li>
                                <li><hr class="dropdown-divider border-secondary"></li>
                                <li>
                                    <a class="dropdown-item ${user.status === 'Banned' ? 'text-success' : 'text-danger'}" 
                                       href="javascript:void(0)" onclick="UsersList.toggleUserStatus('${user.id}', '${user.status}')">
                                        <i class="bi ${user.status === 'Banned' ? 'bi-check-circle' : 'bi-slash-circle'} me-2"></i> 
                                        ${user.status === 'Banned' ? 'Ativar Conta' : 'Suspender Conta'}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.table = $('#users-table').DataTable({
            paging: false,
            searching: false,
            info: false,
            ordering: true,
            columnDefs: [{ targets: [0, 6], orderable: false }]
        });
    }

    /**
     * Alterna o status da conta (Suspender/Ativar) via Backend
     */
    async toggleUserStatus(userId, currentStatus) {
        const isBanned = currentStatus === 'Banned';
        const action = isBanned ? 'reativar' : 'suspender';

        const confirm = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} conta?`,
            text: `Deseja realmente ${action} o acesso deste usuário à plataforma?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: isBanned ? 'var(--success)' : 'var(--primary-color)',
            confirmButtonText: `Sim, ${action}`,
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (confirm.isConfirmed) {
            try {
                // PATCH /api/v1/users/:id/status
                const response = await window.API.patch(`${this.endpoint}/${userId}/status`, {
                    suspended: !isBanned,
                    reason: isBanned ? 'Reativação administrativa' : 'Violação dos termos de uso'
                });

                if (response.status === 'success') {
                    window.showAlert('Sucesso', `Usuário ${isBanned ? 'ativado' : 'suspenso'} com sucesso.`, 'success');
                    this.loadUsers();
                }
            } catch (err) {
                console.error('[UsersList] Falha ao alterar status:', err);
            }
        }
    }

    /**
     * Lógica de Paginação Dinâmica
     */
    renderPagination(meta) {
        const container = document.getElementById('users-pagination');
        if (!container) return;

        let html = `
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === 1 ? 'disabled' : ''} onclick="UsersList.changePage(${meta.page - 1})">
                <i class="bi bi-chevron-left"></i>
            </button>
            <span class="text-dim small mx-3">Página ${meta.page} de ${meta.totalPages}</span>
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === meta.totalPages ? 'disabled' : ''} onclick="UsersList.changePage(${meta.page + 1})">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;
        container.innerHTML = html;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadUsers();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    handleExport() {
        const exportData = this.allUsers.map(u => ({
            ID: u.id,
            Username: u.username,
            Email: u.email,
            Role: u.role,
            Status: u.status,
            Data_Registro: window.Formatters.date(u.createdAt)
        }));
        window.Exporters.exportToCSV(exportData, 'users_directory_oc');
    }

    updateCounters(total) {
        const el = document.getElementById('total-users-stat');
        if (el) el.innerText = total.toLocaleString('pt-AO');
    }

    _getRoleBadge(role) {
        const map = {
            'ADMIN': 'badge-danger',
            'MODERATOR': 'badge-info',
            'USER': 'badge-soft-primary'
        };
        return `<span class="oc-badge ${map[role] || 'badge-soft-primary'}">${role}</span>`;
    }

    _getStatusBadge(status) {
        const map = {
            'Ativo': 'badge-success',
            'Ativa': 'badge-success',
            'Pendente': 'badge-warning',
            'Banned': 'badge-danger',
            'Suspenso': 'badge-danger'
        };
        return `<span class="oc-badge ${map[status] || 'badge-info'}">${status}</span>`;
    }

    toggleLoading(show) {
        const loader = document.getElementById('users-loader');
        const table = document.getElementById('users-table');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        if (table) table.style.opacity = show ? '0.3' : '1';
    }
}

// Inicializa o módulo e expõe globalmente
window.UsersList = new UsersListModule();