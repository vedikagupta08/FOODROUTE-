import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import FoodPostForm from '../components/FoodPostForm';
import FoodListingsList from '../components/FoodListingsList';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Donor Dashboard
 * Allows donors to post surplus food and view their listings
 */
const DonorDashboard = () => {
  const { userProfile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [foodListings, setFoodListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFoodListings();
  }, []);

  const fetchFoodListings = async () => {
    try {
      const response = await api.get('/food');
      setFoodListings(response.data.foodListings.filter(
        listing => listing.donorId._id === userProfile?._id && 
        !['delivered', 'expired'].includes(listing.status)
      ));
    } catch (error) {
      toast.error('Failed to fetch food listings');
    } finally {
      setLoading(false);
    }
  };

  const handleFoodPosted = () => {
    setShowForm(false);
    setEditingListing(null);
    fetchFoodListings();
    toast.success('Food listing created successfully!');
  };

  const handleEdit = (listing) => {
    setEditingListing(listing);
    setShowForm(true);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Donor Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your surplus food listings</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>{showForm ? 'Cancel' : 'Post Surplus Food'}</span>
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <FoodPostForm 
            onSuccess={handleFoodPosted} 
            editingListing={editingListing}
          />
        </div>
      )}

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Food Listings</h2>
        {foodListings.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-600">No food listings yet. Post your first surplus food!</p>
          </div>
        ) : (
          <FoodListingsList 
            listings={foodListings}
            showActions={true}
            onEdit={handleEdit}
            userRole={userProfile?.role}
            currentUser={userProfile}
          />
        )}
      </div>
    </div>
  );
};

export default DonorDashboard;
