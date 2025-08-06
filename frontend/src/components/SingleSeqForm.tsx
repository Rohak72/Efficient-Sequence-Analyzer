// src/components/TranslationForm.tsx

import * as React from 'react';
import { z } from 'zod';
import { Loader2, MicroscopeIcon, Send, SquarePenIcon } from 'lucide-react';
import { FormResultDisplay } from './FormResultDisplay';

// Zod schema remains the same. It's perfect.
const DNASequenceSchema = z.object({
  sequence: z
    .string()
    .min(1, { message: 'A DNA sequence is required.' })
    .regex(/^[ACGTN\s]*$/i, { message: 'Sequence contains invalid characters. Only A, C, G, T, N are allowed.' }),
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

// Renamed the component to be more general
export const SingleSeqForm: React.FC = () => {
  // We now use React state to manage the form's input values directly.
  const [sequence, setSequence] = React.useState('');
  const [direction, setDirection] = React.useState<'FWD' | 'REV' | 'BOTH'>('BOTH');

  // State for validation errors, API responses, and UI status
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [apiResponse, setApiResponse] = React.useState<FrameResponse | null>(null);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setApiError(null);
    setApiResponse(null);
    setErrors({}); // Clear old errors

    // Validate the state directly
    const cleanedSequence = formatDNASequence(sequence)
    const validationResult = DNASequenceSchema.safeParse({ sequence: cleanedSequence, direction });

    if (!validationResult.success) {
      setErrors(validationResult.error.flatten().fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seq: validationResult.data.sequence,
          direction: validationResult.data.direction,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: `Server error: ${res.status}` }));
        throw new Error(errorData.detail || 'An unknown error occurred.');
      }

      const data: FrameResponse = await res.json();
      setApiResponse(data);
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
              value={sequence}
              onChange={(e) => setSequence(formatDNASequence(e.target.value))}
              required
              placeholder="Paste your DNA sequence here (e.g. ATGATTG...)!"
              className="block w-full h-48 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none 
              focus:ring-2 focus:ring-[#fc5391] focus:border-[#fc5391] transition duration-150 ease-in-out font-mono text-sm"
              style={{ height: '96px' }}
            />
            {errors.sequence && <p className="mt-1 text-sm text-red-600">{errors.sequence[0]}</p>}
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
      
      {apiResponse && (
        <FormResultDisplay data={apiResponse}/>   
      )}
    </>
  );
};

// <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
/*
<div className="bg-gray-800 text-white font-mono text-sm p-4 rounded-lg overflow-x-auto shadow-inner">
            </div>
{apiResponse && (
        <div className="w-full max-w-5xl mx-auto p-6 sm:p-8 bg-grey-200 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-x-3 mb-4">
            <MicroscopeIcon size={30}></MicroscopeIcon>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Six-Frame Translation
            </h2>
          </div>
          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Translation Result</h3>
            <FormResultDisplay data={apiResponse}/>
          </div>
        </div>
      )}
*/
