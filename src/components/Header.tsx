import React from 'react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../services/authService';
import { AppSection } from '../types';

interface HeaderProps {
  currentUser: User;
  onNavigate: (section: AppSection) => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onNavigate }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="bg-primary shadow-md py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white tracking-wide">UPHR-Vault</h1>
        <nav className="hidden md:flex space-x-6">
          <button onClick={() => onNavigate('dashboard')} className="text-white hover:text-accent font-medium transition-colors">
            Dashboard
          </button>
          <button onClick={() => onNavigate('upload')} className="text-white hover:text-accent font-medium transition-colors">
            Upload Report
          </button>
          <button onClick={() => onNavigate('trends')} className="text-white hover:text-accent font-medium transition-colors">
            Health Trends
          </button>
          <button onClick={() => onNavigate('chatbot')} className="text-white hover:text-accent font-medium transition-colors">
            Chatbot
          </button>
          <button onClick={() => onNavigate('doctorAccess')} className="text-white hover:text-accent font-medium transition-colors">
            Share with Doctor
          </button>
        </nav>
        <div className="flex items-center space-x-4">
          <span className="text-white text-lg font-medium hidden sm:block">{currentUser.email}</span>
          <button
            onClick={handleLogout}
            className="bg-white text-primary px-4 py-2 rounded-full shadow-md hover:bg-light-green hover:text-dark-green transition-colors font-semibold text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;