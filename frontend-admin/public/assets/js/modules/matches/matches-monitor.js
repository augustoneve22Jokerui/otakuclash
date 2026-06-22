/**
 * OTAKU CLASH ANGOLA - MATCHES MONITORING MODULE
 * Senior Frontend Engineer: Real-time Gameplay Supervision
 */

class MatchesMonitorModule {
    constructor() {
        this.endpoint = '/matches';
        this.activeMatches = new Map(); // Armazenamento local para busca rápida O(1)
        
        this.init();
    }

    async init() {
        console.log('[MatchesMonitor] Inicializando supervisão em tempo real...');
        this.setupEventListeners();
        this.setupSocketListeners();
        await this.loadActiveMatches();
    }

    setupEventListeners() {
        // Filtro por tipo de partida
        const typeFilter = document.getElementById('filter-match-type');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.refreshDisplay());
        }

        // Refresh manual
        const btnRefresh = document.getElementById('btn-refresh-matches');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadActiveMatches());
        }
    }

    /**
     * Handlers Socket.IO (Real Backend Integration)
     */
    setupSocketListeners() {
        // Quando uma nova partida começa
        window.Socket.on('game:match_found', (data) => {
            console.log('[Socket] Nova partida iniciada:', data.matchId);
            this.activeMatches.set(data.matchId, {
                ...data,
                status: 'IN_PROGRESS',
                lastUpdate: Date.now()
            });
            this.refreshDisplay();
        });

        // Quando um placar é atualizado (Real-time scoring)
        window.Socket.on('game:score_update', (data) => {
            const match = this.activeMatches.get(data.matchId);
            if (match) {
                // Atualiza score do jogador específico no Map
                const player = match.players.find(p => p.id === data.userId);
                if (player) {
                    player.score = data.score;
                    this.updateMatchCardUI(data.matchId);
                }
            }
        });

        // Quando a partida termina
        window.Socket.on('game:game_over', (data) => {
            console.log('[Socket] Partida encerrada:', data.matchId);
            this.activeMatches.delete(data.matchId);
            this.refreshDisplay();
        });

        // Alerta de desconexão
        window.Socket.on('game:opponent_disconnected', (data) => {
            this.pushMatchAlert(data.matchId, 'Jogador desconectado');
        });
    }

    /**
     * Carga inicial de partidas que já estão rodando
     */
    async loadActiveMatches() {
        this.toggleLoading(true);
        try {
            // Endpoint real: GET /api/v1/matches (filtrado por ativos no backend)
            const response = await window.API.get(this.endpoint, { params: { status: 'IN_PROGRESS' } });
            
            if (response.status === 'success') {
                this.activeMatches.clear();
                response.data.forEach(match => {
                    this.activeMatches.set(match.id, match);
                });
                this.refreshDisplay();
            }
        } catch (error) {
            console.error('[MatchesMonitor] Erro ao carregar partidas:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza o grid de monitoramento
     */
    refreshDisplay() {
        const container = document.getElementById('matches-monitor-grid');
        if (!container) return;

        const filterType = document.getElementById('filter-match-type')?.value;
        const matchesArray = Array.from(this.activeMatches.values());

        const filteredMatches = filterType 
            ? matchesArray.filter(m => m.type === filterType)
            : matchesArray;

        if (filteredMatches.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="display-1 text-dim mb-3"><i class="bi bi-controller"></i></div>
                    <p class="text-muted">Nenhuma atividade de combate detectada no momento.</p>
                </div>`;
            return;
        }

        container.innerHTML = filteredMatches.map(match => this.renderMatchCard(match)).join('');
        this.updateGlobalCounters(filteredMatches.length);
    }

    /**
     * Template de Card de Partida (Identidade Visual Premium)
     */
    renderMatchCard(match) {
        const p1 = match.players[0];
        const p2 = match.players[1] || { username: 'Aguardando...', score: 0, avatarUrl: '' };

        return `
            <div class="col-xl-4 col-md-6 mb-4 match-card-wrapper" id="card-${match.id}">
                <div class="oc-card animate-up">
                    <div class="oc-card-header mb-2">
                        <span class="oc-badge badge-info" style="font-size: 9px;">${match.type}</span>
                        <div class="d-flex align-items-center">
                            <span class="status-pulse-green me-2"></span>
                            <small class="text-dim">LIVE</small>
                        </div>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center py-3">
                        <!-- Player 1 -->
                        <div class="text-center" style="width: 40%;">
                            <img src="${p1.avatarUrl || '/assets/img/placeholders/avatar.png'}" class="oc-avatar rounded-circle mb-2 border-primary">
                            <div class="fw-bold text-truncate small">${p1.username}</div>
                            <div class="display-6 fw-800 text-main mt-1 player-score" data-player-id="${p1.id}">${p1.score || 0}</div>
                        </div>

                        <div class="text-dim fw-900 italic">VS</div>

                        <!-- Player 2 -->
                        <div class="text-center" style="width: 40%;">
                            <img src="${p2.avatarUrl || '/assets/img/placeholders/avatar.png'}" class="oc-avatar rounded-circle mb-2 border-secondary">
                            <div class="fw-bold text-truncate small">${p2.username}</div>
                            <div class="display-6 fw-800 text-main mt-1 player-score" data-player-id="${p2.id}">${p2.score || 0}</div>
                        </div>
                    </div>

                    <div class="mt-2 pt-2 border-top border-secondary d-flex justify-content-between align-items-center">
                        <small class="text-muted"><i class="bi bi-clock me-1"></i> ${window.Formatters.timeAgo(match.createdAt)}</small>
                        <button class="btn-oc btn-oc-outline btn-sm" onclick="MatchesMonitor.terminateMatch('${match.id}')">
                            <i class="bi bi-slash-circle me-1"></i> Encerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Atualiza apenas os números de uma partida sem re-renderizar o card todo
     */
    updateMatchCardUI(matchId) {
        const match = this.activeMatches.get(matchId);
        if (!match) return;

        match.players.forEach(p => {
            const scoreEl = document.querySelector(`#card-${matchId} .player-score[data-player-id="${p.id}"]`);
            if (scoreEl && scoreEl.innerText != p.score) {
                scoreEl.innerText = p.score;
                scoreEl.classList.add('animate-scale');
                setTimeout(() => scoreEl.classList.remove('animate-scale'), 300);
            }
        });
    }

    /**
     * Intervenção Administrativa: Encerra uma partida forçadamente
     */
    async terminateMatch(matchId) {
        const confirm = await Swal.fire({
            title: 'Encerrar Partida?',
            text: "A partida será finalizada como empate e os fundos (se houver) serão devolvidos.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-color)',
            confirmButtonText: 'Sim, abortar partida',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (confirm.isConfirmed) {
            try {
                // PATCH /api/v1/matches/:id/finish com flag de cancelamento administrativo
                await window.API.patch(`${this.endpoint}/${matchId}/finish`, { 
                    status: 'FINISHED',
                    metadata: { terminatedByAdmin: true }
                });
                
                this.activeMatches.delete(matchId);
                this.refreshDisplay();
                window.showAlert('Encerrada', 'A partida foi finalizada pelo administrador.', 'info');
            } catch (err) {
                console.error('[Matches] Erro ao encerrar:', err);
            }
        }
    }

    updateGlobalCounters(count) {
        const el = document.getElementById('live-matches-count');
        if (el) el.innerText = count;
    }

    pushMatchAlert(matchId, message) {
        // Implementar log lateral de alertas de gameplay se houver container
        console.warn(`[Alert] Match ${matchId}: ${message}`);
    }

    toggleLoading(show) {
        const loader = document.getElementById('matches-loader');
        if (loader) loader.style.display = show ? 'flex' : 'none';
    }
}

// Inicializa o módulo e expõe globalmente
window.MatchesMonitor = new MatchesMonitorModule();