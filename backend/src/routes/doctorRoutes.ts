import express from 'express';
import { db } from '../services/firebaseService';
import { DoctorAccessToken, Report, UserProfile } from '../types';
import { authenticateDoctor } from '../middleware/authMiddleware';

const router = express.Router();

// GET /doctor/timeline/:token
// Retrieves the full medical timeline for a patient given a valid doctor access token
router.get('/timeline/:token', authenticateDoctor, async (req, res) => {
  try {
    const doctorTokenValue = req.params.token; // From authenticateDoctor middleware

    // Find the user who owns this token (or if token exists directly in a collection)
    // For this prototype, we'll iterate through users to find the token.
    // In a real app, tokens could be in their own collection for direct lookup.
    const usersSnapshot = await db.collection('users').get();
    let foundToken: DoctorAccessToken | undefined;
    let patientUserId: string | undefined;

    for (const doc of usersSnapshot.docs) {
      const userProfile = doc.data() as UserProfile;
      if (userProfile.doctorAccessTokens) {
        for (const tokenId in userProfile.doctorAccessTokens) {
          if (userProfile.doctorAccessTokens[tokenId].token === doctorTokenValue) {
            foundToken = userProfile.doctorAccessTokens[tokenId];
            patientUserId = doc.id;
            break;
          }
        }
      }
      if (foundToken) break;
    }

    if (!foundToken || !patientUserId) {
      return res.status(404).send({ error: 'Invalid or expired doctor access token.' });
    }

    // Check if the token is active and not expired
    const now = new Date();
    const expiresAt = new Date(foundToken.expiresAt);

    if (!foundToken.isActive || expiresAt < now) {
      return res.status(403).send({ error: 'Doctor access token is inactive or expired.' });
    }

    // Fetch reports allowed by this token
    const reportsSnapshot = await db.collection('reports')
      .where('userId', '==', patientUserId)
      .where('id', 'in', foundToken.allowedReports)
      .orderBy('timestamp', 'desc')
      .get();

    const reports = reportsSnapshot.docs.map(doc => doc.data() as Report);

    // Filter reports based on 'allowedReports' in the token (already done by .where('id', 'in', ...))
    res.status(200).send(reports);
  } catch (error) {
    console.error("Error in doctor timeline access:", error);
    res.status(500).send({ error: 'Failed to retrieve patient timeline.', details: (error as Error).message });
  }
});

export default router;
