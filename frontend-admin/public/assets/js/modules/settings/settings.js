/**
 * OTAKU CLASH ANGOLA - SYSTEM SETTINGS MODULE
 * Senior Software Architect: Platform Governance & Configuration
 */

class SettingsModule {
    constructor() {
        this.endpoint = '/admin/settings';
        this.formId = 'global-settings-form';
        this.settingsData = {};
        
        this.init();
    }

    async init() {
        console.log('[Settings] Inicializando central de configurações...');
        this.setupTabNavigation();
        this.setupEventListeners();
        await this.loadSettings();
    }

    setupEventListeners() {
        // Intercepta o salvamento do formulário principal
        const form = document.getElementById(this.formId);
        if (form) {
            form.addEventListener('submit', (e) => this.handleSave(e));
        }

        // Botão de Salvar Alterações (Floating ou Top bar)
        const btnSave = document.getElementById('btn-save-all-settings');
        if (btnSave) {
            btnSave.addEventListener('click', () => form.requestSubmit());
        }

        // Ações Rápidas (Quick Actions)
        document.querySelectorAll('[data-setting-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-setting-action');
                this.handleQuickAction(action);
            });
        });

        // Toggle de Tema (Preview no Settings)
        const themeRadios = document.querySelectorAll('input[name="theme_preference"]');
        themeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (window.ocAdmin) window.ocAdmin.setTheme(e.target.value);
            });
        });
    }

    /**
     * Gerencia a navegação entre as sub-abas de configurações
     */
    setupTabNavigation() {
        const tabs = document.querySelectorAll('.oc-tab-item');
        const sections = document.querySelectorAll('.settings-section');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-target');
                
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                sections.forEach(s => {
                    s.classList.add('d-none');
                    if (s.id === target) s.classList.remove('d-none');
                });
            });
        });
    }

    /**
     * Carrega as configurações atuais do backend real
     */
    async loadSettings() {
        this.toggleLoading(true);
        try {
            // GET /api/v1/admin/settings
            const response = await window.API.get(this.endpoint);
            
            if (response.status === 'success') {
                this.settingsData = response.data;
                this.mapDataToForm(this.settingsData);
            }
        } catch (error) {
            console.error('[Settings] Erro ao carregar configurações:', error);
            window.showAlert('Erro', 'Falha ao sincronizar configurações com o servidor.', 'error');
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Mapeia o objeto JSON do backend para os inputs do formulário
     */
    mapDataToForm(data) {
        // Mapeamento recursivo de chaves para IDs de input
        const fill = (obj, prefix = '') => {
            for (let key in obj) {
                const value = obj[key];
                const inputId = prefix ? `${prefix}_${key}` : key;
                const element = document.getElementById(inputId);

                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = !!value;
                    } else {
                        element.value = value;
                    }
                } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    fill(value, inputId);
                }
            }
        };

        fill(data);

        // Atualiza UI de preview se necessário (ex: logos)
        if (data.appearance && data.appearance.logo_url) {
            const logoPrev = document.getElementById('logo-preview');
            if (logoPrev) logoPrev.src = data.appearance.logo_url;
        }
    }

    /**
     * Envia as alterações para o backend real
     */
    async handleSave(e) {
        e.preventDefault();
        
        const confirm = await Swal.fire({
            title: 'Salvar Alterações?',
            text: "Algumas mudanças podem exigir o reinício de serviços ou nova autenticação dos usuários.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, aplicar',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (!confirm.isConfirmed) return;

        this.toggleSaveButton(true);

        // Constrói o payload baseado nos campos do formulário
        const formData = new FormData(e.target);
        const payload = {};

        // Lógica para reconstruir objetos aninhados se o backend exigir (ex: appearance.theme)
        formData.forEach((value, key) => {
            if (key.includes('_')) {
                const parts = key.split('_');
                if (!payload[parts[0]]) payload[parts[0]] = {};
                payload[parts[0]][parts[1]] = value === 'on' ? true : value;
            } else {
                payload[key] = value === 'on' ? true : value;
            }
        });

        try {
            // POST ou PATCH /api/v1/admin/settings
            const response = await window.API.post(this.endpoint, payload);
            
            if (response.status === 'success') {
                window.showAlert('Sucesso', 'Configurações atualizadas globalmente.', 'success');
                this.settingsData = response.data;
            }
        } catch (error) {
            console.error('[Settings] Erro ao salvar:', error);
        } finally {
            this.toggleSaveButton(false);
        }
    }

    /**
     * Processa ações rápidas de manutenção
     */
    async handleQuickAction(action) {
        const actionsMap = {
            'clear-cache': { title: 'Limpar Cache', url: '/admin/maintenance/clear-cache', icon: 'bi-lightning' },
            'reindex-search': { title: 'Reindexar Busca', url: '/admin/maintenance/reindex', icon: 'bi-search' },
            'db-backup': { title: 'Backup do Banco', url: '/admin/maintenance/backup', icon: 'bi-database-down' }
        };

        const config = actionsMap[action];
        if (!config) return;

        Swal.fire({
            title: config.title,
            text: `Deseja executar a ação: ${config.title} agora?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--secondary-color)',
            confirmButtonText: 'Executar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Processando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                try {
                    await window.API.post(config.url);
                    Swal.fire('Sucesso', 'Operação concluída com sucesso.', 'success');
                } catch (err) {
                    console.error(`[Settings] Erro na ação ${action}`);
                }
            }
        });
    }

    toggleLoading(show) {
        const loader = document.getElementById('settings-loader');
        if (loader) loader.style.display = show ? 'flex' : 'none';
    }

    toggleSaveButton(loading) {
        const btns = document.querySelectorAll('.btn-save-settings');
        btns.forEach(btn => {
            btn.disabled = loading;
            btn.innerHTML = loading ? 
                `<span class="spinner-border spinner-border-sm me-2"></span> Salvando...` : 
                `<i class="bi bi-check-lg me-2"></i> Salvar Alterações`;
        });
    }
}

// Inicializa o módulo
window.Settings = new SettingsModule();