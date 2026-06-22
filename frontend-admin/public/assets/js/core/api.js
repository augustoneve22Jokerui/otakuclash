/**
 * 🚀 OTAKU CLASH ANGOLA - API CLIENT (AXIOS CONFIG)
 * Versão: Ultra Mega Final - Enterprise Grade
 * Descrição: Gerenciador de requisições com tratamento de tokens, refresh automático e interceptors.
 */

// Definição da URL base capturada do partial head-meta.ejs
const BASE_URL = window.API_URL || 'https://otakuclashaangola.onrender.com/api/v1';

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

/**
 * 🛡️ INTERCEPTOR DE REQUISIÇÃO
 * Injeta o JWT Access Token em todas as chamadas.
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = window.Auth ? window.Auth.getAccessToken() : localStorage.getItem('oc_admin_access_token');
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
 * 🔄 INTERCEPTOR DE RESPOSTA
 * Gerencia erros globais, expiração de token (401) e alertas.
 */
apiClient.interceptors.response.use(
    (response) => {
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        // 1. Tratamento de Expiração de Token (Auto-Refresh)
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = window.Auth ? window.Auth.getRefreshToken() : localStorage.getItem('oc_admin_refresh_token');
                
                if (!refreshToken) {
                    if (window.Auth) window.Auth.logout();
                    return Promise.reject(error);
                }

                // Chamada de refresh para o endpoint real do backend
                const response = await axios.post(`${BASE_URL}/auth/refresh`, {
                    refreshToken: refreshToken
                });

                if (response.data && response.data.data.accessToken) {
                    const newAccessToken = response.data.data.accessToken;
                    
                    // Atualiza a sessão
                    if (window.Auth) {
                        window.Auth.saveSession({ accessToken: newAccessToken }, window.Auth.getUser());
                    } else {
                        localStorage.setItem('oc_admin_access_token', newAccessToken);
                    }

                    // Re-executa a requisição original com o novo token
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                console.error('[API] Falha crítica na renovação da sessão:', refreshError);
                if (window.Auth) window.Auth.logout();
                return Promise.reject(refreshError);
            }
        }

        // 2. Formatação de Mensagem de Erro Amigável
        let errorMessage = 'Ocorreu um erro inesperado na comunicação com o servidor.';
        
        if (error.response && error.response.data) {
            errorMessage = error.response.data.message || errorMessage;
        } else if (error.request) {
            errorMessage = 'O servidor não respondeu. Verifique sua conexão com a internet.';
        }

        // 3. Exibição de Alerta Visual (SweetAlert2)
        // Só exibe se a requisição não for marcada como 'silent'
        if (!originalRequest.silent) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Erro na Operação',
                    text: errorMessage,
                    icon: 'error',
                    background: '#131320',
                    color: '#FFFFFF',
                    confirmButtonColor: '#FF3B5C'
                });
            } else {
                console.error('[API Error]', errorMessage);
            }
        }

        return Promise.reject(error);
    }
);

/**
 * 📦 EXPOSIÇÃO DO WRAPPER GLOBAL
 */
window.API = {
    get: (url, config = {}) => apiClient.get(url, config),
    post: (url, data, config = {}) => apiClient.post(url, data, config),
    put: (url, data, config = {}) => apiClient.put(url, data, config),
    patch: (url, data, config = {}) => apiClient.patch(url, data, config),
    delete: (url, config = {}) => apiClient.delete(url, config),
    
    // Suporte a upload de arquivos reais para Supabase Storage
    upload: (url, formData, onUploadProgress) => {
        return apiClient.post(url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress
        });
    }
};

console.log('[API] Motor de integração inicializado.');
