/**
 * OTAKU CLASH ANGOLA - FORM VALIDATORS
 * Senior Security & Frontend Engineer: Data Integrity Layer
 */

const Validators = {
    /**
     * Validação de E-mail (RFC 5322)
     */
    isEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    },

    /**
     * Validação de Senha Forte (Conforme Backend AuthSchema)
     * Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 especial
     */
    isStrongPassword(password) {
        if (!password || password.length < 8) return false;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);
        return hasUpper && hasLower && hasNumber && hasSpecial;
    },

    /**
     * Validação de Telefone Angolano
     * Formatos suportados: 9XXXXXXXX (9 digitos iniciando com prefixos válidos)
     */
    isAngolanPhone(phone) {
        const cleaned = String(phone).replace(/\D/g, '');
        // Prefixos unitel/movicel/africell: 91, 92, 93, 94, 95, 99
        const re = /^(91|92|93|94|95|99)\d{7}$/;
        return re.test(cleaned);
    },

    /**
     * Validação de Username (Conforme Backend AuthSchema)
     * 3-30 caracteres, apenas letras, números e underlines
     */
    isValidUsername(username) {
        const re = /^[a-zA-Z0-9_]{3,30}$/;
        return re.test(username);
    },

    /**
     * Valida se um campo está vazio ou contém apenas espaços
     */
    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        return false;
    },

    /**
     * Validação de URL (Para Avatares e Banners)
     */
    isURL(str) {
        try {
            new URL(str);
            return true;
        } catch (_) {
            return false;
        }
    },

    /**
     * Valida extensão de arquivos de imagem permitidos
     */
    isValidImageFile(fileName) {
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        const extension = fileName.split('.').pop().toLowerCase();
        return allowedExtensions.includes(extension);
    },

    /**
     * Helper para exibir mensagens de erro em inputs (Bootstrap 5)
     * @param {HTMLElement} inputEl - Elemento do input
     * @param {string} message - Mensagem de erro
     */
    showError(inputEl, message) {
        inputEl.classList.add('is-invalid');
        inputEl.classList.remove('is-valid');
        
        let feedback = inputEl.parentNode.querySelector('.invalid-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            inputEl.parentNode.appendChild(feedback);
        }
        feedback.innerText = message;
    },

    /**
     * Limpa estados de validação
     */
    clearValidation(inputEl) {
        inputEl.classList.remove('is-invalid');
        inputEl.classList.remove('is-valid');
    },

    /**
     * Valida um formulário completo baseado em data-attributes
     * Exemplo de uso: <input data-validate="email" required>
     */
    validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;

        let isValid = true;
        const inputs = form.querySelectorAll('[data-validate]');

        inputs.forEach(input => {
            this.clearValidation(input);
            const type = input.getAttribute('data-validate');
            const val = input.value;

            if (input.hasAttribute('required') && this.isEmpty(val)) {
                this.showError(input, 'Este campo é obrigatório.');
                isValid = false;
            } else if (!this.isEmpty(val)) {
                if (type === 'email' && !this.isEmail(val)) {
                    this.showError(input, 'E-mail inválido.');
                    isValid = false;
                } else if (type === 'password' && !this.isStrongPassword(val)) {
                    this.showError(input, 'A senha deve ser forte (8+ caracteres, A-z, 0-9, !@#).');
                    isValid = false;
                } else if (type === 'phone' && !this.isAngolanPhone(val)) {
                    this.showError(input, 'Número de telefone inválido para Angola.');
                    isValid = false;
                } else if (type === 'username' && !this.isValidUsername(val)) {
                    this.showError(input, 'Username inválido (3-30 caracteres, sem espaços).');
                    isValid = false;
                }
            }

            if (isValid && !this.isEmpty(val)) {
                input.classList.add('is-valid');
            }
        });

        return isValid;
    }
};

// Expor globalmente
window.Validators = Validators;