// src/components/AuthPromptModal.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, X } from 'lucide-react';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthPromptModal: React.FC<AuthPromptModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    onClose(); // Close the modal before navigating
    navigate(path);
  };

  return (
    // Modal Backdrop - same style as your UploadModal for consistency
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
      {/* Modal Panel */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 text-center p-8">
        {/* Close button in the corner */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer">
          <X size={24} />
        </button>
        
        <div className="flex flex-col items-center">
            <div className="p-3 bg-indigo-100 rounded-full mb-4">
                <LogIn size={40} className="text-indigo-600" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-2">Authentication Required</h3>
            <p className="text-gray-500 mb-6">
                You need to have an account and be logged in to create or upload files.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 w-full">
                <button 
                    onClick={() => handleNavigate('/signup')}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-indigo-600 bg-white border border-gray-300 
                    rounded-md hover:bg-gray-50 cursor-pointer">
                    Sign Up
                </button>
                <button 
                    onClick={() => handleNavigate('/login')}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-md 
                    hover:bg-indigo-700 cursor-pointer">
                    Log In
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};