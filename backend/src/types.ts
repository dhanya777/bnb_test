import { Request } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';

// --- Gemini API Output Types ---
export interface GeminiExtractedValue {
  value: number | string;
  unit?: string;
  ref?: string;
  isAbnormal?: boolean;
}

export interface GeminiExtractedData {
  reportType?: string;
  hospital?: string;
  extractedValues: { [key: string]: GeminiExtractedValue };
  diagnosis: string[];
  medications: string[];
  abnormalities: string[];
  patientSummary: string;
  doctorSummary: string;
  timestamp: string; // ISO string or YYYY-MM-DD
}

// --- Firestore Data Models ---

export interface DoctorAccessToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string; // ISO string
  isActive: boolean;
  createdAt: string; // ISO string
  allowedReports: string[]; // Array of report IDs this token can access
}

export interface UserProfile {
  name?: string;
  email: string;
  createdAt: string; // ISO string
  // For simplicity, doctorAccessTokens map is embedded directly.
  // In a more complex app, this might be a subcollection.
  doctorAccessTokens?: { [tokenId: string]: DoctorAccessToken };
}

export interface Report {
  id: string;
  userId: string;
  hospital?: string;
  fileUrl: string;
  fileName: string; // Original file name
  uploadedAt: string; // ISO string
  reportType?: string;
  extractedValues: { [key: string]: GeminiExtractedValue };
  diagnosis: string[];
  medications: string[];
  abnormalities: string[];
  patientSummary: string;
  doctorSummary: string;
  timestamp: string; // ISO string for the date of the report itself
}

// --- Custom Express Request Interface ---
export interface AuthRequest extends Request {
  user?: DecodedIdToken; // Firebase user token
  userId?: string; // Extracted user ID
}
