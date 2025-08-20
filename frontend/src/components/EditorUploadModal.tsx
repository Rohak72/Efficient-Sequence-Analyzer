// src/components/UploadModal.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UploadCloud, X, FileText, Trash2 } from 'lucide-react';

// Define the shape of the props this component will accept
interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void; // To refresh the file list in the sidebar
}

// A type for the file type selection
type FastaFileType = 'input' | 'reference';

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadComplete }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileType, setFileType] = useState<FastaFileType>('input');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { fetchWithAuth } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(prevFiles => [...prevFiles, ...Array.from(event.target.files!)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
  
  const handleDragEvents = (event: React.DragEvent<HTMLDivElement>, inZone: boolean) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(inZone);
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          setFiles(prevFiles => [...prevFiles, ...Array.from(event.dataTransfer.files)]);
          event.dataTransfer.clearData();
      }
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please select files to upload.');
      return;
    }
    setIsUploading(true);

    const uploadPromises = files.map(file => {
      const formData = new FormData();
      formData.append('file', file);
      // THIS IS THE KEY PART! We add the file type to the request.
      formData.append('type', fileType);

      // We use fetchWithAuth but don't need to stringify the body for FormData
      return fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/files/upload`, {
        method: 'POST',
        body: formData, // Headers are set automatically for FormData by the browser
      });
    });

    try {
      await Promise.all(uploadPromises);
      alert('All files uploaded successfully!');
      onUploadComplete(); // Tell the sidebar to refresh its file list
      handleClose();
    } catch (error) {
      console.error('An error occurred during upload:', error);
      alert('An error occurred. Some files may not have uploaded.');
    } finally {
      setIsUploading(false);
    }
  };

  // Function to reset state when closing
  const handleClose = () => {
      setFiles([]);
      setIsUploading(false);
      setIsDragging(false);
      onClose();
  }

  if (!isOpen) return null;

  return (
    // Modal Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
      {/* Modal Panel */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Upload FASTA Files</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Drag and Drop Area */}
          <div 
            onDragEnter={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            onDragOver={(e) => handleDragEvents(e, true)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            ${isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}
          >
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".fasta,.fa,.fna,.faa"
            />
            <div className="flex flex-col items-center text-gray-500">
              <UploadCloud size={40} className="mb-2" />
              <p className="font-semibold">
                <span className="text-indigo-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs">FASTA files only (.fa, .fasta, etc.)</p>
            </div>
          </div>
          
          {/* File Type Selection */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">File Type</h4>
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="fileType" value="input" checked={fileType === 'input'} onChange={() => setFileType('input')} className="form-radio text-indigo-600"/>
                <span>Input File</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="fileType" value="reference" checked={fileType === 'reference'} onChange={() => setFileType('reference')} className="form-radio text-indigo-600"/>
                <span>Reference File</span>
              </label>
            </div>
          </div>


          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              <h4 className="font-medium text-gray-700">Selected Files</h4>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-2 truncate">
                        <FileText size={20} className="text-gray-500 flex-shrink-0"/>
                        <span className="text-sm text-gray-800 truncate" title={file.name}>{file.name}</span>
                    </div>
                    <button onClick={() => handleRemoveFile(index)} className="text-red-500 hover:text-red-700 p-1 rounded-full">
                        <Trash2 size={16}/>
                    </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center p-4 border-t space-x-3">
          <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Cancel
          </button>
          <button 
            onClick={handleUpload} 
            disabled={isUploading || files.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};