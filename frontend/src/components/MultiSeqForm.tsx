// src/components/MultiSeqForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, AlignVerticalDistributeCenter } from 'lucide-react';
import { FileUploader, type ServerFile } from './ViewerUploadModal';
import { MultiAlignResultDisplay } from './MultiAlignResultDisplay';

export const MultiSeqForm: React.FC = () => {
    const [inputFile, setInputFile] = useState<File | ServerFile | null>(null);
    const [targetFile, setTargetFile] = useState<File | ServerFile | null>(null);
    const [direction, setDirection] = useState<'FWD' | 'REV' | 'BOTH'>('BOTH');
    
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    
    // States for API responses
    const [frameResponse, setFrameResponse] = useState<any | null>(null);
    const [alignResponse, setAlignResponse] = useState<any | null>(null);

    const { token, fetchWithAuth } = useAuth();
    const isAuthenticated = !!token;

    // This function needs to be updated to handle fetching ServerFile content
    // For now, it shows an alert and proceeds only with local File objects.
    const parseFastaFile = async (file: File | ServerFile): Promise<Record<string, string>> => {
        const formData = new FormData();
        
        if (!('name' in file)) {
            // In a real app, you'd have an endpoint like /files/download/{file.id}
            // and you would fetch the file content here before appending it.
            alert("Fetching existing server files for processing is not implemented. Please re-upload the file for now.");
            throw new Error("Server file fetching not implemented.");
        }
        
        formData.append('fasta_file', file);
        
        const res = await fetch('http://localhost:8000/parseFASTA', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to parse ${file.name}.`);
        return data.sequences;
    };
    
    // REPLACE IT WITH THIS NEW, SIMPLER FUNCTION
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputFile || !targetFile) {
            setApiError("Please select both an Input and a Target FASTA file.");
            return;
        }
        
        setLoading(true);
        setApiError(null);
        setAlignResponse(null); // We only need one response state now
        setFrameResponse(null); // This state is no longer used here

        try {
            // *** CHANGED: Create a single FormData object ***
            const formData = new FormData();
            // The backend expects the raw File object, not a ServerFile object
            if (!('name' in inputFile) || !('name' in targetFile)) {
                throw new Error("Cannot process a saved file directly. Please re-upload for now.");
            }
            formData.append('input_fasta', inputFile as File);
            formData.append('target_fasta', targetFile as File);
            formData.append('direction', direction);

            // *** CHANGED: Use the correct fetcher (authenticated or not) ***
            const fetcher = isAuthenticated ? fetchWithAuth : fetch;

            // *** CHANGED: Make ONE single, efficient API call to the new endpoint ***
            const alignRes = await fetcher('http://localhost:8000/process/multi', {
                method: 'POST',
                body: formData, // The browser sets the correct headers for FormData
            });

            if (!alignRes.ok) {
                const errorData = await alignRes.json();
                throw new Error(errorData.detail || 'Failed to process alignment.');
            }
            
            // *** CHANGED: Set the lean summary data from the response ***
            const summaryData = await alignRes.json();
            setAlignResponse(summaryData);

        } catch (err: any) {
            setApiError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* --- ADOPTED THE WIDER LAYOUT FROM SingleSeqForm --- */}
            <div className="w-full max-w-5xl mx-auto p-6 sm:p-8 bg-white rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.08)] mb-8">
                <div className="flex items-center gap-x-3 mb-2">
                    <AlignVerticalDistributeCenter size={30} className="text-gray-700"/>
                    <h2 className="text-2xl font-bold text-gray-800">Multi-Sequence Alignment</h2>
                </div>
                <p className="text-gray-500 text-sm mb-6">
                    Upload your input and target sequences in FASTA format to perform a batch pairwise alignment. Results for 
                    each input sequence can be explored individually and the search can also be reversed to look up the top ORFs 
                    per target.
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* --- FILE UPLOADERS --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FileUploader label="Input FASTA File" fileType="input" selectedFile={inputFile} onFileChange={setInputFile} />
                        <FileUploader label="Target FASTA File" fileType="reference" selectedFile={targetFile} onFileChange={setTargetFile} />
                    </div>

                    {/* --- DIRECTION --- */}
                    <fieldset>
                        <legend className="block text-lg font-semibold text-gray-700 mb-3">Translate Direction</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {(['FWD', 'REV', 'BOTH'] as const).map(dir => (
                                <label key={dir} className="group relative flex items-center justify-center p-2 border rounded-lg cursor-pointer transition has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50 hover:border-indigo-400">
                                    <input type="radio" name="direction" value={dir} checked={direction === dir} onChange={(e) => setDirection(e.target.value as any)} className="absolute opacity-0 w-full h-full"/>
                                    <span className="font-medium text-gray-700 group-has-[:checked]:text-indigo-800 transition-colors">{dir}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    
                    {/* --- SUBMIT --- */}
                    <div className="flex justify-center">
                      {/* Submit Button */}
                      <button type="submit" disabled={loading} className="group relative inline-flex h-12 items-center justify-center 
                      overflow-hidden rounded-md border border-neutral-200 bg-white font-medium cursor-pointer">
                        <div className="inline-flex h-12 translate-y-0 items-center justify-center px-6 text-black text-md transition 
                        duration-500 group-hover:-translate-y-[150%]">
                          <Send className="mr-2" size={18}/>
                          <span>Submit</span>
                        </div>
                        <div className="absolute inline-flex h-12 w-full translate-y-[100%] items-center justify-center text-white text-lg 
                        transition duration-500 group-hover:translate-y-0">
                          <span className="absolute h-full w-full translate-y-full skew-y-12 scale-y-0 bg-violet-500 transition duration-500 
                          group-hover:translate-y-0 group-hover:scale-150"></span>
                          <Send className="z-10 mr-2" size={18}/>
                          <span className="z-10">Submit</span>
                        </div>
                      </button>
                    </div>
                </form>

                {apiError && (
                    <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded">
                        <p className="font-semibold text-red-800">An Error Occurred</p>
                        <p className="text-red-700">{apiError}</p>
                    </div>
                )}
            </div>
            
            {/* --- RESULTS DISPLAY --- */}
            {alignResponse && (
                <MultiAlignResultDisplay 
                    alignSummaryData={alignResponse}
                    isAuthenticated={isAuthenticated}
                />
            )}
        </>
    );
};