import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfidenceBadge } from '../components/shared/ConfidenceBadge.js';
import { StatedLabel } from '../components/shared/StatedLabel.js';
import { ReceiptLink } from '../components/shared/ReceiptLink.js';

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string) || 'http://localhost:3000';
const DATA_SOURCE = (import.meta.env.VITE_DATA_SOURCE as string) || 'live';

const STEP_LABELS: Record<string, string> = {
  queued: 'Queued...',
  cloning: 'Cloning repo...',
  ranking: 'Finding hotspot files...',
  linking: 'Fetching GitHub PRs & issues...',
  writing: 'Generating file stories with AI...',
  summarizing: 'Synthesising case overview...',
  persisting: 'Saving to database...',
  verifying: 'Checking trust invariants...',
  done: 'Done! Redirecting...',
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState('');

  const isLive = DATA_SOURCE === 'live';

  const normaliseUrl = (raw: string): string => {
    let url = raw.trim();
    // Strip trailing .git
    url = url.replace(/\.git$/, '');
    if (!url.startsWith('http')) {
      // e.g. "owner/repo" or "github.com/owner/repo"
      if (!url.includes('github.com')) {
        url = `https://github.com/${url}`;
      } else {
        url = `https://${url}`;
      }
    }
    return url;
  };

  const handleAnalyze = async () => {
    const raw = inputVal.trim();

    // Empty input → demo
    if (!raw) {
      navigate('/c/SidhCodez/ColdCase');
      return;
    }

    if (!isLive) {
      setError('Live analysis is disabled in demo mode. Clear the input to view the demo case.');
      return;
    }

    const repoUrl = normaliseUrl(raw);
    const ghMatch = repoUrl.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
    if (!ghMatch) {
      setError('Enter a valid GitHub URL like github.com/owner/repo');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentStep('queued');

    try {
      const res = await fetch(`${WORKER_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to start analysis');
      }

      const { jobId } = data;

      const poll = async () => {
        try {
          const pollRes = await fetch(`${WORKER_URL}/job/${jobId}`);
          const pollData = await pollRes.json();

          if (pollData.status === 'failed') {
            setError(pollData.message || 'Analysis failed. Check the repo URL and try again.');
            setLoading(false);
            return;
          }

          if (pollData.status === 'done') {
            setCurrentStep('done');
            navigate(pollData.caseUrl);
            return;
          }

          setCurrentStep(pollData.step || pollData.status);
          setTimeout(poll, 2000);
        } catch {
          setError('Lost connection to the worker. Try again.');
          setLoading(false);
        }
      };

      setTimeout(poll, 1500);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not reach the worker. Make sure it is running.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-fg-primary font-display flex flex-col">
      {/* Navbar */}
      <header className="border-b border-border-default bg-bg-elevated/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-black font-bold flex items-center justify-center font-mono text-sm">
              CC
            </div>
            <span className="font-bold text-lg tracking-tight">ColdCase</span>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              isLive
                ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
                : 'text-amber-400 border-amber-400/30 bg-amber-400/10'
            }`}>
              {isLive ? 'LIVE' : 'DEMO'}
            </span>
            <button
              type="button"
              onClick={() => navigate('/c/SidhCodez/ColdCase')}
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-amber-400/10 text-amber-400 border border-amber-400/30 hover:bg-amber-400/20 transition-colors"
            >
              Demo Case →
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-fg-primary">
            Every line has a reason.{' '}
            <span className="text-amber-400">Find it.</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-fg-secondary max-w-2xl mx-auto">
            git blame tells you who. ColdCase tells you why, with receipts.
          </p>

          {/* Input */}
          <div className="mt-10 max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleAnalyze()}
              placeholder={isLive ? 'github.com/owner/repo — any public repo' : 'github.com/owner/repo'}
              disabled={loading}
              className="flex-1 bg-bg-elevated border border-border-default rounded-xl px-4 py-3 text-sm text-fg-primary placeholder-fg-disabled focus:outline-none focus:border-border-accent disabled:opacity-50 transition-colors"
            />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading}
              className="bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl text-sm hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/10 disabled:opacity-60 flex items-center justify-center min-w-[170px] gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="truncate">{STEP_LABELS[currentStep] || 'Working...'}</span>
                </>
              ) : (
                inputVal.trim() ? 'Analyze Repo' : 'View Demo Case'
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-400 font-medium max-w-xl mx-auto">
              {error}
            </div>
          )}

          {/* Progress bar while loading */}
          {loading && (
            <div className="mt-6 max-w-xl mx-auto">
              <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full animate-pulse w-1/2" />
              </div>
              <p className="mt-2 text-xs text-fg-tertiary font-mono">
                {STEP_LABELS[currentStep] || 'Processing...'}
              </p>
            </div>
          )}

          <div className="mt-6 text-xs text-fg-tertiary">
            {isLive
              ? 'Paste any public GitHub repo — ColdCase will clone it, read the history, and explain why the code looks the way it does.'
              : 'Demo mode active • Bundled snapshot • Zero network calls'}
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-5xl mx-auto px-6 py-12">
          <h2 className="text-xl font-bold text-fg-primary mb-8 text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Paste any public repo',
                desc: 'ColdCase clones the repository and reads its full git history, pull requests, and linked issues via the GitHub API.',
              },
              {
                step: '02',
                title: 'AI reads the evidence',
                desc: 'Groq\'s LLM explains each hotspot file using only the commit messages, PR bodies, and issue text — never guessing.',
              },
              {
                step: '03',
                title: 'Every claim has a receipt',
                desc: 'A deterministic quote-check verifies every stated claim appears verbatim in the cited evidence. No receipt = no claim.',
              },
            ].map(item => (
              <div
                key={item.step}
                className="p-5 bg-bg-elevated border border-border-default rounded-xl"
              >
                <div className="text-amber-400 font-mono font-bold text-xs mb-2">{item.step}</div>
                <h3 className="text-sm font-bold text-fg-primary mb-2">{item.title}</h3>
                <p className="text-xs text-fg-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Mini-Demo */}
        <section className="max-w-5xl mx-auto px-6 py-8">
          <div className="bg-bg-elevated border border-border-default rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-3">
              <span className="text-xs font-mono text-fg-secondary">
                Example: packages/core/src/confidence.ts
              </span>
              <span className="text-xs text-amber-400 font-mono">Live result preview</span>
            </div>

            <div className="bg-bg-base border border-border-subtle rounded-xl p-4 font-mono text-xs">
              <div className="flex items-center gap-3 py-1.5 px-2 rounded bg-amber-400/10">
                <span className="text-amber-400 font-bold w-8 shrink-0">L42</span>
                <span className="text-fg-primary">
                  if (!claim.evidence_ids || claim.evidence_ids.length === 0) return 'NONE';
                </span>
              </div>
              <div className="mt-3 p-3 bg-bg-elevated border border-border-accent/40 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ConfidenceBadge tier="HIGH" />
                  <StatedLabel type="stated" />
                </div>
                <p className="text-sm font-sans font-medium text-fg-primary">
                  Claims without evidence receipts must always evaluate to NONE confidence.
                </p>
                <blockquote className="mt-2 text-xs italic text-amber-200/90 border-l-2 border-amber-400/50 pl-2 py-0.5">
                  "No claim is shown without a receipt."
                </blockquote>
                <div className="mt-2 flex gap-2">
                  <ReceiptLink evidenceId="pr:1" onClick={() => {}} />
                  <ReceiptLink evidenceId="commit:a3f9c2b" onClick={() => {}} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-default py-8 text-center text-xs text-fg-tertiary">
        <p>ColdCase Forensic Analysis • git blame tells you who. ColdCase tells you why, with receipts.</p>
      </footer>
    </div>
  );
}
