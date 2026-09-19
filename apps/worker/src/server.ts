// Load .env from monorepo root before anything else
import { config as loadDotenv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import { runPipeline } from '@coldcase/pipeline';
import rateLimit from 'express-rate-limit';

const __dirname2 = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname2, '..', '..', '..', '.env');
loadDotenv({ path: envPath });

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const LIVE_MODE_ENABLED = process.env.LIVE_MODE_ENABLED !== 'false';
const DAILY_JOB_CAP = parseInt(process.env.DAILY_JOB_CAP || '50', 10);
const startTime = Date.now();

// Snapshot directory — pipeline writes here, worker serves from here
const SNAPSHOT_DIR = resolve(__dirname2, '..', '..', '..', 'data', 'demo');

let dailyJobCount = 0;
let dailyJobResetDate = new Date().toDateString();

app.use(express.json());

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Rate limiter: 5 req/min per IP ───────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limited',
    message: 'Too many requests. Try again in a minute.',
    retry_after_seconds: 60,
  },
});

// ── Job state ─────────────────────────────────────────────────────────────────
export interface JobState {
  jobId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  step?: string;
  caseUrl?: string;
  snapshotUrl?: string;
  error?: string;
  message?: string;
  startedAt: string;
  completedAt?: string;
}

const jobs = new Map<string, JobState>();

// ── GET /health ───────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  res.json({
    status: 'ok',
    apiVersion: '1.0',
    liveModeEnabled: LIVE_MODE_ENABLED,
    queueDepth: Array.from(jobs.values()).filter(j => j.status === 'running').length,
    uptimeSeconds,
  });
});

// ── GET /snapshot/:owner/:repo ────────────────────────────────────────────────
// Serves a generated snapshot JSON so the web app can read any analyzed repo.
app.get('/snapshot/:owner/:repo', (req: Request, res: Response) => {
  const { owner, repo } = req.params;

  // Validate owner/repo to prevent path traversal
  if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo)) {
    return res.status(400).json({ error: 'invalid_repo', message: 'Invalid owner or repo name.' });
  }

  const filename = `${owner}__${repo}.json`;
  const snapshotPath = resolve(SNAPSHOT_DIR, filename);

  if (!fs.existsSync(snapshotPath)) {
    return res.status(404).json({
      error: 'snapshot_not_found',
      message: `No snapshot found for ${owner}/${repo}. Run the pipeline first.`,
    });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(snapshotPath);
});

// ── POST /analyze ─────────────────────────────────────────────────────────────
app.post('/analyze', apiLimiter, (req: Request, res: Response) => {
  // Daily cap reset
  const today = new Date().toDateString();
  if (today !== dailyJobResetDate) {
    dailyJobCount = 0;
    dailyJobResetDate = today;
  }

  if (!LIVE_MODE_ENABLED) {
    return res.status(503).json({
      error: 'live_mode_disabled',
      message: 'Live analysis is turned off right now. Try one of the example cases.',
    });
  }

  if (dailyJobCount >= DAILY_JOB_CAP) {
    return res.status(429).json({
      error: 'rate_limited',
      message: 'Daily analysis cap reached. Try again tomorrow or use an example case.',
      retry_after_seconds: 3600,
    });
  }

  // Only one job at a time
  const runningJob = Array.from(jobs.values()).find(j => j.status === 'running');
  if (runningJob) {
    return res.status(503).json({
      error: 'queue_full',
      message: 'A job is already running. Try again in a few minutes.',
    });
  }

  const { repoUrl } = req.body || {};
  if (!repoUrl || typeof repoUrl !== 'string') {
    return res.status(400).json({
      error: 'invalid_repo_url',
      message: 'Please paste a GitHub repository URL like https://github.com/owner/repo.',
    });
  }

  const match = repoUrl.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
  if (!match) {
    return res.status(400).json({
      error: 'invalid_repo_url',
      message: 'Please paste a GitHub repository URL like https://github.com/owner/repo.',
    });
  }

  const [, owner, repoName] = match;
  const jobId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  const job: JobState = {
    jobId,
    status: 'running',
    step: 'queued',
    caseUrl: `/c/${owner}/${repoName}`,
    snapshotUrl: `/snapshot/${owner}/${repoName}`,
    startedAt,
  };

  jobs.set(jobId, job);
  dailyJobCount++;

  const updateStep = (step: string) => { job.step = step; };

  runPipeline({
    repo: `${owner}/${repoName}`,
    top: 10,
    onStep: updateStep,
  })
    .then(() => {
      job.status = 'done';
      job.step = 'done';
      job.completedAt = new Date().toISOString();
    })
    .catch((err: unknown) => {
      job.status = 'failed';
      job.error = 'pipeline_failed';
      job.message = err instanceof Error ? err.message : String(err);
      job.completedAt = new Date().toISOString();
    });

  return res.status(202).json({ jobId });
});

// ── GET /job/:jobId ───────────────────────────────────────────────────────────
app.get('/job/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'job_not_found', message: 'Job not found.' });
  }
  return res.json(job);
});

app.listen(port, () => {
  console.log(`[Worker] Listening on port ${port} | live=${LIVE_MODE_ENABLED} | snapshots=${SNAPSHOT_DIR}`);
});
