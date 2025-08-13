import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Profile = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear messages when user starts typing
    setSuccess(null);
    setError(null);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.put('/api/auth/profile', {
        name: formData.name,
        email: formData.email
      });
      setSuccess('Profile updated successfully');
      setLoading(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.put('/api/auth/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      setSuccess('Password changed successfully');
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setLoading(false);
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.message || 'Failed to change password');
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Profile Settings
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'primary.main',
              fontSize: '2rem',
              mr: 2
            }}
          >
            {user?.name?.charAt(0) || 'U'}
          </Avatar>
          <Box>
            <Typography variant="h5">{user?.name}</Typography>
            <Typography variant="body1" color="text.secondary">
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'User'}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" gutterBottom>
          Personal Information
        </Typography>

        <Box component="form" onSubmit={handleProfileUpdate}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Update Profile'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Change Password
        </Typography>

        <Box component="form" onSubmit={handlePasswordChange}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Password"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="New Password"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Change Password'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default Profile;