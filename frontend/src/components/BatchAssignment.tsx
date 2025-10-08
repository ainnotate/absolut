import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  Snackbar,
  LinearProgress
} from '@mui/material';
import {
  PersonAdd,
  PersonRemove,
  Download,
  Search
} from '@mui/icons-material';

interface LocaleStats {
  locale: string;
  pending: number;
  completed: number;
}

interface BookingCategoryStats {
  booking_category: string;
  pending: number;
  completed: number;
  total: number;
}


interface AssignedUser {
  id: number;
  user_id: number;
  username: string;
  email: string;
  assigned_at: string;
  assigned_assets: number;
  completed_assets: number;
}

interface UnassignedUser {
  id: number;
  username: string;
  email: string;
}

const API_BASE = 'http://192.168.29.158:5003';

interface BookingCategoryCardProps {
  category: BookingCategoryStats;
  locale: string;
  onAssignUser: (bookingCategory: string, unassignedAssetIds: number[]) => void;
  onRemoveUser: (bookingCategory: string, userId: number, username: string) => void;
}

const BookingCategoryCard: React.FC<BookingCategoryCardProps> = ({ 
  category, 
  locale, 
  onAssignUser, 
  onRemoveUser 
}) => {
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [unassignedAssetIds, setUnassignedAssetIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAssignedUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/api/batches/locale/${locale}/category/${encodeURIComponent(category.booking_category)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssignedUsers(data.assignedUsers || []);
        setUnassignedAssetIds(data.unassignedAssetIds || []);
      }
    } catch (error) {
      console.error('Error fetching assigned users:', error);
    } finally {
      setLoading(false);
    }
  }, [locale, category.booking_category]);

  React.useEffect(() => {
    fetchAssignedUsers();
  }, [fetchAssignedUsers]);

  const total = category.total;
  const completedPercent = total > 0 ? ((category.completed / total) * 100).toFixed(1) : 0;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Left side: Category info and progress bar */}
        <Box sx={{ width: '50%', minWidth: 300 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            {category.booking_category}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            {category.completed} / {total} completed ({completedPercent}%)
          </Typography>
          <Box sx={{ width: '100%' }}>
            <LinearProgress
              variant="determinate"
              value={total > 0 ? (category.completed / total) * 100 : 0}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#4caf50',
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        </Box>

        {/* Right side: Assigned users */}
        <Box sx={{ flex: 1, minWidth: 400 }}>
          <Typography variant="body2" fontWeight="medium" gutterBottom>
            Assigned Users:
          </Typography>
          {loading ? (
            <CircularProgress size={20} />
          ) : assignedUsers.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
              No users assigned
            </Typography>
          ) : (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
              {assignedUsers.map((user) => (
                <Chip
                  key={user.id}
                  label={user.username}
                  onDelete={() => onRemoveUser(category.booking_category, user.user_id, user.username)}
                  deleteIcon={<PersonRemove />}
                  size="small"
                  color="primary"
                />
              ))}
            </Stack>
          )}
          <Button
            variant="outlined"
            startIcon={<PersonAdd />}
            size="small"
            onClick={() => onAssignUser(category.booking_category, unassignedAssetIds)}
          >
            Assign User
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

const BatchAssignment: React.FC = () => {
  const [localeStats, setLocaleStats] = useState<LocaleStats[]>([]);
  const [bookingCategoryStats, setBookingCategoryStats] = useState<BookingCategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  
  // Navigation state
  const [selectedLocale, setSelectedLocale] = useState<string>('');
  
  // Search states
  const [localeSearch, setLocaleSearch] = useState<string>('');
  const [bookingCategorySearch, setBookingCategorySearch] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');
  
  // Dialog states
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<UnassignedUser[]>([]);
  
  // Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    fetchLocaleStats();
  }, []);

  const fetchLocaleStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/api/batches/locales`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch locales');
      }

      const data = await response.json();
      const locales = data.locales || [];
      
      // Get stats for each locale by checking booking categories
      const statsPromises = locales.map(async (locale: string) => {
        const statsResponse = await fetch(`${API_BASE}/api/batches/locale/${locale}/booking-categories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          const bookingCategories = statsData.bookingCategories || [];
          
          let totalPending = 0;
          let totalCompleted = 0;
          
          // Sum up stats from booking categories
          bookingCategories.forEach((category: any) => {
            totalPending += category.count - (category.completed || 0);
            totalCompleted += category.completed || 0;
          });
          
          return {
            locale,
            pending: totalPending,
            completed: totalCompleted
          };
        }
        
        return {
          locale,
          pending: 0,
          completed: 0
        };
      });
      
      const stats = await Promise.all(statsPromises);
      setLocaleStats(stats);
    } catch (error) {
      console.error('Error fetching locale stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingCategoriesByLocale = async (locale: string) => {
    try {
      setBatchLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/api/batches/locale/${locale}/booking-categories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const bookingCategories = data.bookingCategories || [];
        
        const stats = bookingCategories.map((bc: any) => ({
          booking_category: bc.booking_category,
          pending: bc.count - (bc.completed || 0),
          completed: bc.completed || 0,
          total: bc.count
        }));
        
        setBookingCategoryStats(stats);
      }
    } catch (error) {
      console.error('Error fetching booking categories:', error);
    } finally {
      setBatchLoading(false);
    }
  };


  const fetchUnassignedUsers = async (locale: string, bookingCategory: string) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `${API_BASE}/api/batches/unassigned-users?locale=${locale}&bookingCategory=${encodeURIComponent(bookingCategory)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUnassignedUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching unassigned users:', error);
    }
  };

  const assignUserToBatch = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/api/batches/assign-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locale: selectedLocale,
          bookingCategory: selectedBatch,
          userId,
          assetIds: selectedAssetIds
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSnackbarMessage(`User assigned successfully. ${data.assignedCount} assets assigned.`);
        setSnackbarOpen(true);
        setSelectedBatch('');
        setSelectedAssetIds([]);
        
        // Refresh booking categories
        await fetchBookingCategoriesByLocale(selectedLocale);
      }
    } catch (error) {
      console.error('Error assigning user:', error);
      setSnackbarMessage('Failed to assign user to batch');
      setSnackbarOpen(true);
    }
  };

  const removeUserFromBatch = async (bookingCategory: string, userId: number, username: string) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/api/batches/remove-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locale: selectedLocale,
          bookingCategory: bookingCategory,
          userId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSnackbarMessage(`Removed ${username} from batch. ${data.unassignedCount} assets unassigned.`);
        setSnackbarOpen(true);
        
        // Refresh booking categories
        await fetchBookingCategoriesByLocale(selectedLocale);
      }
    } catch (error) {
      console.error('Error removing user:', error);
      setSnackbarMessage('Failed to remove user from batch');
      setSnackbarOpen(true);
    }
  };

  const generateBatchReport = () => {
    // This would generate a PDF report similar to the reference
    console.log('Generate batch report - to be implemented');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Batch Assignment Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Assign users to batches (locale + deliverable type combinations) for manual work distribution
          </Typography>
        </Box>
        <IconButton
          color="primary"
          onClick={generateBatchReport}
          title="Download Report"
          sx={{ height: 56 }}
        >
          <Download fontSize="large" />
        </IconButton>
      </Box>

      {/* Current Selection Breadcrumb */}
      {selectedLocale && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ color: 'primary.contrastText' }}>
              {selectedLocale}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="inherit"
                size="small"
                onClick={() => {
                  setSelectedLocale('');
                  setBookingCategoryStats([]);
                }}
              >
                Back to Locales
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Locale Statistics Overview - Collapsible */}
      <Collapse in={!selectedLocale}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              Locale Overview
            </Typography>
            <TextField
              size="small"
              placeholder="Search locales..."
              value={localeSearch}
              onChange={(e) => setLocaleSearch(e.target.value)}
              sx={{ width: 250 }}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          ) : localeStats.length === 0 ? (
            <Alert severity="info">No locales found. Please upload assets with locale metadata.</Alert>
          ) : (
            <Grid container spacing={2}>
              {localeStats
                .filter(locale => locale.locale.toLowerCase().includes(localeSearch.toLowerCase()))
                .map((locale, index) => {
                const total = locale.pending + locale.completed;
                const completedPercent = total > 0 ? ((locale.completed / total) * 100).toFixed(1) : 0;

                return (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: 'background.default',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          boxShadow: 2
                        }
                      }}
                      onClick={async () => {
                        setSelectedLocale(locale.locale);
                        await fetchBookingCategoriesByLocale(locale.locale);
                      }}
                    >
                      <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                        {locale.locale}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        {locale.completed} / {total} completed ({completedPercent}%)
                      </Typography>
                      <Box sx={{ width: '100%' }}>
                        <LinearProgress
                          variant="determinate"
                          value={total > 0 ? (locale.completed / total) * 100 : 0}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: '#4caf50',
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Paper>
      </Collapse>

      {/* Booking Categories with User Assignment - Shown when locale is selected */}
      <Collapse in={!!selectedLocale}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              Booking Categories for {selectedLocale}
            </Typography>
            <TextField
              size="small"
              placeholder="Search booking categories..."
              value={bookingCategorySearch}
              onChange={(e) => setBookingCategorySearch(e.target.value)}
              sx={{ width: 250 }}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Box>
          {batchLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          ) : bookingCategoryStats.length === 0 ? (
            <Alert severity="info">No booking categories found for this locale</Alert>
          ) : (
            <Stack spacing={2}>
              {bookingCategoryStats
                .filter(category => category.booking_category.toLowerCase().includes(bookingCategorySearch.toLowerCase()))
                .map((category, index) => (
                  <BookingCategoryCard
                    key={index}
                    category={category}
                    locale={selectedLocale}
                    onAssignUser={(bookingCategory, unassignedAssetIds) => {
                      setSelectedBatch(bookingCategory);
                      setSelectedAssetIds(unassignedAssetIds);
                      fetchUnassignedUsers(selectedLocale, bookingCategory);
                    }}
                    onRemoveUser={async (bookingCategory, userId, username) => {
                      await removeUserFromBatch(bookingCategory, userId, username);
                      // Refresh the booking category data
                      await fetchBookingCategoriesByLocale(selectedLocale);
                    }}
                  />
                ))}
            </Stack>
          )}
        </Paper>
      </Collapse>


      {/* Assign User to Batch Dialog */}
      <Dialog
        open={selectedBatch !== ''}
        onClose={() => {
          setSelectedBatch('');
          setSelectedAssetIds([]);
          setUserSearch('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign User to Batch</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Batch: <strong>{selectedBatch}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Assets to assign: <strong>{selectedAssetIds.length}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
            Select a user to assign to this batch:
          </Typography>
          {unassignedUsers.length === 0 ? (
            <Alert severity="info">No unassigned users available</Alert>
          ) : (
            <>
              <TextField
                size="small"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
              <Stack spacing={1}>
                {unassignedUsers
                  .filter(user =>
                    user.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                    user.email.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map((user) => (
                  <Button
                    key={user.id}
                    variant="outlined"
                    fullWidth
                    startIcon={<PersonAdd />}
                    onClick={() => assignUserToBatch(user.id)}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {user.username} ({user.email})
                  </Button>
                ))}
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSelectedBatch('');
            setSelectedAssetIds([]);
            setUserSearch('');
          }}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default BatchAssignment;