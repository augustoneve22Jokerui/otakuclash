/**
 * OTAKU CLASH ANGOLA - TOURNAMENTS MANAGEMENT MODULE
 * Senior Frontend Engineer: Competitive Events & Prize Pool Orchestration
 */

class TournamentsManageModule {
    constructor() {
        this.endpoint = '/tournaments';
        this.animesEndpoint = '/animes';
        this.currentTournaments = [];
        this.tableParticipants = null;
        this.currentPage = 1;
        this.limit = 9; // Grid 3x3

        this.init();
    }

    async init() {
        console.log('[Tournaments] Inicializando gestão de competições...');
        this.setupEventListeners();
        await this.loadAnimesList();
        await this.loadTournaments();
    }

    setupEventListeners() {
        // Botão Novo Torneio (Abre Modal)
        const btnCreate = document.getElementById('btn-create-tournament');
        if (btnCreate) {
            btnCreate.addEventListener('click', () => this.openFormModal());
        }

        // Formulário de Criação/Edição
        const form = document.getElementById('tournament-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSave(e));
        }

        // Filtros
        ['filter-tournament-status', 'filter-tournament-anime'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => {
                this.currentPage = 1;
                this.loadTournaments();
            });
        });

        // Refresh Manual
        const btnRefresh = document.getElementById('btn-refresh-tournaments');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadTournaments());
        }
    }

    /**
     * Carrega lista de animes para o formulário
     */
    async loadAnimesList() {
        try {
            const response = await window.API.get(this.animesEndpoint, { params: { limit: 1000 } });
            const selectFilter = document.getElementById('filter-tournament-anime');
            const selectForm = document.getElementById('anime_id');
            
            if (response.data) {
                const options = response.data.map(a => `<option value="${a.id}">${a.title}</option>`).join('');
                if (selectFilter) selectFilter.innerHTML += options;
                if (selectForm) selectForm.innerHTML += options;
            }
        } catch (error) {
            console.error('[Tournaments] Erro ao carregar animes');
        }
    }

    /**
     * Busca torneios do backend real
     */
    async loadTournaments() {
        this.toggleLoading(true);
        const params = {
            page: this.currentPage,
            limit: this.limit,
            status: document.getElementById('filter-tournament-status')?.value || undefined,
            animeId: document.getElementById('filter-tournament-anime')?.value || undefined
        };

        try {
            const response = await window.API.get(this.endpoint, { params });
            if (response.status === 'success') {
                this.currentTournaments = response.data;
                this.renderTournamentsGrid(this.currentTournaments);
                this.renderPagination(response.pagination);
            }
        } catch (error) {
            console.error('[Tournaments] Erro ao carregar lista:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza o grid de torneios (Design Premium)
     */
    renderTournamentsGrid(data) {
        const container = document.getElementById('tournaments-grid');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-trophy text-dim display-1 mb-3"></i>
                    <p class="text-muted">Nenhum torneio agendado ou ativo.</p>
                </div>`;
            return;
        }

        container.innerHTML = data.map(tournament => `
            <div class="col-xl-4 col-md-6 mb-4">
                <div class="oc-card hover-lift animate-up h-100 d-flex flex-column">
                    <div class="position-relative">
                        <img src="${tournament.bannerUrl || '/assets/img/placeholders/tournament-banner.png'}" 
                             class="rounded-md w-100 mb-3" style="height: 160px; object-fit: cover;" alt="Banner">
                        <span class="position-absolute top-0 end-0 m-2 oc-badge ${this._getStatusClass(tournament.status)}">
                            ${tournament.status}
                        </span>
                    </div>
                    
                    <h5 class="text-main mb-1 text-truncate">${tournament.name}</h5>
                    <p class="text-muted small mb-3 line-clamp-2">${tournament.description || 'Sem descrição.'}</p>
                    
                    <div class="mt-auto">
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <div class="bg-dark p-2 rounded-sm border border-secondary text-center">
                                    <small class="text-dim d-block" style="font-size: 9px;">PREMIAÇÃO</small>
                                    <span class="text-primary fw-bold">${window.Formatters.currency(tournament.finance.prizePool)}</span>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="bg-dark p-2 rounded-sm border border-secondary text-center">
                                    <small class="text-dim d-block" style="font-size: 9px;">VAGAS</small>
                                    <span class="text-main fw-bold">${tournament.rules.currentParticipants}/${tournament.rules.maxParticipants}</span>
                                </div>
                            </div>
                        </div>

                        <div class="d-flex gap-2">
                            <button class="btn-oc btn-oc-primary flex-grow-1 btn-sm" onclick="TournamentsManage.viewDetails('${tournament.id}')">
                                <i class="bi bi-gear-fill me-1"></i> Gerenciar
                            </button>
                            <button class="btn-oc btn-oc-outline btn-sm" onclick="TournamentsManage.edit('${tournament.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Visualiza detalhes e lista de participantes
     */
    async viewDetails(id) {
        try {
            const response = await window.API.get(`${this.endpoint}/${id}`);
            if (response.status === 'success') {
                const t = response.data;
                this.renderParticipantsModal(t);
            }
        } catch (error) {
            console.error('[Tournaments] Erro ao buscar detalhes');
        }
    }

    renderParticipantsModal(t) {
        const modalHtml = `
            <div class="text-start mt-3">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h4 class="mb-0 text-main">${t.name}</h4>
                        <span class="text-muted small">Início: ${window.Formatters.date(t.schedule.startAt, true)}</span>
                    </div>
                    <div class="dropdown">
                        <button class="btn-oc btn-oc-outline btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                            Alterar Status
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="#" onclick="TournamentsManage.updateStatus('${t.id}', 'REGISTRATION')">Inscrições</a></li>
                            <li><a class="dropdown-item" href="#" onclick="TournamentsManage.updateStatus('${t.id}', 'IN_PROGRESS')">Iniciar</a></li>
                            <li><a class="dropdown-item" href="#" onclick="TournamentsManage.updateStatus('${t.id}', 'FINISHED')">Finalizar</a></li>
                        </ul>
                    </div>
                </div>

                <label class="oc-label mb-2">Lista de Inscritos (${t.participants.length})</label>
                <div class="oc-table-container" style="max-height: 400px;">
                    <table class="oc-table small" id="participants-table">
                        <thead>
                            <tr>
                                <th>Jogador</th>
                                <th>Nível</th>
                                <th>Inscrição</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${t.participants.map(p => `
                                <tr>
                                    <td>
                                        <div class="d-flex align-items-center">
                                            <img src="${p.avatarUrl || '/assets/img/placeholders/avatar.png'}" class="oc-avatar-sm rounded-circle me-2">
                                            <span>${p.username}</span>
                                        </div>
                                    </td>
                                    <td>${p.level}</td>
                                    <td>${window.Formatters.date(p.joinedAt)}</td>
                                    <td class="text-end">
                                        <button class="btn-oc btn-oc-outline btn-sm text-danger" onclick="TournamentsManage.removeParticipant('${t.id}', '${p.id}')">
                                            <i class="bi bi-x-circle"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        Swal.fire({
            title: '<i class="bi bi-trophy-fill text-warning"></i> Painel de Controle',
            html: modalHtml,
            width: '800px',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            showConfirmButton: false,
            showCloseButton: true
        });
    }

    /**
     * Altera o status operacional do torneio via API
     */
    async updateStatus(id, newStatus) {
        try {
            const response = await window.API.patch(`${this.endpoint}/${id}/status`, { status: newStatus });
            if (response.status === 'success') {
                Swal.close();
                window.showAlert('Sucesso', `Torneio movido para: ${newStatus}`, 'success');
                this.loadTournaments();
            }
        } catch (error) {
            console.error('[Tournaments] Falha ao mudar status');
        }
    }

    /**
     * Remove um participante (Desqualificação ou cancelamento)
     */
    async removeParticipant(tId, userId) {
        const confirm = await Swal.fire({
            title: 'Remover Jogador?',
            text: "O valor da taxa será estornado se o torneio ainda não começou.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-color)',
            confirmButtonText: 'Sim, remover'
        });

        if (confirm.isConfirmed) {
            try {
                await window.API.delete(`${this.endpoint}/${tId}/unregister`, { data: { userId } });
                this.viewDetails(tId); // Recarrega o modal
            } catch (err) {
                console.error('[Tournaments] Erro ao desinscrever');
            }
        }
    }

    /**
     * Lógica de Persistência (Create/Update)
     */
    async handleSave(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const id = document.getElementById('tournament-id').value;

        this.toggleBtnLoading('btn-save-tournament', true);

        try {
            let response;
            if (id) {
                response = await window.API.patch(`${this.endpoint}/${id}`, data);
            } else {
                response = await window.API.post(this.endpoint, data);
            }

            if (response.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('tournament-modal')).hide();
                window.showAlert('Sucesso', `Torneio salvo com sucesso!`, 'success');
                this.loadTournaments();
            }
        } catch (error) {
            console.error('[Tournaments] Erro ao salvar');
        } finally {
            this.toggleBtnLoading('btn-save-tournament', false);
        }
    }

    /**
     * Helpers de UI
     */
    _getStatusClass(status) {
        const map = {
            'REGISTRATION': 'badge-success',
            'IN_PROGRESS': 'badge-warning',
            'FINISHED': 'badge-info',
            'CANCELLED': 'badge-danger'
        };
        return map[status] || 'badge-soft-primary';
    }

    openFormModal() {
        document.getElementById('tournament-form').reset();
        document.getElementById('tournament-id').value = '';
        document.getElementById('modal-tournament-title').innerText = 'Novo Torneio';
        new bootstrap.Modal(document.getElementById('tournament-modal')).show();
    }

    renderPagination(meta) {
        const container = document.getElementById('tournaments-pagination');
        if (!container) return;

        let html = `
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === 1 ? 'disabled' : ''} onclick="TournamentsManage.changePage(${meta.page - 1})">
                <i class="bi bi-chevron-left"></i>
            </button>
            <span class="text-dim small mx-3">Página ${meta.page} de ${meta.totalPages}</span>
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === meta.totalPages ? 'disabled' : ''} onclick="TournamentsManage.changePage(${meta.page + 1})">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;
        container.innerHTML = html;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadTournaments();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    toggleLoading(show) {
        const loader = document.getElementById('tournaments-loader');
        const grid = document.getElementById('tournaments-grid');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        if (grid) grid.style.opacity = show ? '0.3' : '1';
    }

    toggleBtnLoading(btnId, loading) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = loading;
        btn.innerHTML = loading ? `<span class="spinner-border spinner-border-sm me-2"></span> Salvando...` : `<i class="bi bi-cloud-check me-2"></i> Salvar Torneio`;
    }
}

// Inicializa o módulo
window.TournamentsManage = new TournamentsManageModule();