import 'dotenv/config'; // Load environment variables first
import express from 'express';
import cors from 'cors';
import patientRoutes from './routes/patientRoutes';
import doctorRoutes from './routes/doctorRoutes';
import { initializeFirebaseAdmin } from './services/firebaseService';

// Initialize Firebase Admin SDK
initializeFirebaseAdmin();

const app = express();
const port = process.env.PORT || 8080;

// Configure CORS
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'; // Default to frontend dev URL
const corsOptions = {
  origin: frontendUrl,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json()); // For parsing application/json

// Routes
app.use('/patient', patientRoutes);
app.use('/doctor', doctorRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('UPHR-Vault Backend is running!');
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something broke!', details: err.message });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});