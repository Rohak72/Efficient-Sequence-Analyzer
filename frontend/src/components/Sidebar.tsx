// src/components/Sidebar.tsx
import { 
  ChevronLast, ChevronFirst, MoreVertical, Plus, Folder, FileText, FlaskConical, LogIn, ChevronDown, Upload, 
  Trash2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext"; // Your auth context is key!
import { useNavigate } from "react-router-dom";
import { UploadModal } from "./EditorUploadModal";
import { AuthPromptModal } from "./AuthPromptModal"

// Define the shape of a file object from your backend
interface FastaFile {
  id: number;
  filename: string;
  type: "input" | "reference" | "result";
  // Add other properties if they exist, like `created_at`
}

// Props for our new dropdown component
interface DropdownSectionProps {
  title: string;
  icon: React.ReactNode;
  files: FastaFile[];
  isExpanded: boolean; // Is the whole sidebar expanded?
  isOpen: boolean;
  onToggle: () => void;
  onFileClick: (fileId: number) => void;
  onFileDelete: (fileId: number) => void;
}

// Reusable Dropdown Component for files
const DropdownSection: React.FC<DropdownSectionProps> = ({ title, icon, files, isExpanded, isOpen, 
    onToggle, onFileClick, onFileDelete }) => (
  <div>
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full py-2 px-3 my-1 font-medium rounded-md cursor-pointer 
      transition-colors hover:bg-indigo-50 text-gray-600"
    >
      <div className="flex items-center">
        {icon}
        <span className={`overflow-hidden transition-all text-left ${isExpanded ? "w-44 ml-3" : "w-0"}`}>
          {title}
        </span>
      </div>
      <ChevronDown
        size={20}
        className={`transition-transform ${isOpen ? "rotate-180" : ""} ${isExpanded ? "" : "hidden"}`}
      />
    </button>
    {isOpen && isExpanded && (
      <div className="pl-6 transition-all">
        {files.length > 0 ? (
          files.map((file) => (
            <div 
              key={file.id} 
              onClick={() => onFileClick(file.id)}
              className="group flex items-center text-sm py-1.5 px-2 text-gray-500 hover:text-indigo-800 hover:bg-indigo-100 
              rounded-md cursor-pointer"
            >
              <FileText size={16} className="mr-2 flex-shrink-0" />
              <span className="truncate">{file.filename}</span>

              <button
                // This stops the click from also triggering the onFileClick of the parent div
                onClick={(e) => {
                  e.stopPropagation(); 
                  onFileDelete(file.id);
                }}
                className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded-full text-gray-400 hover:bg-red-100 
                hover:text-red-600 transition-opacity cursor-pointer"
                aria-label={`Delete file ${file.filename}`}
              >
                  <Trash2 size={14}/>
              </button>
            </div>
          ))
        ) : (
          <p className="text-sm py-1.5 px-2 text-gray-400">No files found.</p>
        )}
      </div>
    )}
  </div>
);

// The main Sidebar component
export const Sidebar: React.FC = () => {
  const { user, token, logout, fetchWithAuth } = useAuth();
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const isLoggedIn = !!user;

  const [expanded, setExpanded] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>('inputs'); // Keep 'inputs' open by default

  // State for user's files
  const [inputFiles, setInputFiles] = useState<FastaFile[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<FastaFile[]>([]);
  const [results, setResults] = useState<FastaFile[]>([]);
  const [_isLoading, setIsLoading] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/files/`);

      if (!response.ok) {
        throw new Error("Could not retrieve file list.");
      }
    
      const allFiles: FastaFile[] = await response.json();

        // **IMPORTANT**: Your backend doesn't currently distinguish between file types.
        // For now, we'll put them all in "Input Files".
        // To fix this properly, you would add a `type` column ('input', 'reference', 'result')
        // to your FastaFile model in the backend and filter them here.
      setInputFiles(allFiles.filter(f => f.type === 'input'));
      setReferenceFiles(allFiles.filter(f => f.type === 'reference')); // Example for the future
      setResults(allFiles.filter(f => f.type === 'result')); // Example for the future

    } catch (error: any) {
      if (error.message !== "Authentication failed. Session expired.") {
        console.error("A non-authentication error occurred:", error);
        // Maybe show an error message to the user here
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch files when user logs in
  useEffect(() => {
    if (isLoggedIn) {
      fetchFiles();
    } else {
      setInputFiles([]);
      setReferenceFiles([]);
      setResults([]);
      return;
    }
  }, [isLoggedIn, token]); // Rerun effect if login status changes

  const handleToggleDropdown = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const handleCreateClick = () => {
    if (isLoggedIn) {
        navigate('/editor/new');
    } else {
        setIsAuthModalOpen(true);
    }
  }

  const handleFileClick = (fileId: number) => {
    // Here you would navigate to the editor with the file ID
    // e.g., navigate(`/editor/${fileId}`)
    console.log(`Opening FASTA with ID: ${fileId}...`);
    navigate(`./${fileId}`)
  }

  const handleFileDelete = async (fileId: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this file?")) {
      return;
    }

    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/files/${fileId}`, {method: 'DELETE'});

      if (!response.ok) {
        // If the server returns an error message, show it
        throw new Error("Failed to delete file.");
      }

      navigate('/editor')

      // On success, update the UI instantly without a page reload
      // This is the "magic" of React state updates
      setInputFiles(currentFiles => currentFiles.filter(file => file.id !== fileId));
      setReferenceFiles(currentFiles => currentFiles.filter(file => file.id !== fileId));
      
      // Optionally show a success message
      // alert("File deleted successfully.");

    } catch (error: any) {
      if (error.message !== "Authentication failed. Session expired.") {
        console.error("A non-authentication error occurred:", error);
        // Maybe show an error message to the user here
      }
    }
  }

  const handleUploadClick = () => {
    if (isLoggedIn) {
        setIsUploadModalOpen(true);
    } else {
        setIsAuthModalOpen(true);
    }
  };

  const handleUploadFinished = () => {
    // This is way better than window.location.reload()!
    // It just re-fetches the file list.
    fetchFiles();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    const formData = new FormData();
    formData.append('file', file); // The key 'file' must match your FastAPI backend
    console.log()

    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/files/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed. Please try again.");
        }

        const newFile = await response.json();
        alert(`Successfully uploaded: ${newFile.filename}`);
        
        // TODO: Refresh the file list automatically instead of requiring a page reload
        window.location.reload(); 

        } catch (error: any) {
          alert(error.message);
        }
    };

  return (
    <>
        <aside className={`h-full transition-all ${expanded ? "w-72" : "w-20"}`}>
        <nav className="h-full flex flex-col bg-white shadow-sm">
            <div className="p-4 pb-0 flex justify-between items-center">
            <h3></h3>
            <button
                onClick={() => setExpanded((curr) => !curr)}
                className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100"
            >
                {expanded ? <ChevronFirst /> : <ChevronLast />}
            </button>
            </div>

            {/* --- Main Content of Sidebar --- */}
            <div className="flex-1 px-5 overflow-y-auto">
            {/* Create New File Button */}
            <button onClick={handleCreateClick} 
            className="flex items-center w-full py-1.5 px-3 my-3 font-semibold rounded-md cursor-pointer group bg-[#5386fc] 
            text-white hover:bg-indigo-700">
                <Plus size={20} />
                <span className={`overflow-hidden transition-all ${expanded ? "ml-3" : "w-0"}`}>
                Create FASTA
                </span>
            </button>

            {/* Upload File Button */}
            <button
                onClick={handleUploadClick}
                className="flex items-center justify-start w-full py-1.5 px-3 my-3 font-semibold rounded-md cursor-pointer 
                transition-colors group border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-500 
                hover:text-indigo-600"
            >
                <Upload size={expanded ? 20 : 28} />
                <span className={`overflow-hidden transition-all ${expanded ? "ml-3" : "w-0"}`}>
                  Upload File
                </span>
            </button>

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileUploadRef}
                onChange={handleFileSelected}
                className="hidden"
                accept=".fasta,.fa,.fna,.faa" // Optional: only allow FASTA files
            />
    
            <hr className="my-3" />

            {isLoggedIn ? (
                <>
                {/* --- Dropdown Sections --- */}
                <DropdownSection
                    title="Input Files"
                    icon={<Folder size={20} />}
                    files={inputFiles}
                    isExpanded={expanded}
                    isOpen={openDropdown === 'inputs'}
                    onToggle={() => handleToggleDropdown('inputs')}
                    onFileClick={handleFileClick}
                    onFileDelete={handleFileDelete}
                />
                <DropdownSection
                    title="Reference Files"
                    icon={<Folder size={20} />}
                    files={referenceFiles}
                    isExpanded={expanded}
                    isOpen={openDropdown === 'references'}
                    onToggle={() => handleToggleDropdown('references')}
                    onFileClick={handleFileClick}
                    onFileDelete={handleFileDelete}
                />
                <DropdownSection
                    title="Results"
                    icon={<FlaskConical size={20} />}
                    files={results}
                    isExpanded={expanded}
                    isOpen={openDropdown === 'results'}
                    onToggle={() => handleToggleDropdown('results')}
                    onFileClick={handleFileClick}
                    onFileDelete={handleFileDelete}
                />
                </>
            ) : (
                // --- Logged Out State ---
                <div className={`flex flex-col items-center justify-center p-4 text-center text-gray-500 ${expanded ? '' : 'hidden'}`}>
                <LogIn size={40} className="mb-2" />
                <h4 className="font-semibold">Log in to view files</h4>
                <p className="text-xs">Your saved work will appear here once you are logged in.</p>
                </div>
            )}
            </div>

            {/* --- Bottom User Profile Section --- */}
            <div className="px-5"> {/* 1. Add a wrapper with horizontal padding */}
            <hr className="my-3" /> {/* 2. Use the same <hr> as above */}
            </div>

            <div className="flex p-5 pt-2"> {/* 3. The content div now has no border */}
            <img
                src={`https://ui-avatars.com/api/?background=c7d2fe&color=3730a3&bold=true&name=${user?.username || '?'}`}
                alt="User Avatar"
                className="w-10 h-10 rounded-md"
            />
            <div className={`flex justify-between items-center transition-all ${expanded ? "w-52 ml-3" : "w-0"}`}>
                {isLoggedIn && user ? (
                <div className="leading-4">
                    <h4 className="font-semibold pb-0.5">{expanded ? user.username : ""}</h4>
                    <span className="text-xs text-gray-600">{expanded ? "User Profile" : ""}</span>
                </div>
                ) : (
                <div className="leading-4">
                    <h4 className="font-semibold">{expanded ? "Not Logged In" : ""}</h4>
                </div>
                )}
              </div>
            </div>
        </nav>
      </aside>
      
      {/* RENDER THE MODAL HERE */}
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadFinished}
      />

      <AuthPromptModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
};