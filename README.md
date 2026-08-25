# ReServe - Food Waste Reduction Platform

## Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/adityakp15/ReServe.git
cd ReServe
```

### 2. Backend Setup (Optional - only if working on backend)

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ReServe?appName=ClusterName
JWT_SECRET=generate_with_command_below
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
PORT=5001
NODE_ENV=development
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Get from your team:**
- `MONGO_URI` - MongoDB connection string (database is already hosted)
- `GOOGLE_CLIENT_ID` - Only needed if testing authentication features. Get from your team if needed.

**Start backend:**
```bash
npm start
```

### 3. Frontend Setup (Required)

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
VITE_API_URL=http://localhost:5001
```

**Get from your team:**
- `VITE_API_URL` - Backend URL (use `http://localhost:5001` if running backend locally, or your team's shared backend URL)
- `VITE_GOOGLE_CLIENT_ID` - Only needed if testing login/signup features. Get from your team if needed.

**Start frontend:**
```bash
npm run dev
```

### 4. Access Application

Open http://localhost:5173 in your browser

## Running the Project

**If running both backend and frontend:**
- Terminal 1: `cd backend && npm start`
- Terminal 2: `cd frontend && npm run dev`

**If using shared backend (frontend only):**
- Terminal: `cd frontend && npm run dev`

## Troubleshooting

**Backend won't start:**
- Check all variables in `backend/.env` are set
- Verify MongoDB connection string is correct
- Port 5001 might be in use - change `PORT` in `.env`

**Frontend won't start:**
- Check all variables in `frontend/.env` are set
- Restart dev server after changing `.env` files

**"Failed to fetch" error:**
- Verify backend is running (if using local backend)
- Check `VITE_API_URL` matches your backend URL
- Restart both servers

**Google Sign-In not working:**
- Only needed if testing login/signup features
- Verify `GOOGLE_CLIENT_ID` is set in both `.env` files
- Use the same Client ID in frontend and backend
- Restart both servers after updating `.env` files
