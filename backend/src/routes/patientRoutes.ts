import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { authenticatePatient } from '../middleware/authMiddleware';
import { db, bucket } from '../services/firebaseService';
import { extractMedicalData, getChatResponse } from '../services/geminiService'; // Updated import
import { Report, AuthRequest, DoctorAccessToken, UserProfile, GeminiExtractedValue } from '../types';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper to convert extracted values to proper types
const processExtractedValues = (data: Record<string, GeminiExtractedValue>) => {
  const processed: Record<string, GeminiExtractedValue> = {};
  for (const key in data) {
    const value = data[key];
    processed[key] = { ...value };
    if (typeof value.value === 'string' && !isNaN(parseFloat(value.value))) {
      processed[key].value = parseFloat(value.value);
    }
    // Ensure isAbnormal is boolean if it comes as something else
    if (typeof value.isAbnormal !== 'boolean') {
      processed[key].isAbnormal = value.isAbnormal === 'true' || value.isAbnormal === true;
    }
  }
  return processed;
};

// POST /patient/uploadReport
// Uploads a medical report, stores it in Cloud Storage, and triggers AI extraction
router.post('/uploadReport', authenticatePatient, upload.single('report'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: 'No file uploaded.' });
    }
    if (!req.userId) {
      return res.status(401).send({ error: 'User not authenticated.' });
    }

    const userId = req.userId;
    const reportId = uuidv4();
    const filePath = `users/${userId}/reports/${reportId}/${req.file.originalname}`;
    const fileRef = bucket.file(filePath);

    // Upload file to GCS
    await fileRef.save(req.file.buffer, {
      contentType: req.file.mimetype,
      metadata: {
        firebaseStorageDownloadTokens: uuidv4(), // Generate a token for public download
      },
    });

    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    console.log(`File uploaded to: ${fileUrl}`);

    // Trigger AI extraction
    console.log(`Triggering AI extraction for report ${reportId}...`);
    const geminiData = await extractMedicalData(fileUrl, req.file.mimetype);
    console.log(`AI extraction complete for report ${reportId}.`);

    // Save report data to Firestore
    const newReport: Report = {
      id: reportId,
      userId: userId,
      hospital: geminiData.hospital || 'Unknown',
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      uploadedAt: new Date().toISOString(),
      reportType: geminiData.reportType || 'General Report',
      extractedValues: processExtractedValues(geminiData.extractedValues),
      diagnosis: geminiData.diagnosis,
      medications: geminiData.medications,
      abnormalities: geminiData.abnormalities,
      patientSummary: geminiData.patientSummary,
      doctorSummary: geminiData.doctorSummary,
      timestamp: geminiData.timestamp, // Report's own date
    };

    await db.collection('reports').doc(reportId).set(newReport);

    res.status(201).send({ message: 'Report uploaded and processed successfully.', reportId: reportId, report: newReport });
  } catch (error) {
    console.error("Error in uploadReport:", error);
    res.status(500).send({ error: 'Failed to upload or process report.', details: (error as Error).message });
  }
});

// GET /patient/reports
// Fetches all medical reports for the authenticated user
router.get('/reports', authenticatePatient, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).send({ error: 'User not authenticated.' });
    }

    const reportsSnapshot = await db.collection('reports')
      .where('userId', '==', req.userId)
      .orderBy('timestamp', 'desc')
      .get();

    const reports = reportsSnapshot.docs.map(doc => doc.data() as Report);
    res.status(200).send(reports);
  } catch (error) {
    console.error("Error fetching patient reports:", error);
    res.status(500).send({ error: 'Failed to fetch reports.', details: (error as Error).message });
  }
});

// GET /patient/doctorAccessTokens
// Fetches all doctor access tokens for the authenticated user
router.get('/doctorAccessTokens', authenticatePatient, async (req: AuthRequest, res) => {
    try {
        if (!req.userId) {
            return res.status(401).send({ error: 'User not authenticated.' });
        }

        const userDoc = await db.collection('users').doc(req.userId).get();
        if (!userDoc.exists) {
            return res.status(404).send({ error: 'User profile not found.' });
        }

        const userProfile = userDoc.data() as UserProfile;
        const tokens = userProfile.doctorAccessTokens ? Object.values(userProfile.doctorAccessTokens) : [];

        // Filter out tokens that are explicitly inactive and sort by creation date
        const activeTokens = tokens
            .filter(token => token.isActive)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.status(200).send(activeTokens);
    } catch (error) {
        console.error("Error fetching doctor access tokens:", error);
        res.status(500).send({ error: 'Failed to fetch doctor access tokens.', details: (error as Error).message });
    }
});

// POST /patient/createDoctorAccessToken
// Creates a time-bound access token for a doctor
router.post('/createDoctorAccessToken', authenticatePatient, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).send({ error: 'User not authenticated.' });
    }
    const { allowedReports } = req.body;

    if (!Array.isArray(allowedReports) || allowedReports.length === 0) {
      return res.status(400).send({ error: 'At least one report must be selected to create an access token.' });
    }

    // Verify that the selected reports belong to this user
    const reportsSnapshot = await db.collection('reports')
      .where('id', 'in', allowedReports)
      .where('userId', '==', req.userId)
      .get();

    if (reportsSnapshot.docs.length !== allowedReports.length) {
      return res.status(403).send({ error: 'One or more selected reports do not belong to the authenticated user.' });
    }


    const tokenId = uuidv4();
    const tokenValue = uuidv4(); // The actual token doctors will use
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

    const newToken: DoctorAccessToken = {
      id: tokenId,
      userId: req.userId,
      token: tokenValue,
      expiresAt: expiresAt,
      isActive: true,
      createdAt: new Date().toISOString(),
      allowedReports: allowedReports,
    };

    await db.collection('users').doc(req.userId).update({
      [`doctorAccessTokens.${tokenId}`]: newToken,
    });

    res.status(201).send({ message: 'Doctor access token created.', token: newToken });
  } catch (error) {
    console.error("Error creating doctor access token:", error);
    res.status(500).send({ error: 'Failed to create token.', details: (error as Error).message });
  }
});

// POST /patient/revokeDoctorAccessToken
// Revokes an existing doctor access token
router.post('/revokeDoctorAccessToken', authenticatePatient, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).send({ error: 'User not authenticated.' });
    }
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).send({ error: 'Token ID is required.' });
    }

    const userDocRef = db.collection('users').doc(req.userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
        return res.status(404).send({ error: 'User profile not found.' });
    }

    const userProfile = userDoc.data() as UserProfile;
    if (!userProfile.doctorAccessTokens?.[tokenId]) {
        return res.status(404).send({ error: 'Token not found or does not belong to this user.' });
    }

    // Update the token's isActive status to false
    await userDocRef.update({
        [`doctorAccessTokens.${tokenId}.isActive`]: false,
    });

    res.status(200).send({ message: 'Doctor access token revoked.' });
  } catch (error) {
    console.error("Error revoking doctor access token:", error);
    res.status(500).send({ error: 'Failed to revoke token.', details: (error as Error).message });
  }
});

// POST /patient/chat
// Handles AI chatbot interactions
router.post('/chat', authenticatePatient, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).send({ error: 'User not authenticated.' });
    }
    const { message, reportContext } = req.body; // reportContext is optional

    if (!message) {
      return res.status(400).send({ error: 'Chat message is required.' });
    }

    const aiResponse = await getChatResponse(message, reportContext);
    res.status(200).send({ response: aiResponse });
  } catch (error) {
    console.error("Error in chatbot endpoint:", error);
    res.status(500).send({ error: 'Failed to get AI response.', details: (error as Error).message });
  }
});


export default router;