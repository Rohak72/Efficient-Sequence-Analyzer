// FastaEditor.tsx

import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import { MaximizeIcon, MinimizeIcon, SaveIcon, X } from 'lucide-react';

import 'react-quill-new/dist/quill.snow.css';
import '../styles/FastaEditor.css'; // The updated CSS is crucial
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// --- ReactQuill Configuration (No changes here) ---
const quillConfig = {
    toolbar: [
        [{ header: [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
        ['clean'],
    ],
};
const quillFormats = [ 'header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'link' ];

// --- Helper function to convert Quill's HTML to plain FASTA text ---
const convertHTMLToFASTA = (html: string): string => {
  // Use a temporary DOM element to correctly parse HTML and extract text
  // This handles HTML entities (like >) and structure correctly.
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Replace <p> tags with newlines for block-level separation
  // Quill often wraps each line in a <p> tag.
  return Array.from(tempDiv.childNodes)
    .map(node => (node.nodeType === 1 ? (node as HTMLElement).innerText : node.textContent))
    .join('\n')
    .trim(); // Trim any leading/trailing whitespace
};

// --- The Main Component ---
export const FastaEditor: React.FC = () => {
  const [content, setContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newFilename, setNewFilename] = useState('');
  const [fileType, setFileType] = useState<'input' | 'reference'>('input');

  const navigate = useNavigate();

  const { fileId } = useParams();
  const isNewFile = !fileId || fileId === 'new';
  const { token, fetchWithAuth } = useAuth();

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  // Prevent background scroll when fullscreen
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalStyle;
    }
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isFullscreen]);

  useEffect(() => {
    // This specialist only cares about the fileId and token.
    if (fileId && fileId !== 'new') {
      setIsLoading(true);
      const fetchFileContent = async () => {
        try {
          const response = await fetchWithAuth(`http://localhost:8000/files/${fileId}/read`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error("File read attempt failed!");
          }

          // The raw text content from your backend
          const rawContent = data.content;
        
          // Split the text by newlines and then join with HTML line breaks.
          // This preserves every single line break from the original file.
          const formattedContent = rawContent.split('\n').join('<br>');

          setContent(formattedContent);
          setHasUnsavedChanges(false);
        } catch (error: any) {
          if (error.message !== "Authentication failed. Session expired.") {
            console.error("A non-authentication error occurred:", error);
            // Maybe show an error message to the user here
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchFileContent();
    } else {
      setContent('');
      setHasUnsavedChanges(false);
    }
  }, [fileId, token, fetchWithAuth]); // Its dependency array

  // Define dynamic classes for cleaner JSX
  const containerClasses = isFullscreen
    // ✅ FIX: Use a very high z-index and add consistent padding
    ? 'fixed inset-0 z-[9999] bg-white p-4 sm:p-6'
    : 'relative w-full flex items-center justify-center bg-slate-50 p-4';
  
  const wrapperClasses = isFullscreen
    // ✅ FIX: Set up a flex column layout that fills the screen height
    ? 'w-full h-full flex flex-col'
    : 'w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl shadow-slate-200';

  const handleContentChange = (newContent: string, delta: any, source: string) => {
    // Always update the visual content
    setContent(newContent);

    // If the change was triggered by a user action (typing, pasting, etc.),
    // then we set the flag to true.
    if (source === 'user') {
      setHasUnsavedChanges(true);
    }
  };

  const handleSaveClick = async () => {
    if (!isNewFile) {
      if (!hasUnsavedChanges || !token) return;
      
      setIsSaving(true);
      const plainTextContent = convertHTMLToFASTA(content);
      try {
        const response = await fetchWithAuth(`http://localhost:8000/files/${fileId}/edit`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: plainTextContent }),
        });
        if (!response.ok) throw new Error("Failed to save changes.");
        alert("File saved successfully!");
        setHasUnsavedChanges(false);
      } catch (error: any) {
        alert(`Error: ${error.message}`);
      } finally {
        setIsSaving(false);
      }
    } else {
      // If it's a new file, open the modal to get a filename and type.
      setIsSaveModalOpen(true);
    }
  };

  const handleCreateNewFile = async () => {
    if (!newFilename) {
      alert("Please enter a filename.");
      return;
    }
    
    setIsSaving(true);
    
    const plainTextContent = convertHTMLToFASTA(content);
    const blob = new Blob([plainTextContent], { type: 'text/plain' });
    const fileToUpload = new File([blob], `${newFilename}.fasta`, { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('type', fileType);

    try {
      const response = await fetchWithAuth('http://localhost:8000/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create the file.");
      }

      alert("File created successfully!");
      setIsSaveModalOpen(false);
      setNewFilename('');
      navigate('/editor');

    } catch (error: any) {
      console.error("Error creating file:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`transition-all duration-300 ease-in-out ${containerClasses}`}>
      <div className={wrapperClasses}>
        
        <header className="flex flex-shrink-0 justify-between items-start mb-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              FASTA Sequence Editor
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Paste your sequence or start typing below.
            </p>
          </div>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode'}
          >
            {isFullscreen ? <><MinimizeIcon /><span>Exit</span></> : <><MaximizeIcon /><span>Fullscreen</span></>}
          </button>
        </header>

        {/* ✅ FIX: Editor container now grows to fill available space */}
        <div className="flex-grow min-h-0 relative">
          <ReactQuill
            theme="snow"
            value={content}
            onChange={handleContentChange}
            modules={quillConfig}
            formats={quillFormats}
            placeholder=">Example_Sequence..."
            // ✅ FIX: `h-full` tells Quill to fill its new flex-grow parent
            className="h-full" 
          />
        </div>

        {/* NEW: A footer just for the save button */}
        <footer className="flex gap-2 flex-shrink-0 justify-end items-center pt-4 mt-4 border-t border-slate-200">
            <button 
              onClick={() => navigate("/editor")}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-500 rounded-lg 
              hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 
              focus-visible:ring-offset-2 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed
              cursor-pointer"
            >
              Back
            </button>

            <button
              onClick={handleSaveClick}
              disabled={isSaving || isLoading || (isNewFile ? convertHTMLToFASTA(content).length === 0 : !hasUnsavedChanges)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg 
              hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 
              focus-visible:ring-offset-2 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed
              cursor-pointer"
              aria-label="Save file"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <SaveIcon size={16} />
                  <span>Save</span>
                </>
              )}
            </button>
        </footer>

        {/* --- NEW: The 'Save As' Modal --- */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Save New FASTA File</h2>
              <button onClick={() => setIsSaveModalOpen(false)}><X className="text-slate-500 hover:text-slate-800"/></button>
            </div>
            
            {/* Filename Input */}
            <div>
              <label htmlFor="filename" className="block text-sm font-medium text-slate-700 mb-1">Filename</label>
              <div className="relative">
                <input
                  type="text"
                  id="filename"
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  placeholder="my-cool-sequence"
                  className="w-full pl-3 pr-16 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">.fasta</span>
              </div>
            </div>

            {/* File Type Radio Buttons */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">File Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="input" checked={fileType === 'input'} onChange={() => setFileType('input')} className="form-radio text-indigo-600"/>
                  <span>Input File</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="reference" checked={fileType === 'reference'} onChange={() => setFileType('reference')} className="form-radio text-indigo-600"/>
                  <span>Reference File</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
                Cancel
              </button>
              <button onClick={handleCreateNewFile} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300">
                {isSaving ? "Saving..." : "Save File"}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};