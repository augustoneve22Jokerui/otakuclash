/**
 * 🔐 OTAKU CLASH ANGOLA - LOGIN MODULE
 * Versão: 2.0.0 - Enterprise Standard
 * Senior Security & Frontend Engineer: Authentication Flow
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
        
        // 1. Verificação de sessão pré-existente
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

        // Alternar visibilidade da senha
        const togglePassword = document.getElementById('toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const passwordInput = document.getElementById('password');
                const icon = togglePassword.querySelector('i');
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.replace('bi-eye', 'bi-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.replace('bi-eye-slash', 'bi-eye');
                }
            });
        }
    }

    setupUI() {
        // Efeito de entrada suave no card de login
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
            loginCard.style.opacity = '0';
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
            console.warn('[Auth] Validação de formulário falhou.');
            return;
        }

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        this.toggleButtonLoading(true);

        try {
            /**
             * 2. Chamada ao Backend Real via API Client
             * O interceptor em api.js já retorna response.data
             */
            const response = await window.API.post(this.endpoint, {
                email: email,
                password: password
            }, { silent: true }); // Desativamos o alerta automático do api.js para tratar aqui

            // 3. Validação do status da resposta
            if (response && response.status === 'success') {
                const { tokens, user } = response.data;

                // 4. Verificação de permissão administrativa
                // Apenas ADMIN e MODERATOR podem acessar o Painel Admin
                if (!['ADMIN', 'MODERATOR'].includes(user.role)) {
                    throw new Error('Acesso negado. Sua conta não possui privilégios administrativos.');
                }

                // 5. Persistência da sessão
                const saved = window.Auth.saveSession(tokens, user);

                if (saved) {
                    this.showLoginSuccess(user.username);
                } else {
                    throw new Error('Falha crítica ao inicializar persistência de sessão.');
                }
            } else {
                throw new Error(response.message || 'Falha na autenticação.');
            }

        } catch (error) {
            console.error('[Auth] Erro durante o fluxo de login:', error);
            
            let message = 'E-mail ou senha incorretos.';
            
            // Tratamento de mensagens específicas do backend ou do erro lançado
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
     * Helpers de UI e Feedback Visual
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

// Inicialização imediata
document.addEventListener('DOMContentLoaded', () => {
    window.LoginModule = new LoginModule();
});