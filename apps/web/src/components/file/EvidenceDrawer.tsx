import React from 'react';
import { Evidence } from '../../lib/types.js';

interface EvidenceDrawerProps {
  evidence: Evidence | null;
  quote?: string;
  onClose: () => void;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  evidence,
  quote,
  onClose,
}) => {
  if (!evidence) return null;

  let bodyContent = <>{evidence.body}</>;

  if (quote) {
    const normQuote = normalizeWhitespace(quote);
    const normBody = normalizeWhitespace(evidence.body);
    const idx = normBody.indexOf(normQuote);
    
    if (idx !== -1) {
      bodyContent = (
        <>
          {normBody.substring(0, idx)}
          <mark className="bg-amber-400/30 text-amber-200 px-1 rounded">
            {normQuote}
          </mark>
          {normBody.substring(idx + normQuote.length)}
        </>
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-bg-overlay backdrop-blur-sm">
      <div className="w-full max-w-lg bg-bg-elevated border-l border-border-default h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="p-4 border-b border-border-default flex items-center justify-between bg-bg-raised">
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
              {evidence.type}
            </span>
            <h3 className="text-sm font-mono font-semibold text-fg-primary mt-1">
              {evidence.id}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-tertiary hover:text-fg-primary p-1.5 rounded hover:bg-bg-raised"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {evidence.title && (
            <div>
              <h4 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider mb-1">
                Title
              </h4>
              <p className="text-sm font-medium text-fg-primary">
                {evidence.title}
              </p>
            </div>
          )}

          {evidence.author && (
            <div>
              <h4 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider mb-1">
                Author
              </h4>
              <p className="text-xs font-mono text-fg-secondary">
                {evidence.author}
              </p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider mb-1">
              Body
            </h4>
            <div className="p-3 bg-bg-base border border-border-subtle rounded-md text-xs font-mono text-fg-secondary whitespace-pre-wrap leading-relaxed">
              {bodyContent}
            </div>
          </div>

          <div className="pt-2">
            <a
              href={evidence.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline font-mono"
            >
              <span>View on GitHub</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
