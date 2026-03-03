# FoodRoute+ Frontend

React frontend application for the FoodRoute+ platform.

## Features

- React 18 with modern hooks
- Tailwind CSS for styling
- Firebase Authentication
- Mapbox GL for maps and routing
- Chart.js for analytics
- Socket.IO client for real-time updates
- Responsive design

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in your Firebase and API configuration.

## Running

Development mode:
```bash
npm start
```

Build for production:
```bash
npm run build
```

## Project Structure

- `src/components/` - Reusable React components
- `src/pages/` - Page components
- `src/context/` - React context providers (Auth)
- `src/config/` - Configuration files (Firebase, API)
- `src/services/` - Frontend services (Socket.IO)

## User Roles

- **Donor**: Can post surplus food listings
- **Receiver**: Can view and accept food listings
- **Volunteer**: Can accept delivery assignments
- **Admin**: Can view impact dashboard and all data
