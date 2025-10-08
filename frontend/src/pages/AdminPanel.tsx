import React, { useState } from 'react';
import {
  Container,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Logout,
  People,
  Dashboard as DashboardIcon,
  TrackChanges,
  Assignment
} from '@mui/icons-material';
import { authService } from '../services/authService';
import UserManagement from '../components/UserManagement';
import AssetTracking from '../components/AssetTracking';
import BatchAssignment from '../components/BatchAssignment';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminPanel: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const currentUser = authService.getUser();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLogout = () => {
    // Sign out from Google if available
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.disableAutoSelect();
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

  const DashboardOverview = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Welcome to Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Welcome back, {currentUser?.first_name || currentUser?.username}! 
          Here you can manage all aspects of the Absolute Platform.
        </Typography>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <People color="primary" sx={{ mr: 2 }} />
              <Typography variant="h6">Users</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Manage user accounts, roles, and permissions. Create new users, edit existing ones, and control access levels.
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => setTabValue(1)}
              fullWidth
            >
              Manage Users
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrackChanges color="primary" sx={{ mr: 2 }} />
              <Typography variant="h6">Assets</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Track and monitor uploaded assets across all users. View asset status, metadata, and file relationships.
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => setTabValue(2)}
              fullWidth
            >
              Track Assets
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Assignment color="primary" sx={{ mr: 2 }} />
              <Typography variant="h6">Batch Assignment</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Assign QC users to specific batches based on locale and deliverable type. Monitor assignment progress.
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => setTabValue(3)}
              fullWidth
            >
              Manage Batches
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Platform Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Your Role:</strong> {currentUser?.role === 'admin' ? 'Administrator' : currentUser?.role}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Platform:</strong> Absolute - Multi-role Authentication System
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Account Type:</strong> {currentUser?.profile_picture ? 'Google Account' : 'Regular Account'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Access Level:</strong> Full Administrative Access
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Admin Dashboard - Absolute Platform
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {currentUser?.first_name || currentUser?.username} (Admin)
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<Logout />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
            <Tab 
              icon={<DashboardIcon />} 
              label="Dashboard" 
              iconPosition="start"
              id="admin-tab-0"
              aria-controls="admin-tabpanel-0"
            />
            <Tab 
              icon={<People />} 
              label="Users" 
              iconPosition="start"
              id="admin-tab-1"
              aria-controls="admin-tabpanel-1"
            />
            <Tab 
              icon={<TrackChanges />} 
              label="Assets" 
              iconPosition="start"
              id="admin-tab-2"
              aria-controls="admin-tabpanel-2"
            />
            <Tab 
              icon={<Assignment />} 
              label="Batch Assignment" 
              iconPosition="start"
              id="admin-tab-3"
              aria-controls="admin-tabpanel-3"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <DashboardOverview />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <UserManagement />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <AssetTracking />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <BatchAssignment />
        </TabPanel>
      </Container>
    </Box>
  );
};

export default AdminPanel;