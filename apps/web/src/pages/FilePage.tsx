import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getFile, findClaimsForLine } from '../lib/data.js';
import { FileDetail, Evidence, Claim } from '../lib/types.js';
import { CodeView } from '../components/file/CodeView.js';
import { ClaimCard } from '../components/file/ClaimCard.js';
import { LineWhyPanel } from '../components/file/LineWhyPanel.js';
import { EvidenceDrawer } from '../components/file/EvidenceDrawer.js';
import { HonestyBanner } from '../components/shared/HonestyBanner.js';

export default function FilePage() {
  const params = useParams();
  const owner = params.owner || 'SidhCodez';
  const repo = params.repo || 'ColdCase';
  const filePath = params['*'] || 'packages/core/src/confidence.ts';

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [fileData, setFileData] = useState<FileDetail | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  const selectedLineParam = searchParams.get('line');
  const selectedLine = selectedLineParam ? parseInt(selectedLineParam, 10) : undefined;
  const selectedEvidenceParam = searchParams.get('evidence');

  useEffect(() => {
    getFile(owner, repo, filePath).then(setFileData);
  }, [owner, repo, filePath]);

  useEffect(() => {
    if (fileData && selectedEvidenceParam) {
      const found = fileData.evidence.find(e => e.id === selectedEvidenceParam);
      setSelectedEvidence(found || null);
    } else {
      setSelectedEvidence(null);
    }
  }, [fileData, selectedEvidenceParam]);

  if (!fileData) {
    return (
      <div className="min-h-screen bg-bg-base text-fg-primary flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-fg-secondary">Loading file...</p>
        </div>
      </div>
    );
  }

  const handleLineClick = (lineNum: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (next.get('line') === String(lineNum)) {
        next.delete('line');
      } else {
        next.set('line', String(lineNum));
      }
      return next;
    });
  };

  const handleOpenEvidence = (id: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('evidence', id);
      return next;
    });
  };

  const handleCloseEvidence = () => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('evidence');
      return next;
    });
  };

  const handleCloseLineWhy = () => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('line');
      return next;
    });
  };

  let lineClaims: Claim[] = [];
  let matchedBlame = fileData.blame[0];
  if (selectedLine) {
    lineClaims = findClaimsForLine(selectedLine, fileData.blame, fileData.narrative.claims);
    const range = fileData.blame.find(r => selectedLine >= r.start && selectedLine <= r.end);
    if (range) matchedBlame = range;
  }

  // Filter out NONE claims for display to avoid confusing users with empty cards
  const visibleClaims = fileData.narrative.claims.filter(
    c => c.confidence_tier !== 'NONE'
  );

  return (
    <div className="h-screen bg-bg-base text-fg-primary flex flex-col font-display overflow-hidden">
      {/* Header */}
      <header className="border-b border-border-default bg-bg-elevated px-6 py-3 flex items-center justify-between h-14 shrink-0">
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={() => navigate(`/c/${owner}/${repo}`)}
            className="text-xs px-3 py-1.5 bg-bg-raised hover:bg-border-default rounded-md text-fg-primary font-medium transition-colors"
          >
            ← Back to Overview
          </button>
          <span className="text-xs font-mono text-fg-tertiary">/</span>
          <span className="text-sm font-mono font-bold text-fg-primary truncate" title={fileData.path}>
            {fileData.path}
          </span>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Pane: Code View */}
        <div className="w-full md:w-[60%] border-r border-border-default h-full overflow-y-auto">
          <CodeView
            content={fileData.content}
            blame={fileData.blame}
            selectedLine={selectedLine}
            onLineClick={handleLineClick}
          />
        </div>

        {/* Right Pane: Story Panel */}
        <div className="w-full md:w-[40%] h-full overflow-y-auto bg-bg-base">
          <div className="p-6">
            <h2 className="text-xl font-bold text-fg-primary mb-2">The Story of this File</h2>
            <p className="text-sm text-fg-secondary mb-6 leading-relaxed">
              This explains why the code was written this way. Click any line of code on the left to see the specific reason it was changed, or read the full chronological story below.
            </p>

            {fileData.narrative.sampled_history && (
              <div className="mb-6">
                <HonestyBanner variant="sampled" />
              </div>
            )}

            {visibleClaims.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border-default rounded-xl">
                <div className="text-3xl mb-2">🕵️‍♂️</div>
                <h3 className="text-sm font-bold text-fg-primary">No Recorded History</h3>
                <p className="text-xs text-fg-tertiary mt-1">
                  We searched the PRs and issues for this file's commits, but couldn't find any explicit statements explaining why these changes were made.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleClaims.map(claim => (
                  <ClaimCard
                    key={claim.claim_id}
                    claim={claim}
                    onOpenEvidence={handleOpenEvidence}
                    onNavigateLine={line => handleLineClick(line)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Overlay: Line Why Panel (slides in when clicking a line) */}
        {selectedLine && matchedBlame && (
          <LineWhyPanel
            lineNumber={selectedLine}
            blame={matchedBlame}
            claims={lineClaims}
            evidence={fileData.evidence}
            onClose={handleCloseLineWhy}
            onOpenEvidence={handleOpenEvidence}
          />
        )}
      </div>

      {/* Modal: Evidence Drawer (opens when clicking a receipt) */}
      {selectedEvidence && (
        <EvidenceDrawer
          evidence={selectedEvidence}
          onClose={handleCloseEvidence}
        />
      )}
    </div>
  );
}
