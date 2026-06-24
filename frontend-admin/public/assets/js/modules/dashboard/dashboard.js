/**
 * 📊 OTAKU CLASH ANGOLA - DASHBOARD CORE MODULE
 * Versão: 2.0.0 - Enterprise Grade
 * Senior Frontend Engineer: Data Visualization & Real-time Analytics
 */

class DashboardModule {
    constructor() {
        this.endpoint = '/admin/dashboard';
        this.charts = {};
        this.refreshInterval = 300000; // 5 minutos para refresh forçado de segurança
        
        this.init();
    }

    async init() {
        console.log('[Dashboard] Inicializando central de inteligência...');
        
        // 1. Configura os ouvintes de Socket antes da carga inicial para não perder eventos
        this.setupSocketListeners();
        
        // 2. Realiza a carga inicial dos dados
        await this.loadStats();
        
        // 3. Inicia o timer de auto-refresh
        this.initAutoRefresh();
    }

    /**
     * ⚡ SINCRONIZAÇÃO EM TEMPO REAL (SOCKET.IO)
     * Atualiza os KPIs do dashboard instantaneamente com base nos eventos do Backend.
     */
    setupSocketListeners() {
        if (!window.Socket) return;

        // Atualização de Usuários Online (Evento do PresenceController)
        window.Socket.on('presence:online', (data) => {
            this.updateCounter('online-users-count', 1, true);
            this.pushActivity(`Nova conexão: ${data.username}`);
        });

        window.Socket.on('presence:offline', (data) => {
            this.updateCounter('online-users-count', -1, true);
        });

        // Monitoramento de Arena (Evento do MatchmakingController)
        window.Socket.on('game:match_found', (data) => {
            this.updateCounter('active-matches-count', 1, true);
            this.pushActivity(`Duelo iniciado: ${data.players[0].username} vs ${data.players[1].username}`);
        });

        // Finalização de Partidas (Evento do MatchesService)
        window.Socket.on('game:game_over', () => {
            this.updateCounter('active-matches-count', -1, true);
            // Recarrega estatísticas para atualizar receita e volume circulante
            setTimeout(() => this.loadStats(), 2000);
        });

        // Alertas de Sistema Críticos
        window.Socket.on('notification:received', (data) => {
            if (data.type === 'SYSTEM') {
                this.renderAlert(data);
            }
        });
    }

    /**
     * 📥 CARGA DE DADOS (API REST)
     */
    async loadStats() {
        try {
            // Chamada ao backend corrigido
            const response = await window.API.get(this.endpoint);
            
            if (response && response.status === 'success') {
                const { overview, recentActivity } = response.data;
                
                // Atualiza os Cards Superiores
                this.renderKPIs(overview);
                
                // Renderiza ou Atualiza os Gráficos
                this.initCharts(recentActivity);
                
                // Log de depuração para o Admin
                console.log('[Dashboard] Métricas sincronizadas com o servidor.');
            }
        } catch (error) {
            console.error('[Dashboard] Erro ao carregar estatísticas:', error);
        }
    }

    /**
     * 🃏 RENDERIZAÇÃO DE KPIs (TOP CARDS)
     */
    renderKPIs(data) {
        if (!data) return;

        const totalUsersEl = document.getElementById('total-users-count');
        const onlineUsersEl = document.getElementById('online-users-count');
        const activeMatchesEl = document.getElementById('active-matches-count');
        const revenueEl = document.getElementById('revenue-total');

        if (totalUsersEl) totalUsersEl.innerText = window.Formatters.compactNumber(data.totalUsers);
        if (onlineUsersEl) onlineUsersEl.innerText = data.onlineCount || '0';
        if (activeMatchesEl) activeMatchesEl.innerText = data.activeMatches || '0';
        if (revenueEl) revenueEl.innerText = window.Formatters.currency(data.totalCirculatingKz);
        
        // Indicadores de Crescimento
        if (data.growth) {
            this.renderGrowthIndicator('users-growth', data.growth.users);
            this.renderGrowthIndicator('revenue-growth', data.growth.revenue);
        }
    }

    /**
     * 📈 INICIALIZAÇÃO DE GRÁFICOS (CHART.JS)
     */
    initCharts(activityData) {
        const ctxRevenue = document.getElementById('chart-revenue')?.getContext('2d');
        if (!ctxRevenue) return;

        // Destrói gráfico anterior se existir (para evitar sobreposição em updates)
        if (this.charts.revenue) this.charts.revenue.destroy();

        // Mapeia os dados do backend para o formato do Chart.js
        const labels = activityData.map(item => item.date_label);
        const dataValues = activityData.map(item => parseFloat(item.total_amount));

        this.charts.revenue = new Chart(ctxRevenue, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ['Sem dados'],
                datasets: [{
                    label: 'Volume AKZ',
                    data: dataValues.length > 0 ? dataValues : [0],
                    backgroundColor: '#7C4DFF',
                    borderRadius: 4,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                        ticks: { color: '#6E7191', font: { size: 10 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#6E7191', font: { size: 10 } }
                    }
                }
            }
        });
    }

    /**
     * 📝 FEED DE ATIVIDADE (LOBBY VISUAL)
     */
    pushActivity(message) {
        const container = document.getElementById('realtime-activity-feed');
        if (!container) return;

        const time = new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
        const item = document.createElement('div');
        item.className = 'activity-item animate-right mb-3 d-flex align-items-center';
        item.innerHTML = `
            <div class="activity-dot bg-primary me-3"></div>
            <div class="flex-grow-1">
                <p class="mb-0 small text-main">${message}</p>
                <span class="text-dim" style="font-size: 10px;">${time}</span>
            </div>
        `;

        container.prepend(item);
        
        // Mantém apenas as últimas 6 atividades para performance
        if (container.children.length > 6) {
            container.lastChild.remove();
        }
    }

    /**
     * 🔔 RENDERIZA ALERTA DE SISTEMA
     */
    renderAlert(data) {
        const container = document.getElementById('dashboard-alerts');
        if (!container) return;

        const alertHtml = `
            <div class="alert-card p-3 mb-2 rounded-md bg-dark border-start border-4 border-warning animate-up">
                <div class="d-flex justify-content-between">
                    <span class="fw-bold small text-warning">${data.title}</span>
                </div>
                <p class="text-muted small mb-0 mt-1">${data.message}</p>
            </div>
        `;
        container.insertAdjacentHTML('afterbegin', alertHtml);
    }

    /**
     * 🔢 HELPER: ATUALIZADOR DE CONTADOR ANIMADO
     */
    updateCounter(id, value, isRelative = false) {
        const el = document.getElementById(id);
        if (!el) return;
        
        let current = parseInt(el.innerText.replace(/\D/g, '')) || 0;
        let target = isRelative ? current + value : value;
        
        if (target < 0) target = 0;
        
        // Efeito de pulo visual simples
        el.innerText = target.toLocaleString('pt-AO');
        el.classList.add('animate-scale');
        setTimeout(() => el.classList.remove('animate-scale'), 300);
    }

    renderGrowthIndicator(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        const isPositive = value >= 0;
        el.className = isPositive ? 'text-success small' : 'text-danger small';
        el.innerHTML = `<i class="bi bi-graph-${isPositive ? 'up' : 'down'} me-1"></i> ${Math.abs(value)}%`;
    }

    initAutoRefresh() {
        setInterval(() => this.loadStats(), this.refreshInterval);
    }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.Dashboard = new DashboardModule();
});