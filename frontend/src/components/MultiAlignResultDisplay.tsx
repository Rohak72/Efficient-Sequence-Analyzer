// src/components/MultiAlignResultDisplay.tsx

import React, { useState, useEffect } from 'react';
import { FrameResultDisplay } from './FrameResultDisplay';
import { useAuth } from '../contexts/AuthContext';
import { BarChart2, ChevronUp, ChevronDown, Download, FileText, UserCheck, AlertCircle, SearchCheck, Loader2 } from 'lucide-react';

// --- TYPE DEFINITIONS ---
interface AlignmentResult {
  identity_pct: number;
  target: string | null;
  top_orf: string;
  alignment: string | null;
  detail?: string;
}

interface MultiAlignSummaryData {
  job_id: string;
  alignment_results: Record<string, AlignmentResult>;
  available_targets: string[];
  download_links?: {
    orf_mappings: string;
    top_hits: string;
  };
}

interface MultiAlignResultDisplayProps {
  alignSummaryData: MultiAlignSummaryData;
  isAuthenticated: boolean;
}

// --- CHILD COMPONENT: AlignmentMetricsCard ---
const AlignmentMetricsCard: React.FC<{ result: AlignmentResult }> = ({ result }) => {
  const [isAlignmentVisible, setIsAlignmentVisible] = useState(false);
  const { alignment } = result;

  return (
    // Added overflow-hidden to the main container
    <div className="bg-white rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-x-3 mb-4">
          <BarChart2 size={28} className="text-indigo-600" />
          <h3 className="text-2xl font-bold text-gray-800">Alignment Summary</h3>
        </div>
        {/* This grid part is unchanged */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-4 bg-indigo-50 rounded-lg"><p className="text-sm font-semibold text-indigo-700">Identity Score</p><p className="text-3xl font-bold text-indigo-600 pt-1">{result.identity_pct.toFixed(1)}%</p></div>
          <div className="p-4 bg-green-50 rounded-lg"><p className="text-sm font-semibold text-green-700">Best Target Match</p><p className="text-xl font-mono text-green-600 truncate pt-2" title={result.target || 'N/A'}>{result.target || 'N/A'}</p></div>
          <div className="p-4 bg-sky-50 rounded-lg"><p className="text-sm font-semibold text-sky-700">Most Likely ORF</p><div className="overflow-hidden pt-1"><p className="text-lg font-mono text-sky-600 whitespace-nowrap overflow-x-auto pb-2" title={result.top_orf}>{result.top_orf || 'N/A'}</p></div></div>
        </div>
      </div>

      {/* --- ADDED: The exact toggle and readout sections from your example --- */}
      {/* --- TOGGLE FOR ALIGNMENT READOUT --- */}
      {alignment && (
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
            <button
            onClick={() => setIsAlignmentVisible(!isAlignmentVisible)}
            className="flex items-center justify-between w-full text-left font-semibold text-gray-700"
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
  )
};

// --- CHILD COMPONENT: ExportCard ---
interface ExportCardProps {
    isAuthenticated: boolean;
    links?: MultiAlignSummaryData['download_links'];
}
const ExportCard: React.FC<ExportCardProps> = ({ isAuthenticated, links }) => {
  if (isAuthenticated && links) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.08)] p-6">
        <div className="flex items-center gap-x-3 mb-4">
          <Download size={28} />
          <h3 className="text-2xl font-bold text-gray-800">Export Full Results</h3>
        </div>
        <p className="text-gray-600 mb-5">Download the detailed ORF mappings and top alignment hits for the entire batch.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a href={links.orf_mappings} download className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-emerald-500 rounded-lg shadow-sm hover:bg-emerald-600 hover:!text-white transition">
            <FileText size={16} /> Download ORF Mappings (.csv)
          </a>
          <a href={links.top_hits} download className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white hover:!text-white bg-sky-500 rounded-lg shadow-sm hover:bg-sky-600 transition">
            <FileText size={16} /> Download Top Hits (.csv)
          </a>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
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
  return null;
};


// --- CHILD COMPONENT: TopHitsExplorer ---
interface TopHitsExplorerProps {
    jobId: string;
    availableTargets: string[];
    isAuthenticated: boolean;
}
const TopHitsExplorer: React.FC<TopHitsExplorerProps> = ({ jobId, availableTargets, isAuthenticated }) => {
    const [selectedTarget, setSelectedTarget] = useState<string>('');
    const [currentHits, setCurrentHits] = useState<any[]>([]);
    const [isLoadingHits, setIsLoadingHits] = useState(false);
    const { fetchWithAuth } = useAuth();

    useEffect(() => {
        if (availableTargets.length > 0 && !selectedTarget) {
            setSelectedTarget(availableTargets[0]);
        }
    }, [availableTargets, selectedTarget]);

    // *** FIXED: This hook now correctly handles the unauthenticated case ***
    useEffect(() => {
        if (!selectedTarget || !jobId) return;

        const fetchHitsForTarget = async () => {
            setIsLoadingHits(true);
            setCurrentHits([]);
            try {
                // Choose the correct fetch function based on login status
                const fetcher = isAuthenticated ? fetchWithAuth : fetch;
                const response = await fetcher(`http://localhost:8000/results/${jobId}/tophits/${encodeURIComponent(selectedTarget)}`);

                if (!response.ok) throw new Error("Failed to fetch top hits.");

                const data = await response.json();
                setCurrentHits(data);
            } catch (error) { 
                console.error("Failed to fetch top hits:", error);
                // Optionally set an error state here
            } finally { 
                setIsLoadingHits(false);
            }
        };

        fetchHitsForTarget();
    }, [selectedTarget, jobId, fetchWithAuth, isAuthenticated]); // Added isAuthenticated
    
    if (availableTargets.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.08)] p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div className="flex items-center gap-x-3"><SearchCheck size={28} /><h3 className="text-2xl font-bold text-gray-800">Top Hits Explorer</h3></div>
                <div className="relative w-full sm:w-64">
                    <select value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)} className="w-full pl-3 pr-10 py-2 text-md font-semibold text-gray-800 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none">
                        {availableTargets.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
            </div>
            {isLoadingHits ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-teal-600" size={32}/></div>
            ) : (
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LCA</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Sequence</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source ORF</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentHits.map(([identity, lca, orf, originSeq], index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{identity.toFixed(1)}%</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{lca}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium truncate max-w-xs" title={originSeq}>{originSeq}</td>
                                    <td className="px-6 py-4 font-mono text-sm text-gray-700 max-w-xs overflow-x-auto whitespace-nowrap">{orf}</td>
                                </tr>))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-4 text-sm text-gray-500">
                <p>This table shows the highest-ranking open reading frames (ORFs) from your input, sorted by their alignment 
                identity score against the selected target protein. Note that <b>LCA</b> refers to <b>Longest Continuous Alignment</b>, or
                the maximum window of overlap in the alignment readout.</p>
            </div>
        </div>
    );
};


// --- MAIN COMPONENT ---
export const MultiAlignResultDisplay: React.FC<MultiAlignResultDisplayProps> = ({ alignSummaryData, isAuthenticated }) => {
  const [selectedInput, setSelectedInput] = useState<string>('');
  const [currentFrameData, setCurrentFrameData] = useState<any | null>(null);
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const { fetchWithAuth } = useAuth();
  
  const inputSequenceNames = Object.keys(alignSummaryData.alignment_results);
  const { job_id } = alignSummaryData;

  useEffect(() => {
    if (inputSequenceNames.length > 0) {
      setSelectedInput(inputSequenceNames[0]);
    }
  }, [alignSummaryData]);

  // *** FIXED: This hook now correctly handles the unauthenticated case ***
  useEffect(() => {
    if (!selectedInput || !job_id) return;

    const fetchFramesForInput = async () => {
      setIsLoadingFrames(true);
      setCurrentFrameData(null);
      try {
        // Choose the correct fetch function based on login status
        const fetcher = isAuthenticated ? fetchWithAuth : fetch;
        const response = await fetcher(`http://localhost:8000/results/${job_id}/frames/${encodeURIComponent(selectedInput)}`);

        if (!response.ok) throw new Error("Failed to fetch frame data.");

        const data = await response.json();
        setCurrentFrameData(data);
      } catch (error) { 
          console.error("Failed to fetch frame data:", error);
          // Optionally set an error state to show the user
      }
      finally { setIsLoadingFrames(false); }
    };

    fetchFramesForInput();
  }, [selectedInput, job_id, fetchWithAuth, isAuthenticated]); // Added isAuthenticated

  if (!selectedInput) return null;

  const currentAlignmentResult = alignSummaryData.alignment_results[selectedInput];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 mt-8">
      <div className="bg-white p-4 rounded-lg shadow-md">
        <label htmlFor="input-selector" className="block text-sm font-medium text-gray-600 mb-1">Viewing Results For Input Sequence:</label>
        <div className="relative">
          <select id="input-selector" value={selectedInput} onChange={(e) => setSelectedInput(e.target.value)} className="w-full pl-3 pr-10 py-2 text-lg font-semibold text-gray-800 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
            {inputSequenceNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {currentAlignmentResult.detail ? (
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-4"><AlertCircle className="w-8 h-8 text-yellow-500" /><div><h3 className="font-bold text-gray-800">No Alignment Found</h3><p className="text-gray-600">{currentAlignmentResult.detail}</p></div></div>
      ) : (
        <>
          <AlignmentMetricsCard result={currentAlignmentResult} />
          {isLoadingFrames ? (
            <div className="flex justify-center items-center h-48 bg-white rounded-lg shadow-md"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>
          ) : currentFrameData ? (
            <FrameResultDisplay data={currentFrameData} />
          ) : null}
          <TopHitsExplorer 
            jobId={job_id} 
            availableTargets={alignSummaryData.available_targets}
            isAuthenticated={isAuthenticated} 
          />
        </>
      )}

      <ExportCard isAuthenticated={isAuthenticated} links={alignSummaryData.download_links} />
    </div>
  );
};