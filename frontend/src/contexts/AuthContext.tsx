// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

// Define the shape of your user and the context
interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Effect to set user if token exists (e.g., on page refresh)
  // In a real app, you'd also verify the token with the backend here
  useEffect(() => {
    if (token) {
      // For simplicity, we'll decode the username from the token
      // A more robust solution would be a `/users/me` endpoint
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ username: payload.sub });
      } catch (e) {
        console.error("Failed to decode token:", e);
        // If token is invalid, log out
        logout();
      }
    }
  }, [token]);

  const handleAuth = async (url: string, body: URLSearchParams | string, successCallback: (data: any) => void) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" }, // Your backend uses this for login!
        body: body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Something went wrong");
      }
      
      successCallback(data);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const body = new URLSearchParams();
    body.append('username', username);
    body.append('password', password);
    
    await handleAuth("http://localhost:8000/auth/login", body, (data) => {
        setToken(data.access_token);
        localStorage.setItem("token", data.access_token);
        setUser({ username }); // Set user from the login form
        navigate("/"); // Redirect to home on successful login
    });
  };

  const signup = async (username: string, password: string) => {
    // NOTE: Your signup endpoint takes JSON, not form data
    const body = JSON.stringify({ username, password });
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:8000/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Signup failed");
      // Optionally, automatically log them in or show a "please log in" message
      alert("Signup successful! Please log in.");
      navigate("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    navigate("/login"); // Redirect to login page on logout
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const currentToken = localStorage.getItem("token");

    // 1. Prepare the request headers with the token
    const headers = new Headers(options.headers || {});
    if (currentToken) {
      headers.append('Authorization', `Bearer ${currentToken}`);
    } else {
      // If there's no token, log out immediately
      logout();
      throw new Error("No token found. User logged out.");
    }
    
    const newOptions = { ...options, headers };

    // 2. Make the API call
    const response = await fetch(url, newOptions);

    // 3. THIS IS THE CRITICAL PART: Check for auth errors
    if (response.status === 401 || response.status === 403) {
      // The token is invalid or expired.
      // Trigger the logout process, which will redirect to the login page.
      logout();
      // Throw an error to stop the component's code from running
      throw new Error("Authentication failed. Session expired.");
    }

    // 4. If everything is okay, return the response as normal
    return response;
  };

  const value = { user, token, isLoading, error, login, signup, logout, fetchWithAuth };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context easily
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};