/**
 * 🔐 OTAKU CLASH ANGOLA - AUTHENTICATION MANAGER
 * Versão: 2.2.0 - Stable Redirection Edition
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
     * 💾 SALVA SESSÃO (PERSISTÊNCIA PÓS-LOGIN)
     * @param {Object} tokens - { accessToken, refreshToken }
     * @param {Object} user - Dados do perfil administrativo
     */
    saveSession(tokens, user) {
        try {
            if (!tokens || !tokens.accessToken) {
                console.error('[Auth] Erro: Tentativa de salvar sessão sem token válido.');
                return false;
            }

            localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
            
            if (tokens.refreshToken) {
                localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
            }

            if (user) {
                localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
            }

            console.log('[Auth] Sessão administrativa persistida.');
            return true;
        } catch (error) {
            console.error('[Auth] Erro ao acessar localStorage:', error);
            return false;
        }
    },

    /**
     * 🎟️ RECUPERA ACCESS TOKEN (JWT)
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
     * 👤 RECUPERA DADOS DO UTILIZADOR LOGADO
     */
    getUser() {
        const user = localStorage.getItem(this.STORAGE_KEYS.USER_DATA);
        try {
            return user ? JSON.parse(user) : null;
        } catch (e) {
            console.error('[Auth] Erro ao parsear dados do utilizador.');
            return null;
        }
    },

    /**
     * ✅ VERIFICA INTEGRIDADE DA SESSÃO (CLIENT-SIDE)
     * Realiza o parse do JWT para verificar a expiração sem bater na API.
     */
    isAuthenticated() {
        const token = this.getAccessToken();
        if (!token || token === 'undefined' || token === 'null') return false;

        try {
            // Decodifica a parte do payload do JWT (Base64)
            const base64Url = token.split('.')[1];
            if (!base64Url) return false;

            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const payload = JSON.parse(jsonPayload);
            const now = Math.floor(Date.now() / 1000);

            // Verifica se o token expira em menos de 10 segundos
            return payload.exp > (now + 10);
        } catch (e) {
            console.error('[Auth] Falha na validação do token local:', e);
            return false;
        }
    },

    /**
     * 🚪 LOGOUT (ENCERRAMENTO DE SESSÃO)
     * Limpa o storage e limpa o estado do Socket.IO.
     */
    logout() {
        console.log('[Auth] Encerrando sessão administrativa...');
        
        // 1. Limpa chaves de segurança
        localStorage.removeItem(this.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(this.STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(this.STORAGE_KEYS.USER_DATA);
        
        // 2. Desconecta o Socket.IO se estiver instanciado
        if (window.Socket && typeof window.Socket.disconnect === 'function') {
            window.Socket.disconnect();
        }

        // 3. Redireciona para o login apenas se não estiver na página de login
        if (window.location.pathname !== '/login') {
            window.location.replace('/login');
        }
    },

    /**
     * 🛡️ PROTEÇÃO DE ROTA (ROUTE GUARD)
     * Controla o fluxo de redirecionamento para evitar loops.
     */
    checkAuth() {
        const path = window.location.pathname;
        const isLoginPage = path === '/login' || path === '/';
        const authenticated = this.isAuthenticated();

        // Cenário A: Utilizador não logado tentando acessar dashboard
        if (!authenticated && !isLoginPage) {
            console.warn('[Auth] Acesso restrito: Identidade expirada ou ausente.');
            return this.logout();
        }

        // Cenário B: Utilizador logado tentando acessar página de login
        if (authenticated && isLoginPage) {
            console.log('[Auth] Utilizador já autenticado. Redirecionando para Dashboard.');
            window.location.replace('/dashboard');
        }
    },

    /**
     * ✍️ ATUALIZADOR DE ESTADO LOCAL
     * Sincroniza mudanças no perfil com o storage.
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
     * ♻️ RENOVAÇÃO MANUAL DE SESSÃO
     * Pode ser chamado via UI ou via interceptor de API.
     */
    async refreshSession() {
        const rToken = this.getRefreshToken();
        if (!rToken) return this.logout();

        try {
            // Chamada direta para evitar recursividade no apiClient
            const response = await axios.post(`${window.API_URL}/auth/refresh`, {
                refreshToken: rToken
            });

            if (response.data && response.data.status === 'success') {
                const newAccess = response.data.data.accessToken;
                localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, newAccess);
                console.log('[Auth] Token renovado com sucesso.');
                return true;
            }
            throw new Error('Falha na resposta do servidor.');
        } catch (err) {
            console.error('[Auth] Falha crítica ao renovar sessão:', err.message);
            this.logout();
            return false;
        }
    }
};

/**
 * ⚡ EXECUÇÃO DE SEGURANÇA IMEDIATA
 * Protege a interface antes mesmo do carregamento total do DOM.
 */
AuthManager.checkAuth();

// Expõe globalmente para os módulos de interface
window.Auth = AuthManager;
