// src/components/AlignResultDisplay.tsx
import * as React from 'react';
import { Download, ChevronDown, ChevronUp, FileText, BarChart2, AlertCircle, UserCheck } from 'lucide-react';

// --- TYPE DEFINITIONS ---
// Based on the JSON structure from your FastAPI backend
interface AlignmentResult {
  start: number | null;
  end: number | null;
  length: number;
  target: string | null;
  alignment: string | null;
  identity_pct: number;
  top_orf: string;
}

interface DownloadLinks {
  orf_mappings: string;
  top_hits: string;
}

interface AlignResultProps {
  data: {
    alignment_result?: AlignmentResult;
    download_links?: DownloadLinks;
    detail?: string; // To catch errors like "No valid ORFs found"
  };
  // You must pass the user's auth status from the parent
  isAuthenticated: boolean;
}

/**
 * A card-based component to display pairwise alignment metrics, a collapsible
 * alignment readout, and context-aware download/login actions.
 */
export const AlignResultDisplay: React.FC<AlignResultProps> = ({ data, isAuthenticated }) => {
  const [isAlignmentVisible, setIsAlignmentVisible] = React.useState(false);

  // --- Early return for server-side detail messages (e.g., no ORFs) ---
  if (data.detail || !data.alignment_result) {
    return (
      <div className="mt-8 w-full max-w-5xl mx-auto p-6 sm:p-8 bg-white rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-x-3">
            <AlertCircle className="text-red-500" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Alignment Not Performed</h3>
        </div>
        <p className="text-gray-600 mt-2">
          {data.detail || 'The server could not produce an alignment. This may be due to a lack of valid ORFs in the input sequence or low similarity to the target.'}
        </p>
      </div>
    );
  }

  const { alignment_result, download_links } = data;
  const { identity_pct, target, top_orf, alignment } = alignment_result;

  return (
    <div className="mt-8 w-full max-w-5xl mx-auto space-y-6">

      {/* --- 1. ALIGNMENT METRICS CARD --- */}
      <div className="bg-white rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-x-3 mb-4">
            <BarChart2 size={28} className="text-indigo-600" />
            <h3 className="text-2xl font-bold text-gray-800">Pairwise Alignment Summary</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm font-semibold text-indigo-800">Identity Score</p>
              <p className="text-3xl font-bold text-indigo-600">{identity_pct.toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-semibold text-green-800">Best Target Match</p>
              <p className="text-xl font-mono text-green-600 truncate pt-2" title={target || 'N/A'}>{target || 'N/A'}</p>
            </div>
            <div className="p-4 bg-sky-50 rounded-lg">
              <p className="text-sm font-semibold text-sky-800">Most Likely ORF</p>
              <p className="text-lg font-mono text-sky-600 truncate pt-2" title={top_orf}>
                {top_orf ? `${top_orf.slice(0, 15)}...` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* --- TOGGLE FOR ALIGNMENT READOUT --- */}
        {alignment && (
            <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                <button
                onClick={() => setIsAlignmentVisible(!isAlignmentVisible)}
                className="flex items-center justify-between w-full text-left font-semibold text-gray-700 "
                >
                <span>{isAlignmentVisible ? 'Hide' : 'Show'} Alignment Readout</span>
                {isAlignmentVisible ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>
        )}
        
        {/* --- ALIGNMENT READOUT SECTION (Conditional) --- */}
        {isAlignmentVisible && alignment && (
          <div className="p-6 border-t border-gray-200 bg-gray-800 text-white font-mono text-sm overflow-x-auto">
            <pre><code>{alignment}</code></pre>
          </div>
        )}
      </div>

      {/* --- 2. DOWNLOADS / LOGIN PROMPT CARD --- */}
      {isAuthenticated && download_links ? (
        <div className="bg-white rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.08)] p-6">
          <div className="flex items-center gap-x-3 mb-4">
            <Download size={28} className="text-emerald-600" />
            <h3 className="text-2xl font-bold text-gray-800">Export Results</h3>
          </div>
          <p className="text-gray-600 mb-5">Download the detailed ORF mappings and top alignment hits for your records.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={download_links.orf_mappings}
              download="orf_mappings.csv"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-emerald-500 rounded-lg shadow-sm hover:bg-emerald-600 transition"
            >
              <FileText size={16} />
              Download ORF Mappings (.csv)
            </a>
            <a
              href={download_links.top_hits}
              download="top_hits.csv"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-sky-500 rounded-lg shadow-sm hover:bg-sky-600 transition"
            >
              <FileText size={16} />
              Download Top Hits (.csv)
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-r-lg">
            <div className="flex items-center gap-x-3">
                <UserCheck className="text-amber-700" size={24}/>
                <h4 className="font-bold text-amber-800">Login to Save & Export Results</h4>
            </div>
            <p className="text-amber-700 mt-2">
                Create an account or sign in to download your results. This will allow you to save your work for future 
                analysis and share it with others.
            </p>
        </div>
      )}
    </div>
  );
};
