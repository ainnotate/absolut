import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Grid,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  Stack,
  TextField,
  InputAdornment,
  Collapse,
  Autocomplete,
  Tabs,
  Tab,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  Logout,
  Visibility,
  Search,
  Clear,
  Assignment,
  ContactSupport,
  PlayArrow,
  Dashboard,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  SupervisorAccount,
  People,
  Assessment
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5003/api';

interface SupervisorAsset {
  asset_id: string;
  user_id: number;
  deliverable_type: string;
  metadata: any;
  created_date: string;
  batch_id?: string;
  assigned_to?: number;
  qc_status?: string;
  qc_completed_date?: string;
  qc_comments?: string;
  username?: string;
  qc_username?: string;
  qc_email?: string;
  uploader_name?: string;
}

interface Statistics {
  total_assets: number;
  pending_qc: number;
  completed_qc: number;
  approved: number;
  rejected: number;
  review_requested: number;
}

const SupervisorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<SupervisorAsset[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter states
  const [showFilters, setShowFilters] = useState(true);
  const [selectedQCStatus, setSelectedQCStatus] = useState<string>('');
  const [selectedQCUser, setSelectedQCUser] = useState<string>('');
  const [selectedDeliverableType, setSelectedDeliverableType] = useState<string>('');

  // Filter options
  const qcStatusOptions = ['pending', 'approved', 'rejected'];
  const [qcUsers, setQCUsers] = useState<Array<{id: number, username: string}>>([]);
  const [deliverableTypes, setDeliverableTypes] = useState<string[]>([]);
  const [hasActiveList, setHasActiveList] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    loadStatistics();
    loadFilterOptions();
    // Check if there's an active sequential review list on mount
    setHasActiveList(sessionStorage.getItem('supervisorAssetList') !== null);
  }, []);

  useEffect(() => {
    loadAssets();
  }, [currentPage, searchQuery, selectedQCStatus, selectedQCUser, selectedDeliverableType, currentTab]);

  const loadCurrentUser = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload);
      } catch (error) {
        console.error('Error parsing token:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  };

  const loadStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/supervisor/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (searchQuery) params.append('search', searchQuery);
      if (selectedQCStatus) params.append('qc_status', selectedQCStatus);
      if (selectedQCUser) params.append('qc_user', selectedQCUser);
      if (selectedDeliverableType) params.append('deliverable_type', selectedDeliverableType);

      // For Review Requested tab, show assets that requested supervisor review
      if (currentTab === 1) {
        params.set('supervisor_review_requested', 'true');
      }

      const response = await fetch(`${API_URL}/supervisor/assets?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load assets');
        setAssets([]);
      }
    } catch (error: any) {
      setError('Failed to load assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/supervisor/filter-options`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQCUsers(data.qcUsers);
        setDeliverableTypes(data.deliverableTypes);
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    setCurrentPage(1);
  };

  const handleLogout = async () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const handleReviewAsset = (assetId: string) => {
    // Store the current filtered asset list in sessionStorage for sequential review
    const assetList = assets.map(a => a.asset_id);
    const currentIndex = assetList.indexOf(assetId);

    sessionStorage.setItem('supervisorAssetList', JSON.stringify(assetList));
    sessionStorage.setItem('supervisorAssetIndex', currentIndex.toString());
    sessionStorage.setItem('supervisorFilterState', JSON.stringify({
      selectedQCStatus,
      selectedQCUser,
      selectedDeliverableType,
      searchQuery,
      currentTab,
    }));

    navigate(`/supervisor/review/${assetId}`);
  };

  const handleStartSequentialReview = () => {
    if (assets.length === 0) return;

    // Store the current filtered asset list in sessionStorage for sequential review
    const assetList = assets.map(a => a.asset_id);

    sessionStorage.setItem('supervisorAssetList', JSON.stringify(assetList));
    sessionStorage.setItem('supervisorAssetIndex', '0');
    sessionStorage.setItem('supervisorFilterState', JSON.stringify({
      selectedQCStatus,
      selectedQCUser,
      selectedDeliverableType,
      searchQuery,
      currentTab,
    }));

    setHasActiveList(true);

    // Navigate to the first asset
    navigate(`/supervisor/review/${assetList[0]}`);
  };


  const handleSearch = () => {
    setCurrentPage(1);
    loadAssets();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleSearchKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      // Remove needs_revision case
      case 'pending':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle fontSize="small" />;
      case 'rejected':
        return <Cancel fontSize="small" />;
      // Remove needs_revision case
      case 'pending':
        return <HourglassEmpty fontSize="small" />;
      default:
        return <HourglassEmpty fontSize="small" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Container maxWidth={false} sx={{ px: 2, py: 1 }}>
        <AppBar position="static" sx={{ mb: 2, borderRadius: 1 }}>
          <Toolbar>
            <Dashboard sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Supervisor Dashboard - Absolute Platform
            </Typography>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {currentUser?.username} (Supervisor)
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <Logout />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Statistics Cards */}
        {statistics && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Assets
                  </Typography>
                  <Typography variant="h4">
                    {statistics.total_assets}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Pending QC
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {statistics.pending_qc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Approved
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {statistics.approved}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Rejected
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {statistics.rejected}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Rejected
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {statistics.rejected}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tab Navigation */}
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab icon={<Assignment />} label="All Assets" iconPosition="start" />
            <Tab
              icon={<ContactSupport />}
              label={
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Review Requested</span>
                  {(statistics?.review_requested || 0) > 0 && (
                    <Chip
                      label={statistics?.review_requested || 0}
                      size="small"
                      color="info"
                      sx={{
                        height: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                </Box>
              }
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Main Content */}
        <Paper sx={{ width: '100%', mb: 2, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search by Asset ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="clear search"
                      onClick={handleClearSearch}
                      edge="end"
                      size="small"
                    >
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="outlined"
              onClick={loadAssets}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>

          {/* Filter Panel */}
          {currentTab === 0 && (
            <Collapse in={showFilters}>
              <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                      size="small"
                      options={qcUsers}
                      getOptionLabel={(option) => option.username}
                      value={qcUsers.find(u => u.id.toString() === selectedQCUser) || null}
                      onChange={(event, newValue) => {
                        setSelectedQCUser(newValue ? newValue.id.toString() : '');
                        setCurrentPage(1);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="QC User" placeholder="All Users" />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                      size="small"
                      options={deliverableTypes}
                      value={selectedDeliverableType || null}
                      onChange={(event, newValue) => {
                        setSelectedDeliverableType(newValue || '');
                        setCurrentPage(1);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Deliverable Type" placeholder="All Types" />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                      size="small"
                      options={qcStatusOptions}
                      value={selectedQCStatus || null}
                      onChange={(event, newValue) => {
                        setSelectedQCStatus(newValue || '');
                        setCurrentPage(1);
                      }}
                      getOptionLabel={(option) => {
                        const labels: Record<string, string> = {
                          'pending': 'Pending Review',
                          'approved': 'QC Approved',
                          'rejected': 'QC Rejected'
                        };
                        return labels[option] || option;
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="QC Status" placeholder="All Statuses" />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" sx={{ height: '100%' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSelectedQCUser('');
                          setSelectedDeliverableType('');
                          setSelectedQCStatus('');
                          setCurrentPage(1);
                        }}
                      >
                        Clear Filters
                      </Button>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end" alignItems="center">
                      <Tooltip title="Review the list one by one">
                        <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          startIcon={<PlayArrow />}
                          onClick={handleStartSequentialReview}
                          disabled={assets.length === 0}
                        >
                          Start Review
                        </Button>
                      </Tooltip>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>
            </Collapse>
          )}

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Loading */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : assets.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                {currentTab === 1 ? 'No consulted assets found.' : 'No assets found.'}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Asset ID</TableCell>
                      <TableCell>Locale</TableCell>
                      <TableCell>Deliverable Type</TableCell>
                      <TableCell>Uploader</TableCell>
                      <TableCell>QC User</TableCell>
                      <TableCell>QC Status</TableCell>
                      <TableCell>QC Date</TableCell>
                      <TableCell>Created Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.asset_id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {asset.asset_id}
                          </Typography>
                        </TableCell>
                        <TableCell>{parseMetadata(asset.metadata)?.locale || '-'}</TableCell>
                        <TableCell>{asset.deliverable_type}</TableCell>
                        <TableCell>{asset.uploader_name || asset.username || '-'}</TableCell>
                        <TableCell>{asset.qc_username || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(asset.qc_status || 'pending')}
                            label={asset.qc_status || 'Pending'}
                            color={getStatusColor(asset.qc_status || 'pending') as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDate(asset.qc_completed_date || '')}</TableCell>
                        <TableCell>{formatDate(asset.created_date)}</TableCell>
                        <TableCell>
                          <Button
                            startIcon={<Visibility />}
                            size="small"
                            onClick={() => handleReviewAsset(asset.asset_id)}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default SupervisorDashboard;