import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { Report, ExtractedValue } from '../types';
import Spinner from './Spinner';

interface DoctorViewProps {
  token: string;
}

const DoctorView: React.FC<DoctorViewProps> = ({ token }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [viewSummary, setViewSummary] = useState<boolean>(true); // Toggle between summary and detailed report

  const fetchDoctorData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the token directly in the API call for doctor view
      const response = await apiService.get(`/doctor/timeline/${token}`);
      const fetchedReports: Report[] = response.data;
      const sortedReports = fetchedReports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setReports(sortedReports);
      if (sortedReports.length > 0) {
        setSelectedReport(sortedReports[0]); // Select the latest report by default
      }
    } catch (err: any) {
      console.error("Failed to fetch doctor data:", err);
      setError(`Failed to load patient data: ${err.response?.data?.error || err.message}. The access token might be invalid or expired.`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDoctorData();
  }, [fetchDoctorData]);

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
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <Spinner />
        <p className="ml-4 text-gray-700">Loading patient's medical history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg relative max-w-lg text-center" role="alert">
          <strong className="font-bold text-lg">Access Denied!</strong>
          <span className="block sm:inline mt-2">{error}</span>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto my-8 text-center">
          <h2 className="text-3xl font-semibold text-dark-green mb-4">No Reports Available</h2>
          <p className="text-gray-600 mb-6">
            The patient has not shared any reports or there are no reports associated with this token.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8">
          <h1 className="text-4xl font-bold text-blue-800 mb-2">Patient Medical History</h1>
          <p className="text-lg text-gray-600">Secure Read-Only View (Token Access)</p>
          <div className="mt-4 flex space-x-4">
            <button
              onClick={() => setViewSummary(true)}
              className={`px-4 py-2 rounded-md font-medium text-lg ${viewSummary ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Timeline Summary
            </button>
            <button
              onClick={() => setViewSummary(false)}
              className={`px-4 py-2 rounded-md font-medium text-lg ${!viewSummary ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Detailed Reports
            </button>
          </div>
        </div>

        {viewSummary ? (
          // Timeline Summary View
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-3xl font-semibold text-blue-700 mb-6">Unified Patient Summary</h2>
            <div className="space-y-6">
              {reports.map((report) => (
                <div key={report.id} className="border-b pb-4 last:border-b-0">
                  <h3 className="text-2xl font-semibold text-gray-800 mb-2">{report.reportType || 'Medical Report'} - {report.hospital || 'Unknown Hospital'}</h3>
                  <p className="text-gray-600 text-sm mb-3">
                    Report Date: {new Date(report.timestamp).toLocaleDateString()} | Uploaded: {new Date(report.uploadedAt).toLocaleDateString()}
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-blue-700 mb-2">Doctor-Level Summary for this report:</h4>
                    <p className="text-gray-800 leading-relaxed italic">{report.doctorSummary}</p>
                  </div>
                  {report.abnormalities.length > 0 && (
                    <div className="mt-4 bg-red-50 p-3 rounded-lg border border-red-200">
                      <h5 className="font-semibold text-red-700">Abnormalities:</h5>
                      <ul className="list-disc list-inside text-red-800 text-sm">
                        {report.abnormalities.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Detailed Reports View (similar to patient dashboard, but read-only)
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Report List */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-lg p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-2xl font-semibold text-blue-700 mb-6 border-b pb-4">Reports Timeline</h3>
              <ul className="space-y-4">
                {reports.map((report) => (
                  <li
                    key={report.id}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ease-in-out
                      ${selectedReport?.id === report.id ? 'bg-blue-100 shadow-md border-blue-600 border-l-4' : 'bg-gray-50 hover:bg-gray-100'}`}
                    onClick={() => setSelectedReport(report)}
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

            {/* Selected Report Details */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {selectedReport ? (
                <>
                  <h3 className="text-3xl font-bold text-blue-700 mb-4">{selectedReport.reportType || 'Medical Report'}</h3>
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
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium mb-6 transition-colors"
                  >
                    View Original Report
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>

                  <div className="space-y-6">
                    {/* Doctor Summary */}
                    <div className="bg-blue-50 rounded-lg p-4 shadow-sm border border-blue-200">
                      <h4 className="text-xl font-semibold text-blue-700 mb-2">Doctor-Level Summary</h4>
                      <p className="text-gray-800 leading-relaxed italic">{selectedReport.doctorSummary}</p>
                    </div>

                    {/* Lab Values */}
                    {Object.keys(selectedReport.extractedValues).length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
                        <h4 className="text-xl font-semibold text-blue-700 mb-2">Lab Values</h4>
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
                        <h4 className="text-xl font-semibold text-blue-700 mb-2">Diagnoses</h4>
                        <ul className="list-disc list-inside text-gray-800 space-y-1">
                          {selectedReport.diagnosis.map((d, i) => <li key={i}>{d}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Medications */}
                    {selectedReport.medications.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
                        <h4 className="text-xl font-semibold text-blue-700 mb-2">Medications</h4>
                        <ul className="list-disc list-inside text-gray-800 space-y-1">
                          {selectedReport.medications.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Abnormalities */}
                    {selectedReport.abnormalities.length > 0 && (
                      <div className="bg-red-50 rounded-lg p-4 shadow-sm border border-red-200">
                        <h4 className="text-xl font-semibold text-red-700 mb-2">Noted Abnormalities</h4>
                        <ul className="list-disc list-inside text-red-800 space-y-1">
                          {selectedReport.abnormalities.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-600 mt-12">
                  <p className="text-xl font-medium">Select a report from the timeline to view its details.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorView;