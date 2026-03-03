import { useState, useEffect } from 'react';
import api from '../config/api';
import toast from 'react-hot-toast';
import MapComponent from './mapcomponent';

const FoodPostForm = ({ onSuccess, editingListing }) => {
  const [formData, setFormData] = useState({
    foodName: '',
    quantity: '',
    timeCooked: '',
    latitude: '',
    longitude: '',
    address: '',
    packagingType: 'container',
    imageUrl: ''
  });

  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Populate form when editing
  useEffect(() => {
    if (editingListing) {
      setFormData({
        foodName: editingListing.foodName || '',
        quantity: editingListing.quantity || '',
        timeCooked: editingListing.timeCooked ? new Date(editingListing.timeCooked).toISOString().slice(0, 16) : '',
        latitude: editingListing.location?.latitude || '',
        longitude: editingListing.location?.longitude || '',
        address: editingListing.location?.address || '',
        packagingType: editingListing.packagingType || 'container',
        imageUrl: editingListing.imageUrl || ''
      });
      setImagePreview(editingListing.imageUrl || null);
    }
  }, [editingListing]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files allowed');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleLocationSelect = (lat, lng, address) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: address || prev.address
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();

      formDataToSend.append('foodName', formData.foodName);
      formDataToSend.append('quantity', Number(formData.quantity));
      formDataToSend.append('timeCooked', new Date(formData.timeCooked).toISOString());
      formDataToSend.append('location[latitude]', Number(formData.latitude));
      formDataToSend.append('location[longitude]', Number(formData.longitude));
      formDataToSend.append('packagingType', formData.packagingType);

      if (formData.address) {
        formDataToSend.append('location[address]', formData.address);
      }

      if (selectedImage) {
        formDataToSend.append('foodImage', selectedImage);
      }

      if (formData.imageUrl) {
        formDataToSend.append('imageUrl', formData.imageUrl);
      }

      let response;
      let successMessage;

      if (editingListing) {
        // Update existing listing
        response = await api.put(`/food/${editingListing._id}`, formDataToSend);
        successMessage = 'Food listing updated successfully!';
      } else {
        // Create new listing
        response = await api.post('/food', formDataToSend);
        successMessage = 'Food listing created successfully!';
      }

      const foodData = response.data.foodListing || response.data.food;

      toast.success(successMessage);

      // Call success callback
      if (onSuccess) {
        onSuccess(foodData);
      }

      // Reset form only if creating new listing
      if (!editingListing) {
        setFormData({
          foodName: '',
          quantity: '',
          timeCooked: '',
          latitude: '',
          longitude: '',
          address: '',
          packagingType: 'container',
          imageUrl: ''
        });
        setImagePreview(null);
        setSelectedImage(null);
      }

    } catch (error) {
      console.error('Submit error:', error);
      toast.error(editingListing ? 'Failed to update food listing' : 'Failed to create food listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container space-y-6 scale-in">
      <h3 className="text-xl font-semibold slide-up">
        {editingListing ? 'Edit Food Listing' : 'Post Surplus Food'}
      </h3>

      <input
        name="foodName"
        value={formData.foodName}
        onChange={handleChange}
        placeholder="Food Name"
        required
      />

      <input
        name="quantity"
        type="number"
        min="1"
        value={formData.quantity}
        onChange={handleChange}
        placeholder="Quantity"
        required
      />

      <input
        name="timeCooked"
        type="datetime-local"
        value={formData.timeCooked}
        onChange={handleChange}
        required
      />

      <input
        name="latitude"
        type="number"
        step="any"
        value={formData.latitude}
        onChange={handleChange}
        placeholder="Latitude"
        required
      />

      <input
        name="longitude"
        type="number"
        step="any"
        value={formData.longitude}
        onChange={handleChange}
        placeholder="Longitude"
        required
      />

      <input
        name="address"
        value={formData.address}
        onChange={handleChange}
        placeholder="Address"
      />

      <select
        name="packagingType"
        value={formData.packagingType}
        onChange={handleChange}
      >
        <option value="container">Container</option>
        <option value="tray">Tray</option>
        <option value="bag">Bag</option>
        <option value="box">Box</option>
        <option value="other">Other</option>
      </select>

      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
      />

      {imagePreview && (
        <img src={imagePreview} alt="Preview" width="100" />
      )}

      <MapComponent
        onLocationSelect={handleLocationSelect}
      />

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? (editingListing ? 'Updating...' : 'Posting...') : (editingListing ? 'Update Food' : 'Post Food')}
      </button>
    </form>
  );
};

export default FoodPostForm;