// src/App.tsx (or main.tsx)
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { FastaEditor } from './components/FastaEditor'
import { LoginPage } from './pages/Login';
import { SignupPage } from './pages/Signup';
import { HomePage } from './pages/Home';
import { DashboardLayout } from './layouts/Dashboard'
import { WelcomeHub } from './components/WelcomeHub';
import { FormOverhead } from './components/FormOverhead';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            {/* Add other routes here */}
            <Route path="/editor" element={<DashboardLayout />}>
              <Route index element={<WelcomeHub />} />
              {/* You can add more sub-routes here if needed */}
              {/* <Route path=":fileId" element={<SomeOtherComponent />} /> */}
              <Route path=":fileId" element={<FastaEditor />} /> 
            </Route>
            <Route path="/viewer" element={<FormOverhead />}/>
          </Routes>
        </main>
      </AuthProvider>
    </Router>
  );
}

export default App;