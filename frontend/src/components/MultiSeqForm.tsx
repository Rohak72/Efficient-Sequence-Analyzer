// src/components/MultiSeqForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, AlignVerticalDistributeCenter, Loader2 } from 'lucide-react';
import { FileUploader, type ServerFile } from './ViewerUploadModal';
import { MultiAlignResultDisplay } from './MultiAlignResultDisplay';

export const MultiSeqForm: React.FC = () => {
    const [inputFile, setInputFile] = useState<File | ServerFile | null>(null);
    const [targetFile, setTargetFile] = useState<File | ServerFile | null>(null);
    const [direction, setDirection] = useState<'FWD' | 'REV' | 'BOTH'>('BOTH');
    
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    
    // States for API responses
    const [alignResponse, setAlignResponse] = useState<any | null>(null);

    const { token, fetchWithAuth } = useAuth();
    const isAuthenticated = !!token;
    
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

        try {
            const getFileObject = async (file: File | ServerFile): Promise<File> => {
                // If it's already a File object (from a direct upload), we're good.
                if ('name' in file) {
                    return file;
                }

                console.log(`Fetching content for ${file.filename}...`);

                // *** Corrected Endpoint: We now use the /read endpoint ***
                const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/files/${file.id}/read`);
                if (!response.ok) {
                    throw new Error(`Failed to read existing file: ${file.filename}`);
                }

                // *** The response is JSON, so we call .json() ***
                const data = await response.json();
                
                // *** Extract the actual file content from the 'content' property ***
                const fileContent = data.content;

                // *** Create the new File object from the string content ***
                return new File([fileContent], file.filename, { type: 'text/plain' });
            }

            const importedInputFile = await getFileObject(inputFile)
            const importedTargetFile = await getFileObject(targetFile)

            const formData = new FormData();
            formData.append('input_fasta', importedInputFile as File);
            formData.append('target_fasta', importedTargetFile as File);
            formData.append('direction', direction);

            // *** CHANGED: Use the correct fetcher (authenticated or not) ***
            const fetcher = isAuthenticated ? fetchWithAuth : fetch;

            // *** CHANGED: Make ONE single, efficient API call to the new endpoint ***
            const alignRes = await fetcher(`${import.meta.env.VITE_API_BASE_URL}/process/multi`, {
                method: 'POST',
                body: formData, // The browser sets the correct headers for FormData
            });

            if (!alignRes.ok) {
                const errorData = await alignRes.json();
                console.log("Alignment error response:", errorData);
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
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-md border 
                            border-neutral-200 font-medium transition-all duration-300 disabled:cursor-not-allowed cursor-pointer
                            ${loading ? 'min-w-32 bg-violet-500' : 'bg-white'}`}
                        >
                            {loading ? (
                            // --- LOADING STATE ---
                            // This is shown ONLY when loading is true.
                            // It has a pink background, white text, and a spinner.
                            <div className="flex items-center justify-center text-white">
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                <span>Loading...</span>
                            </div>
                            ) : (
                            // --- NORMAL STATE ---
                            // This is your exact animation code, shown when loading is false.
                            <>
                                <div className="inline-flex h-12 translate-y-0 items-center justify-center px-6 text-black text-md transition 
                                duration-500 group-hover:-translate-y-[150%]">
                                <Send className="mr-2" size={18}/>
                                <span>Submit</span>
                                </div>
                                <div className="absolute inline-flex h-12 w-full translate-y-[100%] items-center justify-center text-white 
                                text-lg transition duration-500 group-hover:translate-y-0">
                                <span className="absolute h-full w-full translate-y-full skew-y-12 scale-y-0 bg-violet-500 transition 
                                duration-500 group-hover:translate-y-0 group-hover:scale-150"></span>
                                <Send className="z-10 mr-2" size={18}/>
                                <span className="z-10">Submit</span>
                                </div>
                            </>
                            )}
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