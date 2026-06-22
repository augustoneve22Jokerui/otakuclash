/**
 * OTAKU CLASH ANGOLA - DASHBOARD CORE MODULE
 * Senior Frontend Engineer: Data Visualization & Real-time Analytics
 */

class DashboardModule {
    constructor() {
        this.endpoint = '/admin/dashboard';
        this.charts = {};
        this.refreshInterval = 300000; // 5 minutos para dados pesados
        
        this.init();
    }

    async init() {
        console.log('[Dashboard] Inicializando central de inteligência...');
        this.setupSocketListeners();
        await this.loadStats();
        this.initAutoRefresh();
    }

    /**
     * Sincronização em Tempo Real via Socket.IO
     * Captura eventos do backend para atualizar KPIs sem refresh
     */
    setupSocketListeners() {
        // Atualização de Usuários Online (Métrica Viva)
        window.Socket.on('presence:online', (data) => {
            this.updateCounter('online-users-count', 1, true);
            this.pushActivity(`Novo usuário conectado: ${data.username}`);
        });

        window.Socket.on('presence:offline', () => {
            this.updateCounter('online-users-count', -1, true);
        });

        // Monitoramento de Partidas
        window.Socket.on('game:match_found', () => {
            this.updateCounter('active-matches-count', 1, true);
        });

        window.Socket.on('game:game_over', () => {
            this.updateCounter('active-matches-count', -1, true);
            this.loadStats(); // Recarrega para atualizar receita se houver aposta
        });

        // Alertas de Sistema
        window.Socket.on('notification:received', (data) => {
            if (data.type === 'SYSTEM') {
                this.renderAlert(data);
            }
        });
    }

    /**
     * Carga de dados inicial do backend real
     */
    async loadStats() {
        try {
            const response = await window.API.get(this.endpoint);
            
            if (response.status === 'success') {
                const { overview, recentActivity, catalogSize } = response.data;
                
                this.renderKPIs(overview);
                this.initCharts(response.data);
                this.renderRecentActivity(recentActivity);
            }
        } catch (error) {
            console.error('[Dashboard] Erro ao carregar estatísticas:', error);
        }
    }

    /**
     * Renderiza os Cards de Indicadores (Topo)
     */
    renderKPIs(data) {
        document.getElementById('total-users-count').innerText = window.Formatters.compactNumber(data.totalUsers);
        document.getElementById('online-users-count').innerText = data.onlineCount || '0'; // Valor vindo do Redis
        document.getElementById('active-matches-count').innerText = data.totalMatches || '0';
        document.getElementById('revenue-total').innerText = window.Formatters.currency(data.totalCirculatingKz);
        
        // Adiciona porcentagens de crescimento se disponíveis no DTO
        if (data.growth) {
            this.renderGrowthIndicator('users-growth', data.growth.users);
            this.renderGrowthIndicator('revenue-growth', data.growth.revenue);
        }
    }

    /**
     * Inicializa Gráficos (Chart.js) seguindo o design Premium
     */
    initCharts(data) {
        const ctxUsers = document.getElementById('chart-new-users')?.getContext('2d');
        const ctxRevenue = document.getElementById('chart-revenue')?.getContext('2d');
        const ctxDifficulty = document.getElementById('chart-difficulty')?.getContext('2d');

        if (ctxUsers) {
            this.charts.users = new Chart(ctxUsers, {
                type: 'line',
                data: {
                    labels: ['06 Mai', '07 Mai', '08 Mai', '09 Mai', '10 Mai', '11 Mai', '12 Mai'],
                    datasets: [{
                        label: 'Novos Usuários',
                        data: [200, 450, 380, 600, 420, 800, 950],
                        borderColor: '#FF3B5C',
                        backgroundColor: 'rgba(255, 59, 92, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6
                    }]
                },
                options: this.getChartOptions()
            });
        }

        if (ctxRevenue) {
            this.charts.revenue = new Chart(ctxRevenue, {
                type: 'bar',
                data: {
                    labels: ['06 Mai', '07 Mai', '08 Mai', '09 Mai', '10 Mai', '11 Mai', '12 Mai'],
                    datasets: [{
                        label: 'Receita (KZ)',
                        data: [300000, 500000, 250000, 700000, 450000, 300000, 600000],
                        backgroundColor: '#7C4DFF',
                        borderRadius: 5
                    }]
                },
                options: this.getChartOptions()
            });
        }

        // Gráfico de Pizza/Doughnut para dificuldade (Catálogo)
        if (ctxDifficulty) {
            this.charts.difficulty = new Chart(ctxDifficulty, {
                type: 'doughnut',
                data: {
                    labels: ['Fácil', 'Médio', 'Difícil'],
                    datasets: [{
                        data: [35, 40, 25],
                        backgroundColor: ['#00D1FF', '#FFAB2D', '#FF3B5C'],
                        borderWidth: 0,
                        cutout: '70%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
        }
    }

    /**
     * Configurações visuais padrão para os gráficos
     */
    getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { color: '#A0A3BD', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#A0A3BD', font: { size: 10 } }
                }
            }
        };
    }

    /**
     * Feed de Atividade em Tempo Real
     */
    pushActivity(message) {
        const container = document.getElementById('realtime-activity-feed');
        if (!container) return;

        const item = document.createElement('div');
        item.className = 'activity-item animate-right mb-3 d-flex align-items-center';
        item.innerHTML = `
            <div class="activity-dot bg-primary me-3"></div>
            <div class="flex-grow-1">
                <p class="mb-0 small text-main">${message}</p>
                <span class="text-dim" style="font-size: 10px;">agora</span>
            </div>
        `;

        container.prepend(item);
        if (container.children.length > 5) container.lastChild.remove();
    }

    /**
     * Renderiza Alertas de Saúde/Sistema
     */
    renderAlert(data) {
        const container = document.getElementById('dashboard-alerts');
        if (!container) return;

        const alertHtml = `
            <div class="alert-card p-3 mb-2 rounded-md bg-dark border-start border-4 ${data.priority === 'CRITICAL' ? 'border-danger' : 'border-warning'} animate-up">
                <div class="d-flex justify-content-between">
                    <span class="fw-bold small">${data.title}</span>
                    <span class="badge ${data.priority === 'CRITICAL' ? 'bg-danger' : 'bg-warning'} text-dark" style="font-size: 9px;">${data.priority}</span>
                </div>
                <p class="text-muted small mb-0 mt-1">${data.message}</p>
            </div>
        `;
        container.insertAdjacentHTML('afterbegin', alertHtml);
    }

    /**
     * Helper para atualizar contadores com animação suave
     */
    updateCounter(id, value, relative = false) {
        const el = document.getElementById(id);
        if (!el) return;
        
        let current = parseInt(el.innerText.replace(/\D/g, '')) || 0;
        let target = relative ? current + value : value;
        
        if (target < 0) target = 0;
        el.innerText = target.toLocaleString('pt-AO');
    }

    renderGrowthIndicator(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        const isPositive = value >= 0;
        el.className = isPositive ? 'text-success small' : 'text-danger small';
        el.innerHTML = `<i class="bi bi-graph-${isPositive ? 'up' : 'down'} me-1"></i> ${Math.abs(value)}% este mês`;
    }

    renderRecentActivity(activities) {
        // Implementar se o backend retornar lista de logs recentes formatada
    }

    initAutoRefresh() {
        setInterval(() => this.loadStats(), this.refreshInterval);
    }
}

// Inicializa o módulo
window.Dashboard = new DashboardModule();