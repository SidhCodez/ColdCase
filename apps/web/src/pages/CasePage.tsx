import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCase } from '../lib/data.js';
import { CaseDetail } from '../lib/types.js';
import { ConfidenceMixBar } from '../components/shared/ConfidenceMixBar.js';
import { HonestyBanner } from '../components/shared/HonestyBanner.js';

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
          <p className="text-sm text-fg-secondary font-mono">Analysing {owner}/{repo}...</p>
        </div>
      </div>
    );
  }

  if (state === 'not_found') {
    return (
      <div className="min-h-screen bg-bg-base text-fg-primary flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="text-4xl font-bold text-amber-400 font-mono">404</div>
          <h1 className="text-xl font-bold">Case not found</h1>
          <p className="text-sm text-fg-secondary">
            No analysis exists for <span className="font-mono text-fg-primary">{owner}/{repo}</span>.
            Run the pipeline or paste the URL on the landing page to analyze it.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 px-5 py-2 rounded-xl bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 transition-colors"
          >
            ← Back to Landing
          </button>
        </div>
      </div>
    );
  }

  if (state === 'error' || !caseData) {
    return (
      <div className="min-h-screen bg-bg-base text-fg-primary flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="text-4xl font-bold text-red-400 font-mono">Error</div>
          <h1 className="text-xl font-bold">Failed to load case</h1>
          <p className="text-sm text-fg-secondary">
            The snapshot could not be loaded. The worker may be offline or the snapshot is invalid.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 px-5 py-2 rounded-xl bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 transition-colors"
          >
            ← Back to Landing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base text-fg-primary font-display">
      {/* Header */}
      <header className="border-b border-border-default bg-bg-elevated px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs text-fg-tertiary hover:text-fg-primary font-medium"
            >
              ← ColdCase
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

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Synthesis */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-fg-primary mb-3">Repository Eras</h2>
            {caseData.synthesis.eras.length === 0 ? (
              <div className="p-4 bg-bg-elevated border border-border-default rounded-xl text-xs text-fg-tertiary italic">
                No eras recorded. Run the pipeline with LLM keys to generate synthesis.
              </div>
            ) : (
              caseData.synthesis.eras.map((era, idx) => (
                <div key={idx} className="p-4 bg-bg-elevated border border-border-default rounded-xl mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-amber-400">{era.name}</h3>
                    <span className="text-xs font-mono text-fg-tertiary">
                      {era.date_range.start} – {era.date_range.end}
                    </span>
                  </div>
                  <p className="text-xs text-fg-secondary leading-relaxed">{era.summary}</p>
                </div>
              ))
            )}
          </div>

          {caseData.synthesis.key_decisions.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-fg-primary mb-3">Key Architectural Decisions</h2>
              <div className="space-y-2">
                {caseData.synthesis.key_decisions.map((kd, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-bg-elevated border border-border-default rounded-lg text-xs font-medium text-fg-primary"
                  >
                    {kd.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Stats + Hotspot Files */}
        <div className="space-y-6">
          <div className="p-5 bg-bg-elevated border border-border-default rounded-xl">
            <h2 className="text-sm font-bold text-fg-primary mb-3">Case Stats</h2>
            <ConfidenceMixBar mix={caseData.stats.confidence_mix} />
            <HonestyBanner
              variant="case-limited"
              n={caseData.stats.files_analyzed}
              m={caseData.stats.files_total}
            />
          </div>

          <div>
            <h2 className="text-sm font-bold text-fg-primary mb-3">Hotspot Files</h2>
            <div className="space-y-2">
              {caseData.files.map(file => (
                <button
                  type="button"
                  key={file.path}
                  onClick={() =>
                    navigate(`/c/${caseData.owner}/${caseData.repo}/f/${file.path}`)
                  }
                  className="w-full text-left p-3 bg-bg-elevated hover:bg-bg-raised border border-border-default hover:border-border-accent/50 rounded-lg transition-colors flex items-center justify-between group"
                >
                  <div className="truncate pr-2">
                    <span className="text-xs font-mono font-medium text-fg-primary group-hover:text-amber-400 block truncate">
                      {file.path}
                    </span>
                    <div className="text-[11px] text-fg-tertiary mt-0.5">
                      Rank #{file.hotspotRank} • {file.changeCount} changes
                      {file.sampledHistory && ' • sampled'}
                    </div>
                  </div>
                  <span className="text-xs text-fg-tertiary group-hover:text-amber-400 shrink-0">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
