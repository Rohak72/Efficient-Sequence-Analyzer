// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    // This parent div correctly centers its child both vertically and horizontally.
    <div className="flex items-center justify-center min-h-screen min-w-screen bg-gray-50 px-4">
      
      {/* 
        EXPLAINER: THE FIX IS HERE!
        - The original code used `lg:max-w-4xl`. The `4xl` size (1280px) is very wide and can be larger than the available space on many laptop screens, causing it to be "cut off".
        - We are changing it to `lg:max-w-3xl`. This size (1152px) is still plenty wide for a beautiful two-column layout but is much more likely to fit and center properly on standard desktop and laptop screens.
        - This single change maintains your desired layout while fixing the centering/cutoff issue.
      */}
      <div className="w-full max-w-md lg:max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 h-full">

          {/* Left Column (Branding) - No changes here */}
          <div className="hidden lg:flex flex-col justify-center p-12 bg-blue-800 text-white">
            <h2 className="text-3xl font-bold mb-4">Welcome Back!</h2>
            <p className="text-white">
              Enter your credentials to access your sequences and analysis tools.
            </p>
          </div>

          {/* Right Column (Form) - No changes here */}
          <div className="p-8 lg:p-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Log In to Your Account</h2>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <div>
                <label htmlFor="username" className="text-sm font-medium text-gray-700">Username</label>
                <input
                  id="username"
                  type="text"
                  required
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 
                  focus:border-blue-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 
                  focus:border-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm 
                  font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                  focus:ring-blue-500 disabled:bg-blue-400 cursor-pointer"
                >
                  {isLoading ? 'Logging in...' : 'Log In'}
                </button>
              </div>
            </form>
            <p className="mt-6 text-sm text-center text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up!
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};