// src/components/FileUploader.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UploadCloud, File as FileIcon, X, Server, Loader2 } from 'lucide-react';

// --- TYPE DEFINITIONS ---
export interface ServerFile {
  id: number | string;
  filename: string;
  type: 'input' | 'reference';
  // Add other fields from your backend model as needed
}

interface FileUploaderProps {
  // The type of file we're handling (for authenticated users)
  fileType: 'input' | 'reference'; 
  // The file currently selected in the parent form
  selectedFile: File | ServerFile | null;
  // Callback to update the parent form's state
  onFileChange: (file: File | ServerFile | null) => void;
  // UI Label
  label: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ fileType, selectedFile, onFileChange, label }) => {
  const { token } = useAuth();
  const isAuthenticated = !!token;

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => e.preventDefault();
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileChange(e.target.files[0]);
    }
    // Reset the input value to allow re-uploading the same file
    e.target.value = '';
  };
  
  // Render the filename based on whether it's a local File or a ServerFile
  const getFileName = (file: File | ServerFile | null): string => {
      if (!file) return '';
      return 'name' in file ? file.name : file.filename;
  }

  return (
    <div>
      <label className="block text-lg font-semibold text-gray-700 mb-3">{label}</label>
      {!selectedFile ? (
        // This container now handles the conditional rendering
        <div className="relative w-full h-32">
          {isAuthenticated ? (
            // --- LOGGED-IN VIEW: The entire div is a button that opens the modal ---
            <div
              onClick={() => setIsModalOpen(true)} // <-- The click handler is on the main container
              onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
              onDrop={(e: React.DragEvent<HTMLDivElement>) => { /* Adjusted for div */
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      onFileChange(e.dataTransfer.files[0]);
                  }
              }}
              className="flex flex-col items-center justify-center w-full h-full p-4 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
            >
              <UploadCloud size={32} className="text-gray-400 mb-2"/>
              <p className="font-semibold text-gray-600">
                {/* The span is now just for styling, not for clicks */}
                <span className="text-indigo-600">Select an existing file</span>
                {' or drag & drop'}
              </p>
              <p className="text-xs text-gray-500">FASTA format (.fa, .fasta)</p>
            </div>
          ) : (
            // --- GUEST VIEW: Unchanged, still works perfectly ---
            <label
              onDragOver={handleDragOver}
              onDrop={(e: React.DragEvent<HTMLLabelElement>) => handleDrop(e)} // Ensure correct event type
              className="flex flex-col items-center justify-center w-full h-full p-4 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
            >
              <UploadCloud size={32} className="text-gray-400 mb-2"/>
              <p className="font-semibold text-gray-600">
                <span className="text-indigo-600">Click to upload</span>
                {' or drag & drop'}
              </p>
              <p className="text-xs text-gray-500">FASTA format (.fa, .fasta)</p>
              <input type="file" onChange={handleFileSelect} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" accept=".fasta,.fa,.fna" />
            </label>
          )}
        </div>
      ) : (
        // --- FILE SELECTED VIEW (Unchanged) ---
        <div className="flex items-center justify-between w-full h-32 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
          <div className="flex items-center gap-3 overflow-hidden">
            <FileIcon size={32} className="text-emerald-600 flex-shrink-0" />
            <p className="font-medium text-gray-800 truncate" title={getFileName(selectedFile)}>{getFileName(selectedFile)}</p>
          </div>
          <button onClick={() => onFileChange(null)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors"><X size={20} /></button>
        </div>
      )}
      
      {/* Modal logic remains unchanged */}
      {isAuthenticated && (
        <FileSelectionModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            fileType={fileType}
            onFileSelect={(file) => { onFileChange(file); setIsModalOpen(false); }}
            onNewFileUpload={(file) => { onFileChange(file); setIsModalOpen(false); }}
        />
      )}
    </div>
  );
};

// --- MODAL COMPONENT (Can be in the same file or imported) ---
interface FileSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileType: 'input' | 'reference';
    onFileSelect: (file: ServerFile) => void;
    onNewFileUpload: (file: File) => void;
}
const FileSelectionModal: React.FC<FileSelectionModalProps> = ({ isOpen, onClose, fileType, onFileSelect, onNewFileUpload }) => {
    const [serverFiles, setServerFiles] = useState<ServerFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { fetchWithAuth } = useAuth();
    
    useEffect(() => {
      const fetchFiles = async () => {
      setIsLoading(true);
      try {
        // Corrected: Fetch from the single endpoint that returns all files
        const res = await fetchWithAuth(`http://localhost:8000/files/`);
        if (!res.ok) throw new Error('Failed to fetch files');
          // Fetch all files
          const allFiles: ServerFile[] = await res.json();
            
          // Filter the files on the client-side based on the required type
          const filteredFiles = allFiles.filter(file => file.type === fileType);
          setServerFiles(filteredFiles);
        } catch (error) { 
          console.error(error);
          // Set to empty array on error to avoid stale data
          setServerFiles([]); 
        } finally { 
            setIsLoading(false); 
        }
      };
      fetchFiles();
    }, [fileType, fetchWithAuth]); // Dependencies are correct
    
    const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onNewFileUpload(e.target.files[0]);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Select {fileType === 'input' ? 'Input' : 'Target'} File</h3>
                    <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <div className="p-4">
                    <div className="font-semibold text-gray-700 mb-2">Choose an existing file:</div>
                    <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                        {isLoading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div> :
                         serverFiles.length > 0 ? serverFiles.map(file => (
                            <div key={file.id} onClick={() => onFileSelect(file)} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-indigo-50">
                                <Server size={18} className="text-gray-500" />
                                <span className="font-medium text-gray-800">{file.filename}</span>
                            </div>
                         )) : <div className="p-8 text-center text-gray-500">No existing files found.</div>
                        }
                    </div>
                </div>
                <div className="p-4 text-center">
                    <span className="text-sm font-semibold text-gray-500">OR</span>
                </div>
                <div className="p-4 pt-0">
                     <label className="relative flex flex-col items-center justify-center w-full p-6 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                        <UploadCloud size={24} className="text-gray-400 mb-1"/>
                        <span className="font-semibold text-indigo-600">Upload a new file</span>
                        <input type="file" onChange={handleLocalFileChange} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" accept=".fasta,.fa,.fna" />
                    </label>
                </div>
            </div>
        </div>
    );
};