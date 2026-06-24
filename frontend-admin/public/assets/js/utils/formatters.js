/**
 * OTAKU CLASH ANGOLA - UI FORMATTERS
 * Senior Frontend Engineer: Data Presentation & Localization
 */

const Formatters = {
    /**
     * Formata valores para a moeda local de Angola (Kwanza)
     * @param {number|string} value - O valor numérico
     * @param {string} suffix - Sufixo da moeda (padrão KZ)
     * @returns {string} Ex: 2.430.000 KZ
     */
    currency(value, suffix = 'KZ') {
        const amount = parseFloat(value) || 0;
        return new Intl.NumberFormat('pt-AO', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount) + ' ' + suffix;
    },

    /**
     * Formata datas para o padrão angolano com suporte a horário
     * @param {string|Date} date - Objeto de data ou string ISO
     * @param {boolean} includeTime - Se deve incluir horas e minutos
     * @returns {string} Ex: 12 de Maio, 2025 ou 12/05/2025 14:30
     */
    date(date, includeTime = false) {
        if (!date) return '---';
        const d = new Date(date);
        
        const options = {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        };

        if (includeTime) {
            return d.toLocaleString('pt-AO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        return d.toLocaleDateString('pt-AO', options);
    },

    /**
     * Calcula o tempo relativo (Time Ago)
     * @param {string|Date} date 
     * @returns {string} Ex: há 5m, há 2 dias
     */
    timeAgo(date) {
        if (!date) return '---';
        const now = new Date();
        const past = new Date(date);
        const diffInSeconds = Math.floor((now - past) / 1000);

        if (diffInSeconds < 60) return 'agora';
        
        const minutes = Math.floor(diffInSeconds / 60);
        if (minutes < 60) return `há ${minutes}m`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `há ${hours}h`;
        
        const days = Math.floor(hours / 24);
        if (days < 30) return `há ${days}d`;
        
        const months = Math.floor(days / 30);
        return `há ${months} meses`;
    },

    /**
     * Abrevia números grandes para exibição em KPIs
     * @param {number} num 
     * @returns {string} Ex: 24.780 -> 24.8k
     */
    compactNumber(num) {
        if (!num) return '0';
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(num);
    },

    /**
     * Formata números de telefone de Angola
     * @param {string} phone 
     * @returns {string} Ex: +244 9XX XXX XXX
     */
    phoneNumber(phone) {
        if (!phone) return '---';
        const cleaned = ('' + phone).replace(/\D/g, '');
        const match = cleaned.match(/^(244)?(\d{3})(\d{3})(\d{3})$/);
        if (match) {
            const intl = match[1] ? '+244 ' : '';
            return `${intl}${match[2]} ${match[3]} ${match[4]}`;
        }
        return phone;
    },

    /**
     * Trunca uma string adicionando reticências
     * @param {string} str 
     * @param {number} length 
     */
    truncate(str, length = 20) {
        if (!str) return '';
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    },

    /**
     * Formata bytes para tamanhos legíveis
     * @param {number} bytes 
     */
    fileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Transforma slug ou enum em texto legível
     * @param {string} text - Ex: BATTLE_ROYALE
     * @returns {string} Ex: Battle Royale
     */
    humanize(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .replace(/[_-]/g, ' ')
            .replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    }
};

// Expor para o escopo global
window.Formatters = Formatters;