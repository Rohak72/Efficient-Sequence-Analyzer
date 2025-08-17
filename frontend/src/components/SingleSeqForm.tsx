// src/components/TranslationForm.tsx

import * as React from 'react';
import { z } from 'zod';
import { Send, SquarePenIcon } from 'lucide-react';
import { FrameResultDisplay } from './FrameResultDisplay';
import { AlignResultDisplay } from './AlignResultDisplay'
import { useAuth } from '../contexts/AuthContext';

// Zod schema remains the same. It's perfect.
const DNASequenceSchema = z.object({
  inputSequence: z
    .string()
    .min(1, { message: 'A DNA sequence is required.' })
    .regex(/^[ACGTN\s]*$/i, { message: 'Sequence contains invalid characters. Only A, C, G, T, N are allowed.' }),
  targetSequence: z
    .string()
    .regex(/^[A-Z*\s-]*$/i, { message: 'Target sequence contains invalid amino acid characters.' }),
  direction: z.enum(['FWD', 'REV', 'BOTH'], {
    errorMap: () => ({ message: 'Please select a translation direction.' }),
  }),
});

// --- 2. Create a dedicated formatting function ---
const formatDNASequence = (rawText: string): string => {
  // First, remove any FASTA header lines
  const noHeaders = rawText.replace(/>.*$/gm, '');
  // Then, remove all whitespace (newlines, spaces, tabs) and convert to uppercase
  return noHeaders.replace(/\s/g, '').toUpperCase();
};

interface FrameResponse {
  [key: string]: any;
}

interface AlignResponse {
  [key: string]: any;
}

// Renamed the component to be more general
export const SingleSeqForm: React.FC = () => {
  // We now use React state to manage the form's input values directly.
  const [inputSequence, setInputSequence] = React.useState('');
  const [targetSequence, setTargetSequence] = React.useState('');
  const [direction, setDirection] = React.useState<'FWD' | 'REV' | 'BOTH'>('BOTH');

  // State for validation errors, API responses, and UI status
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [frameResponse, setFrameResponse] = React.useState<FrameResponse | null>(null);
  const [alignResponse, setAlignResponse] = React.useState<AlignResponse | null>(null);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const { token, fetchWithAuth } = useAuth();
  const isAuthenticated = !!token; // Determine if the user is logged in
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setApiError(null);
    setFrameResponse(null);
    setErrors({}); // Clear old errors

    // Validate the state directly
    const cleanedInputSequence = formatDNASequence(inputSequence)
    const cleanedTargetSequence = targetSequence.replace(/\s/g, '').toUpperCase();
    const validationResult = DNASequenceSchema.safeParse({ 
      inputSequence: cleanedInputSequence,
      targetSequence: cleanedTargetSequence, 
      direction
    });

    if (!validationResult.success) {
      setErrors(validationResult.error.flatten().fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const frameRes = await fetch('http://localhost:8000/frames/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequence: validationResult.data.inputSequence,
          direction: validationResult.data.direction
        }),
      });

      if (!frameRes.ok) {
        const errorData = await frameRes.json().catch(() => ({ detail: `Server error: ${frameRes.status}` }));
        throw new Error(errorData.detail || 'An unknown error occurred.');
      }

      const frameData: FrameResponse = await frameRes.json();
      setFrameResponse(frameData);

      if (cleanedTargetSequence && frameData) {
        let alignRes: Response;
        if (isAuthenticated) {
          alignRes = await fetchWithAuth('http://localhost:8000/align/single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query_frames: frameData,
              target: cleanedTargetSequence,
              threshold: 0.98
            })
          });
        } else {
          alignRes = await fetch('http://localhost:8000/align/single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query_frames: frameData,
              target: cleanedTargetSequence,
              threshold: 0.98
            })
          });
        }

        if (!alignRes.ok) {
          const errorData = await frameRes.json().catch(() => ({ detail: `Server error: ${frameRes.status}` }));
          throw new Error(errorData.detail || 'An unknown error occurred.');
        }

        const alignData = await alignRes.json();
        setAlignResponse(alignData)
      }

    } catch (err: any) {
      setApiError(`${err.message} -- please try again!`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-5xl mx-auto p-6 sm:p-8 bg-grey-200 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.08)] mb-8">
        <div className="flex items-center gap-x-3 mb-2">
          <SquarePenIcon size={30}></SquarePenIcon>
          <h2 className="text-2xl font-bold text-gray-800">
            Prepare Inputs
          </h2>
        </div>
        <p className="text-gray-500 text-sm mb-4">Start by providing a DNA sequence to generate all possible reading frames. 
          Optionally, you can supply a target amino acid sequence to perform a global pairwise alignment and identify the most 
          likely ORF!
        </p>
        
        {/* THIS IS NOW A STANDARD HTML FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sequence Input Field */}
          <div>
            <label htmlFor="sequence-input" className="block justify-left text-lg font-semibold text-gray-700 mb-3">
              DNA Sequence
            </label>
            <textarea
              id="sequence-input"
              name="sequence"
              value={inputSequence}
              onChange={(e) => setInputSequence(formatDNASequence(e.target.value))}
              required
              placeholder="Paste your DNA sequence here (e.g. ATGATTG...)!"
              className="block w-full h-48 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none 
              focus:ring-2 focus:ring-[#fc5391] focus:border-[#fc5391] transition duration-150 ease-in-out font-mono text-sm"
              style={{ height: '96px' }}
            />
            {errors.sequence && <p className="mt-1 text-sm text-red-600">{errors.sequence[0]}</p>}
          </div>

          {/* Target Protein Sequence Input */}
          <div>
            <label htmlFor="target-sequence-input" className="block text-lg font-semibold text-gray-700 mb-3">
              Target Protein Sequence <span className="text-sm font-normal text-gray-500">(Optional)</span>
            </label>
            <textarea
              id="target-sequence-input"
              name="targetSequence"
              value={targetSequence}
              onChange={(e) => setTargetSequence(e.target.value)}
              placeholder="Paste a target protein sequence here to run pairwise alignment..."
              className="block w-full h-48 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none 
              focus:ring-2 focus:ring-[#fc5391] focus:border-[#fc5391] transition duration-150 ease-in-out font-mono text-sm"
              style={{ height: '96px' }}
            />
            {errors.targetSequence && <p className="mt-1 text-sm text-red-600">{errors.targetSequence[0]}</p>}
          </div>

          {/* Direction Custom Radio Group Field */}
          <fieldset>
            <legend className="block text-lg font-semibold text-gray-700 mb-3">Translate Direction</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['FWD', 'REV', 'BOTH'] as const).map(dir => (
                <label key={dir} className="group relative flex items-center justify-center p-1.5 border-1 rounded-lg 
                cursor-pointer transition has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50 hover:border-indigo-400">
                  <input
                    type="radio"
                    name="direction"
                    value={dir}
                    checked={direction === dir}
                    onChange={(e) => setDirection(e.target.value as any)}
                    className="absolute opacity-0 w-full h-full cursor-pointer"
                  />
                  <span className="font-medium text-gray-700 group-has-[:checked]:text-indigo-800 
                  group-hover:text-indigo-600 transition-colors">{dir}</span>
                </label>
              ))}
            </div>
            {errors.direction && <p className="mt-1 text-sm text-red-600">{errors.direction[0]}</p>}
          </fieldset>
          
          <div className="flex justify-center">
            {/* Submit Button */}
            <button type="submit" disabled={loading} className="group relative inline-flex h-12 items-center justify-center 
            overflow-hidden rounded-md border border-neutral-200 bg-white font-medium">
              <div className="inline-flex h-12 translate-y-0 items-center justify-center px-6 text-black text-md transition 
              duration-500 group-hover:-translate-y-[150%]">
                <Send className="mr-2" size={18}/>
                <span>Submit</span>
              </div>
              <div className="absolute inline-flex h-12 w-full translate-y-[100%] items-center justify-center text-white text-lg 
              transition duration-500 group-hover:translate-y-0">
                <span className="absolute h-full w-full translate-y-full skew-y-12 scale-y-0 bg-pink-500 transition duration-500 
                group-hover:translate-y-0 group-hover:scale-150"></span>
                <Send className="z-10 mr-2" size={18}/>
                <span className="z-10">Submit</span>
              </div>
            </button>
          </div>
        </form>

        {/* API Error and Response Display ... */}
        {apiError && (
          <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded">
              <p className="font-semibold text-red-800">An Error Occurred</p>
              <p className="text-red-700">{apiError}</p>
          </div>
        )}

      </div>
      
      {frameResponse && (
        <FrameResultDisplay data={frameResponse}/>   
      )}

      {alignResponse && (
        <AlignResultDisplay data={alignResponse} isAuthenticated={isAuthenticated}/>
      )}
    </>
  );
};
