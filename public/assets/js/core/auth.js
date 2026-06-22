/**
 * OTAKU CLASH ANGOLA - AUTHENTICATION MANAGER
 * Senior Security & Frontend Engineer: Session & Identity Management
 */

const AuthManager = {
    // Chaves de armazenamento
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'oc_admin_access_token',
        REFRESH_TOKEN: 'oc_admin_refresh_token',
        USER_DATA: 'oc_admin_user_info'
    },

    /**
     * Inicia a sessão após login bem-sucedido
     * @param {Object} tokens - { accessToken, refreshToken }
     * @param {Object} user - Dados do perfil do admin
     */
    saveSession(tokens, user) {
        if (!tokens.accessToken) return false;

        localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
        
        if (tokens.refreshToken) {
            localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
        }

        if (user) {
            localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
        }

        return true;
    },

    /**
     * Recupera o token de acesso atual
     */
    getAccessToken() {
        return localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
    },

    /**
     * Recupera o token de renovação
     */
    getRefreshToken() {
        return localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
    },

    /**
     * Recupera os dados do usuário logado
     */
    getUser() {
        const user = localStorage.getItem(this.STORAGE_KEYS.USER_DATA);
        return user ? JSON.parse(user) : null;
    },

    /**
     * Verifica se existe uma sessão ativa
     */
    isAuthenticated() {
        const token = this.getAccessToken();
        if (!token) return false;

        // Validação básica de expiração via Base64 do payload do JWT
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            return payload.exp > now;
        } catch (e) {
            return false;
        }
    },

    /**
     * Limpa todos os dados de sessão e redireciona para o login
     */
    logout() {
        localStorage.removeItem(this.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(this.STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(this.STORAGE_KEYS.USER_DATA);
        
        // Evita loop de redirecionamento se já estiver no login
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    },

    /**
     * Lógica de proteção de rota client-side
     */
    checkAuth() {
        const isLoginPage = window.location.pathname === '/login';
        const authenticated = this.isAuthenticated();

        if (!authenticated && !isLoginPage) {
            this.logout();
        }

        if (authenticated && isLoginPage) {
            window.location.href = '/dashboard';
        }
    },

    /**
     * Atualiza dados do usuário em tempo real (ex: após mudar avatar ou nome)
     */
    updateUser(newData) {
        const currentUser = this.getUser();
        if (currentUser) {
            const updated = { ...currentUser, ...newData };
            localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(updated));
            return updated;
        }
        return null;
    }
};

// Execução imediata da verificação de segurança ao carregar o script
AuthManager.checkAuth();

// Expor globalmente para uso nos módulos
window.Auth = AuthManager;