import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCase } from '../lib/data.js';
import { CaseDetail } from '../lib/types.js';
import { ConfidenceBadge } from '../components/shared/ConfidenceBadge.js';

type LoadState = 'loading' | 'loaded' | 'not_found' | 'error';

export default function CasePage() {
  const { owner = 'SidhCodez', repo = 'ColdCase' } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    setState('loading');
    getCase(owner, repo)
      .then(data => {
        if (data) {
          setCaseData(data);
          setState('loaded');
        } else {
          setState('not_found');
        }
      })
      .catch(() => setState('error'));
  }, [owner, repo]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-bg-base text-fg-primary flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-fg-secondary">Loading analysis for {owner}/{repo}...</p>
        </div>
      </div>
    );
  }

  if (state === 'not_found') {
    return (
      <div className="min-h-screen bg-bg-base text-fg-primary flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="text-5xl">🔍</div>
          <h1 className="text-xl font-bold">No analysis found</h1>
          <p className="text-sm text-fg-secondary">
            <span className="font-mono text-fg-primary">{owner}/{repo}</span> hasn't been analyzed yet.
            Go back and paste the repo URL to start an analysis.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 px-5 py-2 rounded-xl bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 transition-colors"
          >
            ← Analyze a Repo
          </button>
        </div>
      </div>
    );
  }

  if (state === 'error' || !caseData) {
    return (
      <div className="min-h-screen bg-bg-base text-fg-primary flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="text-5xl">⚠</div>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-fg-secondary">
            Could not load the analysis. The worker may be offline.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 px-5 py-2 rounded-xl bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 transition-colors"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const totalClaims = caseData.stats.confidence_mix;
  const totalCount = Object.values(totalClaims).reduce((a, b) => a + b, 0);
  const highMedCount = (totalClaims.HIGH || 0) + (totalClaims.MEDIUM || 0);

  return (
    <div className="min-h-screen bg-bg-base text-fg-primary font-display">
      {/* Header */}
      <header className="border-b border-border-default bg-bg-elevated px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs text-fg-tertiary hover:text-fg-primary font-medium"
            >
              ← Home
            </button>
            <span className="text-fg-subtle text-xs">/</span>
            <h1 className="text-base font-bold font-mono text-fg-primary">
              {caseData.owner}/{caseData.repo}
            </h1>
          </div>
          <span className="text-xs font-mono text-fg-tertiary bg-bg-raised px-2 py-1 rounded">
            {caseData.lastFetchedSha.substring(0, 7)}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Quick Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-bg-elevated border border-border-default rounded-xl text-center">
            <div className="text-2xl font-bold text-amber-400 font-mono">{caseData.files.length}</div>
            <div className="text-xs text-fg-tertiary mt-1">Files Analyzed</div>
          </div>
          <div className="p-4 bg-bg-elevated border border-border-default rounded-xl text-center">
            <div className="text-2xl font-bold text-fg-primary font-mono">{totalCount}</div>
            <div className="text-xs text-fg-tertiary mt-1">Total Findings</div>
          </div>
          <div className="p-4 bg-bg-elevated border border-border-default rounded-xl text-center">
            <div className="text-2xl font-bold text-emerald-400 font-mono">{highMedCount}</div>
            <div className="text-xs text-fg-tertiary mt-1">Verified Findings</div>
          </div>
          <div className="p-4 bg-bg-elevated border border-border-default rounded-xl text-center">
            <div className="text-2xl font-bold text-fg-primary font-mono">{caseData.synthesis.eras.length}</div>
            <div className="text-xs text-fg-tertiary mt-1">Eras Detected</div>
          </div>
        </div>

        {/* What is this section */}
        <div className="p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl">
          <p className="text-xs text-fg-secondary leading-relaxed">
            <span className="font-semibold text-amber-400">What you're looking at:</span> ColdCase analyzed the top {caseData.files.length} most-changed files in this repository. These are the "hotspot" files — the ones with the most commits, meaning they have the richest history to explain. Click any file below to see why each line of code was written.
          </p>
        </div>

        {/* Repository Timeline */}
        {caseData.synthesis.eras.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-fg-primary mb-1">Project Timeline</h2>
            <p className="text-xs text-fg-tertiary mb-4">How this repository evolved over time, based on the evidence found in commits and PRs.</p>
            <div className="space-y-3">
              {caseData.synthesis.eras.map((era, idx) => (
                <div key={idx} className="p-4 bg-bg-elevated border border-border-default rounded-xl flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-amber-400/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-fg-primary">{era.name}</h3>
                      <span className="text-[10px] font-mono text-fg-tertiary bg-bg-raised px-1.5 py-0.5 rounded">
                        {era.date_range.start} → {era.date_range.end}
                      </span>
                    </div>
                    <p className="text-xs text-fg-secondary leading-relaxed mt-1">{era.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Key Decisions */}
        {caseData.synthesis.key_decisions.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-fg-primary mb-1">Key Decisions</h2>
            <p className="text-xs text-fg-tertiary mb-4">Important architectural choices discovered in the project's history.</p>
            <div className="space-y-2">
              {caseData.synthesis.key_decisions.map((kd, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-bg-elevated border border-border-default rounded-lg text-sm text-fg-primary flex gap-3 items-start"
                >
                  <span className="text-amber-400 font-mono font-bold text-xs shrink-0 mt-0.5">#{idx + 1}</span>
                  <span>{kd.text}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Analyzed Files */}
        <section>
          <h2 className="text-lg font-bold text-fg-primary mb-1">Analyzed Files</h2>
          <p className="text-xs text-fg-tertiary mb-4">
            These are the {caseData.files.length} most frequently changed files. They were selected because files with more commits have more recorded reasoning to uncover. Click a file to see its full story.
          </p>
          <div className="space-y-2">
            {caseData.files.map(file => {
              // Count non-NONE claims for this file from the snapshot
              const claimCount = file.changeCount;
              return (
                <button
                  type="button"
                  key={file.path}
                  onClick={() =>
                    navigate(`/c/${caseData.owner}/${caseData.repo}/f/${file.path}`)
                  }
                  className="w-full text-left p-4 bg-bg-elevated hover:bg-bg-raised border border-border-default hover:border-amber-400/40 rounded-xl transition-all flex items-center justify-between group"
                >
                  <div className="truncate pr-3 flex-1 min-w-0">
                    <span className="text-sm font-mono font-medium text-fg-primary group-hover:text-amber-400 block truncate">
                      {file.path}
                    </span>
                    <div className="text-xs text-fg-tertiary mt-1 flex items-center gap-3">
                      <span>#{file.hotspotRank} most changed</span>
                      <span className="text-fg-subtle">|</span>
                      <span>{claimCount} commits</span>
                      {file.sampledHistory && (
                        <>
                          <span className="text-fg-subtle">|</span>
                          <span className="text-amber-400/70">sampled history</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-fg-tertiary group-hover:text-amber-400 shrink-0 transition-colors">
                    View Story →
                  </span>
                </button>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
