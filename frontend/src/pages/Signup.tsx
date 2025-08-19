// src/pages/SignupPage.tsx

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

export const SignupPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const { signup, isLoading } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { error: apiError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    await signup(username, password);
  };

  return (
    // The main container that centers everything on the page.
    <div className="flex items-center justify-center min-h-screen min-w-screen bg-gray-50 px-4">

      {/* 
        EXPLAINER 1: THE RESPONSIVE CARD
        - Same as the login page, this card grows from a mobile-friendly `max-w-md`
        - to a desktop-friendly `lg:max-w-4xl`.
      */}
      <div className="w-full max-w-md lg:max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden">
        
        {/* 
          EXPLAINER 2: THE TWO-COLUMN GRID LAYOUT
          - Identical to the login page: one column on mobile, two columns on desktop.
        */}
        <div className="grid grid-cols-1 lg:grid-cols-2">

          {/* 
            EXPLAINER 3: THE BRANDING/LEFT COLUMN
            - This is hidden on mobile (`hidden lg:flex`).
            - We've changed the text to be appropriate for a signup page.
          */}
          <div className="hidden lg:flex flex-col justify-center p-12 bg-blue-800 text-white">
            <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
            <p className="text-white">
              Create an account to start analyzing your DNA sequences with our powerful pipeline.
            </p>
          </div>

          {/* 
            EXPLAINER 4: THE FORM/RIGHT COLUMN
            - This contains the signup form.
            - It includes the extra 'Confirm Password' field.
            - The padding is responsive (`p-8 lg:p-12`) for a better look on all screen sizes.
          */}
          <div className="p-8 lg:p-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Create a New Account</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {(apiError || formError) && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                  <p className="text-sm text-center">{apiError || formError}</p>
                </div>
              )}
              <div>
                <label htmlFor="username" className="text-sm font-medium text-gray-700">Username</label>
                <input 
                    id="username" 
                    type="text" 
                    required 
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 
                    focus:border-blue-500" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                />
              </div>
              <div>
                <label htmlFor="password"className="text-sm font-medium text-gray-700">Password</label>
                <input 
                    id="password" 
                    type="password" 
                    required 
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 
                    focus:border-blue-500" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                />
              </div>
              <div>
                <label htmlFor="confirm-password"className="text-sm font-medium text-gray-700">Confirm Password</label>
                <input 
                    id="confirm-password" 
                    type="password" 
                    required 
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm 
                  font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                  focus:ring-blue-500 cursor-pointer"
                >
                  {isLoading ? 'Creating account...' : 'Sign Up'}
                </button>
              </div>
            </form>
            <p className="mt-6 text-sm text-center text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Log in!
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper CSS class for inputs (optional, you can add this to your main CSS file)
// .input {
//   @apply px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500;
// }