/**
 * OTAKU CLASH ANGOLA - ADMIN TEAM MANAGEMENT MODULE
 * Senior Software Architect: Internal Security & RBAC UI
 */

class AdminUsersModule {
    constructor() {
        this.endpoints = {
            list: '/users', // Endpoint de usuários com filtro de role
            updateRole: '/admin/users' // Endpoint de alteração de permissão
        };
        this.adminTable = null;
        this.staffList = [];
        
        this.init();
    }

    async init() {
        console.log('[AdminUsers] Inicializando gestão de staff...');
        this.setupEventListeners();
        await this.loadStaff();
    }

    setupEventListeners() {
        // Botão para promover novo usuário
        const btnPromote = document.getElementById('btn-promote-user');
        if (btnPromote) {
            btnPromote.addEventListener('click', () => this.openPromotionModal());
        }

        // Formulário de Alteração de Role
        const roleForm = document.getElementById('role-change-form');
        if (roleForm) {
            roleForm.addEventListener('submit', (e) => this.handleRoleUpdate(e));
        }

        // Filtro de Nível de Acesso
        const roleFilter = document.getElementById('staff-role-filter');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => this.filterStaff(e.target.value));
        }
    }

    /**
     * Carrega usuários que possuem cargos administrativos (ADMIN ou MODERATOR)
     */
    async loadStaff() {
        this.toggleLoader(true);
        try {
            // Buscamos usuários filtrando por roles administrativas no backend real
            const [admins, moderators] = await Promise.all([
                window.API.get(`${this.endpoints.list}?role=ADMIN&limit=50`),
                window.API.get(`${this.endpoints.list}?role=MODERATOR&limit=50`)
            ]);

            this.staffList = [...(admins.data || []), ...(moderators.data || [])];
            this.renderStaffTable(this.staffList);
            this.updateStaffCounters();
        } catch (error) {
            console.error('[AdminUsers] Erro ao carrergar staff:', error);
        } finally {
            this.toggleLoader(false);
        }
    }

    /**
     * Renderiza a tabela de membros da equipe
     */
    renderStaffTable(data) {
        if (this.adminTable) {
            this.adminTable.destroy();
        }

        const container = document.querySelector('#staff-table tbody');
        if (!container) return;

        container.innerHTML = data.map(user => {
            const roleClass = user.role === 'ADMIN' ? 'badge-danger' : 'badge-info';
            const statusClass = user.is_online ? 'status-pulse-green' : 'status-pulse-red';
            
            return `
                <tr class="animate-up">
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="position-relative">
                                <img src="${user.avatar_url || '/assets/img/placeholders/avatar.png'}" 
                                     class="oc-avatar rounded-circle me-3" alt="Admin">
                                <span class="${statusClass} position-absolute bottom-0 end-0" style="margin-right: 12px;"></span>
                            </div>
                            <div>
                                <div class="fw-bold">${user.username} ${user.role === 'ADMIN' ? '<i class="bi bi-patch-check-fill text-primary" title="Verificado"></i>' : ''}</div>
                                <small class="text-muted">${user.email || 'E-mail privado'}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="oc-badge ${roleClass}">${user.role}</span>
                    </td>
                    <td>
                        <div class="small text-muted">Último Acesso</div>
                        <div>${window.Formatters.timeAgo(user.last_seen || user.last_sign_in_at)}</div>
                    </td>
                    <td>
                        <div class="small text-muted">Membro desde</div>
                        <div>${window.Formatters.date(user.created_at)}</div>
                    </td>
                    <td class="text-end">
                        <div class="dropdown">
                            <button class="btn-oc btn-oc-outline btn-sm" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li>
                                    <a class="dropdown-item" href="javascript:void(0)" onclick="AdminUsers.prepareRoleChange('${user.id}', '${user.username}', '${user.role}')">
                                        <i class="bi bi-shield-lock me-2"></i> Alterar Permissões
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item" href="/users/${user.id}">
                                        <i class="bi bi-person-lines-fill me-2"></i> Ver Perfil Completo
                                    </a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                    <a class="dropdown-item text-danger" href="javascript:void(0)" onclick="AdminUsers.revokeAccess('${user.id}', '${user.username}')">
                                        <i class="bi bi-person-x me-2"></i> Revogar Acesso Staff
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.adminTable = $('#staff-table').DataTable({
            pageLength: 10,
            searching: true,
            info: true,
            lengthChange: false,
            dom: '<"top"f>rt<"bottom"lp><"clear">',
            language: {
                search: "",
                searchPlaceholder: "Buscar na equipe...",
                paginate: {
                    next: '<i class="bi bi-chevron-right"></i>',
                    previous: '<i class="bi bi-chevron-left"></i>'
                }
            }
        });
    }

    /**
     * Prepara o modal para alteração de Role
     */
    prepareRoleChange(userId, username, currentRole) {
        document.getElementById('edit-user-id').value = userId;
        document.getElementById('edit-username-display').innerText = username;
        document.getElementById('new-role-select').value = currentRole;
        
        const modal = new bootstrap.Modal(document.getElementById('role-modal'));
        modal.show();
    }

    /**
     * Processa a atualização de Role no backend real
     */
    async handleRoleUpdate(e) {
        e.preventDefault();
        const userId = document.getElementById('edit-user-id').value;
        const newRole = document.getElementById('new-role-select').value;
        
        this.toggleButtonLoading('btn-save-role', true);

        try {
            // Chamada ao endpoint administrativo: PATCH /api/v1/admin/users/:userId/role
            const response = await window.API.patch(`${this.endpoints.updateRole}/${userId}/role`, {
                role: newRole
            });

            if (response.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('role-modal')).hide();
                window.showAlert('Sucesso', `Permissões de ${response.data.username} atualizadas para ${newRole}`, 'success');
                await this.loadStaff();
            }
        } catch (error) {
            console.error('[AdminUsers] Falha ao atualizar role:', error);
        } finally {
            this.toggleButtonLoading('btn-save-role', false);
        }
    }

    /**
     * Revoga acesso administrativo (Rebaixa para USER)
     */
    async revokeAccess(userId, username) {
        const confirm = await Swal.fire({
            title: 'Revogar Acesso?',
            text: `O usuário ${username} perderá todas as permissões administrativas imediatamente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, revogar staff',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (confirm.isConfirmed) {
            try {
                await window.API.patch(`${this.endpoints.updateRole}/${userId}/role`, { role: 'USER' });
                window.showAlert('Acesso Revogado', `${username} agora é um usuário comum.`, 'info');
                await this.loadStaff();
            } catch (error) {
                console.error('[AdminUsers] Erro ao revogar acesso:', error);
            }
        }
    }

    /**
     * Filtro local na lista carregada
     */
    filterStaff(role) {
        if (!role) {
            this.renderStaffTable(this.staffList);
        } else {
            const filtered = this.staffList.filter(u => u.role === role);
            this.renderStaffTable(filtered);
        }
    }

    /**
     * Atualiza contadores visuais do dashboard de staff
     */
    updateStaffCounters() {
        const adminCount = this.staffList.filter(u => u.role === 'ADMIN').length;
        const modCount = this.staffList.filter(u => u.role === 'MODERATOR').length;
        const onlineCount = this.staffList.filter(u => u.is_online).length;

        if (document.getElementById('count-admins')) document.getElementById('admin-count').innerText = adminCount;
        if (document.getElementById('count-mods')) document.getElementById('mod-count').innerText = modCount;
        if (document.getElementById('count-online-staff')) document.getElementById('online-staff-count').innerText = onlineCount;
    }

    toggleLoader(show) {
        const loader = document.getElementById('staff-loader');
        if (loader) loader.style.display = show ? 'flex' : 'none';
    }

    toggleButtonLoading(btnId, loading) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (loading) {
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Processando...`;
        } else {
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-check-lg me-2"></i> Salvar Alterações`;
        }
    }
}

// Inicialização Global
window.AdminUsers = new AdminUsersModule();