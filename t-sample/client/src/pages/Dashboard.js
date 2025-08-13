import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(3),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}));

const StatNumber = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(1),
}));

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    averageHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch dashboard statistics
        const response = await axios.get('/api/dashboard/stats', {
          params: { date: today }
        });
        
        setStats(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Today's Attendance Overview
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Item>
            <StatNumber>{stats.totalEmployees}</StatNumber>
            <Typography variant="h6">Total Employees</Typography>
          </Item>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Item sx={{ bgcolor: '#e3f2fd' }}>
            <StatNumber>{stats.presentToday}</StatNumber>
            <Typography variant="h6">Present Today</Typography>
          </Item>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Item sx={{ bgcolor: '#ffebee' }}>
            <StatNumber>{stats.absentToday}</StatNumber>
            <Typography variant="h6">Absent Today</Typography>
          </Item>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Item sx={{ bgcolor: '#fff8e1' }}>
            <StatNumber>{stats.lateToday}</StatNumber>
            <Typography variant="h6">Late Today</Typography>
          </Item>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Item>
            <Typography variant="h6" gutterBottom>Average Working Hours</Typography>
            <StatNumber>{stats.averageHours.toFixed(1)}</StatNumber>
            <Typography>hours per employee today</Typography>
          </Item>
        </Grid>
        <Grid item xs={12} md={6}>
          <Item>
            <Typography variant="h6" gutterBottom>Attendance Rate</Typography>
            <StatNumber>
              {stats.totalEmployees > 0
                ? ((stats.presentToday / stats.totalEmployees) * 100).toFixed(1)
                : 0}%
            </StatNumber>
            <Typography>of employees present today</Typography>
          </Item>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;