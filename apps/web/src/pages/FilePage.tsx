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
      <div className="min-h-screen bg-bg-base text-fg-primary p-12 text-center">
        Loading case file...
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

  // Find claims for selected line if LineWhyPanel is active
  let lineClaims: Claim[] = [];
  let matchedBlame = fileData.blame[0];
  if (selectedLine) {
    lineClaims = findClaimsForLine(selectedLine, fileData.blame, fileData.narrative.claims);
    const range = fileData.blame.find(r => selectedLine >= r.start && selectedLine <= r.end);
    if (range) matchedBlame = range;
  }

  return (
    <div className="h-screen bg-bg-base text-fg-primary flex flex-col font-display overflow-hidden">
      {/* Header */}
      <header className="border-b border-border-default bg-bg-elevated px-4 py-3 flex items-center justify-between h-14 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/c/${owner}/${repo}`)}
            className="text-xs text-fg-tertiary hover:text-fg-primary font-medium"
          >
            ← Overview
          </button>
          <span className="text-xs font-mono text-fg-tertiary">/</span>
          <span className="text-xs font-mono font-bold text-fg-primary">{fileData.path}</span>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Code View (55%) */}
        <div className="w-full md:w-[55%] border-r border-border-default h-full overflow-y-auto">
          <CodeView
            content={fileData.content}
            blame={fileData.blame}
            selectedLine={selectedLine}
            onLineClick={handleLineClick}
          />
        </div>

        {/* Right Pane: Story Panel (45%) */}
        <div className="hidden md:flex flex-col w-[45%] h-full overflow-y-auto p-4 bg-bg-base">
          {fileData.narrative.sampled_history && (
            <HonestyBanner variant="sampled" />
          )}

          <div className="mb-3">
            <h2 className="text-sm font-bold text-fg-primary">File Story</h2>
            <p className="text-xs text-fg-tertiary">
              Chronological explanation with evidence receipts
            </p>
          </div>

          <div className="space-y-3">
            {fileData.narrative.claims.map(claim => (
              <ClaimCard
                key={claim.claim_id}
                claim={claim}
                onOpenEvidence={handleOpenEvidence}
                onNavigateLine={line => handleLineClick(line)}
              />
            ))}
          </div>
        </div>

        {/* Line Why Side Panel Overlay */}
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

      {/* Evidence Drawer Modal */}
      {selectedEvidence && (
        <EvidenceDrawer
          evidence={selectedEvidence}
          onClose={handleCloseEvidence}
        />
      )}
    </div>
  );
}
