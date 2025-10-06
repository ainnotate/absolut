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
  Analytics,
  Settings
} from '@mui/icons-material';
import { authService } from '../services/authService';
import UserManagement from '../components/UserManagement';

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
              <Typography variant="h6">User Management</Typography>
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
              <Analytics color="primary" sx={{ mr: 2 }} />
              <Typography variant="h6">Analytics</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              View platform usage statistics, user activity reports, and system performance metrics.
            </Typography>
            <Button 
              variant="outlined" 
              disabled
              fullWidth
            >
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Settings color="primary" sx={{ mr: 2 }} />
              <Typography variant="h6">System Settings</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure platform settings, security options, and system preferences.
            </Typography>
            <Button 
              variant="outlined" 
              disabled
              fullWidth
            >
              Coming Soon
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
              label="User Management" 
              iconPosition="start"
              id="admin-tab-1"
              aria-controls="admin-tabpanel-1"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <DashboardOverview />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <UserManagement />
        </TabPanel>
      </Container>
    </Box>
  );
};

export default AdminPanel;