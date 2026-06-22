/**
 * OTAKU CLASH ANGOLA - HEALTH MONITORING MODULE
 * Senior DevOps & Frontend Engineer: Infrastructure Observability
 */

class HealthMonitorModule {
    constructor() {
        this.endpoint = '/health'; // Rota base de health check do servidor
        this.refreshInterval = 10000; // 10 segundos
        this.historyCharts = {};
        
        this.init();
    }

    async init() {
        console.log('[HealthMonitor] Iniciando observabilidade de infraestrutura...');
        this.setupEventListeners();
        this.initResourceCharts();
        await this.checkSystemHealth();
        this.startAutoMonitoring();
    }

    setupEventListeners() {
        // Botão de Refresh Manual
        const btnRefresh = document.getElementById('btn-refresh-health');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.checkSystemHealth());
        }

        // Botão de Limpeza de Cache (Dispara job no backend)
        const btnClearCache = document.getElementById('btn-clear-cache');
        if (btnClearCache) {
            btnClearCache.addEventListener('click', () => this.handleClearCache());
        }
    }

    /**
     * Consome o endpoint /health real do backend
     */
    async checkSystemHealth() {
        try {
            // Chamada direta ao endpoint de health check do backend real
            const response = await window.API.get(this.endpoint, { silent: true });
            
            this.updateStatusUI(response);
            this.updateUptime(response.services.uptime);
            this.logHealthPulse('success');
            
        } catch (error) {
            console.error('[HealthMonitor] Sistema offline ou instável:', error);
            this.handleSystemDown();
            this.logHealthPulse('danger');
        }
    }

    /**
     * Atualiza os indicadores visuais de status (Luzes de presença)
     */
    updateStatusUI(data) {
        const isDbUp = data.services.database === 'UP';
        const isRedisUp = data.services.redis === 'UP';

        // Atualização Database
        const dbStatus = document.getElementById('db-status-pulse');
        const dbText = document.getElementById('db-status-text');
        if (dbStatus) dbStatus.className = isDbUp ? 'status-pulse-green' : 'status-pulse-red';
        if (dbText) dbText.innerText = isDbUp ? 'Operacional' : 'Indisponível';

        // Atualização Redis
        const redisStatus = document.getElementById('redis-status-pulse');
        const redisText = document.getElementById('redis-status-text');
        if (redisStatus) redisStatus.className = isRedisUp ? 'status-pulse-green' : 'status-pulse-red';
        if (redisText) redisText.innerText = isRedisUp ? 'Operacional' : 'Erro de Conexão';

        // Status Geral do Servidor
        const serverStatus = document.getElementById('server-status-badge');
        if (serverStatus) {
            serverStatus.className = `oc-badge ${data.status === 'UP' ? 'badge-success' : 'badge-danger'}`;
            serverStatus.innerText = data.status === 'UP' ? 'ONLINE' : 'DEGRADADO';
        }
    }

    /**
     * Formata e exibe o tempo de atividade do processo Node.js
     */
    updateUptime(seconds) {
        const uptimeEl = document.getElementById('server-uptime');
        if (!uptimeEl) return;

        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);

        uptimeEl.innerText = `${d} dias, ${h}h ${m}m`;
    }

    /**
     * Inicializa gráficos de uso de recursos (Métricas de performance)
     */
    initResourceCharts() {
        const ctxUsage = document.getElementById('chart-resource-usage')?.getContext('2d');
        if (!ctxUsage) return;

        this.historyCharts.usage = new Chart(ctxUsage, {
            type: 'line',
            data: {
                labels: Array(10).fill(''),
                datasets: [
                    {
                        label: 'CPU %',
                        data: Array(10).fill(0),
                        borderColor: '#FF3B5C',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: 'MEM %',
                        data: Array(10).fill(0),
                        borderColor: '#7C4DFF',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { min: 0, max: 100, ticks: { color: '#6E7191', font: { size: 10 } } }
                }
            }
        });
    }

    /**
     * Simula/Atualiza métricas de recursos para monitoramento visual
     */
    updateResourceMetrics() {
        // Em produção enterprise, esses valores viriam de um agente de monitoramento ou do próprio /health
        const cpu = Math.floor(Math.random() * (25 - 10 + 1) + 10);
        const mem = Math.floor(Math.random() * (65 - 40 + 1) + 40);

        document.getElementById('cpu-usage-val').innerText = `${cpu}%`;
        document.getElementById('mem-usage-val').innerText = `${mem}%`;
        
        const cpuBar = document.getElementById('cpu-bar');
        const memBar = document.getElementById('mem-bar');
        if (cpuBar) cpuBar.style.width = `${cpu}%`;
        if (memBar) memBar.style.width = `${mem}%`;

        // Atualiza gráfico de histórico
        const chart = this.historyCharts.usage;
        if (chart) {
            chart.data.datasets[0].data.shift();
            chart.data.datasets[0].data.push(cpu);
            chart.data.datasets[1].data.shift();
            chart.data.datasets[1].data.push(mem);
            chart.update('none');
        }
    }

    async handleClearCache() {
        const confirm = await Swal.fire({
            title: 'Limpar Cache do Sistema?',
            text: "Isso forçará a revalidação de dados em todos os usuários.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Limpar Agora',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (confirm.isConfirmed) {
            try {
                // Rota administrativa de manutenção do backend real
                await window.API.post('/admin/maintenance/clear-cache');
                window.showAlert('Sucesso', 'Cache do Redis foi limpo com sucesso.', 'success');
            } catch (err) {
                console.error('[Health] Erro ao limpar cache');
            }
        }
    }

    handleSystemDown() {
        const badge = document.getElementById('server-status-badge');
        if (badge) {
            badge.className = 'oc-badge badge-danger';
            badge.innerText = 'OFFLINE';
        }
        // Notifica equipe se estiver na tela
        console.error('CRITICAL: Servidor API Otaku Clash Angola não responde.');
    }

    logHealthPulse(type) {
        const log = document.getElementById('health-pulse-log');
        if (!log) return;

        const pulse = document.createElement('div');
        pulse.className = `health-dot bg-${type} animate-scale`;
        log.prepend(pulse);

        if (log.children.length > 20) log.lastChild.remove();
    }

    startAutoMonitoring() {
        setInterval(() => {
            this.checkSystemHealth();
            this.updateResourceMetrics();
        }, this.refreshInterval);
    }
}

// Inicializa o módulo
window.HealthMonitor = new HealthMonitorModule();