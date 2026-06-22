/**
 * OTAKU CLASH ANGOLA - REPORTS & MODERATION MODULE
 * Senior Frontend Engineer: User Safety & Feedback Operations
 */

class ReportsModule {
    constructor() {
        this.endpoint = '/reports';
        this.table = null;
        this.reports = [];
        this.currentPage = 1;
        this.limit = 10;
        this.currentStatus = '';
        this.currentType = '';

        this.init();
    }

    async init() {
        console.log('[Reports] Inicializando central de moderação e feedback...');
        this.setupEventListeners();
        await this.loadSummary();
        await this.loadReports();
    }

    setupEventListeners() {
        // Filtros de Status e Tipo
        ['filter-report-status', 'filter-report-type'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', (e) => {
                    if (id.includes('status')) this.currentStatus = e.target.value;
                    if (id.includes('type')) this.currentType = e.target.value;
                    this.currentPage = 1;
                    this.loadReports();
                });
            }
        });

        // Refresh Manual
        const btnRefresh = document.getElementById('btn-refresh-reports');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => {
                this.loadSummary();
                this.loadReports();
            });
        }
    }

    /**
     * Carrega o resumo de pendências para os cards superiores
     */
    async loadSummary() {
        try {
            const response = await window.API.get(`${this.endpoint}/summary`);
            if (response.status === 'success') {
                this.renderSummary(response.data.pending);
            }
        } catch (error) {
            console.warn('[Reports] Erro ao carregar resumo de pendências.');
        }
    }

    /**
     * Carrega a lista de relatos com paginação e filtros do backend real
     */
    async loadReports() {
        this.toggleLoading(true);

        const params = {
            page: this.currentPage,
            limit: this.limit,
            status: this.currentStatus || undefined,
            type: this.currentType || undefined
        };

        try {
            const response = await window.API.get(this.endpoint, { params });
            
            if (response.status === 'success') {
                this.reports = response.data;
                this.renderTable(this.reports);
                this.renderPagination(response.pagination);
            }
        } catch (error) {
            console.error('[Reports] Erro ao carregar relatos:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza o resumo visual de pendências
     */
    renderSummary(pending) {
        const bugCount = pending.find(p => p.type === 'BUG')?.count || 0;
        const cheatCount = pending.find(p => p.type === 'CHEATING')?.count || 0;
        const feedbackCount = pending.find(p => p.type === 'FEEDBACK')?.count || 0;

        if (document.getElementById('pending-bugs')) document.getElementById('pending-bugs').innerText = bugCount;
        if (document.getElementById('pending-cheats')) document.getElementById('pending-cheats').innerText = cheatCount;
        if (document.getElementById('pending-feedback')) document.getElementById('pending-feedback').innerText = feedbackCount;
    }

    /**
     * Renderiza a tabela de moderação (Identidade Visual Enterprise)
     */
    renderTable(data) {
        const container = document.querySelector('#reports-table tbody');
        if (!container) return;

        if (this.table) this.table.destroy();

        if (data.length === 0) {
            container.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-dim">Nenhum relato pendente de análise.</td></tr>`;
            return;
        }

        container.innerHTML = data.map(report => {
            const typeBadge = this._getTypeBadge(report.type);
            const statusBadge = this._getStatusBadge(report.status);

            return `
                <tr class="animate-up">
                    <td>
                        <div class="fw-bold text-main">#${report.id.substring(0, 8)}</div>
                        <small class="text-dim">${window.Formatters.timeAgo(report.created_at)}</small>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="bi bi-person-circle me-2 text-muted"></i>
                            <span class="fw-500">${report.reporter_username || 'Anônimo'}</span>
                        </div>
                    </td>
                    <td>${typeBadge}</td>
                    <td>
                        <div class="text-truncate" style="max-width: 250px;" title="${report.description}">
                            ${report.description}
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td class="text-end">
                        <button class="btn-oc btn-oc-outline btn-sm" onclick="Reports.viewDetails('${report.id}')">
                            <i class="bi bi-search me-1"></i> Analisar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.table = $('#reports-table').DataTable({
            paging: false,
            searching: false,
            info: false,
            ordering: false
        });
    }

    /**
     * Exibe os detalhes técnicos do relato e opções de resolução
     */
    async viewDetails(id) {
        const report = this.reports.find(r => r.id === id);
        if (!report) return;

        let reportedUserHtml = report.reported_id ? `
            <div class="mb-3 p-2 bg-dark rounded border border-danger">
                <small class="text-danger d-block mb-1">Usuário Denunciado:</small>
                <div class="d-flex align-items-center">
                    <i class="bi bi-person-x-fill me-2 text-danger"></i>
                    <span class="text-main fw-bold">${report.reported_username}</span>
                    <code class="ms-auto small text-dim">${report.reported_id.substring(0, 8)}</code>
                </div>
            </div>
        ` : '';

        Swal.fire({
            title: `Análise de Relato: ${report.type}`,
            html: `
                <div class="text-start mt-3">
                    ${reportedUserHtml}
                    <label class="oc-label">Descrição do Relato:</label>
                    <div class="p-3 bg-dark rounded border border-secondary text-main mb-4 small">
                        ${report.description}
                    </div>
                    
                    ${report.metadata ? `
                        <label class="oc-label">Metadados Técnicos:</label>
                        <pre class="bg-dark p-2 text-dim rounded border border-secondary small" style="font-size: 10px; max-height: 150px; overflow: auto;">${JSON.stringify(report.metadata, null, 2)}</pre>
                    ` : ''}

                    <div class="d-flex gap-2 mt-4">
                        <button class="btn-oc btn-oc-primary flex-grow-1" onclick="Reports.resolve('${report.id}', 'RESOLVED')">
                            <i class="bi bi-check-circle me-2"></i> Marcar como Resolvido
                        </button>
                        <button class="btn-oc btn-oc-outline text-danger" onclick="Reports.resolve('${report.id}', 'DISMISSED')">
                            <i class="bi bi-x-circle me-2"></i> Rejeitar
                        </button>
                    </div>
                </div>
            `,
            width: '600px',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            showConfirmButton: false,
            showCloseButton: true
        });
    }

    /**
     * Altera o status do relato via API
     */
    async resolve(id, status) {
        Swal.fire({
            title: 'Processando...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            // PATCH /api/v1/reports/:id/resolve
            const response = await window.API.patch(`${this.endpoint}/${id}/resolve`, { status });
            
            if (response.status === 'success') {
                Swal.close();
                window.showAlert('Sucesso', `O relato foi marcado como ${status.toLowerCase()}.`, 'success');
                await this.loadSummary();
                await this.loadReports();
            }
        } catch (error) {
            console.error('[Reports] Erro ao resolver relato:', error);
        }
    }

    /**
     * Paginação Dinâmica
     */
    renderPagination(meta) {
        const container = document.getElementById('reports-pagination');
        if (!container) return;

        let html = `
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === 1 ? 'disabled' : ''} onclick="Reports.changePage(${meta.page - 1})">
                <i class="bi bi-chevron-left"></i>
            </button>
            <span class="text-dim small mx-3">Página ${meta.page} de ${meta.totalPages}</span>
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === meta.totalPages ? 'disabled' : ''} onclick="Reports.changePage(${meta.page + 1})">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;
        container.innerHTML = html;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadReports();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    _getTypeBadge(type) {
        const map = {
            'CHEATING': 'badge-danger',
            'TOXICITY': 'badge-warning',
            'BUG': 'badge-info',
            'FEEDBACK': 'badge-success',
            'OTHER': 'badge-soft-primary'
        };
        return `<span class="oc-badge ${map[type] || 'badge-soft-primary'}">${type}</span>`;
    }

    _getStatusBadge(status) {
        const map = {
            'PENDING': 'badge-warning',
            'RESOLVED': 'badge-success',
            'DISMISSED': 'badge-danger'
        };
        return `<span class="oc-badge ${map[status]}">${status}</span>`;
    }

    toggleLoading(show) {
        const loader = document.getElementById('reports-loader');
        const table = document.getElementById('reports-table');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        if (table) table.style.opacity = show ? '0.3' : '1';
    }
}

// Inicializa o módulo e expõe globalmente
window.Reports = new ReportsModule();