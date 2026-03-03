# FoodRoute+ Setup Guide

This guide will help you set up the FoodRoute+ platform on your local machine.

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- Firebase account
- Mapbox account

## Step 1: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password authentication
4. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Copy the Firebase configuration values

5. For backend Firebase Admin:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file (you'll need the values for backend .env)

## Step 2: Mapbox Setup

1. Go to [Mapbox](https://www.mapbox.com/)
2. Sign up for a free account
3. Go to Account > Access tokens
4. Copy your default public token

## Step 3: MongoDB Setup

### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Connection string: `mongodb://localhost:27017/foodroute`

### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Replace `<password>` with your database password

## Step 4: Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your values:
```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
JWT_SECRET=your_random_secret_key
```

5. (Optional) Seed database with test data:
```bash
node scripts/seedData.js
```

6. Start the backend server:
```bash
npm run dev
```

The backend should now be running on `http://localhost:5000`

## Step 5: Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your Firebase and API values:
```
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
REACT_APP_MAPBOX_TOKEN=your_mapbox_access_token
REACT_APP_API_URL=http://localhost:5000
```

5. Start the frontend development server:
```bash
npm start
```

The frontend should now be running on `http://localhost:3000`

## Step 6: Test the Application

1. Open `http://localhost:3000` in your browser
2. Register a new account:
   - Choose a role (Donor, Receiver, or Volunteer)
   - Fill in the required information
   - For Receiver/Volunteer, provide location coordinates
3. Login with your credentials
4. Test the features based on your role:
   - **Donor**: Post surplus food listings
   - **Receiver**: View and accept food listings
   - **Volunteer**: Accept delivery assignments
   - **Admin**: View impact dashboard

## Troubleshooting

### Backend Issues

- **MongoDB Connection Error**: Ensure MongoDB is running and connection string is correct
- **Firebase Admin Error**: Check that your Firebase private key is properly formatted (with `\n` for newlines)
- **Port Already in Use**: Change PORT in `.env` to a different port

### Frontend Issues

- **Firebase Auth Error**: Verify all Firebase config values are correct
- **API Connection Error**: Ensure backend is running and `REACT_APP_API_URL` is correct
- **Mapbox Error**: Check that Mapbox token is valid and has proper permissions

### Common Issues

- **CORS Errors**: Backend CORS is configured to allow `http://localhost:3000` by default
- **Socket.IO Connection**: Ensure both frontend and backend are running
- **Environment Variables**: Make sure all `.env` files are created and properly formatted

## Project Structure

```
FoodRoute+/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── scripts/         # Utility scripts (seed data)
│   └── server.js        # Express server entry point
├── frontend/
│   ├── public/          # Static files
│   └── src/
│       ├── components/  # React components
│       ├── pages/       # Page components
│       ├── context/     # React context providers
│       ├── config/      # Configuration files
│       └── services/    # Frontend services
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Food Listings
- `GET /api/food` - Get all food listings
- `POST /api/food` - Create food listing
- `GET /api/food/:id` - Get specific listing
- `PUT /api/food/:id` - Update listing
- `DELETE /api/food/:id` - Delete listing

### Receivers
- `GET /api/receivers` - Get all receivers
- `GET /api/receivers/match/:foodListingId` - Find matching receivers
- `POST /api/receivers/assign` - Assign receiver to listing

### Volunteers
- `GET /api/volunteer/available` - Get available volunteers
- `GET /api/volunteer/nearby/:foodListingId` - Find nearby volunteers
- `POST /api/volunteer/accept` - Accept delivery assignment

### Deliveries
- `GET /api/delivery` - Get all deliveries
- `GET /api/delivery/:id` - Get specific delivery
- `GET /api/delivery/:id/route` - Get delivery route
- `PUT /api/delivery/:id/status` - Update delivery status

### Dashboard
- `GET /api/dashboard/stats` - Get platform statistics
- `GET /api/dashboard/charts` - Get chart data

## Next Steps

- Add image upload functionality for food listings
- Implement push notifications using Firebase Cloud Messaging
- Add email notifications
- Enhance map features with real-time tracking
- Add more analytics and reporting features
- Implement payment integration (if needed)
- Add unit and integration tests

## Deployment

### Backend (Render)
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set environment variables
4. Deploy

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables
3. Deploy

Make sure to update `REACT_APP_API_URL` to your production backend URL.

## Support

For issues or questions, please check the code comments or create an issue in the repository.
