/**
 * OTAKU CLASH ANGOLA - QUESTIONS FORM MODULE
 * Senior Frontend Engineer: Content Management & dynamic UI Logic
 */

class QuestionsFormModule {
    constructor() {
        this.endpoint = '/questions';
        this.animesEndpoint = '/animes';
        this.charactersEndpoint = '/characters';
        this.questionId = this._extractIdFromURL();
        this.formId = 'question-form';
        this.optionsContainerId = 'options-container';
        
        this.init();
    }

    async init() {
        console.log('[QuestionsForm] Inicializando formulário de questão...');
        this.setupEventListeners();
        await this.loadDependencies(); // Carrega animes e personagens para os selects
        
        if (this.isEditMode()) {
            await this.loadQuestionData();
        } else {
            // Inicia com 4 opções vazias por padrão para nova questão
            this.initDefaultOptions();
        }
    }

    /**
     * Identifica ID para edição via URL
     */
    _extractIdFromURL() {
        const path = window.location.pathname;
        const parts = path.split('/');
        const id = parts[parts.length - 1];
        return (id && id.length > 20) ? id : null; // Validação simples de UUID
    }

    isEditMode() {
        return this.questionId !== null;
    }

    setupEventListeners() {
        const form = document.getElementById(this.formId);
        if (!form) return;

        form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Botão para adicionar nova opção
        const btnAddOption = document.getElementById('btn-add-option');
        if (btnAddOption) {
            btnAddOption.addEventListener('click', () => this.addOptionRow());
        }

        // Listener para garantir apenas uma resposta correta (Radio-like behavior)
        document.getElementById(this.optionsContainerId).addEventListener('change', (e) => {
            if (e.target.classList.contains('is-correct-check')) {
                this.handleCorrectOptionSelection(e.target);
            }
        });
    }

    /**
     * Carrega listas de Animes e Personagens para popular os campos de busca/vínculo
     */
    async loadDependencies() {
        try {
            const [animesRes, charsRes] = await Promise.all([
                window.API.get(this.animesEndpoint, { params: { limit: 1000 } }),
                window.API.get(this.charactersEndpoint, { params: { limit: 1000 } })
            ]);

            this.populateSelect('anime_id', animesRes.data, 'Selecione o Anime...');
            this.populateSelect('character_id', charsRes.data, 'Selecione o Personagem (Opcional)...');
        } catch (error) {
            console.error('[QuestionsForm] Erro ao carregar dependências:', error);
        }
    }

    populateSelect(elementId, data, placeholder) {
        const select = document.getElementById(elementId);
        if (!select || !data) return;

        select.innerHTML = `<option value="">${placeholder}</option>`;
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.title || item.name;
            select.appendChild(option);
        });
    }

    /**
     * Carrega dados para edição
     */
    async loadQuestionData() {
        this.toggleLoading(true);
        try {
            // Endpoint Admin que retorna as opções com o campo isCorrect
            const response = await window.API.get(`${this.endpoint}/${this.questionId}`);
            
            if (response.status === 'success') {
                this.fillForm(response.data);
            }
        } catch (error) {
            console.error('[QuestionsForm] Erro ao carregar dados:', error);
            window.showAlert('Erro', 'Não foi possível carregar os dados da questão.', 'error');
        } finally {
            this.toggleLoading(false);
        }
    }

    fillForm(data) {
        document.getElementById('question_text').value = data.text;
        document.getElementById('anime_id').value = data.animeId || '';
        document.getElementById('character_id').value = data.characterId || '';
        document.getElementById('difficulty_level').value = data.difficulty;
        document.getElementById('category').value = data.category;
        document.getElementById('points').value = data.points;
        document.getElementById('time_limit').value = data.timeLimit;

        // Renderiza as opções vindas do banco
        const container = document.getElementById(this.optionsContainerId);
        container.innerHTML = '';
        data.options.forEach(opt => this.addOptionRow(opt.text, opt.isCorrect));
    }

    initDefaultOptions() {
        for (let i = 0; i < 4; i++) {
            this.addOptionRow('', i === 0); // Marca a primeira como correta por padrão
        }
    }

    /**
     * Adiciona linha de opção dinâmica
     */
    addOptionRow(text = '', isCorrect = false) {
        const container = document.getElementById(this.optionsContainerId);
        const rowId = 'opt-' + Date.now() + Math.random().toString(36).substr(2, 5);
        
        const row = document.createElement('div');
        row.className = 'option-row d-flex align-items-center mb-3 animate-up';
        row.id = rowId;
        row.innerHTML = `
            <div class="me-3">
                <div class="form-check">
                    <input class="form-check-input is-correct-check" type="checkbox" 
                           ${isCorrect ? 'checked' : ''} title="Marcar como correta">
                </div>
            </div>
            <div class="flex-grow-1">
                <input type="text" class="oc-input option-text" placeholder="Texto da opção..." 
                       value="${text}" required>
            </div>
            <button type="button" class="btn-oc btn-oc-outline btn-sm ms-3 text-danger" 
                    onclick="QuestionsForm.removeOptionRow('${rowId}')" title="Remover">
                <i class="bi bi-trash"></i>
            </button>
        `;
        container.appendChild(row);
    }

    removeOptionRow(rowId) {
        const row = document.getElementById(rowId);
        const allRows = document.querySelectorAll('.option-row');
        
        if (allRows.length <= 2) {
            window.showAlert('Aviso', 'Uma questão deve ter pelo menos 2 opções.', 'warning');
            return;
        }

        row.remove();
    }

    handleCorrectOptionSelection(checkbox) {
        // Comportamento de rádio: desseleciona as outras
        const allChecks = document.querySelectorAll('.is-correct-check');
        allChecks.forEach(c => {
            if (c !== checkbox) c.checked = false;
        });
    }

    /**
     * Submissão para o Backend Real
     */
    async handleSubmit(e) {
        e.preventDefault();

        // 1. Validação básica do formulário
        if (!window.Validators.validateForm(this.formId)) return;

        // 2. Extração e validação das opções
        const optionRows = document.querySelectorAll('.option-row');
        const options = [];
        let hasCorrect = false;

        optionRows.forEach(row => {
            const text = row.querySelector('.option-text').value.trim();
            const isCorrect = row.querySelector('.is-correct-check').checked;
            
            if (isCorrect) hasCorrect = true;
            options.push({ text, isCorrect });
        });

        if (!hasCorrect) {
            window.showAlert('Erro', 'Você deve marcar uma opção como correta.', 'error');
            return;
        }

        // 3. Montagem do Payload
        const payload = {
            question_text: document.getElementById('question_text').value,
            anime_id: document.getElementById('anime_id').value || null,
            character_id: document.getElementById('character_id').value || null,
            difficulty_level: parseInt(document.getElementById('difficulty_level').value),
            category: document.getElementById('category').value,
            points: parseInt(document.getElementById('points').value),
            time_limit: parseInt(document.getElementById('time_limit').value),
            options: options
        };

        this.toggleSubmitButton(true);

        try {
            let response;
            if (this.isEditMode()) {
                response = await window.API.patch(`${this.endpoint}/${this.questionId}`, payload);
            } else {
                response = await window.API.post(this.endpoint, payload);
            }

            if (response.status === 'success') {
                await Swal.fire({
                    title: 'Sucesso!',
                    text: 'A questão foi salva com sucesso no banco de dados.',
                    icon: 'success',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    confirmButtonColor: 'var(--primary-color)'
                });
                window.location.href = '/questions';
            }
        } catch (error) {
            console.error('[QuestionsForm] Erro ao salvar:', error);
        } finally {
            this.toggleSubmitButton(false);
        }
    }

    /**
     * UI Helpers
     */
    toggleLoading(loading) {
        const overlay = document.getElementById('form-loader');
        if (overlay) overlay.style.display = loading ? 'flex' : 'none';
    }

    toggleSubmitButton(loading) {
        const btn = document.querySelector('button[type="submit"]');
        if (!btn) return;
        btn.disabled = loading;
        btn.innerHTML = loading ? `<span class="spinner-border spinner-border-sm me-2"></span> Salvando...` : `<i class="bi bi-cloud-check me-2"></i> ${this.isEditMode() ? 'Atualizar Questão' : 'Criar Questão'}`;
    }
}

// Inicialização e exposição global para os botões dinâmicos
window.QuestionsForm = new QuestionsFormModule();