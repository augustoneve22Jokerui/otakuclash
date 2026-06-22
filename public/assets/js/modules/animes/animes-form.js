/**
 * OTAKU CLASH ANGOLA - ANIMES FORM MODULE
 * Senior Frontend Engineer: Metadata & Asset Management
 */

class AnimesFormModule {
    constructor() {
        this.endpoint = '/animes';
        this.animeId = this._extractIdFromURL();
        this.formId = 'anime-form';
        this.previewImgId = 'cover-preview';
        
        this.init();
    }

    async init() {
        console.log('[AnimesForm] Inicializando formulário...');
        this.setupEventListeners();
        
        if (this.isEditMode()) {
            await this.loadAnimeData();
        }
    }

    /**
     * Identifica se é modo de edição baseado na URL
     */
    _extractIdFromURL() {
        const path = window.location.pathname;
        const parts = path.split('/');
        // Esperado: /animes/edit/:id ou /animes/form/:id
        const id = parts[parts.length - 1];
        return (id && id !== 'form' && id !== 'new') ? id : null;
    }

    isEditMode() {
        return this.animeId !== null;
    }

    setupEventListeners() {
        const form = document.getElementById(this.formId);
        if (!form) return;

        // Submissão do formulário
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Pré-visualização de imagem ao digitar URL
        const imageInput = document.getElementById('imageUrl');
        if (imageInput) {
            imageInput.addEventListener('input', (e) => this.updateImagePreview(e.target.value));
        }

        // Botão Cancelar
        const btnCancel = document.getElementById('btn-cancel');
        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                window.location.href = '/animes';
            });
        }
    }

    /**
     * Carrega dados existentes para edição
     */
    async loadAnimeData() {
        this.toggleLoading(true);
        try {
            const response = await window.API.get(`${this.endpoint}/${this.animeId}`);
            
            if (response.status === 'success') {
                this.fillForm(response.data);
            }
        } catch (error) {
            console.error('[AnimesForm] Erro ao carregar dados:', error);
            window.showAlert('Erro', 'Não foi possível carregar os dados do anime.', 'error');
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Preenche os campos do formulário com dados do backend
     */
    fillForm(data) {
        const fields = [
            'title', 'titleEnglish', 'mal_id', 'synopsis', 
            'type', 'episodes', 'status', 'score', 'year', 'imageUrl'
        ];

        fields.forEach(field => {
            const input = document.getElementById(field);
            if (input) {
                input.value = data[field] || '';
            }
        });

        // Tratamento especial para Gêneros (Select2 ou Chips se implementado)
        const genresInput = document.getElementById('genres');
        if (genresInput && data.genres) {
            genresInput.value = Array.isArray(data.genres) ? data.genres.join(', ') : data.genres;
        }

        this.updateImagePreview(data.imageUrl);
    }

    /**
     * Atualiza o elemento de pré-visualização da capa
     */
    updateImagePreview(url) {
        const img = document.getElementById(this.previewImgId);
        if (!img) return;

        if (window.Validators.isURL(url)) {
            img.src = url;
            img.classList.remove('d-none');
        } else {
            img.src = '/assets/img/placeholders/anime-cover.png';
        }
    }

    /**
     * Processa o envio dos dados
     */
    async handleSubmit(e) {
        e.preventDefault();

        // Validação Client-side
        if (!window.Validators.validateForm(this.formId)) {
            return;
        }

        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData.entries());

        // Tratamento de tipos numéricos conforme o schema do backend
        payload.mal_id = parseInt(payload.mal_id);
        payload.episodes = parseInt(payload.episodes) || 0;
        payload.score = parseFloat(payload.score) || 0;
        payload.year = parseInt(payload.year) || null;
        
        // Converte string de gêneros em Array
        if (payload.genres) {
            payload.genres = payload.genres.split(',').map(g => g.trim()).filter(g => g !== '');
        }

        this.toggleSubmitButton(true);

        try {
            let response;
            if (this.isEditMode()) {
                response = await window.API.patch(`${this.endpoint}/${this.animeId}`, payload);
            } else {
                response = await window.API.post(this.endpoint, payload);
            }

            if (response.status === 'success') {
                await Swal.fire({
                    title: 'Sucesso!',
                    text: `O anime "${payload.title}" foi salvo com sucesso no catálogo.`,
                    icon: 'success',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    confirmButtonColor: 'var(--primary-color)'
                });
                window.location.href = '/animes';
            }
        } catch (error) {
            console.error('[AnimesForm] Erro ao salvar:', error);
            // O erro já é tratado globalmente pelo interceptor no api.js
        } finally {
            this.toggleSubmitButton(false);
        }
    }

    /**
     * Helpers de UI
     */
    toggleLoading(loading) {
        const overlay = document.getElementById('form-loader');
        if (overlay) overlay.style.display = loading ? 'flex' : 'none';
    }

    toggleSubmitButton(loading) {
        const btn = document.querySelector('button[type="submit"]');
        if (!btn) return;

        if (loading) {
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Salvando...`;
        } else {
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-cloud-check me-2"></i> ${this.isEditMode() ? 'Atualizar Anime' : 'Criar Anime'}`;
        }
    }
}

// Inicializa o módulo
window.AnimesForm = new AnimesFormModule();