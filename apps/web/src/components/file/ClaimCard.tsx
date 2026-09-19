import React from 'react';
import { Claim } from '../../lib/types.js';
import { ConfidenceBadge } from '../shared/ConfidenceBadge.js';
import { StatedLabel } from '../shared/StatedLabel.js';
import { ReceiptLink } from '../shared/ReceiptLink.js';

interface ClaimCardProps {
  claim: Claim;
  onOpenEvidence: (id: string) => void;
  onNavigateLine?: (line: number) => void;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({
  claim,
  onOpenEvidence,
  onNavigateLine,
}) => {
  const isNone = claim.confidence_tier === 'NONE' || claim.text === 'No recorded reason found';

  return (
    <div className="p-4 bg-bg-elevated border border-border-default rounded-lg mb-3 shadow-sm hover:border-border-accent/40 transition-colors">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <ConfidenceBadge tier={claim.confidence_tier} />
          <StatedLabel type={claim.stated_vs_inferred} />
        </div>
        {claim.line_range && onNavigateLine && (
          <button
            type="button"
            onClick={() => onNavigateLine(claim.line_range!.start)}
            className="text-xs font-mono text-zinc-400 hover:text-amber-400"
          >
            L{claim.line_range.start}-{claim.line_range.end}
          </button>
        )}
      </div>

      <p className="text-sm font-medium text-fg-primary leading-relaxed">
        {isNone ? (
          <span className="text-fg-tertiary italic">No recorded reason found</span>
        ) : (
          claim.text
        )}
      </p>

      {/* Quote display if stated */}
      {claim.quote && (
        <blockquote className="mt-2.5 pl-3 border-l-2 border-amber-400/40 text-xs text-amber-200/90 italic bg-amber-400/5 py-1.5 pr-2 rounded-r">
          "{claim.quote}"
        </blockquote>
      )}

      {/* Evidence receipts */}
      {claim.evidence_ids && claim.evidence_ids.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-fg-tertiary font-mono">Receipts:</span>
          {claim.evidence_ids.map(id => (
            <ReceiptLink key={id} evidenceId={id} onClick={onOpenEvidence} />
          ))}
        </div>
      )}
    </div>
  );
};
