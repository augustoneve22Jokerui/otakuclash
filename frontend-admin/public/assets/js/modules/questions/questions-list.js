/**
 * OTAKU CLASH ANGOLA - QUESTIONS LIST MODULE
 * Senior Frontend Engineer: Content Curation & QA Layer
 */

class QuestionsListModule {
    constructor() {
        this.endpoint = '/questions/admin/list';
        this.baseEndpoint = '/questions';
        this.animesEndpoint = '/animes';
        this.table = null;
        this.currentPage = 1;
        this.limit = 10;
        this.filters = {
            animeId: '',
            category: '',
            difficulty: ''
        };

        this.init();
    }

    async init() {
        console.log('[Questions] Inicializando banco de questões...');
        this.setupEventListeners();
        await this.loadFilterData();
        await this.loadQuestions();
    }

    setupEventListeners() {
        // Filtros Dinâmicos
        ['filter-anime', 'filter-category', 'filter-difficulty'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', (e) => {
                    const key = id.replace('filter-', '').replace('anime', 'animeId');
                    this.filters[key] = e.target.value;
                    this.currentPage = 1;
                    this.loadQuestions();
                });
            }
        });

        // Refresh Manual
        const btnRefresh = document.getElementById('btn-refresh-questions');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadQuestions());
        }

        // Botão Exportar Banco (CSV)
        const btnExport = document.getElementById('btn-export-questions');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.handleExport());
        }
    }

    /**
     * Carrega animes para o filtro de busca
     */
    async loadFilterData() {
        try {
            const response = await window.API.get(this.animesEndpoint, { params: { limit: 1000 } });
            const select = document.getElementById('filter-anime');
            if (select && response.data) {
                response.data.forEach(anime => {
                    const option = document.createElement('option');
                    option.value = anime.id;
                    option.textContent = anime.title;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('[Questions] Erro ao carregar filtros:', error);
        }
    }

    /**
     * Carrega questões do backend real com filtros e paginação
     */
    async loadQuestions() {
        this.toggleLoading(true);

        const params = {
            page: this.currentPage,
            limit: this.limit,
            ...this.filters
        };

        try {
            const response = await window.API.get(this.endpoint, { params });
            
            if (response.status === 'success') {
                this.renderTable(response.data);
                this.renderPagination(response.pagination);
                this.updateCounters(response.pagination.total);
            }
        } catch (error) {
            console.error('[Questions] Erro ao carregar banco de questões:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza a tabela de questões (Visão Admin)
     */
    renderTable(data) {
        const container = document.querySelector('#questions-table tbody');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-dim">Nenhuma questão localizada no banco de dados.</td></tr>`;
            return;
        }

        container.innerHTML = data.map(q => `
            <tr class="animate-up">
                <td>
                    <span class="text-dim small">#${q.id.substring(0, 8)}</span>
                </td>
                <td style="max-width: 300px;">
                    <div class="fw-bold text-main">${q.text}</div>
                    <div class="small text-muted mt-1">
                        <i class="bi bi-person-badge me-1"></i> ${q.characterName || 'Geral'}
                    </div>
                </td>
                <td>
                    <div class="text-secondary fw-500">${q.animeTitle || 'Sem vínculo'}</div>
                    <span class="oc-badge badge-soft-primary" style="font-size: 10px;">${q.category}</span>
                </td>
                <td>
                    <div class="d-flex gap-1">
                        ${this._renderStars(q.difficulty)}
                    </div>
                    <small class="text-dim">Pts: ${q.points}</small>
                </td>
                <td>
                    <div class="text-dim small">Criada em</div>
                    <div class="small">${window.Formatters.date(q.createdAt)}</div>
                </td>
                <td class="text-end">
                    <div class="dropdown">
                        <button class="btn-oc btn-oc-outline btn-sm" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="/questions/edit/${q.id}"><i class="bi bi-pencil me-2"></i> Editar Questão</a></li>
                            <li><a class="dropdown-item" href="javascript:void(0)" onclick="QuestionsList.viewDetails('${q.id}')"><i class="bi bi-eye me-2"></i> Ver Opções</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="QuestionsList.delete('${q.id}')"><i class="bi bi-trash me-2"></i> Excluir</a></li>
                        </ul>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Exibe modal com as opções e a resposta correta real
     */
    async viewDetails(id) {
        try {
            // GET /api/v1/questions/:id (Endpoint Admin retorna isCorrect)
            const response = await window.API.get(`${this.baseEndpoint}/${id}`);
            
            if (response.status === 'success') {
                const q = response.data;
                
                Swal.fire({
                    title: 'Detalhes da Questão',
                    html: `
                        <div class="text-start mt-3">
                            <p class="text-main fw-bold mb-4">${q.text}</p>
                            <label class="oc-label mb-2">Opções de Resposta:</label>
                            <div class="list-group">
                                ${q.options.map(opt => `
                                    <div class="list-group-item bg-dark border-secondary d-flex justify-content-between align-items-center mb-2 rounded-sm">
                                        <span class="${opt.isCorrect ? 'text-success fw-bold' : 'text-dim'}">${opt.text}</span>
                                        ${opt.isCorrect ? '<i class="bi bi-check-circle-fill text-success"></i>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    confirmButtonColor: 'var(--secondary-color)',
                    confirmButtonText: 'Fechar'
                });
            }
        } catch (error) {
            console.error('[Questions] Erro ao carregar detalhes:', error);
        }
    }

    async delete(id) {
        const confirm = await Swal.fire({
            title: 'Excluir Questão?',
            text: "Esta ação é irreversível e removerá a questão de todos os quizzes ativos.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-color)',
            confirmButtonText: 'Sim, excluir permanentemente',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (confirm.isConfirmed) {
            try {
                await window.API.delete(`${this.baseEndpoint}/${id}`);
                window.showAlert('Removida', 'Questão excluída do banco de dados.', 'success');
                this.loadQuestions();
            } catch (err) {
                console.error('[Questions] Erro ao excluir');
            }
        }
    }

    handleExport() {
        const exportData = this.logs || []; // O backend retornaria toda a lista se necessário
        window.Exporters.exportTableToCSV('questions-table', 'questions_database');
    }

    renderPagination(meta) {
        const container = document.getElementById('questions-pagination');
        if (!container) return;

        let html = `
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === 1 ? 'disabled' : ''} onclick="QuestionsList.changePage(${meta.page - 1})">
                <i class="bi bi-chevron-left"></i>
            </button>
            <span class="text-dim small mx-3">Página ${meta.page} de ${meta.totalPages}</span>
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === meta.totalPages ? 'disabled' : ''} onclick="QuestionsList.changePage(${meta.page + 1})">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;
        container.innerHTML = html;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadQuestions();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateCounters(total) {
        const el = document.getElementById('total-questions-count');
        if (el) el.innerText = total;
    }

    _renderStars(difficulty) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="bi bi-star-fill" style="color: ${i <= difficulty ? 'var(--warning)' : 'var(--border-color)'}; font-size: 10px;"></i>`;
        }
        return stars;
    }

    toggleLoading(show) {
        const loader = document.getElementById('questions-loader');
        const table = document.getElementById('questions-table');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        if (table) table.style.opacity = show ? '0.3' : '1';
    }
}

// Inicializa o módulo
window.QuestionsList = new QuestionsListModule();