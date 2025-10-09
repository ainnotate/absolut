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
  Alert
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

const AdminPanel: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [localeProgress, setLocaleProgress] = useState<LocaleProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState({ completed: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [searchLocale, setSearchLocale] = useState('');
  const currentUser = authService.getUser();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (tabValue === 0) {
      fetchDashboardData();
    }
  }, [tabValue]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = authService.getToken();
      
      // Fetch user statistics
      const userResponse = await fetch('http://localhost:5003/api/admin/users', {
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
      const assetResponse = await fetch('http://localhost:5003/api/admin/assets', {
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
              const locale = metadata.locale || 'Unknown';
              
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
            } catch (e) {
              // Handle invalid JSON
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
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="h6">
                        Total Users
                      </Typography>
                      <Typography variant="h4">
                        {dashboardStats?.totalUsers || 0}
                      </Typography>
                    </Box>
                    <Group color="primary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="h6">
                        Admin Users
                      </Typography>
                      <Typography variant="h4">
                        {dashboardStats?.adminUsers || 0}
                      </Typography>
                    </Box>
                    <AdminPanelSettings color="primary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="h6">
                        Normal Users
                      </Typography>
                      <Typography variant="h4">
                        {dashboardStats?.normalUsers || 0}
                      </Typography>
                    </Box>
                    <PersonOutline color="primary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="h6">
                        Active Users
                      </Typography>
                      <Typography variant="h4">
                        {dashboardStats?.activeUsers || 0}
                      </Typography>
                    </Box>
                    <CheckCircle color="primary" sx={{ fontSize: 40 }} />
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
              <Typography variant="h6" gutterBottom>
                Locale-wise Progress
              </Typography>
              
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

              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {filteredLocaleProgress.map((locale) => {
                  const completionRate = locale.total > 0 ? (locale.completed / locale.total) * 100 : 0;
                  return (
                    <Box key={locale.locale} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {locale.locale}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {locale.completed}/{locale.total} ({completionRate.toFixed(0)}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={completionRate}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: '#4caf50'
                          }
                        }}
                      />
                    </Box>
                  );
                })}
                {filteredLocaleProgress.length === 0 && (
                  <Typography color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                    No locales found
                  </Typography>
                )}
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
                    value={overallProgress.total > 0 ? (overallProgress.completed / overallProgress.total) * 100 : 0}
                    size={120}
                    thickness={4}
                    sx={{ color: '#4caf50' }}
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
                
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    <Box component="span" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                      ● Completed: {overallProgress.completed}
                    </Box>
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <Box component="span" sx={{ color: '#9e9e9e', fontWeight: 'bold' }}>
                      ● Remaining: {overallProgress.total - overallProgress.completed}
                    </Box>
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Total Assets: {overallProgress.total}
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
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
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
              label="Data Export" 
              id="admin-tab-2"
              aria-controls="admin-tabpanel-2"
            />
            <Tab 
              label="Reset & Reassign" 
              id="admin-tab-3"
              aria-controls="admin-tabpanel-3"
            />
            <Tab 
              label="Batch Assignment" 
              id="admin-tab-4"
              aria-controls="admin-tabpanel-4"
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
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Data Export
            </Typography>
            <Typography color="textSecondary" paragraph>
              Export platform data and reports. This feature will be implemented soon.
            </Typography>
            <Button variant="outlined" startIcon={<GetApp />}>
              Export Data
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Reset & Reassign
            </Typography>
            <Typography color="textSecondary" paragraph>
              Reset user assignments and reassign tasks. This feature will be implemented soon.
            </Typography>
            <Button variant="outlined" startIcon={<RestartAlt />}>
              Reset Assignments
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <BatchAssignment />
        </TabPanel>
      </Container>
    </Box>
  );
};

export default AdminPanel;