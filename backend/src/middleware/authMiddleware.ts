import { Response, NextFunction } from 'express';
import { auth } from '../services/firebaseService';
import { AuthRequest } from '../types';

export const authenticatePatient = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'No authentication token provided.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    req.userId = decodedToken.uid;
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(403).send({ error: 'Unauthorized: Invalid or expired token.' });
  }
};

export const authenticateDoctor = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { token } = req.params; // Expect token to be in URL params

  if (!token) {
    return res.status(401).send({ error: 'No doctor access token provided.' });
  }

  // Store the doctor token in the request for later use in route handlers
  req.params.doctorToken = token;
  next();
};
