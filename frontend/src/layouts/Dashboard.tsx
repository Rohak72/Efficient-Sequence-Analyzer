// src/layouts/DashboardLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export const DashboardLayout: React.FC = () => {
  return (
    // This container has padding-top to push everything below the main navbar.
    // The h-screen and flex styles will apply to the remaining viewport height.
    <div className="h-[calc(100vh-4rem)] flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4"> {/* Added padding for content spacing */}
        <Outlet />
      </main>
    </div>
  );
};