import React from 'react';
import { BlameRange } from '../../lib/types.js';

interface CodeViewProps {
  content: string;
  blame: BlameRange[];
  selectedLine?: number;
  onLineClick: (lineNum: number) => void;
}

export const CodeView: React.FC<CodeViewProps> = ({
  content,
  blame,
  selectedLine,
  onLineClick,
}) => {
  const lines = content.split('\n');

  // Map line number to whether it has blame history
  const lineHasBlame = (lineNum: number) => {
    return blame.some(r => lineNum >= r.start && lineNum <= r.end);
  };

  return (
    <div className="font-mono text-xs leading-6 select-text overflow-x-auto bg-bg-base text-fg-primary h-full">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((lineText, idx) => {
            const lineNum = idx + 1;
            const hasBlame = lineHasBlame(lineNum);
            const isSelected = selectedLine === lineNum;

            return (
              <tr
                key={lineNum}
                className={`group ${
                  isSelected ? 'bg-amber-400/20' : 'hover:bg-bg-elevated'
                }`}
              >
                {/* Gutter / Blame Button */}
                <td className="w-12 text-right pr-2 select-none border-r border-border-subtle bg-bg-elevated/50">
                  {hasBlame ? (
                    <button
                      type="button"
                      onClick={() => onLineClick(lineNum)}
                      className={`w-6 h-5 rounded text-[10px] font-bold inline-flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-amber-400 text-black'
                          : 'bg-zinc-800 text-zinc-400 group-hover:bg-amber-400/30 group-hover:text-amber-300'
                      }`}
                      title={`Inspect line ${lineNum}`}
                    >
                      ?
                    </button>
                  ) : (
                    <span className="text-zinc-600 text-[10px]">{lineNum}</span>
                  )}
                </td>

                {/* Line Content */}
                <td className="pl-4 pr-4 whitespace-pre font-mono text-[13px] leading-6">
                  {lineText || ' '}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
