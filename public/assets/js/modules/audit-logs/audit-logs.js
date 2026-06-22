/**
 * OTAKU CLASH ANGOLA - AUDIT LOGS MODULE
 * Senior Security Engineer: Transparency & Traceability Layer
 */

class AuditLogsModule {
    constructor() {
        this.endpoint = '/admin/audit-logs';
        this.table = null;
        this.currentPage = 1;
        this.limit = 25;
        this.logs = [];
        
        this.init();
    }

    async init() {
        console.log('[AuditLogs] Inicializando monitoramento de logs...');
        this.setupEventListeners();
        await this.loadLogs();
    }

    setupEventListeners() {
        // Filtros de Ação e Recurso
        ['filter-action', 'filter-resource'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => {
                this.currentPage = 1;
                this.loadLogs();
            });
        });

        // Botão Exportar CSV
        const btnExport = document.getElementById('btn-export-logs');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.handleExport());
        }

        // Refresh Manual
        const btnRefresh = document.getElementById('btn-refresh-logs');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadLogs());
        }
    }

    /**
     * Carrega logs do backend com paginação e filtros
     */
    async loadLogs() {
        this.toggleLoading(true);

        const params = {
            page: this.currentPage,
            limit: this.limit,
            action: document.getElementById('filter-action')?.value || undefined,
            resourceType: document.getElementById('filter-resource')?.value || undefined
        };

        try {
            const response = await window.API.get(this.endpoint, { params });
            
            if (response.status === 'success') {
                this.logs = response.data;
                this.renderTable(this.logs);
                this.renderPagination(response.pagination);
            }
        } catch (error) {
            console.error('[AuditLogs] Erro ao carregar registros:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza a tabela de auditoria
     */
    renderTable(data) {
        const container = document.querySelector('#audit-table tbody');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `<tr><td colspan="6" class="text-center py-5">Nenhum registro de auditoria localizado.</td></tr>`;
            return;
        }

        container.innerHTML = data.map(log => {
            const actionBadge = this._getActionBadge(log.action);
            
            return `
                <tr class="animate-up">
                    <td>
                        <div class="fw-bold text-main">${window.Formatters.date(log.created_at, true)}</div>
                        <small class="text-muted">${window.Formatters.timeAgo(log.created_at)}</small>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="bi bi-person-badge me-2 text-primary"></i>
                            <div>
                                <div class="fw-bold">${log.admin_username || 'Sistema'}</div>
                                <code class="small text-dim">${log.ip_address || '0.0.0.0'}</code>
                            </div>
                        </div>
                    </td>
                    <td>${actionBadge}</td>
                    <td>
                        <span class="text-secondary fw-500">${log.resource_type}</span>
                        <div class="small text-muted">ID: ${log.resource_id ? log.resource_id.substring(0, 8) + '...' : 'N/A'}</div>
                    </td>
                    <td>
                        <button class="btn-oc btn-oc-outline btn-sm" onclick="AuditLogs.viewDetails('${log.id}')">
                            <i class="bi bi-eye me-1"></i> Ver Alterações
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Exibe o modal com comparação de valores (Old vs New)
     */
    async viewDetails(logId) {
        const log = this.logs.find(l => l.id === logId);
        if (!log) return;

        let diffHtml = '';
        const oldVals = log.old_values;
        const newVals = log.new_values;

        if (!oldVals && !newVals) {
            diffHtml = '<div class="alert alert-info bg-dark border-secondary text-dim">Sem dados de comparação para esta ação.</div>';
        } else {
            diffHtml = `
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="oc-label">Valor Anterior</label>
                        <pre class="bg-dark p-3 rounded-sm border border-secondary text-danger small" style="max-height: 300px; overflow: auto;">${JSON.stringify(oldVals, null, 2) || 'Nulo'}</pre>
                    </div>
                    <div class="col-md-6">
                        <label class="oc-label">Novo Valor</label>
                        <pre class="bg-dark p-3 rounded-sm border border-secondary text-success small" style="max-height: 300px; overflow: auto;">${JSON.stringify(newVals, null, 2) || 'Nulo'}</pre>
                    </div>
                </div>
            `;
        }

        Swal.fire({
            title: `<i class="bi bi-shield-text me-2"></i> Detalhes da Ação`,
            html: `
                <div class="text-start">
                    <div class="mb-4">
                        <span class="oc-badge badge-info mb-2">${log.action}</span>
                        <p class="text-muted small">Realizado por <strong>${log.admin_username}</strong> em ${window.Formatters.date(log.created_at, true)}</p>
                    </div>
                    ${diffHtml}
                </div>
            `,
            width: '800px',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            confirmButtonColor: 'var(--primary-color)',
            confirmButtonText: 'Fechar'
        });
    }

    /**
     * Exporta os dados atuais para CSV
     */
    handleExport() {
        const exportData = this.logs.map(l => ({
            Data: window.Formatters.date(l.created_at, true),
            Usuario: l.admin_username,
            Acao: l.action,
            Recurso: l.resource_type,
            IP: l.ip_address
        }));
        
        window.Exporters.exportToCSV(exportData, 'audit_logs_export');
    }

    /**
     * Paginação Dinâmica
     */
    renderPagination(meta) {
        const container = document.getElementById('audit-pagination');
        if (!container) return;

        let html = `
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === 1 ? 'disabled' : ''} onclick="AuditLogs.changePage(${meta.page - 1})">
                <i class="bi bi-chevron-left"></i>
            </button>
            <span class="px-3 text-muted">Página ${meta.page} de ${meta.totalPages}</span>
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === meta.totalPages ? 'disabled' : ''} onclick="AuditLogs.changePage(${meta.page + 1})">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;
        container.innerHTML = html;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadLogs();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Auxiliar para cores de badges de ação
     * @private
     */
    _getActionBadge(action) {
        let cls = 'badge-info';
        if (action.includes('DELETE') || action.includes('REVOKE')) cls = 'badge-danger';
        if (action.includes('CREATE') || action.includes('GRANT')) cls = 'badge-success';
        if (action.includes('UPDATE') || action.includes('CHANGE')) cls = 'badge-warning';

        return `<span class="oc-badge ${cls}">${action}</span>`;
    }

    toggleLoading(show) {
        const loader = document.getElementById('audit-loader');
        const table = document.getElementById('audit-table');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        if (table) table.style.opacity = show ? '0.4' : '1';
    }
}

// Inicializa o módulo
window.AuditLogs = new AuditLogsModule();