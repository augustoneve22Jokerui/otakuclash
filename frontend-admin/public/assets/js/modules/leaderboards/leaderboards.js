/**
 * OTAKU CLASH ANGOLA - LEADERBOARDS MODULE
 * Senior Frontend Engineer: Competitive Integrity & Ranking UI
 */

class LeaderboardsModule {
    constructor() {
        this.endpoints = {
            global: '/leaderboards/global',
            period: '/leaderboards/period',
            guilds: '/leaderboards/guilds'
        };
        this.currentType = 'global'; // global, period, guilds
        this.currentPeriod = 'weekly'; // daily, weekly, monthly
        this.table = null;
        this.data = [];

        this.init();
    }

    async init() {
        console.log('[Leaderboards] Inicializando classificações...');
        this.setupEventListeners();
        this.setupSocketListeners();
        await this.loadRankings();
    }

    setupEventListeners() {
        // Alternar entre Rankings de Jogadores e Guildas
        const tabs = document.querySelectorAll('[data-rank-tab]');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const type = e.currentTarget.getAttribute('data-rank-tab');
                this.switchRankType(type, e.currentTarget);
            });
        });

        // Filtro de Período (Apenas para Jogadores)
        const periodFilter = document.getElementById('rank-period-filter');
        if (periodFilter) {
            periodFilter.addEventListener('change', (e) => {
                this.currentPeriod = e.target.value;
                this.loadRankings();
            });
        }

        // Botão de Limpeza de Cache de Ranking (Apenas Super Admin)
        const btnClearCache = document.getElementById('btn-clear-rank-cache');
        if (btnClearCache) {
            btnClearCache.addEventListener('click', () => this.handleClearCache());
        }

        // Refresh Manual
        const btnRefresh = document.getElementById('btn-refresh-ranks');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadRankings());
        }
    }

    /**
     * Sincronização Real-time
     */
    setupSocketListeners() {
        // Escuta atualizações de XP que podem impactar o ranking
        window.Socket.on('rank:updated', (data) => {
            console.log('[Leaderboards] Ranking atualizado via socket:', data);
            this.loadRankings();
        });
    }

    /**
     * Carrega dados do backend conforme o tipo selecionado
     */
    async loadRankings() {
        this.toggleLoading(true);
        try {
            let url = this.endpoints.global;
            
            if (this.currentType === 'period') {
                url = `${this.endpoints.period}/${this.currentPeriod}`;
            } else if (this.currentType === 'guilds') {
                url = this.endpoints.guilds;
            }

            const response = await window.API.get(url, { params: { limit: 50 } });
            
            if (response.status === 'success') {
                this.data = response.data;
                this.renderLeaderboard(this.data);
                this.renderPodium(this.data.slice(0, 3));
            }
        } catch (error) {
            console.error('[Leaderboards] Erro ao carregar ranking:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza o Top 3 (Pódio) com destaque visual Premium
     */
    renderPodium(top3) {
        const podiumContainer = document.getElementById('rank-podium');
        if (!podiumContainer || this.currentType === 'guilds') {
            if (podiumContainer) podiumContainer.classList.add('d-none');
            return;
        }
        
        podiumContainer.classList.remove('d-none');
        
        // Ordena para exibir 2º - 1º - 3º visualmente
        const positions = [top3[1], top3[0], top3[2]]; 
        
        podiumContainer.innerHTML = positions.map((user, idx) => {
            if (!user) return '<div class="col-4"></div>';
            
            const isFirst = user.position === 1;
            const sizeClass = isFirst ? 'podium-first' : 'podium-side';
            const crown = isFirst ? '<div class="crown"><i class="bi bi-trophy-fill"></i></div>' : '';

            return `
                <div class="col-4 text-center animate-up" style="animation-delay: ${idx * 100}ms">
                    <div class="podium-item ${sizeClass}">
                        ${crown}
                        <div class="podium-avatar-wrapper">
                            <img src="${user.avatar_url || '/assets/img/placeholders/avatar.png'}" 
                                 class="podium-avatar" alt="Avatar">
                            <div class="podium-rank-badge">#${user.position}</div>
                        </div>
                        <h6 class="mt-3 mb-0 text-truncate">${user.username}</h6>
                        <span class="text-primary fw-bold small">${window.Formatters.compactNumber(user.xp || user.period_xp)} XP</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Renderiza a tabela principal do ranking
     */
    renderLeaderboard(data) {
        const tableBody = document.querySelector('#leaderboard-table tbody');
        if (!tableBody) return;

        if (this.table) this.table.destroy();

        tableBody.innerHTML = data.map(item => {
            const isGuild = this.currentType === 'guilds';
            const imgUrl = isGuild ? (item.logo_url || '/assets/img/placeholders/guild.png') : (item.avatar_url || '/assets/img/placeholders/avatar.png');
            const score = isGuild ? item.xp : (item.xp || item.period_xp);
            const subText = isGuild ? `[${item.tag}] • ${item.member_count} membros` : `Nível ${item.level}`;

            return `
                <tr class="animate-up">
                    <td class="text-center fw-800 text-dim" style="width: 50px;">
                        ${this._getRankIcon(item.position)}
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${imgUrl}" class="oc-avatar rounded-circle me-3" alt="Img">
                            <div>
                                <div class="fw-bold text-main">${item.username || item.name}</div>
                                <small class="text-muted">${subText}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="fw-bold text-primary">${window.Formatters.compactNumber(score)}</div>
                        <div class="text-dim small">XP ACUMULADO</div>
                    </td>
                    <td>
                        <span class="oc-badge badge-info">${isGuild ? 'GUILDA' : (item.tier || 'MESTRE')}</span>
                    </td>
                    <td class="text-end">
                        <button class="btn-oc btn-oc-outline btn-sm" onclick="Leaderboards.viewItem('${item.id}', ${isGuild})">
                            <i class="bi bi-graph-up-arrow me-2"></i> Ver Status
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.table = $('#leaderboard-table').DataTable({
            paging: true,
            pageLength: 10,
            searching: false,
            lengthChange: false,
            info: false,
            dom: 'tp',
            language: { paginate: { next: '>', previous: '<' } }
        });
    }

    /**
     * Lógica para trocar tipos de ranking
     */
    switchRankType(type, element) {
        this.currentType = type;
        
        // UI Updates
        document.querySelectorAll('[data-rank-tab]').forEach(t => t.classList.remove('active'));
        element.classList.add('active');

        const filterWrapper = document.getElementById('period-filter-wrapper');
        if (type === 'guilds') {
            filterWrapper.classList.add('d-none');
        } else {
            filterWrapper.classList.remove('d-none');
        }

        this.loadRankings();
    }

    /**
     * Limpa o cache de ranking no servidor (Ação de Admin)
     */
    async handleClearCache() {
        const confirm = await Swal.fire({
            title: 'Resetar Cache de Rankings?',
            text: "O sistema levará alguns segundos para recalcular as posições.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, recalcular',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (confirm.isConfirmed) {
            try {
                await window.API.post('/admin/maintenance/clear-ranking-cache');
                window.showAlert('Sucesso', 'Cache de rankings limpo.', 'success');
                this.loadRankings();
            } catch (err) {
                console.error('[Rank] Erro ao limpar cache');
            }
        }
    }

    viewItem(id, isGuild) {
        const path = isGuild ? `/guilds/${id}` : `/users/${id}`;
        window.location.href = path;
    }

    _getRankIcon(pos) {
        if (pos === 1) return '<i class="bi bi-award-fill text-warning fs-4"></i>';
        if (pos === 2) return '<i class="bi bi-award-fill text-secondary fs-5"></i>';
        if (pos === 3) return '<i class="bi bi-award-fill text-danger fs-5"></i>';
        return pos;
    }

    toggleLoading(show) {
        const loader = document.getElementById('rank-loader');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        const table = document.getElementById('leaderboard-table');
        if (table) table.style.opacity = show ? '0.3' : '1';
    }
}

// Inicialização
window.Leaderboards = new LeaderboardsModule();