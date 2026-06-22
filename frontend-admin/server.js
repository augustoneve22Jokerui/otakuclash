/**
 * 🚀 OTAKU CLASH ANGOLA - FRONTEND ADMIN SERVER
 * Versão: Ultra Mega Final v2 - Extra Robust
 * Descrição: Servidor Express configurado para produção real.
 * Resolve erros de CSP para Source Maps e garante comunicação total com o Backend.
 */

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

/**
 * 🛡️ CONFIGURAÇÃO DE SEGURANÇA (HELMET & CSP) - VERSÃO CORRIGIDA
 * Adicionado 'https://cdn.jsdelivr.net' em connect-src para permitir Source Maps.
 */
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: false,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "'unsafe-eval'", 
                "https://cdn.jsdelivr.net", 
                "https://kit.fontawesome.com", 
                "https://unpkg.com", 
                "https://cdnjs.cloudflare.com",
                "https://cdn.socket.io",
                "https://code.jquery.com",
                "https://cdn.datatables.net"
            ],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://cdn.jsdelivr.net", 
                "https://fonts.googleapis.com", 
                "https://cdnjs.cloudflare.com",
                "https://use.fontawesome.com",
                "https://cdn.datatables.net",
                "https://unpkg.com"
            ],
            fontSrc: [
                "'self'", 
                "data:",
                "https://fonts.gstatic.com", 
                "https://use.fontawesome.com", 
                "https://cdn.jsdelivr.net", 
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: [
                "'self'", 
                "data:", 
                "https://*", 
                "https://mdlwexnkufusqfifflsd.supabase.co"
            ],
            connectSrc: [
                "'self'", 
                "https://otakuclashaangola.onrender.com", 
                "wss://otakuclashaangola.onrender.com",
                "https://mdlwexnkufusqfifflsd.supabase.co",
                "https://cdn.jsdelivr.net" // ✅ Correção para erros de .map.js
            ],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
}));

/**
 * ⚙️ MIDDLEWARES DE INFRAESTRUTURA
 */
app.use(morgan('dev'));
app.use(compression());
app.use(cookieParser(process.env.SESSION_SECRET || 'otaku_clash_secret_2026'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir Arquivos Estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true
}));

/**
 * 💎 VARIÁVEIS GLOBAIS PARA TEMPLATES EJS
 */
app.use((req, res, next) => {
    res.locals.apiUrl = process.env.API_URL || 'https://otakuclashaangola.onrender.com/api/v1';
    res.locals.socketUrl = process.env.SOCKET_URL || 'https://otakuclashaangola.onrender.com';
    res.locals.appName = process.env.APP_NAME || "Otaku Clash Angola - Admin";
    res.locals.version = "2.6.0-PRODUCTION";
    next();
});

/**
 * 🚦 ROTEAMENTO DE PÁGINAS
 */
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.render('pages/auth/login', { title: 'Acesso Restrito', active: 'login' }));
app.get('/dashboard', (req, res) => res.render('pages/dashboard/index', { title: 'Dashboard', active: 'dashboard' }));
app.get('/users', (req, res) => res.render('pages/users/list', { title: 'Gestão de Usuários', active: 'users' }));
app.get('/users/new', (req, res) => res.render('pages/users/form', { title: 'Novo Utilizador', active: 'users' }));
app.get('/users/:id', (req, res) => res.render('pages/users/details', { title: 'Perfil Detalhado', active: 'users', userId: req.params.id }));
app.get('/users/edit/:id', (req, res) => res.render('pages/users/form', { title: 'Editar Utilizador', active: 'users', userId: req.params.id }));
app.get('/admin', (req, res) => res.render('pages/admin/index', { title: 'Equipa Staff', active: 'admin' }));
app.get('/profiles', (req, res) => res.render('pages/profiles/index', { title: 'Perfis de Jogadores', active: 'profiles' }));
app.get('/animes', (req, res) => res.render('pages/animes/list', { title: 'Catálogo de Animes', active: 'animes' }));
app.get('/animes/new', (req, res) => res.render('pages/animes/form', { title: 'Nova Obra', active: 'animes' }));
app.get('/animes/edit/:id', (req, res) => res.render('pages/animes/form', { title: 'Editar Obra', active: 'animes', animeId: req.params.id }));
app.get('/characters', (req, res) => res.render('pages/characters/list', { title: 'Base de Personagens', active: 'characters' }));
app.get('/characters/new', (req, res) => res.render('pages/characters/form', { title: 'Novo Personagem', active: 'characters' }));
app.get('/characters/edit/:id', (req, res) => res.render('pages/characters/form', { title: 'Editar Personagem', active: 'characters', charId: req.params.id }));
app.get('/questions', (req, res) => res.render('pages/questions/list', { title: 'Banco de Questões', active: 'questions' }));
app.get('/questions/new', (req, res) => res.render('pages/questions/form', { title: 'Nova Questão', active: 'questions' }));
app.get('/questions/edit/:id', (req, res) => res.render('pages/questions/form', { title: 'Editar Questão', active: 'questions', questionId: req.params.id }));
app.get('/quiz', (req, res) => res.render('pages/quiz/manage', { title: 'Configurações de Quiz', active: 'quiz' }));
app.get('/matches', (req, res) => res.render('pages/matches/index', { title: 'Monitor de Arena', active: 'matches' }));
app.get('/battle-royale', (req, res) => res.render('pages/battleroyale/manage', { title: 'Gestão Battle Royale', active: 'battleroyale' }));
app.get('/tournaments', (req, res) => res.render('pages/tournaments/manage', { title: 'Torneios Oficiais', active: 'tournaments' }));
app.get('/wallets', (req, res) => res.render('pages/wallets/index', { title: 'Carteiras Digitais', active: 'wallets' }));
app.get('/transactions', (req, res) => res.render('pages/transactions/index', { title: 'Ledger Financeiro', active: 'transactions' }));
app.get('/payments', (req, res) => res.render('pages/payments/index', { title: 'Gateways de Pagamento', active: 'payments' }));
app.get('/rankings', (req, res) => res.render('pages/rankings/index', { title: 'Tiers Competitivos', active: 'rankings' }));
app.get('/notifications', (req, res) => res.render('pages/notifications/index', { title: 'Central de Alertas', active: 'notifications' }));
app.get('/achievements', (req, res) => res.render('pages/achievements/index', { title: 'Gamificação', active: 'achievements' }));
app.get('/guilds', (req, res) => res.render('pages/guilds/index', { title: 'Clãs e Guildas', active: 'guilds' }));
app.get('/reports', (req, res) => res.render('pages/reports/index', { title: 'Moderação', active: 'reports' }));
app.get('/audit-logs', (req, res) => res.render('pages/audit-logs/index', { title: 'Logs de Auditoria', active: 'audit-logs' }));
app.get('/settings', (req, res) => res.render('pages/settings/index', { title: 'Configurações do Sistema', active: 'settings' }));
app.get('/health-monitor', (req, res) => res.render('pages/health-monitor/index', { title: 'Status da Infra', active: 'health' }));

/**
 * 🚨 TRATAMENTO DE ERROS
 */
app.use((req, res) => {
    res.status(404).render('pages/errors/404', { title: '404 - Não Encontrado' });
});

app.use((err, req, res, next) => {
    console.error('[FATAL FRONTEND ERROR]', err.stack);
    res.status(500).render('pages/errors/500', { title: '500 - Erro de Sistema', error: err.message });
});

app.listen(PORT, () => {
    console.log(`
    ========================================================
    🛡️  OTAKU CLASH ANGOLA - FRONTEND ADMIN OPERACIONAL
    🌍 AMBIENTE: PRODUCTION
    📡 PORTA: ${PORT}
    🔗 URL FRONT: https://otakuclash.onrender.com
    ⚙️  CSP: REFORÇADO (CONNECT-SRC INCLUÍDO)
    ========================================================
    `);
});

module.exports = app;
