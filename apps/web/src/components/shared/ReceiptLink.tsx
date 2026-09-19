import React from 'react';

interface ReceiptLinkProps {
  evidenceId: string;
  onClick: (id: string) => void;
}

export const ReceiptLink: React.FC<ReceiptLinkProps> = ({ evidenceId, onClick }) => {
  return (
    <button
      type="button"
      onClick={() => onClick(evidenceId)}
      className="inline-flex items-center gap-1 font-mono text-xs text-amber-400 hover:text-amber-300 hover:underline bg-amber-400/10 hover:bg-amber-400/20 px-1.5 py-0.5 rounded transition-colors"
      aria-label={`Open evidence: ${evidenceId}`}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      <span>{evidenceId}</span>
    </button>
  );
};
