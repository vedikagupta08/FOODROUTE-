import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import FoodListingsList from '../components/FoodListingsList';
import { MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Receiver Dashboard
 * Shows available food listings and allows receivers to accept assignments
 */
const ReceiverDashboard = () => {
  const { userProfile } = useAuth();
  const [availableListings, setAvailableListings] = useState([]);
  const [assignedListings, setAssignedListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, [userProfile, setAvailableListings, setAssignedListings, setLoading]);

  const fetchListings = async () => {
    try {
      const response = await api.get('/food?status=available');
      setAvailableListings(response.data.foodListings);

      const assignedResponse = await api.get('/food?status=assigned');
      const myAssigned = assignedResponse.data.foodListings.filter(
        listing => listing.assignedReceiverId && listing.assignedReceiverId.toString() === userProfile?._id
      );
      setAssignedListings(myAssigned);

      // Also fetch picked up items to show "Out for Delivery"
      const pickedUpResponse = await api.get('/food?status=picked_up');
      const myPickedUp = pickedUpResponse.data.foodListings.filter(
        listing => listing.assignedReceiverId && listing.assignedReceiverId.toString() === userProfile?._id
      );
      // Combine assigned and picked up items
      setAssignedListings([...myAssigned, ...myPickedUp]);
    } catch (error) {
      toast.error('Failed to fetch food listings');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchReceivers = async (foodListingId) => {
    try {
      const response = await api.get(`/receivers/match/${foodListingId}`);
      if (response.data.matches.length > 0) {
        toast.success(`Found ${response.data.matches.length} matching receivers`);
        // In a real app, you'd show a modal with matches
        console.log('Matching receivers:', response.data.matches);
      } else {
        toast.info('No matching receivers found');
      }
    } catch (error) {
      toast.error('Failed to find matching receivers');
    }
  };

  const handleAcceptAssignment = async (foodId) => {
  try {
    await api.put(`/food/${foodId}`, {
      assignedReceiverId: userProfile._id,
      status: "assigned"
    });

    toast.success("Food accepted successfully!");
    fetchListings(); // refresh list
  } catch (error) {
    toast.error("Failed to accept food");
  }
};

const handlePickedUp = async (foodId) => {
  try {
    await api.put(`/food/${foodId}`, {
      status: "picked_up"
    });

    toast.success("Food marked as picked up!");
    fetchListings(); // refresh list
  } catch (error) {
    toast.error("Failed to mark as picked up");
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Receiver Dashboard</h1>
        <p className="text-gray-600 mt-2">Find and accept food donations</p>
      </div>

      {userProfile?.location && (
        <div className="card p-6">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            <div>
              <p className="font-medium text-gray-900">Your Location</p>
              <p className="text-sm text-gray-600">
                {userProfile.location.address || `${userProfile.location.latitude}, ${userProfile.location.longitude}`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Available Food Listings</h2>
        {availableListings.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-600">No available food listings found.</p>
          </div>
        ) : (
          <FoodListingsList 
            listings={availableListings} 
            showActions={true}
            onAccept={handleAcceptAssignment}
            onPickedUp={handlePickedUp}
            userRole={userProfile?.role}
            currentUser={userProfile}
          />
        )}
      </div>

      {assignedListings.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Assigned Listings</h2>
          <FoodListingsList 
            listings={assignedListings} 
            showActions={true}
            userRole="receiver"
            currentUser={userProfile}
            onAccept={handleAcceptAssignment}
            onPickedUp={handlePickedUp}
          />
        </div>
      )}
    </div>
  );
};

export default ReceiverDashboard;
