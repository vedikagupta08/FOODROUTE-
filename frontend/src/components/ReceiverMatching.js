import { useState, useEffect } from 'react';
import api from '../config/api';
import { MapPin, Users, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Receiver Matching Component
 * Shows matching receivers for a food listing and allows assignment
 */
const ReceiverMatching = ({ foodListingId, onAssign }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (foodListingId) {
      fetchMatches();
    }
  }, [foodListingId]);

  const fetchMatches = async () => {
    try {
      const response = await api.get(`/receivers/match/${foodListingId}`);
      setMatches(response.data.matches || []);
    } catch (error) {
      toast.error('Failed to find matching receivers');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (receiverId) => {
    try {
      await api.post('/receivers/assign', {
        foodListingId,
        receiverId
      });
      toast.success('Receiver assigned successfully!');
      if (onAssign) {
        onAssign();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign receiver');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="p-8 text-center text-gray-600">
        <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>No matching receivers found nearby.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Top {matches.length} Matching Receivers
      </h3>
      {matches.map((match, index) => (
        <div
          key={match.receiverId}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                  #{index + 1}
                </span>
                <h4 className="font-semibold text-gray-900">{match.receiverName}</h4>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>{match.location.address || `${match.location.latitude}, ${match.location.longitude}`}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span>Distance: <strong>{match.distanceKm} km</strong></span>
                  <span>Capacity: <strong>{match.capacity} meals</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleAssign(match.receiverId)}
              className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Assign</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReceiverMatching;
