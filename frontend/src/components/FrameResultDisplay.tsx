// src/components/FormResultDisplay.tsx
import * as React from 'react';
import { Dna, Download, Copy, Check, MicroscopeIcon } from 'lucide-react';

// --- TYPE DEFINITIONS ---
interface FrameData {
  aa_seq: string;
  orf_set: Array<string>;
}
interface FrameResponse {
  [frameName: string]: FrameData;
}
interface ResultProps {
  data: FrameResponse;
}

// =======================================================
// === 1. THE NEW, POWERFUL HIGHLIGHTING COMPONENT ===
// =======================================================
// In src/components/FormResultDisplay.tsx

const HighlightedSequence: React.FC<{ sequence: string; orfs: string[] }> = ({ sequence, orfs }) => {
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  // If there's nothing to highlight, just return the plain sequence.
  if (!orfs || orfs.length === 0 || !sequence) {
    return <>{sequence}</>;
  }

  // --- A handler to copy text and provide feedback ---
  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedText(textToCopy);
    // Reset the "copied" state after 2 seconds
    setTimeout(() => setCopiedText(null), 2000);
  };

  // --- STEP 1: Find all match intervals ---
  const intervals: { start: number; end: number }[] = [];
  orfs.forEach(orf => {
    // This regex finds all occurrences of the current ORF
    const regex = new RegExp(orf, 'g');
    let match;
    while ((match = regex.exec(sequence)) !== null) {
      intervals.push({ start: match.index, end: match.index + orf.length });
    }
  });

  // If no matches were found at all, return the plain sequence.
  if (intervals.length === 0) {
    return <>{sequence}</>;
  }

  // --- STEP 2: Sort and merge overlapping intervals for clean highlighting ---
  intervals.sort((a, b) => a.start - b.start);

  const mergedIntervals = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = mergedIntervals[mergedIntervals.length - 1];
    const current = intervals[i];
    if (current.start < last.end) {
      // If they overlap, merge them by extending the end of the last one
      last.end = Math.max(last.end, current.end);
    } else {
      mergedIntervals.push(current);
    }
  }

  // --- STEP 3: Build the final React element array ---
  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  mergedIntervals.forEach(interval => {
    // Add the plain text part before the current highlight
    result.push(sequence.substring(lastIndex, interval.start));
    
    const orfText = sequence.substring(interval.start, interval.end);
    const isCopied = copiedText === orfText;

    // Add the highlighted part
    result.push(
      <span key={interval.start} onClick={() => handleCopy(orfText)} title={"Click to copy ORF!"} 
      className={
        isCopied
            ? "bg-emerald-300 text-emerald-900 font-bold rounded px-1 transition-all cursor-pointer ring-2 ring-emerald-400"
            : "bg-teal-100 text-teal-800 font-bold rounded px-1 transition-all cursor-pointer hover:bg-emerald-100 hover:ring-2 hover:ring-teal-300"
      }>
        {orfText}
      </span>
    );
    lastIndex = interval.end;
  });

  // Add any remaining plain text after the last highlight
  result.push(sequence.substring(lastIndex));

  return <>{result}</>;
};

// =======================================================
// === THE MAIN RESULTS DISPLAY COMPONENT ===
// =======================================================
export const FrameResultDisplay: React.FC<ResultProps> = ({ data }) => {
  const [copiedFrame, setCopiedFrame] = React.useState<string | null>(null);
  const frameNames = Object.keys(data);

  if (!data || frameNames.length === 0) {
    return null;
  }

  const handleCopy = (frameName: string, sequence: string) => {
    navigator.clipboard.writeText(`>${frameName}\n${sequence}`);
    setCopiedFrame(frameName);
    setTimeout(() => setCopiedFrame(null), 2000);
  };

  const handleDownloadAll = () => {
    const fastaContent = frameNames.map(name => `>${name}\n${data[name].aa_seq}`).join('\n\n');
    const blob = new Blob([fastaContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'translated_frames.fasta';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  // <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
  return (
    // 2. APPLY THE MAX-WIDTH TO THE MAIN CONTAINER
    <div className="mt-8 w-full max-w-5xl mx-auto">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4 
      mx-auto p-6 sm:p-8 bg-grey-200 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.08)]">
        <div>
            <div className="flex items-center gap-x-3 mb-2">
                <MicroscopeIcon size={30}></MicroscopeIcon>
                <h3 className="text-2xl font-bold text-gray-800">Six-Frame Translation</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
                Open Reading Frames (ORFs) are highlighted in green. Click the icon to copy any sequence.
            </p>
        </div>
        <div className="flex-shrink-0">
            <button onClick={handleDownloadAll} className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-emerald-500 
            px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600 cursor-pointer">
            <Download size={16} />
            Download All Frames
            </button>
        </div>
      </div>

      {/* --- RESULTS GRID --- */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
        {frameNames.map((frameName) => {
          const frameData = data[frameName];
          if (!frameData) return null;

          // 3. PARSE THE FRAME NAME AND DIRECTION
          const match = frameName.match(/(Frame #\d+).*\((.*)\)/);
          const displayName = match ? match[1] : frameName;
          const direction = match ? match[2] : '';

          const isSolitaryORF = frameData.orf_set.length == 1

          return (
            <div key={frameName} className="group flex items-start gap-4 p-4 transition-colors hover:bg-gray-50">
              {/* Frame Name & Direction */}
              <div className="flex-shrink-0 w-32 flex items-start pt-1">
                <Dna className="text-gray-400 mr-3 mt-1" size={16} />
                <div>
                  <span className="font-semibold text-gray-700">{displayName}</span>
                  {direction && <p className="text-xs text-gray-500">{direction}</p>}
                  {/* The new line for the ORF count */}
                  <p className="text-xs font-bold text-emerald-600 mt-1">
                    {isSolitaryORF ? (
                      <p>{frameData.orf_set.length} ORF</p>
                    ) : (
                      <p>{frameData.orf_set.length} ORFs</p>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Sequence */}
              <div className="flex-grow font-mono text-sm text-gray-800">
                {/* 4. USE WRAPPING CLASSES AND THE NEW HIGHLIGHTER */}
                <p className="whitespace-pre-wrap break-all leading-relaxed">
                  <HighlightedSequence sequence={frameData.aa_seq} orfs={frameData.orf_set} />
                </p>
              </div>
              
              {/* Copy Button */}
              <div className="flex-shrink-0">
                 <button
                    onClick={() => handleCopy(frameName, frameData.aa_seq)}
                    className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-md hover:bg-gray-200"
                    aria-label={`Copy ${frameName}`}
                  >
                  {copiedFrame === frameName ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-500" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};