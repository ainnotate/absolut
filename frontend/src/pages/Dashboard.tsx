import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  AppBar,
  Toolbar,
  Avatar
} from '@mui/material';
import { authService } from '../services/authService';
import { User } from '../types';

const Dashboard: React.FC = () => {
  const user: User | null = authService.getUser();

  // Redirect users based on their roles
  React.useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        window.location.href = '/admin';
      } else if (user.role === 'upload_user') {
        window.location.href = '/upload';
      } else if (user.role === 'qc_user') {
        window.location.href = '/qc';
      } else if (user.role === 'supervisor') {
        window.location.href = '/supervisor';
      }
    }
  }, [user]);

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4">Access Denied</Typography>
        <Typography>Please log in to access the dashboard.</Typography>
      </Box>
    );
  }

  const handleLogout = () => {
    // Sign out from Google if available
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.disableAutoSelect();
      // Cancel any ongoing flows
      try {
        window.google.accounts.id.cancel();
      } catch (e) {
        // Ignore if no active flow
      }
    }
    
    authService.logout();
    
    // Clear any Google-related cookies/storage
    localStorage.removeItem('g_state');
    sessionStorage.clear();
    
    window.location.href = '/';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'supervisor': return 'warning';
      case 'qc_user': return 'info';
      case 'upload_user': return 'success';
      default: return 'default';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'supervisor': return 'Supervisor';
      case 'qc_user': return 'QC User';
      case 'upload_user': return 'Upload User';
      default: return role;
    }
  };

  const renderRoleSpecificContent = () => {
    switch (user.role) {
      case 'admin':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    User Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage user accounts, roles, and permissions across the platform.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    Manage Users
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Analytics
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View platform usage statistics and performance metrics.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Settings
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Configure platform settings and system preferences.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    Settings
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Data Export
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Export platform data and generate reports.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    Export Data
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      case 'supervisor':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Team Overview
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monitor team performance and assign tasks to team members.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    View Team
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quality Control Override
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review and override QC decisions when necessary.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }} onClick={() => window.location.href = '/supervisor'}>
                    QC Review
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance Reports
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generate and export team performance reports.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    Generate Reports
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Task Assignment
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Assign and manage tasks for team members.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    Assign Tasks
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      case 'qc_user':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Pending Reviews
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review uploaded files and approve or reject submissions.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }} onClick={() => window.location.href = '/qc'}>
                    Start Reviewing
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    My Reviews
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View your review history and track your progress.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    View History
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Review Guidelines
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Access quality control guidelines and best practices.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    View Guidelines
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance Stats
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View your review statistics and performance metrics.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    View Stats
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      case 'upload_user':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Upload Files
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload new files for quality control review.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }} onClick={() => window.location.href = '/upload'}>
                    Start Upload
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    My Uploads
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View your upload history and track review status.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    View Uploads
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Upload Guidelines
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Read upload guidelines and file format requirements.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    View Guidelines
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Upload Statistics
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View your upload statistics and approval rates.
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    View Stats
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      default:
        return (
          <Typography variant="body1">
            Welcome to the Absolute Booking Data Collection Platform! Your role configuration is being set up.
          </Typography>
        );
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Absolute Booking Data Collection Platform
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={user.profile_picture} sx={{ width: 32, height: 32 }}>
              {user.first_name?.[0] || user.username[0]}
            </Avatar>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Typography variant="body2">
                {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
              </Typography>
              <Chip 
                label={getRoleDisplayName(user.role)} 
                size="small" 
                color={getRoleColor(user.role)}
              />
            </Box>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {user.first_name || user.username}!
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          You are logged in as: {getRoleDisplayName(user.role)}
        </Typography>

        <Box sx={{ mt: 4 }}>
          {renderRoleSpecificContent()}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;