# FoodRoute+ Backend

Express.js backend server for the FoodRoute+ platform.

## Features

- RESTful API endpoints
- MongoDB database integration
- Firebase Authentication
- Mapbox integration for distance calculations and routing
- Socket.IO for real-time updates
- Role-based access control

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in your configuration values.

## Running

Development mode (with nodemon):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Seeding Data

To populate the database with mock data:
```bash
node scripts/seedData.js
```

## API Documentation

See the main README.md for API endpoint documentation.
