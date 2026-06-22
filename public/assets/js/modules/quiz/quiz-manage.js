/**
 * OTAKU CLASH ANGOLA - QUIZ MANAGEMENT MODULE
 * Senior Frontend Engineer: Game Rules & Session Monitoring
 */

class QuizManageModule {
    constructor() {
        this.endpoint = '/quiz';
        this.adminEndpoint = '/admin/dashboard'; // Para métricas globais
        this.table = null;
        this.sessions = [];
        
        this.init();
    }

    async init() {
        console.log('[QuizManage] Inicializando controle de quiz...');
        this.setupEventListeners();
        await this.loadQuizSettings();
        await this.loadRecentSessions();
    }

    setupEventListeners() {
        // Form de Configurações Globais
        const settingsForm = document.getElementById('quiz-settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => this.handleSaveSettings(e));
        }

        // Refresh de Sessões
        const btnRefresh = document.getElementById('btn-refresh-sessions');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadRecentSessions());
        }

        // Botão de Limpeza de Sessões Abandonadas (Cache maintenance)
        const btnCleanup = document.getElementById('btn-cleanup-sessions');
        if (btnCleanup) {
            btnCleanup.addEventListener('click', () => this.handleCleanupCache());
        }
    }

    /**
     * Carrega configurações atuais do backend
     */
    async loadQuizSettings() {
        try {
            // Nota: No backend real, estas configs podem estar no Settings do Admin
            const response = await window.API.get('/admin/settings/quiz');
            if (response.status === 'success') {
                this.fillSettingsForm(response.data);
            }
        } catch (error) {
            console.warn('[QuizManage] Usando valores padrão para configurações.');
        }
    }

    fillSettingsForm(data) {
        if (!data) return;
        document.getElementById('base_points').value = data.basePoints || 10;
        document.getElementById('bonus_speed_threshold').value = data.speedThreshold || 5;
        document.getElementById('max_questions_solo').value = data.maxQuestionsSolo || 10;
        document.getElementById('cooldown_between_quizzes').value = data.cooldown || 0;
    }

    /**
     * Carrega histórico de sessões recentes para monitoramento
     */
    async loadRecentSessions() {
        this.toggleLoading(true);
        try {
            // GET /api/v1/quiz/admin/sessions (Endpoint hipotético para auditoria)
            const response = await window.API.get(`${this.endpoint}/history`, { params: { limit: 50 } });
            
            if (response.status === 'success') {
                this.sessions = response.data;
                this.renderSessionsTable(this.sessions);
            }
        } catch (error) {
            console.error('[QuizManage] Erro ao carregar sessões:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza a tabela de monitoramento de sessões
     */
    renderSessionsTable(data) {
        const container = document.querySelector('#quiz-sessions-table tbody');
        if (!container) return;

        if (this.table) this.table.destroy();

        container.innerHTML = data.map(session => `
            <tr class="animate-up">
                <td>
                    <div class="fw-bold text-main">#${session.sessionId.substring(0, 8)}</div>
                    <small class="text-dim">${window.Formatters.date(session.date, true)}</small>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="/assets/img/placeholders/avatar.png" class="oc-avatar-sm rounded-circle me-2">
                        <span class="fw-500">${session.username || 'Usuário'}</span>
                    </div>
                </td>
                <td>
                    <span class="oc-badge badge-info">${session.mode}</span>
                </td>
                <td>
                    <div class="text-secondary fw-bold">${session.animeTitle}</div>
                </td>
                <td>
                    <div class="text-primary fw-900">${session.score} PTS</div>
                </td>
                <td class="text-end">
                    <button class="btn-oc btn-oc-outline btn-sm" onclick="QuizManage.viewPerformance('${session.sessionId}')">
                        <i class="bi bi-bar-chart-line me-1"></i> Analisar
                    </button>
                </td>
            </tr>
        `).join('');

        this.table = $('#quiz-sessions-table').DataTable({
            pageLength: 10,
            searching: true,
            lengthChange: false,
            info: false,
            dom: 'tp',
            language: { 
                search: "", 
                searchPlaceholder: "Filtrar sessões...",
                paginate: { next: '>', previous: '<' } 
            }
        });
    }

    /**
     * Visualiza o desempenho detalhado da sessão (Acertos/Erros/Tempo)
     */
    async viewPerformance(sessionId) {
        try {
            const response = await window.API.get(`${this.endpoint}/results/${sessionId}`);
            if (response.status === 'success') {
                const res = response.data;
                
                Swal.fire({
                    title: `Relatório de Sessão #${sessionId.substring(0, 8)}`,
                    html: `
                        <div class="text-start mt-3">
                            <div class="row g-3 text-center mb-4">
                                <div class="col-4">
                                    <div class="oc-card bg-dark p-2 border-secondary">
                                        <small class="text-muted d-block">Acertos</small>
                                        <span class="text-success fw-bold">${res.performance.correct}/${res.performance.total}</span>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="oc-card bg-dark p-2 border-secondary">
                                        <small class="text-muted d-block">Precisão</small>
                                        <span class="text-info fw-bold">${res.performance.accuracy}</span>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="oc-card bg-dark p-2 border-secondary">
                                        <small class="text-muted d-block">XP Ganho</small>
                                        <span class="text-primary fw-bold">+${res.rewards.xp}</span>
                                    </div>
                                </div>
                            </div>
                            <label class="oc-label">Análise de Tempo:</label>
                            <p class="text-dim small">Tempo médio de resposta: <strong>${res.performance.avgTime || 'N/A'}s</strong></p>
                        </div>
                    `,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    confirmButtonColor: 'var(--secondary-color)',
                    confirmButtonText: 'Fechar Relatório'
                });
            }
        } catch (err) {
            window.showAlert('Erro', 'Não foi possível recuperar os detalhes desta sessão.', 'error');
        }
    }

    /**
     * Salva as configurações globais de regras do jogo
     */
    async handleSaveSettings(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        this.toggleBtnLoading('btn-save-settings', true);

        try {
            const response = await window.API.post('/admin/settings/quiz', data);
            if (response.status === 'success') {
                window.showAlert('Sucesso', 'Regras do quiz atualizadas globalmente.', 'success');
            }
        } catch (error) {
            console.error('[QuizManage] Erro ao salvar configs');
        } finally {
            this.toggleBtnLoading('btn-save-settings', false);
        }
    }

    /**
     * Limpa sessões expiradas ou abandonadas no Redis via Job do Backend
     */
    async handleCleanupCache() {
        const confirm = await Swal.fire({
            title: 'Limpeza de Cache?',
            text: "Isso encerrará sessões de quiz inativas presas na memória do servidor.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Executar Limpeza',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (confirm.isConfirmed) {
            try {
                // Chama job de limpeza: POST /api/v1/admin/jobs/cleanup-cache
                await window.API.post('/admin/jobs/cleanup-cache', { type: 'SESSIONS' });
                window.showAlert('Sucesso', 'Sessões órfãs removidas com sucesso.', 'success');
                this.loadRecentSessions();
            } catch (err) {
                console.error('[QuizManage] Erro ao executar job');
            }
        }
    }

    toggleLoading(show) {
        const loader = document.getElementById('sessions-loader');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        const table = document.getElementById('quiz-sessions-table');
        if (table) table.style.opacity = show ? '0.3' : '1';
    }

    toggleBtnLoading(btnId, loading) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = loading;
        btn.innerHTML = loading ? `<span class="spinner-border spinner-border-sm me-2"></span> Processando...` : `Salvar Configurações`;
    }
}

// Inicializa o módulo
window.QuizManage = new QuizManageModule();