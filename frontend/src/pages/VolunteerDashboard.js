import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import FoodListingsList from '../components/FoodListingsList';
import { MapPin, CheckCircle, Package, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Volunteer Dashboard
 * Shows pickup requests and allows volunteers to accept and manage deliveries
 */
const VolunteerDashboard = () => {
  const { userProfile } = useAuth();
  const [availableRequests, setAvailableRequests] = useState([]);
  const [assignedPickups, setAssignedPickups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPickupRequests();
  }, []);

  const fetchPickupRequests = async () => {
    try {
      // Fetch available pickup requests (assigned by receivers)
      const availableResponse = await api.get('/food?status=assigned');
      setAvailableRequests(availableResponse.data.foodListings);

      // Fetch assigned pickups (assigned to this volunteer)
      const assignedResponse = await api.get('/food?status=assigned_to_volunteer');
      const myAssigned = assignedResponse.data.foodListings.filter(
        listing => listing.assignedVolunteerId?._id === userProfile?._id
      );
      setAssignedPickups(myAssigned);

      // Also fetch picked up items to show "Out for Delivery"
      const pickedUpResponse = await api.get('/food?status=picked_up');
      const myPickedUp = pickedUpResponse.data.foodListings.filter(
        listing => listing.assignedVolunteerId && listing.assignedVolunteerId.toString() === userProfile?._id
      );
      // Combine assigned and picked up items
      setAssignedPickups([...myAssigned, ...myPickedUp]);
    } catch (error) {
      toast.error('Failed to fetch pickup requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPickup = async (foodId) => {
    try {
      await api.put(`/food/${foodId}`, {
        status: "assigned_to_volunteer"
      });

      toast.success("Pickup accepted successfully!");
      fetchPickupRequests(); // refresh list
    } catch (error) {
      toast.error("Failed to accept pickup");
    }
  };

  const handleMarkPickedUp = async (foodId) => {
    try {
      await api.put(`/food/${foodId}`, {
        status: "picked_up"
      });

      toast.success("Food marked as picked up from donor!");
      fetchPickupRequests(); // refresh list
    } catch (error) {
      toast.error("Failed to mark as picked up");
    }
  };

  const handleMarkDelivered = async (foodId) => {
    try {
      await api.put(`/food/${foodId}`, {
        status: "delivered"
      });

      toast.success("Food marked as delivered to receiver!");
      fetchPickupRequests(); // refresh list
    } catch (error) {
      toast.error("Failed to mark as delivered");
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
        <h1 className="text-3xl font-bold text-gray-900">Volunteer Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage food pickup requests and deliveries</p>
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

      {/* Available Pickup Requests */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Available Pickup Requests</h2>
        {availableRequests.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-600">No available pickup requests found.</p>
          </div>
        ) : (
          <FoodListingsList 
            listings={availableRequests} 
            showActions={true}
            userRole="volunteer"
            currentUser={userProfile}
            onAccept={handleAcceptPickup}
          />
        )}
      </div>

      {/* My Assigned Pickups */}
      {assignedPickups.length > 0 ? (
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">My Assigned Pickups</h2>
          <FoodListingsList 
            listings={assignedPickups} 
            showActions={true}
            userRole="volunteer"
            currentUser={userProfile}
            onPickedUp={handleMarkPickedUp}
            onDelivered={handleMarkDelivered}
          />
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-gray-600">No assigned pickups found.</p>
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;
