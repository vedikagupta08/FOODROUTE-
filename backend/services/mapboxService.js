const axios = require('axios');

/**
 * Mapbox Service
 * Handles distance calculations and route optimization using Mapbox API
 */
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const MAPBOX_BASE_URL = 'https://api.mapbox.com';

/**
 * Calculate distance between two coordinates using Mapbox Matrix API
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {Promise<number>} Distance in meters
 */
const calculateDistance = async (lat1, lng1, lat2, lng2) => {
  try {
    const url = `${MAPBOX_BASE_URL}/directions/v5/mapbox/driving/${lng1},${lat1};${lng2},${lat2}`;
    const response = await axios.get(url, {
      params: {
        access_token: MAPBOX_ACCESS_TOKEN,
        geometries: 'geojson',
        overview: 'simplified'
      }
    });

    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return route.distance; // Distance in meters
    }
    
    // Fallback to Haversine formula if API fails
    return haversineDistance(lat1, lng1, lat2, lng2);
  } catch (error) {
    console.error('Mapbox API error:', error.message);
    // Fallback to Haversine formula
    return haversineDistance(lat1, lng1, lat2, lng2);
  }
};

/**
 * Haversine formula for calculating distance between two points
 * Fallback method when Mapbox API is unavailable
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in meters
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Get optimized route between pickup and drop locations
 * @param {number} pickupLat - Pickup latitude
 * @param {number} pickupLng - Pickup longitude
 * @param {number} dropLat - Drop latitude
 * @param {number} dropLng - Drop longitude
 * @returns {Promise<Object>} Route information with distance, duration, and geometry
 */
const getRoute = async (pickupLat, pickupLng, dropLat, dropLng) => {
  try {
    const url = `${MAPBOX_BASE_URL}/directions/v5/mapbox/driving/${pickupLng},${pickupLat};${dropLng},${dropLat}`;
    const response = await axios.get(url, {
      params: {
        access_token: MAPBOX_ACCESS_TOKEN,
        geometries: 'geojson',
        overview: 'full',
        steps: true
      }
    });

    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        distance: route.distance, // meters
        duration: route.duration, // seconds
        geometry: JSON.stringify(route.geometry) // GeoJSON string
      };
    }
    
    throw new Error('No route found');
  } catch (error) {
    console.error('Mapbox route API error:', error.message);
    // Fallback calculation
    const distance = haversineDistance(pickupLat, pickupLng, dropLat, dropLng);
    const duration = (distance / 1000) * 60; // Rough estimate: 1km per minute
    return {
      distance,
      duration,
      geometry: null
    };
  }
};

/**
 * Geocode an address to coordinates
 * @param {string} address - Address string
 * @returns {Promise<Object>} Coordinates {latitude, longitude}
 */
const geocodeAddress = async (address) => {
  try {
    const url = `${MAPBOX_BASE_URL}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`;
    const response = await axios.get(url, {
      params: {
        access_token: MAPBOX_ACCESS_TOKEN,
        limit: 1
      }
    });

    if (response.data.features && response.data.features.length > 0) {
      const [lng, lat] = response.data.features[0].center;
      return {
        latitude: lat,
        longitude: lng,
        address: response.data.features[0].place_name
      };
    }
    
    throw new Error('Address not found');
  } catch (error) {
    console.error('Geocoding error:', error.message);
    throw error;
  }
};

module.exports = {
  calculateDistance,
  getRoute,
  geocodeAddress,
  haversineDistance
};
