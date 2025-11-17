import React, { useState, useEffect, useCallback } from 'react';
// Fix: Import `User` as a type
import type { User } from 'firebase/auth';
import { apiService } from '../services/apiService';
import { DoctorAccessToken, Report } from '../types';
import Spinner from './Spinner';

interface DoctorAccessProps {
  currentUser: User;
}

const DoctorAccess: React.FC<DoctorAccessProps> = ({ currentUser }) => {
  const [tokens, setTokens] = useState<DoctorAccessToken[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generatingToken, setGeneratingToken] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const fetchTokensAndReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const [tokensResponse, reportsResponse] = await Promise.all([
        apiService.get('/patient/doctorAccessTokens', { headers: { 'Authorization': `Bearer ${token}` } }),
        apiService.get('/patient/reports', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      setTokens(tokensResponse.data);
      setReports(reportsResponse.data.sort((a: Report, b: Report) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (err: any) {
      console.error("Failed to fetch tokens or reports:", err);
      setError(`Failed to load data: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchTokensAndReports();
  }, [fetchTokensAndReports]);

  const handleGenerateToken = async () => {
    if (selectedReportIds.length === 0) {
      setError("Please select at least one report to share.");
      return;
    }
    setGeneratingToken(true);
    setError(null);
    setMessage(null);
    setGeneratedLink(null);
    try {
      const idToken = await currentUser.getIdToken();
      const response = await apiService.post('/patient/createDoctorAccessToken',
        { allowedReports: selectedReportIds },
        { headers: { 'Authorization': `Bearer ${idToken}` } }
      );
      const newToken: DoctorAccessToken = response.data.token;
      setTokens((prev) => [...prev, newToken]);
      const link = `${window.location.origin}/#doctor-view/${newToken.token}`;
      setGeneratedLink(link);
      setMessage("Access token generated successfully!");
      setSelectedReportIds([]); // Clear selection
    } catch (err: any) {
      console.error("Failed to generate token:", err);
      setError(`Failed to generate token: ${err.response?.data?.error || err.message}`);
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!window.confirm("Are you sure you want to revoke this access token?")) {
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const idToken = await currentUser.getIdToken();
      await apiService.post('/patient/revokeDoctorAccessToken',
        { tokenId },
        { headers: { 'Authorization': `Bearer ${idToken}` } }
      );
      setTokens((prev) => prev.map(t => t.id === tokenId ? { ...t, isActive: false } : t));
      setMessage("Access token revoked successfully!");
    } catch (err: any) {
      console.error("Failed to revoke token:", err);
      setError(`Failed to revoke token: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReportToggle = (reportId: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage("Link copied to clipboard!");
  };

  const isTokenExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
        <p className="ml-4 text-gray-700">Loading doctor access settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-4xl mx-auto my-8">
      <h2 className="text-3xl font-semibold text-dark-green mb-6">Share with Doctor</h2>
      <p className="text-gray-600 mb-6">
        Generate a secure, time-bound link for your doctor to view your selected medical reports. You can revoke access anytime.
      </p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      )}
      {message && (
        <div className="bg-primary-100 border border-primary text-primary px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline ml-2">{message}</span>
        </div>
      )}

      {/* Select Reports */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">1. Select Reports to Share</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto custom-scrollbar p-2 border rounded-md bg-gray-50">
          {reports.map((report) => (
            <label key={report.id} className="flex items-center p-2 bg-white rounded-md shadow-sm hover:bg-gray-100 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={selectedReportIds.includes(report.id)}
                onChange={() => handleReportToggle(report.id)}
                className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary"
              />
              <span className="ml-3 text-gray-800">
                {new Date(report.timestamp).toLocaleDateString()} - {report.reportType || 'General Report'} ({report.hospital})
              </span>
            </label>
          ))}
        </div>
        <button
          onClick={handleGenerateToken}
          className="mt-6 w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-primary hover:bg-dark-green focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
          disabled={generatingToken || selectedReportIds.length === 0}
        >
          {generatingToken ? <Spinner /> : 'Generate Secure Link'}
        </button>
      </div>

      {generatedLink && (
        <div className="bg-light-green bg-opacity-30 rounded-lg p-4 mb-8 shadow-sm border border-primary">
          <h4 className="text-lg font-semibold text-dark-green mb-2">Share this link with your doctor:</h4>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={generatedLink}
              className="flex-grow px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm"
            />
            <button
              onClick={() => copyToClipboard(generatedLink)}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-dark-green transition-colors text-sm"
            >
              Copy
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">This link will expire in 24 hours.</p>
        </div>
      )}

      {/* Manage Existing Tokens */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">2. Manage Existing Links</h3>
        {tokens.length === 0 ? (
          <p className="text-gray-600">No active doctor access links found.</p>
        ) : (
          <ul className="space-y-4">
            {tokens.map((token) => (
              <li key={token.id} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg shadow-sm
                ${token.isActive && !isTokenExpired(token.expiresAt) ? 'bg-green-50 border border-green-200' : 'bg-gray-100 border border-gray-200 opacity-70'}`}>
                <div className="flex-grow mb-2 md:mb-0">
                  <p className="font-medium text-gray-800">
                    Token ID: <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">{token.id.substring(0, 8)}...</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Expires: {new Date(token.expiresAt).toLocaleString()}
                    {' '}
                    {isTokenExpired(token.expiresAt) && <span className="text-red-600 font-semibold">(Expired)</span>}
                  </p>
                  <p className="text-sm text-gray-600">
                    Status: <span className={`font-semibold ${token.isActive && !isTokenExpired(token.expiresAt) ? 'text-green-600' : 'text-red-600'}`}>
                      {token.isActive && !isTokenExpired(token.expiresAt) ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                  {token.allowedReports.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">Reports: {token.allowedReports.map(id => reports.find(r => r.id === id)?.reportType || 'N/A').join(', ')}</p>
                  )}
                </div>
                {(token.isActive && !isTokenExpired(token.expiresAt)) && (
                  <button
                    onClick={() => handleRevokeToken(token.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-md shadow hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
                    disabled={loading}
                  >
                    Revoke Access
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DoctorAccess;