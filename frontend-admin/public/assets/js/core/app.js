/**
 * OTAKU CLASH ANGOLA - CORE APP ENGINE
 * Senior Frontend Engineer: Core UI Orchestration
 */

class OtakuClashAdmin {
    constructor() {
        this.themeStorageKey = 'oc_admin_theme';
        this.sidebarId = 'sidebar';
        this.sidebarToggleId = 'sidebarToggle';
        this.mainContentId = 'main-content';
        
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupTheme();
            this.setupSidebar();
            this.initPlugins();
            this.handleActiveLinks();
            this.setupGlobalListeners();
        });
    }

    /**
     * Gerenciamento de Tema (Dark/Light)
     * Persiste a escolha do usuário no LocalStorage
     */
    setupTheme() {
        const savedTheme = localStorage.getItem(this.themeStorageKey) || 'dark';
        this.setTheme(savedTheme);

        const themeToggles = document.querySelectorAll('.theme-toggle-btn');
        themeToggles.forEach(btn => {
            btn.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                this.setTheme(newTheme);
            });
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.themeStorageKey, theme);
        
        // Atualiza ícones dos botões se existirem
        const themeIcons = document.querySelectorAll('.theme-toggle-icon');
        themeIcons.forEach(icon => {
            if (theme === 'light') {
                icon.classList.replace('bi-moon-stars', 'bi-sun');
            } else {
                icon.classList.replace('bi-sun', 'bi-moon-stars');
            }
        });
    }

    /**
     * Gerenciamento da Sidebar
     * Lógica para colapso e responsividade
     */
    setupSidebar() {
        const toggleBtn = document.getElementById(this.sidebarToggleId);
        const sidebar = document.getElementById(this.sidebarId);
        const content = document.getElementById(this.mainContentId);

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                sidebar.classList.toggle('collapsed');
                if (content) content.classList.toggle('expanded');
                
                // Salva estado para desktop se necessário
                if (window.innerWidth > 991) {
                    localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
                }
            });
        }

        // Fecha sidebar ao clicar fora em telas pequenas
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 992) {
                if (sidebar && !sidebar.contains(e.target) && !toggleBtn.contains(e.target) && !sidebar.classList.contains('collapsed')) {
                    sidebar.classList.add('collapsed');
                }
            }
        });
    }

    /**
     * Inicialização de Plugins de Terceiros
     */
    initPlugins() {
        // Inicializa AOS (Animate On Scroll)
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 800,
                once: true,
                offset: 50,
                disable: 'mobile'
            });
        }

        // Inicializa Tooltips do Bootstrap
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        // Inicializa Popovers do Bootstrap
        const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
        popoverTriggerList.map(function (popoverTriggerEl) {
            return new bootstrap.Popover(popoverTriggerEl);
        });
    }

    /**
     * Refinamento estético dos links ativos
     */
    handleActiveLinks() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.sidebar .nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (currentPath === href || (href !== '/' && currentPath.startsWith(href))) {
                link.classList.add('active');
                // Abre o collapse pai se o link estiver dentro de um menu dropdown
                const parentCollapse = link.closest('.collapse');
                if (parentCollapse) {
                    const collapseId = parentCollapse.id;
                    const trigger = document.querySelector(`[data-bs-target="#${collapseId}"]`);
                    if (trigger) {
                        trigger.classList.remove('collapsed');
                        parentCollapse.classList.add('show');
                    }
                }
            }
        });
    }

    /**
     * Listeners Globais de Utilidade
     */
    setupGlobalListeners() {
        // Escuta redimensionamento para ajustar layout
        window.addEventListener('resize', () => {
            if (window.innerWidth < 992) {
                const sidebar = document.getElementById(this.sidebarId);
                if (sidebar) sidebar.classList.add('collapsed');
            }
        });

        // Formatação automática de inputs de pesquisa
        const searchInputs = document.querySelectorAll('.search-input');
        searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                // Lógica de debounce pode ser adicionada aqui se necessário
            });
        });
    }
}

// Inicializa a aplicação
const ocAdmin = new OtakuClashAdmin();

// Expor utilitário de alerta rápido globalmente se necessário
window.showAlert = (title, text, icon = 'info') => {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title,
            text,
            icon,
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            confirmButtonColor: 'var(--primary-color)',
            customClass: {
                popup: 'oc-card rounded-md'
            }
        });
    } else {
        alert(text);
    }
};