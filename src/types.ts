import type { User } from 'firebase/auth';

export interface ExtractedValue {
  value: number | string;
  unit?: string;
  ref?: string;
  isAbnormal?: boolean;
}

export interface ExtractedValues {
  [key: string]: ExtractedValue;
}

export interface Report {
  id: string;
  userId: string;
  hospital?: string;
  fileUrl: string;
  uploadedAt: string; // ISO string
  reportType?: string;
  extractedValues: ExtractedValues;
  diagnosis: string[];
  medications: string[];
  abnormalities: string[];
  patientSummary: string;
  doctorSummary: string;
  timestamp: string; // ISO string for report date
  fileName: string;
}

export interface DoctorAccessToken {
  id: string;
  token: string;
  expiresAt: string; // ISO string
  isActive: boolean;
  createdAt: string; // ISO string
  allowedReports: string[]; // Array of report IDs this token can access
}

export interface CustomUser extends User {
  // Add any custom fields you might want on the user object
  // For now, we'll just rely on the base User type for client-side,
  // and fetch additional profile data from Firestore if needed.
}

export type AppSection = 'upload' | 'dashboard' | 'doctorAccess' | 'chatbot' | 'trends';