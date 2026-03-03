import { useState, useEffect, useCallback } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl';
import api from '../config/api';
import { MapPin, Navigation, Package, Clock } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

/**
 * Enhanced Delivery Map Component
 * Displays route between pickup and drop locations with real-time tracking
 */
const DeliveryMap = ({ delivery }) => {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [volunteerLocation, setVolunteerLocation] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState(delivery?.status || 'pending');
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(false);
  const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

  const fetchRoute = useCallback(async () => {
    try {
      const response = await api.get(`/delivery/${delivery._id}/route`);
      setRoute(response.data.route);
      
      // Set estimated arrival from route data
      if (response.data.route?.duration) {
        const eta = new Date(Date.now() + response.data.route.duration * 1000);
        setEstimatedArrival(eta);
      }
    } catch (error) {
      console.error('Failed to fetch route:', error);
    } finally {
      setLoading(false);
    }
  }, [delivery._id]);

  const fetchVolunteerLocation = useCallback(async () => {
    try {
      const response = await api.get(`/delivery/${delivery._id}/volunteer-location`);
      if (response.data.location) {
        setVolunteerLocation(response.data.location);
      }
    } catch (error) {
      console.error('Failed to fetch volunteer location:', error);
    }
  }, [delivery._id]);

  // Initialize real-time tracking
  useEffect(() => {
    if (delivery?._id && (deliveryStatus === 'picked' || deliveryStatus === 'in_transit')) {
      setRealTimeUpdates(true);
      
      // Fetch initial data
      fetchRoute();
      fetchVolunteerLocation();
      
      // Set up real-time updates (poll every 10 seconds)
      const interval = setInterval(() => {
        fetchVolunteerLocation();
      }, 10000);
      
      return () => clearInterval(interval);
    } else {
      setRealTimeUpdates(false);
      fetchRoute();
    }
  }, [delivery?._id, deliveryStatus, fetchRoute, fetchVolunteerLocation]);

  if (!delivery || !delivery.pickupLocation || !delivery.dropLocation) {
    return <div className="p-4 text-gray-600">No location data available</div>;
  }

  const pickupCoords = [delivery.pickupLocation.longitude, delivery.pickupLocation.latitude];
  const dropCoords = [delivery.dropLocation.longitude, delivery.dropLocation.latitude];

  // Calculate center point for map view
  const centerLat = (delivery.pickupLocation.latitude + delivery.dropLocation.latitude) / 2;
  const centerLng = (delivery.pickupLocation.longitude + delivery.dropLocation.longitude) / 2;

  // Parse route geometry if available
  let routeGeometry = null;
  if (route?.geometry) {
    try {
      routeGeometry = typeof route.geometry === 'string' 
        ? JSON.parse(route.geometry) 
        : route.geometry;
    } catch (e) {
      console.error('Failed to parse route geometry:', e);
    }
  }

  const routeLayer = {
    id: 'route',
    type: 'line',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#22c55e',
      'line-width': 4
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'picked': return 'bg-blue-500';
      case 'in_transit': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <Map
          initialViewState={{
            longitude: centerLng,
            latitude: centerLat,
            zoom: 12
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
        >
          {/* Pickup Marker */}
          <Marker longitude={pickupCoords[0]} latitude={pickupCoords[1]}>
            <div className="bg-green-600 text-white p-2 rounded-full shadow-lg">
              <Package className="h-5 w-5" />
            </div>
          </Marker>

          {/* Drop Marker */}
          <Marker longitude={dropCoords[0]} latitude={dropCoords[1]}>
            <div className="bg-red-600 text-white p-2 rounded-full shadow-lg">
              <MapPin className="h-5 w-5" />
            </div>
          </Marker>

          {/* Real-time Volunteer Location */}
          {volunteerLocation && realTimeUpdates && (
            <Marker 
              longitude={volunteerLocation.longitude} 
              latitude={volunteerLocation.latitude}
            >
              <div className="relative">
                <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg animate-pulse">
                  <Navigation className="h-5 w-5" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
              </div>
            </Marker>
          )}

          {/* Route Line */}
          {routeGeometry && (
            <Source id="route" type="geojson" data={routeGeometry}>
              <Layer {...routeLayer} />
            </Source>
          )}
        </Map>
      )}

      {/* Delivery Status Bar */}
      <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(deliveryStatus)}`}></div>
            <span className="text-sm font-semibold capitalize">
              {deliveryStatus.replace('_', ' ')}
            </span>
          </div>
          {realTimeUpdates && (
            <div className="flex items-center text-xs text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full mr-1 animate-pulse"></div>
              Live Tracking
            </div>
          )}
        </div>
      </div>

      {/* Route Information */}
      {route && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Distance: </span>
              <span className="font-semibold">
                {route.distance ? `${(route.distance / 1000).toFixed(2)} km` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Duration: </span>
              <span className="font-semibold">
                {route.duration ? `${Math.round(route.duration / 60)} min` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">ETA: </span>
              <span className="font-semibold">
                {estimatedArrival ? estimatedArrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
              </span>
            </div>
          </div>
          
          {realTimeUpdates && volunteerLocation && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center text-xs text-gray-600">
                <Clock className="h-3 w-3 mr-1" />
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryMap;
