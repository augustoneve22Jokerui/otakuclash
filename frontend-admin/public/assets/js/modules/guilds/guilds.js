/**
 * OTAKU CLASH ANGOLA - GUILDS MANAGEMENT MODULE
 * Senior Frontend Engineer: Social & Community Layer
 */

class GuildsModule {
    constructor() {
        this.endpoint = '/guilds';
        this.table = null;
        this.allGuilds = [];
        this.currentPage = 1;
        this.limit = 10;

        this.init();
    }

    async init() {
        console.log('[Guilds] Inicializando módulo social...');
        this.setupEventListeners();
        await this.loadGuilds();
    }

    setupEventListeners() {
        // Busca com Debounce
        const searchInput = document.getElementById('guild-search');
        if (searchInput) {
            let timeout = null;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.loadGuilds(e.target.value);
                }, 500);
            });
        }

        // Filtro de Nível ou Ordem
        const filterOrder = document.getElementById('filter-guild-order');
        if (filterOrder) {
            filterOrder.addEventListener('change', () => this.loadGuilds());
        }

        // Refresh Manual
        const btnRefresh = document.getElementById('btn-refresh-guilds');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadGuilds());
        }
    }

    /**
     * Busca guildas do backend real
     */
    async loadGuilds(search = '') {
        this.toggleLoading(true);

        const params = {
            page: this.currentPage,
            limit: this.limit,
            search: search || document.getElementById('guild-search')?.value,
            orderBy: document.getElementById('filter-guild-order')?.value || 'level',
            order: 'DESC'
        };

        try {
            const response = await window.API.get(this.endpoint, { params });
            
            if (response.status === 'success') {
                this.allGuilds = response.data;
                this.renderTable(this.allGuilds);
                this.renderPagination(response.pagination);
                this.updateUIStats(response.pagination.total);
            }
        } catch (error) {
            console.error('[Guilds] Erro ao carregar dados:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza a lista de guildas com visual Premium
     */
    renderTable(data) {
        const container = document.querySelector('#guilds-table tbody');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = `<tr><td colspan="6" class="text-center py-5">Nenhuma guilda localizada.</td></tr>`;
            return;
        }

        container.innerHTML = data.map(guild => `
            <tr class="animate-up">
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${guild.logoUrl || '/assets/img/placeholders/guild.png'}" 
                             class="rounded-md me-3" style="width: 45px; height: 45px; object-fit: cover; border: 2px solid var(--border-color);" alt="Logo">
                        <div>
                            <div class="fw-bold text-main">${guild.name}</div>
                            <span class="oc-badge badge-soft-primary" style="font-size: 10px;">[${guild.tag}]</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="me-2 text-warning fw-bold">LVL ${guild.level}</div>
                        <div class="progress w-100" style="height: 4px; background: var(--bg-main);">
                            <div class="progress-bar bg-warning" role="progressbar" style="width: 45%;"></div>
                        </div>
                    </div>
                    <small class="text-dim" style="font-size: 10px;">XP: ${window.Formatters.compactNumber(guild.xp)}</small>
                </td>
                <td>
                    <div class="text-main fw-500">
                        <i class="bi bi-people me-1"></i> ${guild.memberCount}/${guild.maxMembers}
                    </div>
                </td>
                <td>
                    <div class="small text-muted">Criado em</div>
                    <div class="text-dim small">${window.Formatters.date(guild.createdAt)}</div>
                </td>
                <td>
                    <button class="btn-oc btn-oc-outline btn-sm" onclick="Guilds.viewDetails('${guild.id}')">
                        <i class="bi bi-eye me-1"></i> Detalhes
                    </button>
                </td>
                <td class="text-end">
                    <div class="dropdown">
                        <button class="btn-oc btn-oc-outline btn-sm" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="javascript:void(0)" onclick="Guilds.manageMembers('${guild.id}')"><i class="bi bi-person-gear me-2"></i> Gerir Membros</a></li>
                            <li><a class="dropdown-item" href="javascript:void(0)" onclick="Guilds.editInfo('${guild.id}')"><i class="bi bi-pencil me-2"></i> Editar Info</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="Guilds.disband('${guild.id}', '${guild.name}')"><i class="bi bi-trash me-2"></i> Dissolver Guilda</a></li>
                        </ul>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Abre painel de detalhes da guilda
     */
    async viewDetails(id) {
        try {
            const response = await window.API.get(`${this.endpoint}/${id}`);
            if (response.status === 'success') {
                const guild = response.data;
                
                Swal.fire({
                    title: `<img src="${guild.logoUrl || '/assets/img/placeholders/guild.png'}" width="40" class="rounded-circle me-2"> ${guild.name}`,
                    html: `
                        <div class="text-start mt-3">
                            <p class="text-muted small">${guild.description || 'Sem descrição.'}</p>
                            <hr class="border-secondary">
                            <div class="row g-3">
                                <div class="col-6">
                                    <small class="text-dim d-block">Líder</small>
                                    <span class="text-main fw-bold">${guild.leader.username}</span>
                                </div>
                                <div class="col-6 text-end">
                                    <small class="text-dim d-block">TAG</small>
                                    <span class="oc-badge badge-info">${guild.tag}</span>
                                </div>
                                <div class="col-12">
                                    <small class="text-dim mb-2 d-block">Distribuição de Membros</small>
                                    <div class="d-flex gap-1">
                                        ${guild.members.slice(0, 8).map(m => `<img src="${m.avatarUrl || '/assets/img/placeholders/avatar.png'}" class="oc-avatar-sm rounded-circle border border-dark" title="${m.username}">`).join('')}
                                        ${guild.members.length > 8 ? `<div class="oc-avatar-sm rounded-circle bg-dark text-dim d-flex align-items-center justify-content-center" style="font-size: 10px;">+${guild.members.length - 8}</div>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    confirmButtonColor: 'var(--secondary-color)',
                    confirmButtonText: 'Fechar Painel'
                });
            }
        } catch (error) {
            console.error('[Guilds] Erro ao carregar detalhes:', error);
        }
    }

    /**
     * Dissolve a guilda permanentemente
     */
    async disband(id, name) {
        const confirm = await Swal.fire({
            title: 'Dissolver Guilda?',
            text: `A guilda "${name}" e todo o seu progresso serão apagados para sempre.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-color)',
            confirmButtonText: 'Sim, dissolver',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (confirm.isConfirmed) {
            try {
                await window.API.delete(`${this.endpoint}/${id}`);
                window.showAlert('Sucesso', 'A guilda foi dissolvida.', 'success');
                this.loadGuilds();
            } catch (error) {
                console.error('[Guilds] Erro ao dissolver:', error);
            }
        }
    }

    /**
     * Paginação Dinâmica
     */
    renderPagination(meta) {
        const container = document.getElementById('guilds-pagination');
        if (!container) return;

        let html = `
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === 1 ? 'disabled' : ''} onclick="Guilds.changePage(${meta.page - 1})">
                <i class="bi bi-chevron-left"></i>
            </button>
            <span class="text-dim small mx-3">Página ${meta.page} / ${meta.totalPages}</span>
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === meta.totalPages ? 'disabled' : ''} onclick="Guilds.changePage(${meta.page + 1})">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;
        container.innerHTML = html;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadGuilds();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateUIStats(total) {
        const el = document.getElementById('total-guilds-stat');
        if (el) el.innerText = total;
    }

    toggleLoading(show) {
        const loader = document.getElementById('guilds-loader');
        const table = document.getElementById('guilds-table');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        if (table) table.style.opacity = show ? '0.4' : '1';
    }
}

// Inicializa o módulo
window.Guilds = new GuildsModule();