// src/components/Navbar.tsx

import { useState, useRef, useEffect } from "react";
import { Link, NavLink } from "react-router-dom"; // Use NavLink for active styling
import { useAuth } from "../contexts/AuthContext"; // THE MOST IMPORTANT IMPORT
import logo from "../assets/Icon.png"

export const Navbar: React.FC = () => {
  // 1. GET REAL AUTHENTICATION STATE FROM THE CONTEXT
  // Instead of a fake local state, we get the real user object and logout function.
  const { user, logout } = useAuth();
  const isLoggedIn = !!user; // This will be `true` if user object exists, `false` if it's null.

  // --- Local UI State (this part doesn't change) ---
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  // 2. THE NEW LOGOUT HANDLER
  // This function now calls the central logout logic from our AuthContext.
  const handleLogout = () => {
    logout(); // This will clear the user state, token, and localStorage
    setDropdownOpen(false); // Close the dropdown UI
    setMenuOpen(false); // Close the mobile menu UI
  };

  // Effect to close dropdown when clicking outside (this part doesn't change)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);


  return (
    <nav className="bg-white shadow-md sticky top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <a href="/"><img src={logo} alt="Logo" className="h-12 w-auto" /></a>
            <Link to="/" className="flex-shrink-0 font-bold text-xl text-sky-600 cursor-pointer">
              SimpliSeq
            </Link>
          </div>

          {/* 3. DESKTOP MENU - NOW USES NavLink for better active styles */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `relative px-3 py-2 font-medium text-gray-700 hover:text-violet-500 transition 
                 ${isActive
                   ? "text-violet-600 after:w-full"
                   : "after:w-0"
                 } after:absolute after:left-0 after:bottom-0 after:h-0.5 after:bg-violet-600 after:transition-all 
                 after:duration-300 hover:after:w-full`
              }
            >
              Home
            </NavLink>
            {/* Add other base links here if needed */}
            <NavLink
              to="/viewer"
              className={({ isActive }) =>
                `relative px-3 py-2 font-medium text-gray-700 hover:text-violet-600 transition 
                 ${isActive
                   ? "text-violet-600 after:w-full"
                   : "after:w-0"
                 } after:absolute after:left-0 after:bottom-0 after:h-0.5 after:bg-violet-600 after:transition-all 
                 after:duration-300 hover:after:w-full`
              }
            >
              Viewer
            </NavLink>

            <NavLink
              to="/editor"
              className={({ isActive }) =>
                `relative px-3 py-2 font-medium text-gray-700 hover:text-violet-600 transition 
                 ${isActive
                   ? "text-violet-600 after:w-full"
                   : "after:w-0"
                 } after:absolute after:left-0 after:bottom-0 after:h-0.5 after:bg-violet-600 after:transition-all 
                 after:duration-300 hover:after:w-full`
              }
            >
              Editor
            </NavLink>

            {/* 4. CONDITIONAL UI - The core logic */}
            {isLoggedIn ? (
              // --- Logged In: Profile Dropdown ---
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center justify-center text-sm bg-violet-600 text-white rounded-full h-8 w-8 font-bold 
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
                  <span className="sr-only">Open user menu</span>
                  {/* Display the first letter of the username */}
                  {user?.username.charAt(0).toUpperCase()}
                </button>
                {dropdownOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 
                  ring-black ring-opacity-5 focus:outline-none">
                    <div className="px-4 py-3 text-sm text-gray-700 border-b">
                      <p className="font-medium">Signed in as</p>
                      <p className="truncate">{user?.username}</p>
                    </div>
                    <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Settings
                    </Link>
                    <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-gray-700 
                    hover:bg-gray-100 hover:text-indigo-500 cursor-pointer">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // --- Logged Out: Auth Links ---
              <div className="flex items-center space-x-4">
                <Link to="/login" className="px-3 py-2 font-medium text-gray-700 hover:text-violet-600 transition">
                  Log In
                </Link>

                <Link to="/signup" className="group relative inline-flex items-center justify-center overflow-hidden rounded-md 
                bg-violet-600 px-4 py-1.5 font-medium text-white transition-transform duration-300 ease-in-out 
                hover:scale-110 isolate mix-blend-normal">
                
                  <span className="relative z-10 text-white">
                    Sign Up
                  </span>

                  <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] 
                                  group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                    <div className="relative h-full w-8 bg-white/20"></div>
                  </div>
                </Link>
              </div>
            )}

          </div>

          {/* Mobile menu button (no changes needed here) */}
          <button onClick={toggleMenu} className="md:hidden ...">
            {/* ... SVG icon ... */}
          </button>
        </div>
      </div>

      {/* 5. MOBILE MENU - Dynamically generated */}
      {menuOpen && (
        <div className="md:hidden bg-white shadow-inner">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/" className="block ...">Home</Link>
            {isLoggedIn ? (
              <>
                <Link to="/settings" className="block ...">Settings</Link>
                <button onClick={handleLogout} className="w-full text-left block ...">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block ...">Log In</Link>
                <Link to="/signup" className="block ...">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};