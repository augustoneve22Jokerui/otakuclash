/**
 * OTAKU CLASH ANGOLA - NOTIFICATIONS MANAGEMENT MODULE
 * Senior Frontend Engineer: Real-time Communication & Alerts
 */

class NotificationsModule {
    constructor() {
        this.endpoint = '/notifications';
        this.table = null;
        this.currentPage = 1;
        this.limit = 15;
        this.history = [];

        this.init();
    }

    async init() {
        console.log('[Notifications] Inicializando central de alertas...');
        this.setupEventListeners();
        this.setupSocketListeners();
        await this.loadNotifications();
        await this.updateUnreadCount();
    }

    setupEventListeners() {
        // Botão Nova Notificação (Modal)
        const btnNew = document.getElementById('btn-new-notification');
        if (btnNew) {
            btnNew.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('notification-modal'));
                modal.show();
            });
        }

        // Formulário de Disparo de Notificação
        const form = document.getElementById('notification-send-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSend(e));
        }

        // Marcar todas como lidas
        const btnMarkAll = document.getElementById('btn-mark-all-read');
        if (btnMarkAll) {
            btnMarkAll.addEventListener('click', () => this.handleMarkAllRead());
        }

        // Filtro de Tipo
        const typeFilter = document.getElementById('filter-notify-type');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.currentPage = 1;
                this.loadNotifications();
            });
        }
    }

    /**
     * Listener para atualizações em tempo real
     */
    setupSocketListeners() {
        window.Socket.on('notification:received', (data) => {
            console.log('[Notifications-Socket] Alerta recebido:', data);
            this.loadNotifications();
            this.updateUnreadCount();
        });
    }

    /**
     * Carrega histórico do backend real
     */
    async loadNotifications() {
        this.toggleLoading(true);
        
        const params = {
            page: this.currentPage,
            limit: this.limit,
            unreadOnly: document.getElementById('filter-unread-only')?.checked || false,
            type: document.getElementById('filter-notify-type')?.value || undefined
        };

        try {
            const response = await window.API.get(this.endpoint, { params });
            
            if (response.status === 'success') {
                this.history = response.data;
                this.renderTable(this.history);
                this.renderPagination(response.pagination);
            }
        } catch (error) {
            console.error('[Notifications] Erro ao carrergar alertas:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza a tabela de notificações (Identidade Visual Premium)
     */
    renderTable(data) {
        const container = document.querySelector('#notifications-table tbody');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-dim">Nenhuma notificação encontrada no histórico.</td></tr>`;
            return;
        }

        container.innerHTML = data.map(item => `
            <tr class="animate-up ${item.isRead ? 'opacity-75' : 'fw-bold border-start border-primary border-4'}">
                <td style="width: 50px;" class="text-center">
                    ${this._getTypeIcon(item.type)}
                </td>
                <td>
                    <div class="text-main">${item.title}</div>
                    <small class="text-muted d-block">${window.Formatters.truncate(item.message, 60)}</small>
                </td>
                <td>
                    <span class="oc-badge badge-soft-primary">${item.type}</span>
                </td>
                <td>
                    <div class="small text-dim">${window.Formatters.date(item.createdAt, true)}</div>
                    <div class="text-dim" style="font-size: 10px;">${window.Formatters.timeAgo(item.createdAt)}</div>
                </td>
                <td class="text-end">
                    <button class="btn-oc btn-oc-outline btn-sm me-1" onclick="Notifications.markAsRead('${item.id}')" ${item.isRead ? 'disabled' : ''} title="Marcar como lida">
                        <i class="bi bi-check2-all"></i>
                    </button>
                    <button class="btn-oc btn-oc-outline btn-sm text-danger" onclick="Notifications.delete('${item.id}')" title="Remover">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Dispara nova notificação via API
     */
    async handleSend(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Se userId estiver vazio, o backend trata como Broadcast (Sistema)
        if (!data.userId) delete data.userId;

        this.toggleBtnLoading('btn-send-notification', true);

        try {
            const response = await window.API.post(this.endpoint, data);
            
            if (response.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('notification-modal')).hide();
                window.showAlert('Sucesso', 'A notificação foi enviada com sucesso em tempo real.', 'success');
                e.target.reset();
                this.loadNotifications();
            }
        } catch (error) {
            console.error('[Notifications] Erro ao disparar:', error);
        } finally {
            this.toggleBtnLoading('btn-send-notification', false);
        }
    }

    async markAsRead(id) {
        try {
            await window.API.patch(`${this.endpoint}/${id}/read`);
            this.loadNotifications();
            this.updateUnreadCount();
        } catch (error) {
            console.error('[Notifications] Erro ao marcar como lida');
        }
    }

    async handleMarkAllRead() {
        try {
            await window.API.post(`${this.endpoint}/read-all`);
            window.showAlert('Concluído', 'Todas as notificações foram marcadas como lidas.', 'success');
            this.loadNotifications();
            this.updateUnreadCount();
        } catch (error) {
            console.error('[Notifications] Erro ao limpar pendências');
        }
    }

    async delete(id) {
        const confirm = await Swal.fire({
            title: 'Remover Alerta?',
            text: "Esta ação apagará o registro de notificação permanentemente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (confirm.isConfirmed) {
            try {
                await window.API.delete(`${this.endpoint}/${id}`);
                this.loadNotifications();
                this.updateUnreadCount();
            } catch (error) {
                console.error('[Notifications] Erro ao excluir');
            }
        }
    }

    /**
     * Atualiza o contador global na Navbar
     */
    async updateUnreadCount() {
        try {
            const response = await window.API.get(`${this.endpoint}/unread-count`);
            const count = response.count || 0;
            
            const badges = document.querySelectorAll('.notification-badge');
            badges.forEach(b => {
                b.innerText = count;
                b.style.display = count > 0 ? 'flex' : 'none';
            });
        } catch (err) {
            console.warn('[Notifications] Falha ao atualizar contador');
        }
    }

    renderPagination(meta) {
        const container = document.getElementById('notify-pagination');
        if (!container) return;

        let html = `
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === 1 ? 'disabled' : ''} onclick="Notifications.changePage(${meta.page - 1})">
                <i class="bi bi-chevron-left"></i>
            </button>
            <span class="text-dim small mx-3">Página ${meta.page} de ${meta.totalPages}</span>
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === meta.totalPages ? 'disabled' : ''} onclick="Notifications.changePage(${meta.page + 1})">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;
        container.innerHTML = html;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadNotifications();
    }

    _getTypeIcon(type) {
        const icons = {
            'SYSTEM': '<i class="bi bi-cpu text-info"></i>',
            'WALLET_UPDATE': '<i class="bi bi-wallet2 text-success"></i>',
            'MATCH_INVITE': '<i class="bi bi-controller text-primary"></i>',
            'ACHIEVEMENT': '<i class="bi bi-trophy text-warning"></i>',
            'GUILD_ALERT': '<i class="bi bi-shield-shaded text-secondary"></i>'
        };
        return icons[type] || '<i class="bi bi-bell text-muted"></i>';
    }

    toggleLoading(show) {
        const loader = document.getElementById('notify-loader');
        const table = document.getElementById('notifications-table');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        if (table) table.style.opacity = show ? '0.4' : '1';
    }

    toggleBtnLoading(btnId, loading) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = loading;
        btn.innerHTML = loading ? `<span class="spinner-border spinner-border-sm me-2"></span> Disparando...` : `<i class="bi bi-send me-2"></i> Enviar Notificação`;
    }
}

// Inicializa o módulo
window.Notifications = new NotificationsModule();