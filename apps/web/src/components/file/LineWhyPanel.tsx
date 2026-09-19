import React from 'react';
import { BlameRange, Claim, Evidence } from '../../lib/types.js';
import { ClaimCard } from './ClaimCard.js';

interface LineWhyPanelProps {
  lineNumber: number;
  blame: BlameRange;
  claims: Claim[];
  evidence: Evidence[];
  onClose: () => void;
  onOpenEvidence: (id: string) => void;
}

export const LineWhyPanel: React.FC<LineWhyPanelProps> = ({
  lineNumber,
  blame,
  claims,
  onClose,
  onOpenEvidence,
}) => {
  return (
    <div className="w-full md:w-[380px] bg-bg-elevated border-l border-border-default h-full flex flex-col shadow-xl z-20">
      <div className="p-4 border-b border-border-default flex items-center justify-between bg-bg-raised/50">
        <div>
          <h3 className="text-sm font-semibold text-fg-primary">
            Line Why: Line {lineNumber}
          </h3>
          <p className="text-xs font-mono text-fg-tertiary">
            SHA: {blame.sha.substring(0, 7)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-fg-tertiary hover:text-fg-primary p-1 rounded hover:bg-bg-raised"
          aria-label="Close line why panel"
        >
          ✕
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-1">
        {claims.length === 0 ? (
          <div className="p-4 bg-bg-base border border-border-subtle rounded-md text-xs text-fg-tertiary italic">
            No recorded reason found
          </div>
        ) : (
          claims.map(claim => (
            <ClaimCard
              key={claim.claim_id}
              claim={claim}
              onOpenEvidence={onOpenEvidence}
            />
          ))
        )}
      </div>
    </div>
  );
};
