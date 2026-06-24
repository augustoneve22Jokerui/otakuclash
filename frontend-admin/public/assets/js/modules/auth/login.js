/**
 * 🔐 OTAKU CLASH ANGOLA - LOGIN MODULE
 * Versão: 2.0.0 - Enterprise Standard & Role Validation Edition
 * Senior Security & Frontend Engineer: Authentication Flow
 * Descrição: Gerenciador do fluxo de autenticação do Painel Administrativo com proteção
 *            de privilégios para perfis ADMIN e MODERATOR, interface responsiva e SweetAlert2.
 */

class LoginModule {
    constructor() {
        this.formId = 'login-form';
        this.endpoint = '/auth/login';
        this.submitBtnId = 'btn-login';
        
        this.init();
    }

    init() {
        console.log('[Auth] Inicializando módulo de login...');
        
        // 1. Verificação de sessão pré-existente para evitar logins redundantes
        if (window.Auth && window.Auth.isAuthenticated()) {
            console.log('[Auth] Sessão ativa detectada. Redirecionando para dashboard...');
            window.location.href = '/dashboard';
            return;
        }

        this.setupEventListeners();
        this.setupUI();
    }

    setupEventListeners() {
        const form = document.getElementById(this.formId);
        if (form) {
            form.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Alternar visibilidade do campo de senha (Input Masking Toggle)
        const togglePassword = document.getElementById('toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const passwordInput = document.getElementById('password');
                const icon = togglePassword.querySelector('i');
                
                if (passwordInput && icon) {
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        icon.classList.replace('bi-eye', 'bi-eye-slash');
                    } else {
                        passwordInput.type = 'password';
                        icon.classList.replace('bi-eye-slash', 'bi-eye');
                    }
                }
            });
        }
    }

    setupUI() {
        // Efeito de entrada suave no card de login (Fade-in com transição acelerada via Hardware)
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
            loginCard.style.opacity = '0';
            loginCard.style.transform = 'translateY(20px)';
            setTimeout(() => {
                loginCard.style.transition = 'opacity 0.6s ease-in-out, transform 0.6s ease-out';
                loginCard.style.opacity = '1';
                loginCard.style.transform = 'translateY(0)';
            }, 100);
        }
    }

    /**
     * Processa a tentativa de login consumindo a API real do backend
     */
    async handleLogin(e) {
        e.preventDefault();

        // 1. Validação de integridade dos dados (Client-side)
        if (!window.Validators || !window.Validators.validateForm(this.formId)) {
            console.warn('[Auth] Validação de formulário falhou ou validador ausente.');
            return;
        }

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (!emailInput || !passwordInput) {
            this.showLoginError('Campos do formulário não foram localizados no DOM.');
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        this.toggleButtonLoading(true);

        try {
            /**
             * 2. Chamada ao Backend Real via API Client
             * O interceptor em api.js já retorna response.data diretamente.
             */
            const response = await window.API.post(this.endpoint, {
                email: email,
                password: password
            }, { silent: true }); // Desativamos o alerta automático do api.js para tratar localmente de forma customizada

            // 3. Validação do status estrutural da resposta
            if (response && response.status === 'success') {
                const { tokens, user } = response.data;

                // 4. Verificação de permissão administrativa (🛡️ Role Guard)
                // Apenas ADMIN e MODERATOR podem quebrar a barreira de login do Painel Admin
                if (!user || !user.role || !['ADMIN', 'MODERATOR'].includes(user.role)) {
                    throw new Error('Acesso negado. Sua conta não possui privilégios administrativos.');
                }

                // 5. Persistência da sessão através do gerenciador central de estado de Auth
                const saved = window.Auth.saveSession(tokens, user);

                if (saved) {
                    this.showLoginSuccess(user.username);
                } else {
                    throw new Error('Falha crítica ao inicializar persistência de sessão local.');
                }
            } else {
                throw new Error(response.message || 'Falha na autenticação.');
            }

        } catch (error) {
            console.error('[Auth] Erro durante o fluxo de login:', error);
            
            let message = 'E-mail ou senha incorretos.';
            
            // Tratamento refinado de mensagens específicas da API ou exceções locais disparadas
            if (error.response && error.response.data) {
                message = error.response.data.message || message;
            } else if (error.message) {
                message = error.message;
            }

            this.showLoginError(message);
        } finally {
            this.toggleButtonLoading(false);
        }
    }

    /**
     * Helpers de UI e Controle de Estado de Elementos Gráficos
     */
    toggleButtonLoading(isLoading) {
        const btn = document.getElementById(this.submitBtnId);
        if (!btn) return;

        const spinner = btn.querySelector('.spinner-border');
        const text = btn.querySelector('.btn-text');

        if (isLoading) {
            btn.disabled = true;
            if (spinner) spinner.classList.remove('d-none');
            if (text) text.innerText = 'Autenticando...';
        } else {
            btn.disabled = false;
            if (spinner) spinner.classList.add('d-none');
            if (text) text.innerText = 'Entrar no Painel';
        }
    }

    showLoginSuccess(username) {
        if (typeof Swal === 'undefined') {
            alert(`Bem-vindo, ${username}!`);
            window.location.href = '/dashboard';
            return;
        }

        Swal.fire({
            title: `Bem-vindo, ${username}!`,
            text: 'Acesso autorizado. Carregando dashboard...',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            timerProgressBar: true,
            didClose: () => {
                window.location.href = '/dashboard';
            }
        });
    }

    showLoginError(message) {
        if (typeof Swal === 'undefined') {
            alert(message);
            return;
        }

        Swal.fire({
            title: 'Erro de Autenticação',
            text: message,
            icon: 'error',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            customClass: {
                popup: 'oc-card rounded-md'
            }
        });
    }
}

// Inicialização imediata assim que a árvore do DOM estiver totalmente construída
document.addEventListener('DOMContentLoaded', () => {
    window.LoginModule = new LoginModule();
});
