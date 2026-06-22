/**
 * OTAKU CLASH ANGOLA - LOGIN MODULE
 * Senior Security & Frontend Engineer: Authentication Flow
 */

class LoginModule {
    constructor() {
        this.formId = 'login-form';
        this.endpoint = '/auth/login';
        
        this.init();
    }

    init() {
        console.log('[Auth] Inicializando módulo de login...');
        
        // Verifica se já está logado para evitar tela de login desnecessária
        if (window.Auth.isAuthenticated()) {
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

        // Toggle visibilidade da senha
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
        // Efeito de fade-in no formulário
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
            loginCard.style.opacity = '0';
            setTimeout(() => {
                loginCard.style.transition = 'opacity 0.8s ease-in-out';
                loginCard.style.opacity = '1';
            }, 100);
        }
    }

    /**
     * Processa a tentativa de login no backend real
     */
    async handleLogin(e) {
        e.preventDefault();

        // 1. Validação Client-side (Data Integrity)
        if (!window.Validators.validateForm(this.formId)) {
            return;
        }

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me')?.checked;

        this.toggleButtonLoading(true);

        try {
            /**
             * Chamada ao Backend Real
             * Endpoint: POST /api/v1/auth/login
             * Payload: { email, password }
             */
            const response = await window.API.post(this.endpoint, {
                email: email.trim(),
                password: password
            }, { silent: true }); // Usamos silent: true para tratar o erro manualmente aqui

            if (response.status === 'success' || response.tokens) {
                // 2. Extração de dados conforme DTO do Backend
                const { tokens, user } = response.data || response;

                // 3. Validação de Role (Apenas ADMIN ou MODERATOR acessam o painel)
                if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
                    throw new Error('Acesso negado. Este painel é restrito à equipe administrativa.');
                }

                // 4. Salva Sessão via AuthManager (LocalStorage/Persistent)
                window.Auth.saveSession(tokens, user);

                // 5. Feedback Visual e Redirecionamento
                this.showLoginSuccess(user.username);
            }
        } catch (error) {
            console.error('[Auth] Erro no login:', error);
            
            let message = 'E-mail ou senha incorretos.';
            if (error.message && error.message.includes('Acesso negado')) {
                message = error.message;
            } else if (error.response && error.response.data) {
                message = error.response.data.message || message;
            }

            this.showLoginError(message);
        } finally {
            this.toggleButtonLoading(false);
        }
    }

    /**
     * Helpers de UI e Feedback
     */
    toggleButtonLoading(isLoading) {
        const btn = document.getElementById('btn-login');
        const spinner = btn.querySelector('.spinner-border');
        const text = btn.querySelector('.btn-text');

        if (isLoading) {
            btn.disabled = true;
            spinner.classList.remove('d-none');
            text.innerText = 'Autenticando...';
        } else {
            btn.disabled = false;
            spinner.classList.add('d-none');
            text.innerText = 'Entrar no Painel';
        }
    }

    showLoginSuccess(username) {
        Swal.fire({
            title: `Bem-vindo, ${username}!`,
            text: 'Autenticação realizada com sucesso. Redirecionando...',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            willClose: () => {
                window.location.href = '/dashboard';
            }
        });
    }

    showLoginError(message) {
        Swal.fire({
            title: 'Falha na Autenticação',
            text: message,
            icon: 'error',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });
    }
}

// Inicializa o módulo de login
document.addEventListener('DOMContentLoaded', () => {
    window.Login = new LoginModule();
});