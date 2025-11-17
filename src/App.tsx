import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './services/authService';
import Auth from './components/Auth';
import Header from './components/Header';
import ReportUpload from './components/ReportUpload';
import Dashboard from './components/Dashboard';
import DoctorAccess from './components/DoctorAccess';
import DoctorView from './components/DoctorView';
import Chatbot from './components/Chatbot'; // New import
import Trends from './components/Trends'; // New import
import { Report, AppSection } from './types'; // Updated import for AppSection
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [currentSection, setCurrentSection] = useState<AppSection>('dashboard');
  const [reports, setReports] = useState<Report[]>([]); // This will be passed to Dashboard and Trends
  const [selectedReport, setSelectedReport] = useState<Report | null>(null); // Lifted state for selected report
  const [doctorAccessToken, setDoctorAccessToken] = useState<string | null>(null);

  // Check URL for doctor token
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#doctor-view\/(.+)$/);
    if (match && match[1]) {
      setDoctorAccessToken(match[1]);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleReportsUpdate = useCallback((newReports: Report[]) => {
    setReports(newReports);
    // If reports are updated and there's no selected report, or the selected report is no longer in the list,
    // select the latest one.
    if (newReports.length > 0 && (!selectedReport || !newReports.some(r => r.id === selectedReport.id))) {
        setSelectedReport(newReports[0]);
    } else if (newReports.length === 0) {
        setSelectedReport(null);
    }
  }, [selectedReport]);

  const handleSelectReport = useCallback((report: Report) => {
    setSelectedReport(report);
  }, []);

  if (loadingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <Spinner />
      </div>
    );
  }

  // Render DoctorView if a token is present in the URL hash
  if (doctorAccessToken) {
    return <DoctorView token={doctorAccessToken} />;
  }

  // Render Patient Portal
  return (
    <div className="min-h-screen bg-gradient-to-br from-light-green to-white">
      {currentUser ? (
        <>
          <Header currentUser={currentUser} onNavigate={setCurrentSection} />
          <main className="container mx-auto p-4 md:p-8">
            {currentSection === 'dashboard' && <Dashboard currentUser={currentUser} reports={reports} onReportsUpdate={handleReportsUpdate} selectedReport={selectedReport} onSelectReport={handleSelectReport} />}
            {currentSection === 'upload' && <ReportUpload currentUser={currentUser} onUploadSuccess={() => { setCurrentSection('dashboard'); }} />}
            {currentSection === 'doctorAccess' && <DoctorAccess currentUser={currentUser} />}
            {currentSection === 'chatbot' && <Chatbot currentUser={currentUser} selectedReport={selectedReport} />}
            {currentSection === 'trends' && <Trends currentUser={currentUser} reports={reports} />}
          </main>
        </>
      ) : (
        <div className="flex justify-center items-center min-h-screen">
          <Auth />
        </div>
      )}
    </div>
  );
};

export default App;