import { useState } from 'react';
import api from '../config/api';
import toast from 'react-hot-toast';
import { Clock, MapPin, Package, CheckCircle, XCircle, Edit, Trash2, Check } from 'lucide-react';

/**
 * Food Listings List Component
 * Displays a list of food listings with status indicators
 */
const FoodListingsList = ({ 
  listings, 
  showActions = false, 
  onAccept, 
  onPickedUp, // Add picked up callback prop
  onDelivered, // Add delivered callback prop
  userRole = null, // Add user role prop
  onEdit = null, // Add edit callback prop
  currentUser = null // Add current user prop
}) => {
  const [deletingId, setDeletingId] = useState(null);

  // Status formatter for user-friendly display
  const formatStatus = (status) => {
    switch (status) {
      case "available":
        return "Available";
      case "assigned":
        return "Receiver Assigned";
      case "assigned_to_volunteer":
        return "Pickup in Progress";
      case "picked_up":
        return "Out for Delivery";
      case "delivered":
        return "Delivered";
      case "expired":
        return "Expired";
      default:
        return status;
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-blue-600" />;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) {
      return;
    }

    setDeletingId(id);
    try {
      await api.delete(`/food/${id}`);
      toast.success('Food listing deleted');
      window.location.reload();
    } catch (error) {
      toast.error('Failed to delete listing');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (listing) => {
    if (onEdit) {
      onEdit(listing);
    }
  };

  const handlePickedUp = async (id) => {
    if (onPickedUp) {
      onPickedUp(id);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((listing) => (
        <div
          key={listing._id}
          className="food-card overflow-hidden hover:shadow-lg transition-shadow fade-in"
        >
          {listing.imageUrl && (
            <img
              src={listing.imageUrl.startsWith('http') ? listing.imageUrl : `${process.env.REACT_APP_API_URL}${listing.imageUrl}`}
              alt={listing.foodName}
              className="w-full h-48 object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div className="p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{listing.foodName}</h3>
              {getStatusIcon(listing.status)}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Package className="h-4 w-4 mr-2" />
                <span>{listing.quantity} meals</span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-2" />
                <span className="truncate">
                  {listing.location?.address || `${listing.location?.latitude}, ${listing.location?.longitude}`}
                </span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span>{new Date(listing.timeCooked).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(listing.urgency)}`}>
                {listing.urgency.toUpperCase()} URGENCY
              </span>
              <span className="text-xs text-gray-500 capitalize">{formatStatus(listing.status)}</span>
            </div>

            {listing.assignedReceiverId && (
              <div className="mb-4 p-2 card rounded text-sm">
                <span className="text-blue-800 font-medium">Assigned to: </span>
                <span className="text-blue-600">{listing.assignedReceiverId.name}</span>
              </div>
            )}

            {listing.assignedVolunteerId && (
              <div className="mb-4 p-2 card rounded text-sm">
                <span className="text-green-800 font-medium">Volunteer: </span>
                <span className="text-green-600">{listing.assignedVolunteerId.name}</span>
              </div>
            )}

            {showActions && (
              <div className="flex space-x-2 mt-2">
                {/* Receiver Actions - Can accept available food */}
                {userRole === 'receiver' && listing.status === 'available' && (
                  <button
                    onClick={() => onAccept && onAccept(listing._id)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Accept
                  </button>
                )}
                
                {/* Receiver Actions - Can mark assigned food as picked up */}
                {userRole === 'receiver' && listing.assignedReceiverId && listing.assignedReceiverId.toString() === currentUser?._id && listing.status === 'assigned' && (
                  <button
                    onClick={() => handlePickedUp(listing._id)}
                    className="btn-primary flex-1 px-4 py-2 flex items-center justify-center"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Picked Up
                  </button>
                )}
                
                {/* Volunteer Actions - Can accept pickup requests */}
                {userRole === 'volunteer' && listing.status === 'assigned' && (
                  <button
                    onClick={() => onAccept && onAccept(listing._id)}
                    className="btn-primary flex-1 px-4 py-2 flex items-center justify-center"
                  >
                    Accept Pickup
                  </button>
                )}
                
                {/* Volunteer Actions - Can mark assigned pickups as picked up */}
                {userRole === 'volunteer' && listing.assignedVolunteerId?._id === currentUser?._id && listing.status === 'assigned_to_volunteer' && (
                  <button
                    onClick={() => handlePickedUp(listing._id)}
                    className="btn-primary flex-1 px-4 py-2 flex items-center justify-center"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Picked Up
                  </button>
                )}
                
                {/* Volunteer Actions - Can mark picked up items as delivered */}
                {userRole === 'volunteer' && listing.assignedVolunteerId?._id === currentUser?._id && listing.status === 'picked_up' && (
                  <button
                    onClick={() => onDelivered && onDelivered(listing._id)}
                    className="btn-primary flex-1 px-4 py-2 flex items-center justify-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Delivered
                  </button>
                )}
                
                {/* Donor Actions - Can edit and delete their own listings */}
                {userRole === 'donor' && currentUser && listing.donorId?._id === currentUser._id && (
                  <>
                    {/* Edit button - only when available */}
                    {listing.status === 'available' && (
                      <button
                        onClick={() => handleEdit(listing)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </button>
                    )}
                    
                    {/* Delete button - only when available */}
                    {listing.status === 'available' && (
                      <button
                        onClick={() => handleDelete(listing._id)}
                        disabled={deletingId === listing._id}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingId === listing._id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                    
                    {/* Cancel button - only when assigned but not yet picked up */}
                    {listing.status === 'assigned' && (
                      <button
                        onClick={() => handleDelete(listing._id)}
                        disabled={deletingId === listing._id}
                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingId === listing._id ? 'Cancelling...' : 'Cancel Request'}
                      </button>
                    )}
                    
                    {/* No actions when assigned to volunteer or beyond */}
                    {listing.status === 'assigned_to_volunteer' && (
                      <div className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-center text-sm">
                        Pickup in Progress
                      </div>
                    )}
                    
                    {listing.status === 'picked_up' && (
                      <div className="flex-1 px-4 py-2 bg-blue-200 text-blue-700 rounded-lg text-center text-sm">
                        Out for Delivery
                      </div>
                    )}
                    
                    {listing.status === 'delivered' && (
                      <div className="flex-1 px-4 py-2 bg-green-200 text-green-700 rounded-lg text-center text-sm">
                        Delivered
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FoodListingsList;
