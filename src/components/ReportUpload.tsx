import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { apiService } from '../services/apiService';
import Spinner from './Spinner';

interface ReportUploadProps {
  currentUser: User;
  onUploadSuccess: () => void;
}

const ReportUpload: React.FC<ReportUploadProps> = ({ currentUser, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setMessage(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    setLoading(true);
    setMessage("Uploading file...");
    setError(null);

    const formData = new FormData();
    formData.append('report', selectedFile);

    try {
      const token = await currentUser.getIdToken();
      await apiService.post('/patient/uploadReport', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage("Report uploaded and AI extraction started successfully! You'll see it on your dashboard shortly.");
      setSelectedFile(null);
      onUploadSuccess(); // Navigate back to dashboard or refresh data
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(`Failed to upload report: ${err.response?.data?.error || err.message}`);
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-2xl mx-auto my-8">
      <h2 className="text-3xl font-semibold text-dark-green mb-6">Upload New Medical Report</h2>
      <p className="text-gray-600 mb-6">
        Select a PDF or image file (JPG, PNG) of your medical report. Our AI will automatically
        extract key information and add it to your health timeline.
      </p>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
        <input
          type="file"
          id="reportFile"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="hidden"
        />
        <label htmlFor="reportFile" className="cursor-pointer block text-primary hover:text-dark-green font-medium text-lg mb-2">
          {selected