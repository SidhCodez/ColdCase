import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string) || 'http://localhost:3000';
const DATA_SOURCE = (import.meta.env.VITE_DATA_SOURCE as string) || 'live';

const STEP_LABELS: Record<string, string> = {
  queued: 'Queued...',
  cloning: 'Cloning repository...',
  ranking: 'Finding hotspot files...',
  linking: 'Fetching pull requests & issues...',
  writing: 'Generating file stories...',
  summarizing: 'Synthesizing case overview...',
  persisting: 'Saving evidence...',
  verifying: 'Checking trust invariants...',
  done: 'Done',
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [revealed, setRevealed] = useState(false);

  const isLive = DATA_SOURCE === 'live';

  // Trigger reveal animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const normaliseUrl = (raw: string): string => {
    let url = raw.trim();
    url = url.replace(/\.git$/, '');
    if (!url.startsWith('http')) {
      if (!url.includes('github.com')) {
        url = `https://github.com/${url}`;
      } else {
        url = `https://${url}`;
      }
    }
    return url;
  };

  const handleAnalyze = async (overrideUrl?: string) => {
    const raw = overrideUrl || inputVal.trim();

    if (!raw) return;

    if (!isLive && raw !== 'SidhCodez/ColdCase') {
      setError('Live analysis is disabled in this environment.');
      return;
    }

    const repoUrl = normaliseUrl(raw);
    const ghMatch = repoUrl.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
    if (!ghMatch) {
      setError('Enter a valid GitHub URL');
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
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to start analysis');

      const { jobId } = data;

      const poll = async () => {
        try {
          const pollRes = await fetch(`${WORKER_URL}/job/${jobId}`);
          const pollData = await pollRes.json();

          if (pollData.status === 'failed') {
            setError(pollData.message || 'Analysis failed. Check the repo URL.');
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
          setError('Lost connection to the worker.');
          setLoading(false);
        }
      };

      setTimeout(poll, 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not reach the worker.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-body selection:bg-[#fde047] selection:text-black">
      
      {/* Minimal Navbar */}
      <header className="px-6 h-20 flex items-center justify-between z-40 relative border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          {/* Concept-tied logo mark: A redacted block turning into a quote */}
          <div className="w-5 h-5 bg-white flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[#fde047]"></div>
          </div>
          <span className="font-display font-bold tracking-tight text-lg">ColdCase</span>
        </div>
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noreferrer"
          className="text-sm font-medium text-[#a1a1aa] hover:text-white transition-colors focus-ring p-2 rounded-md h-[44px] flex items-center"
        >
          GitHub
        </a>
      </header>

      <main>
        {/* Asymmetric Hero */}
        <section className="max-w-[1920px] mx-auto px-6 py-12 lg:py-24 grid grid-cols-1 lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_600px] gap-12 lg:gap-20 items-center">
          
          {/* Left: Copy & Input */}
          <div className="max-w-2xl">
            <h1 className="font-display font-bold text-[clamp(3rem,6vw,5.5rem)] leading-[1.05] tracking-[-0.03em] text-balance">
              Every line has a reason.<br />
              <span className="bg-[#fde047] text-[#09090b] px-2 leading-none inline-block mt-2 pb-1">Find it.</span>
            </h1>
            
            <p className="mt-6 text-[17px] text-[#a1a1aa] max-w-[55ch] leading-relaxed">
              git blame tells you who. ColdCase tells you why, with receipts. Paste a repository to autonomously audit its commits, pull requests, and issues.
            </p>

            <div className="mt-10 max-w-xl">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && handleAnalyze()}
                  placeholder={isLive ? "github.com/owner/repo" : "Demo mode active"}
                  disabled={loading || !isLive}
                  className="flex-1 bg-[#18181b] border border-[#27272a] rounded-xl px-5 h-[56px] text-base text-white placeholder-[#52525b] focus-ring transition-colors disabled:opacity-50"
                  aria-label="GitHub Repository URL"
                />
                <button
                  type="button"
                  onClick={() => handleAnalyze()}
                  disabled={loading || (!inputVal.trim() && isLive)}
                  className="bg-white text-black font-semibold h-[56px] px-8 rounded-xl text-[17px] hover:bg-[#e4e4e7] transition-colors focus-ring disabled:opacity-50 min-w-[160px] flex items-center justify-center"
                >
                  {loading ? STEP_LABELS[currentStep] || 'Working...' : 'Open case'}
                </button>
              </div>
              
              {error && (
                <div className="mt-3 text-sm text-[#ef4444] font-medium px-1">
                  {error}
                </div>
              )}

              <div className="mt-5 flex items-center gap-4 text-sm text-[#71717a]">
                <span>Try:</span>
                <button 
                  onClick={() => handleAnalyze('sindresorhus/is')} 
                  disabled={loading}
                  className="text-white hover:text-[#fde047] underline underline-offset-4 decoration-[#27272a] hover:decoration-[#fde047] focus-ring rounded-sm"
                >
                  sindresorhus/is
                </button>
                <button 
                  onClick={() => handleAnalyze('expressjs/express')} 
                  disabled={loading}
                  className="text-white hover:text-[#fde047] underline underline-offset-4 decoration-[#27272a] hover:decoration-[#fde047] focus-ring rounded-sm"
                >
                  expressjs/express
                </button>
                <span className="text-[#52525b]">|</span>
                <button 
                  onClick={() => navigate('/c/SidhCodez/ColdCase')} 
                  className="text-white hover:text-[#fde047] underline underline-offset-4 decoration-[#27272a] hover:decoration-[#fde047] focus-ring rounded-sm"
                >
                  solved case →
                </button>
              </div>
            </div>
          </div>

          {/* Right: Signature Motion Panel */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 lg:p-10 font-mono text-sm relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#fde047] opacity-20"></div>
            
            <div className="flex items-center gap-3 mb-8">
              <span className="bg-[#27272a] text-[#a1a1aa] px-2 py-1 text-xs">EXHIBIT A</span>
              <span className="text-[#71717a]">commit a3f9c2b</span>
            </div>

            <div className="space-y-4">
              <div className="text-[#a1a1aa]">
                // Why was this safety check added?
              </div>
              <div className="text-white font-medium">
                if (!claim.evidence_ids) return 'NONE';
              </div>
              
              <div className="mt-8 p-5 bg-[#09090b] border border-[#27272a] rounded-xl relative">
                <div className="text-xs text-[#52525b] mb-2 uppercase tracking-widest">Quote verification</div>
                <div className={`text-[#fde047] bg-[#fde047]/10 inline-block px-1 ${revealed ? 'redact-wrapper revealed' : 'redact-wrapper'}`}>
                  "We must enforce strict none-confidence for empty receipts."
                </div>
              </div>

              <div className="mt-4 p-5 bg-[#09090b] border border-[#27272a] rounded-xl relative">
                <div className="text-xs text-[#52525b] mb-2 uppercase tracking-widest">Unbacked claim</div>
                <div className="bg-white text-black inline-block px-2 py-0.5 redact-wrapper">
                  "The developer was preparing for future scale."
                </div>
                <div className="absolute inset-0 bg-[#09090b] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="text-[#ef4444] font-bold text-xs tracking-widest border border-[#ef4444] px-2 py-1">NO RECEIPT — NO CLAIM</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Chain of Custody */}
        <section className="border-t border-[#27272a] bg-[#09090b]">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <h2 className="font-display font-bold text-3xl mb-16">The Chain of Custody</h2>
            
            <div className="flex flex-col md:flex-row gap-0">
              {/* Step 1 */}
              <div className="flex-1 relative pb-12 md:pb-0 md:pr-8 border-l border-dashed border-[#27272a] md:border-l-0 md:border-t pl-8 md:pl-0 pt-0 md:pt-8">
                <div className="absolute w-3 h-3 bg-[#a1a1aa] rounded-full -left-[1.5px] top-0 md:top-[-6.5px] md:left-0"></div>
                <div className="font-mono text-xs text-[#71717a] mb-3">01 / INGEST</div>
                <h3 className="font-display font-bold text-xl mb-3">Clone & Blame</h3>
                <p className="text-[17px] text-[#a1a1aa] leading-relaxed max-w-[40ch]">
                  ColdCase clones the repository locally. It runs `git blame` to map every line to a commit, identifying the "hotspot" files with the deepest history.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex-1 relative pb-12 md:pb-0 md:pr-8 border-l border-dashed border-[#27272a] md:border-l-0 md:border-t pl-8 md:pl-0 pt-0 md:pt-8">
                <div className="absolute w-3 h-3 bg-[#a1a1aa] rounded-full -left-[1.5px] top-0 md:top-[-6.5px] md:left-0"></div>
                <div className="font-mono text-xs text-[#71717a] mb-3">02 / LEDGER</div>
                <h3 className="font-display font-bold text-xl mb-3">Fetch Context</h3>
                <p className="text-[17px] text-[#a1a1aa] leading-relaxed max-w-[40ch]">
                  Using the GitHub API, it fetches every Pull Request and Issue linked to those commits, building an immutable ledger of historical text.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex-1 relative pb-12 md:pb-0 border-l border-dashed border-[#27272a] md:border-l-0 md:border-t pl-8 md:pl-0 pt-0 md:pt-8">
                <div className="absolute w-3 h-3 bg-[#fde047] rounded-full -left-[1.5px] top-0 md:top-[-6.5px] md:left-0 shadow-[0_0_12px_rgba(253,224,71,0.5)]"></div>
                <div className="font-mono text-xs text-[#fde047] mb-3">03 / VERIFY</div>
                <h3 className="font-display font-bold text-xl mb-3">Deterministic Verification</h3>
                <p className="text-[17px] text-[#a1a1aa] leading-relaxed max-w-[40ch]">
                  An AI drafts the file's story. Then, a rigid typescript function throws away any claim that doesn't contain a verbatim quote matching the evidence ledger.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Anatomy of a receipt */}
        <section className="border-t border-[#27272a] bg-[#18181b]">
          <div className="max-w-5xl mx-auto px-6 py-24">
            <h2 className="font-display font-bold text-3xl mb-4 text-center">Anatomy of a Receipt</h2>
            <p className="text-[#a1a1aa] text-[17px] text-center mb-16 max-w-2xl mx-auto">
              You should never trust an AI explanation without verifying it. ColdCase builds the UI around the evidence itself.
            </p>

            <div className="bg-[#09090b] border border-[#27272a] rounded-2xl p-6 md:p-10 max-w-3xl mx-auto shadow-2xl relative">
              {/* Fake UI Card */}
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-[#22c55e]/10 text-[#22c55e] font-mono font-bold text-xs px-2 py-1 border border-[#22c55e]/20">HIGH CONFIDENCE</span>
                <span className="text-[#a1a1aa] text-xs font-mono border border-[#27272a] px-2 py-1">STATED</span>
              </div>
              
              <p className="text-white text-lg font-medium leading-relaxed mb-4">
                The polling interval was increased from 1s to 2s to prevent rate-limiting on the background worker API.
              </p>

              <blockquote className="border-l-2 border-[#fde047] pl-4 py-1 my-4">
                <p className="text-[#a1a1aa] font-mono text-sm">
                  "I bumped the interval to 2000ms. Hitting the <span className="bg-[#fde047]/20 text-[#fde047]">worker API</span> every second was <span className="bg-[#fde047]/20 text-[#fde047]">rate-limiting</span> our CI runners."
                </p>
              </blockquote>

              <div className="flex gap-2 mt-6">
                <div className="bg-[#18181b] border border-[#27272a] px-3 py-1.5 font-mono text-xs text-[#a1a1aa] flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span> pr:142
                </div>
                <div className="bg-[#18181b] border border-[#27272a] px-3 py-1.5 font-mono text-xs text-[#a1a1aa] flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span> commit:9f8a7b
                </div>
              </div>

              {/* Annotations (absolute on desktop, hidden on mobile for simplicity, or just part of flow) */}
              <div className="absolute -left-12 top-8 text-[#71717a] font-mono text-xs hidden lg:block text-right w-32 border-r border-[#27272a] pr-4">
                Computed by code, never the LLM
              </div>
              <div className="absolute -right-8 bottom-12 text-[#71717a] font-mono text-xs hidden lg:block w-40 border-l border-[#27272a] pl-4">
                Exact IDs resolve to the JSON snapshot
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-[#27272a] bg-[#09090b]">
          <div className="max-w-2xl mx-auto px-6 py-24 text-center">
            <h2 className="font-display font-bold text-4xl mb-6">Start your audit.</h2>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="github.com/owner/repo"
                disabled={loading || !isLive}
                className="bg-[#18181b] border border-[#27272a] rounded-xl px-5 h-[56px] text-base text-white placeholder-[#52525b] focus-ring transition-colors disabled:opacity-50 w-full sm:w-80 text-left"
              />
              <button
                type="button"
                onClick={() => handleAnalyze()}
                disabled={loading || (!inputVal.trim() && isLive)}
                className="bg-white text-black font-semibold h-[56px] px-8 rounded-xl text-[17px] hover:bg-[#e4e4e7] transition-colors focus-ring disabled:opacity-50 min-w-[160px] flex items-center justify-center"
              >
                Open case
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272a] bg-[#18181b] py-8 text-center text-sm text-[#71717a]">
        <p>ColdCase — Evidence or silence.</p>
        <p className="text-xs mt-2 text-[#52525b]">Powered by TypeScript, SQLite, and Groq.</p>
      </footer>
    </div>
  );
}
