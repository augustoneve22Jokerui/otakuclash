/**
 * OTAKU CLASH ANGOLA - RANKINGS & TIERS MODULE
 * Senior Frontend Engineer: Competitive Ecosystem & Season Management
 */

class RankingsModule {
    constructor() {
        this.endpoint = '/rankings';
        this.table = null;
        this.distributionChart = null;
        this.limit = 50;

        this.init();
    }

    async init() {
        console.log('[Rankings] Inicializando ecossistema competitivo...');
        this.setupEventListeners();
        this.setupSocketListeners();
        await this.loadTierDistribution();
        await this.loadTopRankings();
    }

    setupEventListeners() {
        // Refresh de Ranking
        const btnRefresh = document.getElementById('btn-refresh-rankings');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadTopRankings());
        }

        // Reset de Temporada (Ação Crítica de Admin)
        const btnReset = document.getElementById('btn-reset-season');
        if (btnReset) {
            btnReset.addEventListener('click', () => this.handleSeasonReset());
        }
    }

    /**
     * Sincronização Real-time via Socket.IO
     */
    setupSocketListeners() {
        // Escuta atualizações massivas de ranking (ex: processamento pós-torneio)
        window.Socket.on('rankings:batch_updated', () => {
            this.loadTopRankings();
            this.loadTierDistribution();
        });
    }

    /**
     * Carrega a elite de jogadores (Top Players por LP) do backend real
     */
    async loadTopRankings() {
        this.toggleLoading(true);
        try {
            // GET /api/v1/rankings/top
            const response = await window.API.get(`${this.endpoint}/top`, { params: { limit: this.limit } });
            
            if (response.status === 'success') {
                this.renderRankingsTable(response.data);
            }
        } catch (error) {
            console.error('[Rankings] Erro ao carregar elite:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Carrega estatísticas de distribuição de Tiers para o gráfico
     */
    async loadTierDistribution() {
        try {
            // GET /api/v1/rankings/stats/distribution
            const response = await window.API.get(`${this.endpoint}/stats/distribution`);
            
            if (response.status === 'success') {
                this.renderDistributionChart(response.data);
            }
        } catch (error) {
            console.error('[Rankings] Erro ao carregar distribuição:', error);
        }
    }

    /**
     * Renderiza a tabela de elite com visual Premium
     */
    renderRankingsTable(data) {
        const container = document.querySelector('#rankings-table tbody');
        if (!container) return;

        if (this.table) this.table.destroy();

        container.innerHTML = data.map(player => `
            <tr class="animate-up">
                <td class="text-center">
                    <div class="rank-pos fw-900 ${player.position <= 3 ? 'text-primary' : 'text-dim'}">
                        ${player.position === 1 ? '<i class="bi bi-trophy-fill me-1"></i>' : ''}
                        #${player.position}
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${player.avatarUrl || '/assets/img/placeholders/avatar.png'}" 
                             class="oc-avatar rounded-circle me-3 border border-secondary" alt="Player">
                        <div>
                            <div class="fw-bold text-main">${player.username}</div>
                            <small class="text-muted">LVL ${player.level}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="fw-bold text-primary">${player.lp} LP</div>
                    <div class="progress" style="height: 4px; background: var(--bg-main); width: 80px;">
                        <div class="progress-bar bg-primary" style="width: ${Math.min((player.lp / 25000) * 100, 100)}%;"></div>
                    </div>
                </td>
                <td>
                    <span class="oc-badge" style="background: ${this._getTierColor(player.tier)}20; color: ${this._getTierColor(player.tier)};">
                        <i class="bi bi-shield-shaded me-1"></i> ${player.tier}
                    </span>
                </td>
                <td class="text-end">
                    <button class="btn-oc btn-oc-outline btn-sm" onclick="window.location.href='/users/${player.id}'">
                        <i class="bi bi-search me-1"></i> Auditar
                    </button>
                </td>
            </tr>
        `).join('');

        this.table = $('#rankings-table').DataTable({
            pageLength: 10,
            searching: true,
            lengthChange: false,
            info: false,
            dom: 'tp',
            language: { 
                search: "", 
                searchPlaceholder: "Buscar na elite...",
                paginate: { next: '>', previous: '<' } 
            }
        });
    }

    /**
     * Renderiza o gráfico de pizza com a demografia dos Tiers (Chart.js)
     */
    renderDistributionChart(data) {
        const ctx = document.getElementById('chart-tier-distribution')?.getContext('2d');
        if (!ctx) return;

        if (this.distributionChart) this.distributionChart.destroy();

        const labels = data.map(i => i.tier);
        const counts = data.map(i => i.count);
        const colors = labels.map(label => this._getTierColor(label));

        this.distributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#A0A3BD',
                            usePointStyle: true,
                            font: { size: 11, family: 'Inter' }
                        }
                    }
                }
            }
        });
    }

    /**
     * Lógica de Reset de Temporada (Ação de Alto Risco)
     */
    async handleSeasonReset() {
        const { value: confirmText } = await Swal.fire({
            title: 'Resetar Temporada?',
            html: `
                <p class="text-danger fw-bold">ESTA AÇÃO É IRREVERSÍVEL!</p>
                <p class="small text-muted">Todos os LPs serão zerados e os tiers resetados para Unranked. Digite <strong>CONFIRMAR RESET</strong> para prosseguir.</p>
            `,
            input: 'text',
            inputPlaceholder: 'Digite a frase de confirmação',
            showCancelButton: true,
            confirmButtonText: 'Zerar Temporada Agora',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            customClass: { input: 'oc-input mt-3' }
        });

        if (confirmText === 'CONFIRMAR RESET') {
            Swal.fire({
                title: 'Processando Reset...',
                text: 'Isso pode levar alguns segundos devido ao volume de perfis.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                // POST /api/v1/rankings/admin/reset-season
                const response = await window.API.post(`${this.endpoint}/admin/reset-season`);
                
                if (response.status === 'success') {
                    await Swal.fire({
                        title: 'Temporada Resetada!',
                        text: 'O ranking competitivo foi limpo com sucesso.',
                        icon: 'success',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        confirmButtonColor: 'var(--primary-color)'
                    });
                    this.loadTopRankings();
                    this.loadTierDistribution();
                }
            } catch (error) {
                console.error('[Rankings] Erro no reset:', error);
            }
        } else if (confirmText !== undefined) {
            window.showAlert('Cancelado', 'A frase de confirmação não confere.', 'warning');
        }
    }

    /**
     * Helpers de UI
     */
    _getTierColor(tier) {
        const colors = {
            'UNRANKED': '#95a5a6',
            'BRONZE': '#cd7f32',
            'PRATA': '#c0c0c0',
            'OURO': '#ffd700',
            'PLATINA': '#e5e4e2',
            'DIAMANTE': '#b9f2ff',
            'MESTRE': '#9b59b6',
            'LENDA': '#e74c3c'
        };
        return colors[tier] || '#FFFFFF';
    }

    toggleLoading(show) {
        const loader = document.getElementById('rankings-loader');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        const table = document.getElementById('rankings-table');
        if (table) table.style.opacity = show ? '0.3' : '1';
    }
}

// Inicializa o módulo
window.Rankings = new RankingsModule();