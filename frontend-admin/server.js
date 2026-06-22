require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Engine de Visualização (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares de Infraestrutura
app.use(morgan('dev'));
app.use(compression());
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração de Segurança com Helmet
// Ajustado para permitir carregamento de scripts externos (CDN) e conexão com o backend real
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://kit.fontawesome.com", "https://unpkg.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://use.fontawesome.com"],
            imgSrc: ["'self'", "data:", "https://*", process.env.API_URL],
            connectSrc: ["'self'", process.env.API_URL, process.env.SOCKET_URL, "wss://*"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://use.fontawesome.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
}));

// Servir Arquivos Estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Variáveis Globais para os Templates EJS
app.use((req, res, next) => {
    res.locals.apiUrl = process.env.API_URL;
    res.locals.socketUrl = process.env.SOCKET_URL;
    res.locals.appName = process.env.APP_NAME || "Otaku Clash Angola - Admin";
    res.locals.version = "2.1.0";
    next();
});

/**
 * ROTAS DE NAVEGAÇÃO
 * O Painel utiliza renderização server-side (EJS) para a estrutura
 * e Axios no client-side para consumo da API Real.
 */

// Auth
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.render('pages/auth/login', { title: 'Login' }));

// Dashboard
app.get('/dashboard', (req, res) => res.render('pages/dashboard/index', { title: 'Dashboard', active: 'dashboard' }));

// Usuários e Perfis
app.get('/users', (req, res) => res.render('pages/users/list', { title: 'Gestão de Usuários', active: 'users' }));
app.get('/users/:id', (req, res) => res.render('pages/users/details', { title: 'Detalhes do Usuário', active: 'users' }));
app.get('/profiles', (req, res) => res.render('pages/profiles/index', { title: 'Perfis de Jogadores', active: 'profiles' }));

// Catálogo (Animes, Personagens, Questões)
app.get('/animes', (req, res) => res.render('pages/animes/list', { title: 'Catálogo de Animes', active: 'animes' }));
app.get('/characters', (req, res) => res.render('pages/characters/list', { title: 'Personagens', active: 'characters' }));
app.get('/questions', (req, res) => res.render('pages/questions/list', { title: 'Banco de Questões', active: 'questions' }));

// Modos de Jogo e Competição
app.get('/quiz', (req, res) => res.render('pages/quiz/manage', { title: 'Configurações de Quiz', active: 'quiz' }));
app.get('/matches', (req, res) => res.render('pages/matches/index', { title: 'Partidas em Tempo Real', active: 'matches' }));
app.get('/battle-royale', (req, res) => res.render('pages/battleroyale/manage', { title: 'Gestão Battle Royale', active: 'battleroyale' }));
app.get('/tournaments', (req, res) => res.render('pages/tournaments/manage', { title: 'Torneios Oficiais', active: 'tournaments' }));

// Financeiro e Rankings
app.get('/wallets', (req, res) => res.render('pages/wallets/index', { title: 'Carteiras Digitais', active: 'wallets' }));
app.get('/transactions', (req, res) => res.render('pages/transactions/index', { title: 'Extrato Financeiro', active: 'transactions' }));
app.get('/payments', (req, res) => res.render('pages/payments/index', { title: 'Gateways de Pagamento', active: 'payments' }));
app.get('/rankings', (req, res) => res.render('pages/rankings/index', { title: 'Tiers Competitivos', active: 'rankings' }));

// Social e Engajamento
app.get('/notifications', (req, res) => res.render('pages/notifications/index', { title: 'Central de Alertas', active: 'notifications' }));
app.get('/achievements', (req, res) => res.render('pages/achievements/index', { title: 'Conquistas & Badges', active: 'achievements' }));
app.get('/guilds', (req, res) => res.render('pages/guilds/index', { title: 'Clãs e Guildas', active: 'guilds' }));

// Sistema e Suporte
app.get('/reports', (req, res) => res.render('pages/reports/index', { title: 'Denúncias e Feedbacks', active: 'reports' }));
app.get('/audit-logs', (req, res) => res.render('pages/audit-logs/index', { title: 'Logs de Auditoria', active: 'audit-logs' }));
app.get('/settings', (req, res) => res.render('pages/settings/index', { title: 'Configurações do Sistema', active: 'settings' }));
app.get('/health-monitor', (req, res) => res.render('pages/health-monitor/index', { title: 'Monitoramento de Infra', active: 'health' }));

// Tratamento de Erro 404
app.use((req, res) => {
    res.status(404).render('pages/errors/404', { title: 'Página não encontrada' });
});

// Tratamento de Erro 500
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('pages/errors/500', { title: 'Erro Interno no Servidor', error: err.message });
});

// Inicialização do Servidor
app.listen(PORT, () => {
    console.log(`
    ==================================================
    🚀 OTaku Clash Angola - Painel Administrativo
    🏠 URL Local: http://localhost:${PORT}
    📡 Backend: ${process.env.API_URL}
    🛠  Ambiente: ${process.env.NODE_ENV}
    ==================================================
    `);
});