/**
 * 🔐 OTAKU CLASH ANGOLA - AUTHENTICATION MANAGER
 * Versão: 2.0.0 - Enterprise Secured
 * Senior Security & Frontend Engineer: Session & Identity Management
 */

const AuthManager = {
    // Chaves de armazenamento persistente
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'oc_admin_access_token',
        REFRESH_TOKEN: 'oc_admin_refresh_token',
        USER_DATA: 'oc_admin_user_info'
    },

    /**
     * 💾 SALVA SESSÃO (LOGIN)
     * @param {Object} tokens - { accessToken, refreshToken }
     * @param {Object} user - Dados do perfil administrativo
     */
    saveSession(tokens, user) {
        if (!tokens || !tokens.accessToken) {
            console.error('[Auth] Falha ao salvar: Tokens ausentes.');
            return false;
        }

        localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
        
        if (tokens.refreshToken) {
            localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
        }

        if (user) {
            localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
        }

        console.log('[Auth] Sessão persistida com sucesso.');
        return true;
    },

    /**
     * 🎟️ RECUPERA ACCESS TOKEN
     */
    getAccessToken() {
        return localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
    },

    /**
     * 🔄 RECUPERA REFRESH TOKEN
     */
    getRefreshToken() {
        return localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
    },

    /**
     * 👤 RECUPERA DADOS DO UTILIZADOR
     */
    getUser() {
        const user = localStorage.getItem(this.STORAGE_KEYS.USER_DATA);
        try {
            return user ? JSON.parse(user) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * ✅ VERIFICA SE ESTÁ AUTENTICADO
     * Valida presença do token e expiração temporal (client-side check).
     */
    isAuthenticated() {
        const token = this.getAccessToken();
        if (!token) return false;

        try {
            // Decodifica o payload do JWT (Parte central do token)
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const payload = JSON.parse(jsonPayload);
            const now = Math.floor(Date.now() / 1000);

            // Verifica se o token ainda é válido por pelo menos mais 10 segundos
            return payload.exp > (now + 10);
        } catch (e) {
            console.error('[Auth] Erro ao validar expiração do token:', e);
            return false;
        }
    },

    /**
     * 🚪 LOGOUT GLOBAL
     * Limpa armazenamento e redireciona para login.
     */
    logout() {
        console.log('[Auth] Encerrando sessão administrativa...');
        
        localStorage.removeItem(this.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(this.STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(this.STORAGE_KEYS.USER_DATA);
        
        // Desconecta o socket se estiver ativo
        if (window.Socket) {
            window.Socket.disconnect();
        }

        // Redirecionamento forçado para a raiz (Login)
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    },

    /**
     * 🛡️ ROUTE GUARD (CLIENT-SIDE)
     * Garante que páginas protegidas exijam login.
     */
    checkAuth() {
        const isLoginPage = window.location.pathname === '/login';
        const authenticated = this.isAuthenticated();

        if (!authenticated && !isLoginPage) {
            console.warn('[Auth] Acesso negado: Redirecionando para login.');
            this.logout();
        }

        if (authenticated && isLoginPage) {
            window.location.href = '/dashboard';
        }
    },

    /**
     * ✍️ ATUALIZAÇÃO PARCIAL DE DADOS
     * Utilizado após mudar avatar ou nome no perfil.
     */
    updateUserData(newData) {
        const current = this.getUser();
        if (current) {
            const updated = { ...current, ...newData };
            localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(updated));
            return updated;
        }
        return null;
    },

    /**
     * ♻️ RENOVAÇÃO MANUAL (DASHBOARD ACTION)
     * Utilizado pelo interceptor de API ou modal de timeout.
     */
    async refreshSession() {
        const rToken = this.getRefreshToken();
        if (!rToken) return this.logout();

        try {
            // Chamada direta via Axios para evitar recursividade no apiClient
            const res = await axios.post(`${window.API_URL}/auth/refresh`, {
                refreshToken: rToken
            });

            if (res.data && res.data.status === 'success') {
                const newAccess = res.data.data.accessToken;
                localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, newAccess);
                console.log('[Auth] Token renovado pro-ativamente.');
                return true;
            }
        } catch (err) {
            console.error('[Auth] Falha crítica na renovação pro-ativa.');
            this.logout();
            return false;
        }
    }
};

/**
 * ⚡ EXECUÇÃO IMEDIATA
 * Garante proteção de rota antes do carregamento total do DOM.
 */
AuthManager.checkAuth();

// Exposição global para os módulos
window.Auth = AuthManager;