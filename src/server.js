const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
require('dotenv').config();

const app = express();

// CORS liberado para http://localhost:5173 e origens locais
app.use(cors({
    origin: (origin, callback) => {
        // Permitir requisições sem origin (como mobile/curl) ou de localhost / AI Studio
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Gerenciamento de Bots por roomId
// roomId -> { pid, process, logs: [], status: 'idle'|'starting'|'running'|'stopped'|'error', startedAt, error: null }
const activeBots = new Map();

function getBotEntry(roomId) {
    if (!activeBots.has(roomId)) {
        activeBots.set(roomId, {
            roomId,
            pid: null,
            process: null,
            status: 'idle',
            logs: [],
            startedAt: null,
            error: null
        });
    }
    return activeBots.get(roomId);
}

function appendLog(roomId, message) {
    const entry = getBotEntry(roomId);
    const line = message.toString().trim();
    if (!line) return;
    
    // Suporte a múltiplas linhas
    const lines = line.split('\n');
    lines.forEach(l => {
        const clean = l.trim();
        if (clean) {
            entry.logs.push(clean);
            if (entry.logs.length > 100) {
                entry.logs.shift();
            }
        }
    });

    if (line.includes('FALHA') || line.includes('ERRO') || line.includes('Error:')) {
        entry.status = 'error';
        entry.error = line;
    } else if (line.includes('BOT ATIVO E FUNCIONANDO') || line.includes('Conectado à sala')) {
        entry.status = 'running';
    }
}

// Determinar executável Python disponível no sistema
function getPythonCommand() {
    if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
    if (process.platform === 'win32') return 'python';
    if (fs.existsSync('/usr/local/bin/python')) return '/usr/local/bin/python';
    if (fs.existsSync('/usr/bin/python')) return '/usr/bin/python';
    return 'python3';
}

// --- ROTAS DA API DE BOTS ---

// 1. Iniciar Bot na Sala
app.post('/api/bot/start', (req, res) => {
    const { username, password, roomUrl, roomId } = req.body || {};

    console.log(`[API /api/bot/start] Requisição recebida para roomId: "${roomId}", user: "${username}", roomUrl: "${roomUrl}"`);

    // Validação de campos obrigatórios
    if (!username || !password || !roomUrl || !roomId) {
        const missing = [];
        if (!username) missing.push('username');
        if (!password) missing.push('password');
        if (!roomUrl) missing.push('roomUrl');
        if (!roomId) missing.push('roomId');
        return res.status(400).json({
            success: false,
            error: `Campos obrigatórios ausentes: ${missing.join(', ')}`
        });
    }

    // Se já estiver rodando, matar processo anterior antes de reiniciar
    const existing = activeBots.get(roomId);
    if (existing && existing.process && !existing.process.killed) {
        console.log(`[Bot] Matando processo anterior existente (PID ${existing.pid}) para roomId: ${roomId}`);
        try {
            existing.process.kill('SIGTERM');
        } catch (e) {
            console.error(`[Bot] Erro ao matar processo anterior: ${e.message}`);
        }
    }

    const botEntry = getBotEntry(roomId);
    botEntry.status = 'starting';
    botEntry.logs = [];
    botEntry.error = null;
    botEntry.startedAt = new Date().toISOString();

    const rootDir = path.resolve(__dirname, '..');
    const pythonScript = path.join(rootDir, 'bot_join_room.py');
    const pythonCmd = getPythonCommand();

    console.log(`[Bot] Executando: ${pythonCmd} ${pythonScript} --username ${username} --room-url ${roomUrl} (CWD: ${rootDir})`);

    const pythonArgs = [
        'bot_join_room.py',
        '--username', String(username).trim(),
        '--password', String(password).trim(),
        '--room-url', String(roomUrl).trim()
    ];

    let child;
    try {
        child = spawn(pythonCmd, pythonArgs, {
            cwd: rootDir,
            windowsHide: false,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1'
            }
        });
    } catch (spawnError) {
        console.error(`[Bot Spawn Error]:`, spawnError);
        botEntry.status = 'error';
        botEntry.error = `Erro ao disparar processo Python: ${spawnError.message}`;
        return res.status(500).json({
            success: false,
            error: `Falha ao iniciar processo Python: ${spawnError.message}`
        });
    }

    botEntry.pid = child.pid;
    botEntry.process = child;

    console.log(`[Bot] Processo Python criado com sucesso! PID: ${child.pid} para sala: ${roomId}`);

    child.stdout.on('data', (data) => {
        const text = data.toString();
        process.stdout.write(`[Bot ${roomId}] ${text}`);
        appendLog(roomId, text);
    });

    child.stderr.on('data', (data) => {
        const text = data.toString();
        process.stderr.write(`[Bot ${roomId} ERR] ${text}`);
        appendLog(roomId, text);
    });

    child.on('error', (err) => {
        console.error(`[Bot ${roomId} Process Error]:`, err);
        botEntry.status = 'error';
        botEntry.error = err.message;
        appendLog(roomId, `[ERRO DO PROCESSO]: ${err.message}`);
    });

    child.on('exit', (code, signal) => {
        console.log(`[Bot ${roomId}] Processo finalizado com código ${code}, sinal ${signal}`);
        if (botEntry.status !== 'error') {
            botEntry.status = code === 0 ? 'stopped' : 'error';
            if (code !== 0 && !botEntry.error) {
                botEntry.error = `Processo encerrou com código de saída ${code}`;
            }
        }
        botEntry.process = null;
    });

    return res.json({
        success: true,
        message: 'Bot iniciado com sucesso!',
        roomId,
        pid: child.pid
    });
});

// 2. Parar Bot na Sala
app.post('/api/bot/stop', (req, res) => {
    const { roomId } = req.body || {};

    if (!roomId) {
        return res.status(400).json({
            success: false,
            error: 'Campo obrigatório ausente: roomId'
        });
    }

    console.log(`[API /api/bot/stop] Encerrando bot para roomId: "${roomId}"`);

    const botEntry = activeBots.get(roomId);
    if (!botEntry || !botEntry.process) {
        if (botEntry) {
            botEntry.status = 'stopped';
        }
        return res.json({
            success: true,
            message: 'Nenhum bot estava em execução para esta sala.',
            roomId
        });
    }

    try {
        const pid = botEntry.pid;
        botEntry.process.kill('SIGTERM');
        
        // Timeout de segurança para forçar finalização caso necessário
        setTimeout(() => {
            if (botEntry.process && !botEntry.process.killed) {
                try {
                    botEntry.process.kill('SIGKILL');
                } catch (e) {}
            }
        }, 3000);

        botEntry.status = 'stopped';
        appendLog(roomId, '[Bot interrompido via painel de controle]');
        console.log(`[Bot] PID ${pid} da sala ${roomId} encerrado.`);

        return res.json({
            success: true,
            message: `Bot na sala ${roomId} foi encerrado com sucesso!`,
            roomId,
            pid
        });
    } catch (e) {
        console.error(`[Bot Stop Error]:`, e);
        return res.status(500).json({
            success: false,
            error: `Erro ao finalizar bot: ${e.message}`,
            roomId
        });
    }
});

// 3. Consultar Status e Logs de um Bot
app.get('/api/bot/status/:roomId', (req, res) => {
    const { roomId } = req.params;
    const bot = activeBots.get(roomId);

    if (!bot) {
        return res.json({
            roomId,
            status: 'idle',
            pid: null,
            logs: [],
            error: null
        });
    }

    return res.json({
        roomId: bot.roomId,
        status: bot.status,
        pid: bot.pid,
        logs: bot.logs.slice(-25), // últimas 25 linhas
        error: bot.error,
        startedAt: bot.startedAt
    });
});

// 4. Listar Todos os Bots Ativos
app.get('/api/bot/status', (req, res) => {
    const result = {};
    activeBots.forEach((bot, roomId) => {
        result[roomId] = {
            roomId: bot.roomId,
            status: bot.status,
            pid: bot.pid,
            error: bot.error,
            lastLog: bot.logs[bot.logs.length - 1] || null
        };
    });
    return res.json(result);
});

// 5. Rota de Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'IMVU Bot Controller Backend',
        pythonBin: getPythonCommand()
    });
});

// Inicialização dos Servidores (Porta 3000 para AI Studio Preview e Porta 3001 para Frontend Vite)
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Backend IMVU Bot rodando na porta ${PORT} (0.0.0.0)`);
});

// Escuta também na porta 3001 se estiver em porta diferente, permitindo comunicação direta com Vite (5173)
if (Number(PORT) !== 3001) {
    try {
        const server3001 = http.createServer(app);
        server3001.listen(3001, '0.0.0.0', () => {
            console.log(`[Server] Suporte adicional ativo na porta 3001 para http://localhost:5173`);
        });
        server3001.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`[Server] Porta 3001 já em uso por outro processo.`);
            } else {
                console.log(`[Server] Porta 3001: ${err.message}`);
            }
        });
    } catch (e) {
        console.log(`[Server] Listener secundário: ${e.message}`);
    }
}
