import cors from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

type SdrState = {
  frequencyHz: number;
  bandwidthHz: number;
  gainDb: number;
  sampleRateHz: number;
  mode: 'AM' | 'FM' | 'USB' | 'LSB' | 'CW';
  connected: boolean;
  updatedAt: string;
};

const app = express();
const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? '0.0.0.0';
const corsOrigin = process.env.CORS_ORIGIN ?? '*';

let sdrState: SdrState = {
  frequencyHz: 7100000,
  bandwidthHz: 2400,
  gainDb: 22,
  sampleRateHz: 2048000,
  mode: 'USB',
  connected: true,
  updatedAt: new Date().toISOString(),
};

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '512kb' }));
app.use(morgan('combined'));

app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/readyz', (_req: Request, res: Response) => {
  res.status(200).json({ ready: true, service: 'sdr-express-app' });
});

app.get('/api/sdr/status', (_req: Request, res: Response) => {
  res.status(200).json(sdrState);
});

app.post('/api/sdr/tune', (req: Request, res: Response) => {
  const { frequencyHz, bandwidthHz, gainDb, sampleRateHz, mode } = req.body as Partial<SdrState>;

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
    const validModes = ['AM', 'FM', 'USB', 'LSB', 'CW'] as const;
    if (!validModes.includes(mode as (typeof validModes)[number])) {
      return res.status(400).json({ error: `mode must be one of ${validModes.join(', ')}` });
    }
    sdrState.mode = mode as SdrState['mode'];
  }

  sdrState.updatedAt = new Date().toISOString();
  return res.status(200).json(sdrState);
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

const server = app.listen(port, host, () => {
  // Structured startup log makes container startup diagnostics easier in k3s.
  console.log(JSON.stringify({ level: 'info', msg: 'sdr-express-app started', host, port }));
});

const shutdown = (signal: NodeJS.Signals) => {
  console.log(JSON.stringify({ level: 'info', msg: `received ${signal}, shutting down` }));
  server.close((err?: Error) => {
    if (err) {
      console.error(JSON.stringify({ level: 'error', msg: 'shutdown failed', error: err.message }));
      process.exit(1);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
