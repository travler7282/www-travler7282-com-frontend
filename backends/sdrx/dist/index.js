"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const app = (0, express_1.default)();
const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? '0.0.0.0';
const corsOrigin = process.env.CORS_ORIGIN ?? '*';
let sdrState = {
    frequencyHz: 7100000,
    bandwidthHz: 2400,
    gainDb: 22,
    sampleRateHz: 2048000,
    mode: 'USB',
    connected: true,
    updatedAt: new Date().toISOString(),
};
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: corsOrigin }));
app.use(express_1.default.json({ limit: '512kb' }));
app.use((0, morgan_1.default)('combined'));
app.get(['/healthz', '/srdx/api/v1/healthz'], (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.get(['/readyz', '/srdx/api/v1/readyz'], (_req, res) => {
    res.status(200).json({ ready: true, service: 'sdr-express-app' });
});
app.get(['/api/sdr/status', '/srdx/api/v1/status', '/srdx/api/v1/api/sdr/status'], (_req, res) => {
    res.status(200).json(sdrState);
});
app.post(['/api/sdr/tune', '/srdx/api/v1/tune', '/srdx/api/v1/api/sdr/tune'], (req, res) => {
    const { frequencyHz, bandwidthHz, gainDb, sampleRateHz, mode } = req.body;
    if (typeof frequencyHz === 'number') {
        if (!Number.isFinite(frequencyHz) || frequencyHz < 100000 || frequencyHz > 6000000000) {
            return res.status(400).json({ error: 'frequencyHz must be between 100000 and 6000000000' });
        }
        sdrState.frequencyHz = frequencyHz;
    }
    if (typeof bandwidthHz === 'number') {
        if (!Number.isFinite(bandwidthHz) || bandwidthHz < 100 || bandwidthHz > 5000000) {
            return res.status(400).json({ error: 'bandwidthHz must be between 100 and 5000000' });
        }
        sdrState.bandwidthHz = bandwidthHz;
    }
    if (typeof gainDb === 'number') {
        if (!Number.isFinite(gainDb) || gainDb < 0 || gainDb > 90) {
            return res.status(400).json({ error: 'gainDb must be between 0 and 90' });
        }
        sdrState.gainDb = gainDb;
    }
    if (typeof sampleRateHz === 'number') {
        if (!Number.isFinite(sampleRateHz) || sampleRateHz < 8000 || sampleRateHz > 50000000) {
            return res.status(400).json({ error: 'sampleRateHz must be between 8000 and 50000000' });
        }
        sdrState.sampleRateHz = sampleRateHz;
    }
    if (typeof mode === 'string') {
        const validModes = ['AM', 'FM', 'USB', 'LSB', 'CW'];
        if (!validModes.includes(mode)) {
            return res.status(400).json({ error: `mode must be one of ${validModes.join(', ')}` });
        }
        sdrState.mode = mode;
    }
    sdrState.updatedAt = new Date().toISOString();
    return res.status(200).json(sdrState);
});
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
const server = app.listen(port, host, () => {
    // Structured startup log makes container startup diagnostics easier in k3s.
    console.log(JSON.stringify({ level: 'info', msg: 'sdr-express-app started', host, port }));
});
const shutdown = (signal) => {
    console.log(JSON.stringify({ level: 'info', msg: `received ${signal}, shutting down` }));
    server.close((err) => {
        if (err) {
            console.error(JSON.stringify({ level: 'error', msg: 'shutdown failed', error: err.message }));
            process.exit(1);
        }
        process.exit(0);
    });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
