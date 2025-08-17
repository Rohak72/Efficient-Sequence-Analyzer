// src/components/MultiAlignResultDisplay.tsx
import React, { useState, useEffect } from 'react';
import { FrameResultDisplay } from './FrameResultDisplay'; // Assuming this is in the same folder
import { BarChart2, ChevronDown, Download, FileText, UserCheck, AlertCircle, Search } from 'lucide-react';

// --- TYPE DEFINITIONS (Matching your backend) ---
interface AlignmentResult {
  identity_pct: number;
  target: string | null;
  top_orf: string;
  detail?: string; // For errors like "No valid ORFs found"
}

interface MultiAlignData {
  alignment_results: Record<string, AlignmentResult>;
  top_hits: Record<string, [number, number, string][]>; // [identity, lca, orf_sequence]
  download_links?: {
    orf_mappings: string;
    top_hits: string;
  };
}

interface MultiFrameData {
  [inputSequenceName: string]: any; // The structure from your FrameResultDisplay
}

interface MultiAlignResultDisplayProps {
  alignData: MultiAlignData;
  frameData: MultiFrameData;
  isAuthenticated: boolean;
}

// --- MAIN COMPONENT ---
export const MultiAlignResultDisplay: React.FC<MultiAlignResultDisplayProps> = ({ alignData, frameData, isAuthenticated }) => {
  const [selectedInput, setSelectedInput] = useState<string>('');
  
  const inputSequenceNames = Object.keys(alignData.alignment_results);
  
  // Set the default selected input sequence when the component loads
  useEffect(() => {
    if (inputSequenceNames.length > 0) {
      setSelectedInput(inputSequenceNames[0]);
    }
  }, [alignData]); // Re-run if alignData changes

  if (!selectedInput || !alignData.alignment_results[selectedInput]) {
    // Render nothing or a loader while state is being initialized
    return null;
  }

  const currentAlignmentResult = alignData.alignment_results[selectedInput];
  const currentFrameData = frameData[selectedInput];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 mt-8">
      {/* --- 1. INPUT SEQUENCE SELECTOR --- */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <label htmlFor="input-selector" className="block text-sm font-medium text-gray-600 mb-1">
          Viewing Results For Input Sequence:
        </label>
        <div className="relative">
          <select
            id="input-selector"
            value={selectedInput}
            onChange={(e) => setSelectedInput(e.target.value)}
            className="w-full pl-3 pr-10 py-2 text-lg font-semibold text-gray-800 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
          >
            {inputSequenceNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* --- 2. DYNAMIC RESULTS AREA --- */}
      {currentAlignmentResult.detail ? (
        // --- ERROR CARD FOR THIS SPECIFIC INPUT ---
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-4">
          <AlertCircle className="w-8 h-8 text-yellow-500" />
          <div>
            <h3 className="font-bold text-gray-800">No Alignment Found</h3>
            <p className="text-gray-600">{currentAlignmentResult.detail}</p>
          </div>
        </div>
      ) : (
        // --- SUCCESS RESULTS FOR THIS SPECIFIC INPUT ---
        <>
          <AlignmentMetricsCard result={currentAlignmentResult} />
          <TopHitsExplorer topHits={alignData.top_hits} />
          {/* We pass only the relevant slice of frame data */}
          <FrameResultDisplay data={currentFrameData} />
        </>
      )}

      {/* --- 3. EXPORT CARD (Applies to the whole batch) --- */}
      <ExportCard isAuthenticated={isAuthenticated} links={alignData.download_links} />
    </div>
  );
};


// --- CHILD COMPONENT: AlignmentMetricsCard ---
const AlignmentMetricsCard: React.FC<{ result: AlignmentResult }> = ({ result }) => (
  <div className="bg-white rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.08)] p-6">
    <div className="flex items-center gap-x-3 mb-4">
      <BarChart2 size={28} className="text-indigo-600" />
      <h3 className="text-2xl font-bold text-gray-800">Alignment Summary</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm font-semibold text-indigo-700">Identity Score</p>
            <p className="text-3xl font-bold text-indigo-600 pt-1">{result.identity_pct.toFixed(1)}%</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm font-semibold text-green-700">Best Target Match</p>
            <p className="text-xl font-mono text-green-600 truncate pt-2" title={result.target || 'N/A'}>{result.target || 'N/A'}</p>
        </div>
        <div className="p-4 bg-sky-50 rounded-lg">
            <p className="text-sm font-semibold text-sky-700">Most Likely ORF</p>
            <div className="overflow-hidden pt-1">
                <p className="text-lg font-mono text-sky-600 whitespace-nowrap overflow-x-auto pb-2" title={result.top_orf}>
                    {result.top_orf || 'N/A'}
                </p>
            </div>
        </div>
    </div>
  </div>
);

// --- CHILD COMPONENT: TopHitsExplorer ---
const TopHitsExplorer: React.FC<{ topHits: MultiAlignData['top_hits'] }> = ({ topHits }) => {
    const targetNames = Object.keys(topHits);
    const [selectedTarget, setSelectedTarget] = useState<string>('');

    useEffect(() => {
        if(targetNames.length > 0) setSelectedTarget(targetNames[0]);
    }, [topHits]);

    if (targetNames.length === 0) return null;

    const currentHits = topHits[selectedTarget] || [];
    
    return (
        <div className="bg-white rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.08)] p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div className="flex items-center gap-x-3">
                    <Search size={28} className="text-teal-600" />
                    <h3 className="text-2xl font-bold text-gray-800">Top Hits Explorer</h3>
                </div>
                <div className="relative w-full sm:w-64">
                    <select value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 text-md font-semibold text-gray-800 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none">
                        {targetNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                </div>
            </div>

            {/* --- HITS TABLE --- */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LCA</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ORF Sequence</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {currentHits.map(([identity, lca, orf], index) => (
                            <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">{index + 1}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{identity.toFixed(1)}%</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{lca}</td>
                                <td className="px-6 py-4 font-mono text-sm text-gray-700 max-w-xs overflow-x-auto whitespace-nowrap">
                                    {orf}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- CHILD COMPONENT: ExportCard (Replicated from before) ---
interface ExportCardProps {
    isAuthenticated: boolean;
    links?: MultiAlignData['download_links'];
}
const ExportCard: React.FC<ExportCardProps> = ({ isAuthenticated, links }) => {
  if (isAuthenticated && links) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.08)] p-6">
        <div className="flex items-center gap-x-3 mb-4">
          <Download size={28} className="text-emerald-600" />
          <h3 className="text-2xl font-bold text-gray-800">Export Full Results</h3>
        </div>
        <p className="text-gray-600 mb-5">Download the detailed ORF mappings and top alignment hits for the entire batch.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a href={links.orf_mappings} download className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-emerald-500 rounded-lg shadow-sm hover:bg-emerald-600 transition">
            <FileText size={16} /> Download ORF Mappings (.csv)
          </a>
          <a href={links.top_hits} download className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-sky-500 rounded-lg shadow-sm hover:bg-sky-600 transition">
            <FileText size={16} /> Download Top Hits (.csv)
          </a>
        </div>
      </div>
    );
  } else {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-r-lg">
        <div className="flex items-center gap-x-3">
          <UserCheck className="text-amber-700" size={24}/>
          <h4 className="font-bold text-amber-800">Login to Save & Export Results</h4>
        </div>
        <p className="text-amber-700 mt-2">
          Create an account or sign in to download your results. This will allow you to save your work for future analysis.
        </p>
      </div>
    );
  }
};