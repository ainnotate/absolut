import React, { useState, useEffect } from 'react';
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
  Grid,
  TextField,
  InputAdornment,
  LinearProgress,
  Paper,
  CircularProgress,
  Alert,
  MenuItem
} from '@mui/material';
import {
  Logout,
  People,
  Dashboard as DashboardIcon,
  TrackChanges,
  Assignment,
  GetApp,
  RestartAlt,
  Search,
  AdminPanelSettings,
  PersonOutline,
  Group,
  CheckCircle
} from '@mui/icons-material';
import { authService } from '../services/authService';
import UserManagement from '../components/UserManagement';
import AssetTracking from '../components/AssetTracking';
import BatchAssignment from '../components/BatchAssignment';
import DataExport from '../components/DataExport';

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

interface DashboardStats {
  totalUsers: number;
  adminUsers: number;
  normalUsers: number;
  activeUsers: number;
}

interface LocaleProgress {
  locale: string;
  completed: number;
  total: number;
}

interface ResetFormData {
  currentUser: string;
  locale: string;
  bookingCategory: string;
  newUser: string;
}

interface User {
  id: number;
  username: string;
  role: string;
}

const AdminPanel: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [localeProgress, setLocaleProgress] = useState<LocaleProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState({ completed: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [searchLocale, setSearchLocale] = useState('');
  const [resetForm, setResetForm] = useState<ResetFormData>({
    currentUser: '',
    locale: '',
    bookingCategory: '',
    newUser: ''
  });
  const [qcUsers, setQcUsers] = useState<User[]>([]);
  const [availableLocales, setAvailableLocales] = useState<string[]>([]);
  const [availableBookingCategories, setAvailableBookingCategories] = useState<string[]>([]);
  const [resetLoading, setResetLoading] = useState(false);
  const currentUser = authService.getUser();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (tabValue === 0) {
      fetchDashboardData();
    } else if (tabValue === 5) {
      fetchResetFormData();
    }
  }, [tabValue]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = authService.getToken();
      
      // Fetch user statistics
      const userResponse = await fetch('http://localhost:5003/api/users/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userData = await userResponse.json();
      
      if (userData.users) {
        const stats: DashboardStats = {
          totalUsers: userData.users.length,
          adminUsers: userData.users.filter((user: any) => user.role === 'admin').length,
          normalUsers: userData.users.filter((user: any) => user.role !== 'admin').length,
          activeUsers: userData.users.filter((user: any) => user.is_active).length
        };
        setDashboardStats(stats);
      }

      // Fetch asset progress by locale
      const assetResponse = await fetch('http://localhost:5003/api/assets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const assetData = await assetResponse.json();
      
      if (assetData.assets) {
        const localeMap = new Map<string, { completed: number; total: number }>();
        let totalCompleted = 0;
        let totalAssets = 0;
        
        assetData.assets.forEach((asset: any) => {
          if (asset.metadata) {
            try {
              const metadata = typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata;
              const locale = metadata.locale;
              
              // Only include assets with valid locale data
              if (locale && locale !== 'Unknown' && locale.trim() !== '') {
                if (!localeMap.has(locale)) {
                  localeMap.set(locale, { completed: 0, total: 0 });
                }
                
                const localeData = localeMap.get(locale)!;
                localeData.total++;
                totalAssets++;
                
                if (asset.qc_status === 'approved') {
                  localeData.completed++;
                  totalCompleted++;
                }
              }
            } catch (e) {
              // Handle invalid JSON - skip these assets
            }
          }
        });
        
        const localeProgressArray: LocaleProgress[] = Array.from(localeMap.entries()).map(([locale, data]) => ({
          locale,
          completed: data.completed,
          total: data.total
        }));
        
        setLocaleProgress(localeProgressArray);
        setOverallProgress({ completed: totalCompleted, total: totalAssets });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResetFormData = async () => {
    try {
      const token = authService.getToken();
      
      // Fetch QC users
      const usersResponse = await fetch('http://localhost:5003/api/users/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersResponse.json();
      
      if (usersData.users) {
        const qcUsersList = usersData.users.filter((user: any) => user.role === 'qc_user');
        setQcUsers(qcUsersList);
      }

      // Fetch available locales from assets
      const assetsResponse = await fetch('http://localhost:5003/api/assets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const assetsData = await assetsResponse.json();
      
      if (assetsData.assets) {
        const locales = new Set<string>();
        const bookingCategories = new Set<string>();
        
        assetsData.assets.forEach((asset: any) => {
          if (asset.metadata) {
            try {
              const metadata = typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata;
              
              // Collect locales
              if (metadata.locale && metadata.locale.trim() !== '') {
                locales.add(metadata.locale);
              }
              
              // Collect booking categories
              if (metadata.bookingCategory && metadata.bookingCategory.trim() !== '') {
                bookingCategories.add(metadata.bookingCategory);
              }
            } catch (e) {
              // Skip invalid metadata
            }
          }
        });
        
        setAvailableLocales(Array.from(locales).sort());
        setAvailableBookingCategories(Array.from(bookingCategories).sort());
      }
    } catch (error) {
      console.error('Error fetching reset form data:', error);
    }
  };

  const handleResetFormChange = (field: keyof ResetFormData, value: string) => {
    setResetForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const canSubmitReset = () => {
    return resetForm.currentUser && resetForm.locale && resetForm.bookingCategory && resetForm.newUser;
  };

  const handleResetAndReassign = async () => {
    if (!canSubmitReset()) return;
    
    setResetLoading(true);
    try {
      const token = authService.getToken();
      
      const response = await fetch('http://localhost:5003/api/admin/reset-reassign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resetForm)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert(`Success! Reset and reassigned ${result.affectedAssets} assets to ${result.newUserName}`);
        // Reset form
        setResetForm({
          currentUser: '',
          locale: '',
          bookingCategory: '',
          newUser: ''
        });
        // Refresh dashboard data if on overview tab
        if (tabValue === 0) {
          fetchDashboardData();
        }
      } else {
        alert(`Error: ${result.error || 'Failed to reset and reassign assets'}`);
      }
    } catch (error) {
      console.error('Error resetting and reassigning:', error);
      alert('Error: Failed to reset and reassign assets');
    } finally {
      setResetLoading(false);
    }
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

  const filteredLocaleProgress = localeProgress.filter(locale => 
    locale.locale.toLowerCase().includes(searchLocale.toLowerCase())
  );

  const DashboardOverview = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {/* Dashboard Overview Section - Statistics Cards */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Dashboard Overview
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h2" color="primary" sx={{ fontWeight: 'bold' }}>
                      {dashboardStats?.totalUsers || 0}
                    </Typography>
                    <Typography color="textSecondary" variant="body1">
                      Total Users
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h2" color="primary" sx={{ fontWeight: 'bold' }}>
                      {dashboardStats?.adminUsers || 0}
                    </Typography>
                    <Typography color="textSecondary" variant="body1">
                      Admin Users
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h2" color="success.main" sx={{ fontWeight: 'bold' }}>
                      {dashboardStats?.normalUsers || 0}
                    </Typography>
                    <Typography color="textSecondary" variant="body1">
                      Normal Users
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h2" color="warning.main" sx={{ fontWeight: 'bold' }}>
                      {dashboardStats?.activeUsers || 0}
                    </Typography>
                    <Typography color="textSecondary" variant="body1">
                      Active Users
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Progress Sections */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ mr: 1 }}>📊</Box>
                <Typography variant="h6">
                  Locale-wise Progress
                </Typography>
              </Box>
              
              <TextField
                placeholder="Search locale..."
                variant="outlined"
                size="small"
                value={searchLocale}
                onChange={(e) => setSearchLocale(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3, width: 300 }}
              />

              {/* Bar Chart */}
              <Box sx={{ height: 300, position: 'relative' }}>
                {/* Y-axis labels */}
                <Box sx={{ position: 'absolute', left: -10, top: 0, height: '100%', display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', py: 2 }}>
                  {(() => {
                    const maxTotal = filteredLocaleProgress.length > 0 ? Math.max(...filteredLocaleProgress.map(l => l.total), 60) : 60;
                    const step = Math.ceil(maxTotal / 4);
                    return [0, step, step * 2, step * 3, maxTotal].map((value) => (
                      <Typography key={value} variant="caption" color="textSecondary" sx={{ fontSize: '11px' }}>
                        {value}
                      </Typography>
                    ));
                  })()}
                </Box>
                
                {/* Chart area */}
                <Box sx={{ ml: 3, height: '100%', position: 'relative', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  {/* Grid lines */}
                  <Box sx={{ position: 'absolute', width: '100%', height: '100%' }}>
                    {[20, 40, 60, 80].map((percent) => (
                      <Box
                        key={percent}
                        sx={{
                          position: 'absolute',
                          bottom: `${percent}%`,
                          width: '100%',
                          height: '1px',
                          backgroundColor: '#f0f0f0'
                        }}
                      />
                    ))}
                  </Box>
                  
                  {/* Bars */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', height: '100%', px: 4, py: 2 }}>
                    {filteredLocaleProgress.length > 0 ? filteredLocaleProgress.map((locale, index) => {
                      // Find the maximum total across all locales to scale properly
                      const maxTotal = Math.max(...filteredLocaleProgress.map(l => l.total), 60);
                      const scaleHeight = 250; // Max height in pixels
                      
                      const completedHeight = (locale.completed / maxTotal) * scaleHeight;
                      const remainingHeight = ((locale.total - locale.completed) / maxTotal) * scaleHeight;
                      
                      return (
                        <Box key={locale.locale} sx={{ flex: 1, mx: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          {/* Bar Container */}
                          <Box sx={{ width: 80, height: scaleHeight, display: 'flex', flexDirection: 'column-reverse', position: 'relative' }}>
                            {/* Completed (green) part at bottom */}
                            <Box
                              sx={{
                                width: '100%',
                                height: `${completedHeight}px`,
                                backgroundColor: '#4caf50',
                                borderRadius: '2px 2px 0 0'
                              }}
                            />
                            {/* Remaining (gray) part on top */}
                            <Box
                              sx={{
                                width: '100%',
                                height: `${remainingHeight}px`,
                                backgroundColor: '#e0e0e0',
                                borderRadius: remainingHeight > 0 ? '2px 2px 0 0' : '0'
                              }}
                            />
                          </Box>
                          {/* Locale label */}
                          <Typography variant="body2" sx={{ mt: 1, fontWeight: 'medium', textAlign: 'center' }}>
                            {locale.locale}
                          </Typography>
                        </Box>
                      );
                    }) : (
                      // Show placeholder if no data
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                        <Typography color="textSecondary">
                          No locale data available
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Legend */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#4caf50', mr: 1 }} />
                  <Typography variant="caption">Completed</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#d0d0d0', mr: 1 }} />
                  <Typography variant="caption">Remaining</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overall Progress
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={120}
                    thickness={8}
                    sx={{ color: '#e0e0e0' }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={overallProgress.total > 0 ? (overallProgress.completed / overallProgress.total) * 100 : 0}
                    size={120}
                    thickness={8}
                    sx={{ 
                      color: '#4caf50',
                      position: 'absolute',
                      left: 0
                    }}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h6" component="div" color="textSecondary">
                      {overallProgress.total > 0 ? 
                        `${Math.round((overallProgress.completed / overallProgress.total) * 100)}%` : 
                        '0%'
                      }
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ mt: 3, textAlign: 'right', alignSelf: 'flex-end' }}>
                  <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 'medium', mb: 1 }}>
                    Completed: {overallProgress.completed} ({overallProgress.total > 0 ? Math.round((overallProgress.completed / overallProgress.total) * 100) : 0}%)
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#9e9e9e', fontWeight: 'medium' }}>
                    Remaining: {overallProgress.total - overallProgress.completed} ({overallProgress.total > 0 ? Math.round(((overallProgress.total - overallProgress.completed) / overallProgress.total) * 100) : 0}%)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Admin Panel
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            admin
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            <Logout />
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="admin tabs"
            variant="fullWidth"
            sx={{
              '& .MuiTabs-flexContainer': {
                justifyContent: 'space-between'
              }
            }}
          >
            <Tab 
              label="Overview" 
              id="admin-tab-0"
              aria-controls="admin-tabpanel-0"
            />
            <Tab 
              label="User Management" 
              id="admin-tab-1"
              aria-controls="admin-tabpanel-1"
            />
            <Tab 
              label="Asset Tracking" 
              id="admin-tab-2"
              aria-controls="admin-tabpanel-2"
            />
            <Tab 
              label="Progress" 
              id="admin-tab-3"
              aria-controls="admin-tabpanel-3"
            />
            <Tab 
              label="Data Export" 
              id="admin-tab-4"
              aria-controls="admin-tabpanel-4"
            />
            <Tab 
              label="Reset & Reassign" 
              id="admin-tab-5"
              aria-controls="admin-tabpanel-5"
            />
            <Tab 
              label="Batch Assignment" 
              id="admin-tab-6"
              aria-controls="admin-tabpanel-6"
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
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Progress
            </Typography>
            <Typography color="textSecondary" paragraph>
              View detailed progress reports and analytics. This feature will be implemented soon.
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <DataExport />
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          <Box sx={{ p: 3 }}>
            <Typography variant="body1" color="textSecondary" gutterBottom>
              Reset QC status for assets and reassign them to a new user based on user, region, and sub-category filters
            </Typography>
            
            <Card sx={{ mt: 3, maxWidth: 800, mx: 'auto' }}>
              <CardContent sx={{ p: 4 }}>
                {/* Header with icon and title */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
                  <RestartAlt sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                  <Typography variant="h5" fontWeight="bold">
                    Reset QC Status & Reassign
                  </Typography>
                </Box>

                {/* Filter Grid */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      select
                      label="Current User"
                      variant="outlined"
                      required
                      value={resetForm.currentUser}
                      onChange={(e) => handleResetFormChange('currentUser', e.target.value)}
                    >
                      {qcUsers.map((user) => (
                        <MenuItem key={user.id} value={user.id.toString()}>
                          {user.username}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      select
                      label="Locale"
                      variant="outlined"
                      required
                      value={resetForm.locale}
                      onChange={(e) => handleResetFormChange('locale', e.target.value)}
                    >
                      {availableLocales.map((locale) => (
                        <MenuItem key={locale} value={locale}>
                          {locale}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      select
                      label="Booking Category"
                      variant="outlined"
                      required
                      value={resetForm.bookingCategory}
                      onChange={(e) => handleResetFormChange('bookingCategory', e.target.value)}
                    >
                      {availableBookingCategories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      select
                      label="New User"
                      variant="outlined"
                      required
                      value={resetForm.newUser}
                      onChange={(e) => handleResetFormChange('newUser', e.target.value)}
                    >
                      {qcUsers.map((user) => (
                        <MenuItem key={user.id} value={user.id.toString()}>
                          {user.username}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>

                {/* Warning Box */}
                <Box sx={{ 
                  bgcolor: '#fff3cd', 
                  border: '1px solid #ffeaa7', 
                  borderRadius: 1, 
                  p: 3, 
                  mb: 4 
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Box sx={{ 
                      width: 0, 
                      height: 0, 
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderBottom: '12px solid #f39c12',
                      mr: 2,
                      mt: 0.5
                    }} />
                    <Box>
                      <Typography variant="body2" fontWeight="bold" color="#856404" gutterBottom>
                        Warning: This action will:
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2, color: '#856404' }}>
                        <Typography component="li" variant="body2">
                          Reset all QC status for assets matching the selected filters
                        </Typography>
                        <Typography component="li" variant="body2">
                          Reassign all matching assets to the new user
                        </Typography>
                        <Typography component="li" variant="body2">
                          This action cannot be undone
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Action Button */}
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    disabled={!canSubmitReset() || resetLoading}
                    onClick={handleResetAndReassign}
                    startIcon={resetLoading ? <CircularProgress size={20} color="inherit" /> : <RestartAlt />}
                    sx={{
                      bgcolor: canSubmitReset() && !resetLoading ? '#f44336' : '#e0e0e0',
                      color: canSubmitReset() && !resetLoading ? '#fff' : '#9e9e9e',
                      px: 6,
                      py: 1.5,
                      '&:hover': {
                        bgcolor: canSubmitReset() && !resetLoading ? '#d32f2f' : '#e0e0e0'
                      },
                      '&:disabled': {
                        bgcolor: '#e0e0e0',
                        color: '#9e9e9e'
                      }
                    }}
                  >
                    {resetLoading ? 'PROCESSING...' : 'RESET & REASSIGN ASSETS'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={6}>
          <BatchAssignment />
        </TabPanel>
      </Container>
    </Box>
  );
};

export default AdminPanel;