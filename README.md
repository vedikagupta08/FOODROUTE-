# FoodRoute+ — Surplus Food Redistribution Platform

A full-stack MVP web application that connects surplus food donors with the best nearby receivers and volunteers before food spoils.

## Tech Stack

- **Frontend**: React + Tailwind CSS + Mapbox
- **Backend**: Node.js + Express.js
- **Database**: MongoDB
- **Authentication**: Firebase Auth
- **Notifications**: Firebase
- **Charts**: Chart.js
- **Deployment**: Vercel (frontend) + Render (backend)

## Project Structure

```
FoodRoute+/
├── frontend/          # React application
├── backend/           # Express.js server
└── README.md
```

## Setup Instructions

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file with:
```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
JWT_SECRET=your_jwt_secret
```

4. Run server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file with:
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

4. Run frontend:
```bash
npm start
```

## Features

- ✅ Role-based authentication (Donor, Receiver, Volunteer, Admin)
- ✅ Surplus food posting with urgency calculation
- ✅ Receiver matching based on proximity and capacity
- ✅ Volunteer assignment system
- ✅ Route optimization with Mapbox
- ✅ Real-time delivery tracking
- ✅ Impact dashboard with analytics

## User Roles

- **Donor**: Can post surplus food listings
- **Receiver**: Can receive food donations
- **Volunteer**: Can accept delivery assignments
- **Admin**: Can view all data and manage system
