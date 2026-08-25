import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import listingRoutes from "./routes/listings.js";
import orderRoutes from "./routes/orders.js";
import { scheduleDailyCleanup } from "./jobs/cleanup.js";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
// CORS configuration - allow frontend URL in production, localhost in development
const allowedOrigins = [
  process.env.FRONTEND_URL, // Production frontend URL (set in Render env vars)
  'http://localhost:5173',  // Vite dev server
  'http://localhost:3000',  // Alternative dev port
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production') {
      // In development, be more permissive (allow localhost variations)
      callback(null, true);
    } else {
      // In production, reject unknown origins
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
    // Start daily cleanup job for expired listings
    scheduleDailyCleanup();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Routes
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Listing routes (sell)
app.use("/api/listings", listingRoutes);

// Order routes (buy/reservations)
app.use("/api/orders", orderRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Using port ${PORT}`);
});
