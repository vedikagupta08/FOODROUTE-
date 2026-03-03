import { useCallback, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin } from 'lucide-react';

/* ---------- Auto Recenter Component ---------- */
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [lat, lng, map]);
  return null;
}

/* ---------- Click Marker Component ---------- */
function LocationMarker({ onLocationSelect }) {
  const [loc, setLoc] = useState(null);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setLoc({ lat, lng });
      onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    },
  });

  if (!loc) return null;

  return (
    <Marker position={[loc.lat, loc.lng]}>
      <Popup>
        <p>{loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}</p>
      </Popup>
    </Marker>
  );
}

/* ---------- Main Component ---------- */
export default function MapComponent({ onLocationSelect, initialLocation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
  const [isSearching, setIsSearching] = useState(false);

  /* ---------- Search Address ---------- */
  const searchAddress = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();

      setSearchResults(
        data.map(item => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)   // FIXED HERE
        }))
      );
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchAddress(searchQuery);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  /* ---------- Select Location ---------- */
  const handleLocationSelect = useCallback(
    (lat, lng, address = '') => {
      setSelectedLocation({ lat, lng, address });
      onLocationSelect?.(lat, lng);
      setSearchResults([]);
      setSearchQuery(address);
    },
    [onLocationSelect]
  );

  return (
    <div className="space-y-4">

      {/* Search Input */}
      <div className="relative">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search location..."
          className="w-full border p-2 rounded"
        />
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white border rounded shadow max-h-60 overflow-y-auto">
          {searchResults.map((result, index) => (
            <div
              key={index}
              onClick={() =>
                handleLocationSelect(result.lat, result.lng, result.display_name)
              }
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {result.display_name}
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="h-64 w-full rounded overflow-hidden border">
        <MapContainer
          center={[26.2183, 78.1828]} // Default Gwalior
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Recenter when location selected */}
          {selectedLocation && (
            <RecenterMap
              lat={selectedLocation.lat}
              lng={selectedLocation.lng}
            />
          )}

          {/* Selected Marker */}
          {selectedLocation && (
            <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
              <Popup>
                {selectedLocation.address}
              </Popup>
            </Marker>
          )}

          {/* Manual Click Marker */}
          <LocationMarker onLocationSelect={handleLocationSelect} />
        </MapContainer>
      </div>

      {/* Selected Info */}
      {selectedLocation && (
        <div className="bg-blue-50 p-3 rounded">
          <p className="font-medium">Selected Location:</p>
          <p>{selectedLocation.address}</p>
        </div>
      )}
    </div>
  );
}