// src/components/WelcomeHub.tsx

import { Plus } from 'lucide-react';
// 1. ADD these imports
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Need this to check login status
import { AuthPromptModal } from './AuthPromptModal'; // Need the modal component

export const WelcomeHub = () => {
  const navigate = useNavigate();
  // 2. COPY the state and logic from the Sidebar
  const { token } = useAuth();
  const isLoggedIn = !!token;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 3. COPY the handler function from the Sidebar
  const handleCreateClick = () => {
    if (isLoggedIn) {
      navigate('/editor/new'); // If logged in, do the normal thing
    } else {
      setIsAuthModalOpen(true); // If not, open the prompt modal
    }
  };
  
  return (
    // 4. WRAP in a fragment and RENDER the modal (just like in the Sidebar)
    <>
      <div className="flex h-full w-full items-center justify-center bg-gray-50 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">Your Workspace</h1>
          <p className="mt-2 text-lg text-gray-600">
            Create a new file or select one from the sidebar to get started.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={handleCreateClick} // 5. Use the new handler function
              className="flex items-center gap-2 rounded-lg bg-[#5386fc] px-6 py-2 text-lg font-semibold text-white 
              shadow-sm transition hover:bg-indigo-700 cursor-pointer"
            >
              <Plus size={24} />
              Create
            </button>
          </div>
        </div>
      </div>
      
      {/* And render the modal here */}
      <AuthPromptModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
};