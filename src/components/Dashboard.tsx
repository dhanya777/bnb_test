import React, { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { apiService } from '../services/apiService';
import { Report, ExtractedValue } from '../types';
import Spinner from './Spinner';

interface DashboardProps {
  currentUser: User;
  reports: Report[];
  onReportsUpdate: (reports: Report[]) => void;
  selectedReport: Report | null; // New prop
  onSelectReport: (report: Report) => void; // New prop
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, reports, onReportsUpdate, selectedReport, onSelectReport }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const response = await apiService.get('/patient/reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const fetchedReports: Report[] = response.data;
      // Sort reports by timestamp descending
      const sortedReports = fetchedReports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onReportsUpdate(sortedReports); // Update reports in App.tsx
      // selectedReport is now managed by App.tsx, Dashboard just uses it via props.
    } catch (err: any) {
      console.error("Failed to fetch reports:", err);
      setError(`Failed to load reports: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentUser, onReportsUpdate]); // Removed selectedReport from deps

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); // Re-fetch when user changes

  const formatExtractedValue = (key: string, value: ExtractedValue): React.ReactNode => {
    const isAbnormal = value.isAbnormal ? 'text-red-600 font-bold' : '';
    const formattedValue = typeof value.value === 'number' ? value.value.toFixed(2) : value.value;
    return (
      <li key={key} className={`flex justify-between items-center py-2 ${isAbnormal}`}>
        <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
        <span className="flex items-center space-x-2">
          <span>{formattedValue} {value.unit}</span>
          {value.ref && <span className="text-gray-500 text-sm">({value.ref})</span>}
          {value.isAbnormal && (
            <span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">Abnormal</span>
          )}
        </span>
      </li>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
        <p className="ml-4 text-gray-700">Loading your medical reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-2xl mx-auto my-8" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline ml-2">{error}</span>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto my-8 text-center">
        <h2 className="text-3xl font-semibold text-dark-green mb-4">No Reports Yet</h2>
        <p className="text-gray-600 mb-6">
          It looks like you haven't uploaded any medical reports. Start by uploading your first report to build your unified health timeline!
        </p>
        <button
          onClick={() => { /* In a full app, this would navigate to the upload page */ }}
          className="bg-primary text-white px-6 py-3 rounded-md shadow-md hover:bg-dark-green transition-colors font-semibold"
        >
          Upload Your First Report
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 my-8">
      {/* Timeline / Report List */}
      <div className="lg:col-span-1 bg-white rounded-xl shadow-lg p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-2xl font-semibold text-dark-green mb-6 border-b pb-4">Medical Timeline</h3>
        <ul className="space-y-4">
          {reports.map((report) => (
            <li
              key={report.id}
              className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ease-in-out
                ${selectedReport?.id === report.id ? 'bg-light-green shadow-md border-primary border-l-4' : 'bg-gray-50 hover:bg-gray-100'}`}
              onClick={() => onSelectReport(report)}
            >
              <p className="text-sm text-gray-500">{new Date(report.timestamp).toLocaleDateString()}</p>
              <h4 className="text-lg font-medium text-gray-800">{report.reportType || 'General Report'} - {report.hospital || 'Unknown Hospital'}</h4>
              {report.abnormalities.length > 0 && (
                <p className="text-red-600 text-sm font-semibold mt-1">Abnormalities noted</p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Report Details */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
        {selectedReport ? (
          <>
            <h3 className="text-3xl font-bold text-dark-green mb-4">{selectedReport.reportType || 'Medical Report'}</h3>
            <p className="text-lg text-gray-700 mb-2">
              <span className="font-semibold">Hospital:</span> {selectedReport.hospital || 'N/A'}
            </p>
            <p className="text-lg text-gray-700 mb-4">
              <span className="font-semibold">Date:</span> {new Date(selectedReport.timestamp).toLocaleDateString()}
            </p>

            <a
              href={selectedReport.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:text-dark-green font-medium mb-6 transition-colors"
            >
              View Original Report
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            <div className="space-y-6">
              {/* Patient Summary */}
              <div className="bg-light-green bg-opacity-30 rounded-lg p-4 shadow-sm">
                <h4 className="text-xl font-semibold text-dark-green mb-2">Patient Summary</h4>
                <p className="text-gray-800 leading-relaxed">{selectedReport.patientSummary}</p>
              </div>

              {/* Lab Values */}
              {Object.keys(selectedReport.extractedValues).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
                  <h4 className="text-xl font-semibold text-dark-green mb-2">Lab Values</h4>
                  <ul className="divide-y divide-gray-200">
                    {/* Fix: Explicitly cast 'value' to ExtractedValue type */}
                    {Object.entries(selectedReport.extractedValues).map(([key, value]) =>
                      formatExtractedValue(key, value as ExtractedValue)
                    )}
                  </ul>
                </div>
              )}

              {/* Diagnoses */}
              {selectedReport.diagnosis.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
                  <h4 className="text-xl font-semibold text-dark-green mb-2">Diagnoses</h4>
                  <ul className="list-disc list-inside text-gray-800 space-y-1">
                    {selectedReport.diagnosis.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}

              {/* Medications */}
              {selectedReport.medications.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
                  <h4 className="text-xl font-semibold text-dark-green mb-2">Medications</h4>
                  <ul className="list-disc list-inside text-gray-800 space-y-1">
                    {selectedReport.medications.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              )}

              {/* Abnormalities */}
              {selectedReport.abnormalities.length > 0 && (
                <div className="bg-red-50 bg-opacity-70 rounded-lg p-4 shadow-sm border border-red-200">
                  <h4 className="text-xl font-semibold text-red-700 mb-2">Noted Abnormalities</h4>
                  <ul className="list-disc list-inside text-red-800 space-y-1">
                    {selectedReport.abnormalities.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}

              {/* Doctor Summary */}
              <div className="bg-secondary bg-opacity-30 rounded-lg p-4 shadow-sm">
                <h4 className="text-xl font-semibold text-dark-green mb-2">Doctor-Level Summary</h4>
                <p className="text-gray-800 leading-relaxed italic">{selectedReport.doctorSummary}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-600 mt-12">
            <p className="text-xl font-medium">Select a report from the timeline to view its details.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;