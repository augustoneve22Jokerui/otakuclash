/**
 * OTAKU CLASH ANGOLA - API CLIENT (AXIOS CONFIG)
 * Senior Backend & Frontend Engineer: Communication Layer
 */

const apiClient = axios.create({
    baseURL: window.API_URL || 'https://otakuclashaangola.onrender.com/api/v1',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

/**
 * Interceptor de Requisição
 * Injeta o token JWT em cada chamada enviada ao backend
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = window.Auth.getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Interceptor de Resposta
 * Lida com sucessos e falhas globais, incluindo expiração de token
 */
apiClient.interceptors.response.use(
    (response) => {
        // Retorna apenas os dados se a estrutura do backend for padronizada {status, message, data}
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        // 1. Verifica se o erro é 401 (Não autorizado/Token expirado)
        // O _retry evita loop infinito caso o refresh também falhe
        if (error.response && error.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = window.Auth.getRefreshToken();
                
                if (!refreshToken) {
                    window.Auth.logout();
                    return Promise.reject(error);
                }

                // Tenta renovar o token no endpoint real do backend
                // Nota: Usamos axios puro aqui para evitar os interceptores da nossa instância apiClient
                const refreshResponse = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
                    refreshToken: refreshToken
                });

                if (refreshResponse.data && refreshResponse.data.data.accessToken) {
                    const { accessToken } = refreshResponse.data.data;
                    
                    // Salva o novo token e atualiza a requisição original
                    window.Auth.saveSession({ accessToken }, window.Auth.getUser());
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                    originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
                    
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                console.error('[API] Falha crítica na renovação do token:', refreshError);
                window.Auth.logout();
                return Promise.reject(refreshError);
            }
        }

        // 2. Tratamento de Erros Amigáveis ao Usuário
        let errorMessage = 'Ocorreu um erro inesperado na comunicação com o servidor.';
        
        if (error.response && error.response.data) {
            errorMessage = error.response.data.message || errorMessage;
        } else if (error.request) {
            errorMessage = 'O servidor não respondeu. Verifique sua conexão com a internet.';
        }

        // Exibe alerta visual se não for uma rota silenciosa
        if (!originalRequest.silent) {
            Swal.fire({
                title: 'Erro na Operação',
                text: errorMessage,
                icon: 'error',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                confirmButtonColor: var(--primary-color)
            });
        

        return Promise.reject(error);
    }
);

/**
 * Wrapper de conveniência para métodos HTTP
 */
const API = {
    get: (url, config = {}) => apiClient.get(url, config),
    post: (url, data, config = {}) => apiClient.post(url, data, config),
    put: (url, data, config = {}) => apiClient.put(url, data, config),
    patch: (url, data, config = {}) => apiClient.patch(url, data, config),
    delete: (url, config = {}) => apiClient.delete(url, config),
    
    // Método para upload de arquivos (Multipart/Form-Data)
    upload: (url, formData, onUploadProgress) => {
        return apiClient.post(url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress
        });
    }
};

// Expor globalmente
window.API = API;