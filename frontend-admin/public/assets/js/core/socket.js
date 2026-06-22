/**
 * OTAKU CLASH ANGOLA - REAL-TIME SOCKET ENGINE
 * Senior Backend & DevOps Engineer: Real-time Orchestration
 */

class SocketManager {
    constructor() {
        this.socket = null;
        this.url = window.SOCKET_URL || 'https://otakuclashaangola.onrender.com';
        this.isConnected = false;
        this.reconnectAttempts = 0;
        
        // Inicializa se o usuário já estiver logado
        if (window.Auth.isAuthenticated()) {
            this.connect();
        }
    }

    /**
     * Estabelece conexão com o servidor Socket.io real
     */
    connect() {
        const token = window.Auth.getAccessToken();

        if (!token) return;

        console.log('[Socket] Tentando conectar ao servidor real...');

        this.socket = io(this.url, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity
        });

        this.setupGlobalListeners();
    }

    /**
     * Configura ouvintes para eventos de sistema e notificações globais
     */
    setupGlobalListeners() {
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log(`[Socket] Conectado com sucesso. ID: ${this.socket.id}`);
            
            // Notifica outros componentes do sistema sobre a conexão
            document.dispatchEvent(new CustomEvent('socket_connected', { detail: { id: this.socket.id } }));
        });

        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            console.warn(`[Socket] Desconectado. Motivo: ${reason}`);
            
            if (reason === "io server disconnect") {
                // O servidor forçou a desconexão (ex: token inválido), tenta reconectar manualmente
                this.socket.connect();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('[Socket] Erro de conexão:', error.message);
            this.isConnected = false;
        });

        /**
         * Ouvinte de Notificações em Tempo Real (Real Backend Event)
         * O backend emite 'notification:received' conforme definido no NotificationsService.js
         */
        this.socket.on('notification:received', (data) => {
            this.handleIncomingNotification(data);
        });

        /**
         * Ouvinte de Presença (Real Backend Event)
         * O backend emite 'presence:online' e 'presence:offline' conforme PresenceController.js
         */
        this.socket.on('presence:online', (data) => {
            document.dispatchEvent(new CustomEvent('user_online', { detail: data }));
        });

        this.socket.on('presence:offline', (data) => {
            document.dispatchEvent(new CustomEvent('user_offline', { detail: data }));
        });

        // Evento de Erro de Sistema
        this.socket.on('system:error', (error) => {
            window.showAlert('Erro de Sistema', error.message, 'error');
        });
    }

    /**
     * Lógica para exibir notificações via Toast ou SweetAlert2
     */
    handleIncomingNotification(data) {
        console.log('[Socket] Nova notificação recebida:', data);
        
        // Dispara evento para atualizar o contador de notificações na Navbar
        document.dispatchEvent(new CustomEvent('new_notification', { detail: data }));

        // Exibe Toast se o SweetAlert2 estiver disponível
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 4000,
                timerProgressBar: true,
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });

            Toast.fire({
                icon: 'info',
                title: data.title,
                text: data.message
            });
        }
    }

    /**
     * Encapsula o envio de eventos (Emit)
     */
    emit(event, data) {
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
        } else {
            console.error(`[Socket] Falha ao emitir ${event}: Socket não conectado.`);
        }
    }

    /**
     * Encapsula a inscrição em eventos (On)
     */
    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    /**
     * Remove a inscrição de um evento (Off)
     */
    off(event) {
        if (this.socket) {
            this.socket.off(event);
        }
    }

    /**
     * Finaliza a conexão (Logout)
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }
}

// Inicializa e expõe como Singleton
window.Socket = new SocketManager();