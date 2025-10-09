import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Logout,
  PlayArrow,
  Assignment,
  CheckCircle,
  Pending,
  Error,
  Assessment
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface QCStats {
  total_assigned: number;
  pending: number;
  in_progress: number;
  completed: number;
  rejected: number;
  sent_to_supervisor: number;
}

interface UserBatch {
  batch_id: string;
  locale: string;
  deliverable_type: string;
  assigned_assets: number;
  completed_assets: number;
  total_assets: number;
  pending_count: number;
  completed_count: number;
}

const API_BASE = 'http://192.168.29.158:5003';

const QCDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<QCStats | null>(null);
  const [batches, setBatches] = useState<UserBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = authService.getUser();

  useEffect(() => {
    fetchQCData();
  }, []);

  const fetchQCData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch QC statistics
      const statsResponse = await fetch(`${API_BASE}/api/qc/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch user's assigned batches
      const batchesResponse = await fetch(`${API_BASE}/api/batches/user-batches`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (batchesResponse.ok) {
        const batchesData = await batchesResponse.json();
        setBatches(batchesData.batches || []);
      }
    } catch (error) {
      console.error('Error fetching QC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/';
  };

  const handleStartBatch = (batch: UserBatch) => {
    navigate(`/qc/review/${batch.batch_id}`);
  };

  const getCompletionPercentage = (batch: UserBatch) => {
    if (batch.assigned_assets === 0) return 0;
    return Math.round((batch.completed_assets / batch.assigned_assets) * 100);
  };

  const getStatusColor = (batch: UserBatch): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' => {
    const percentage = getCompletionPercentage(batch);
    if (percentage === 100) return 'success';
    if (percentage > 50) return 'info';
    if (percentage > 0) return 'warning';
    return 'primary';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Assessment sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            QC Dashboard - Absolute Platform
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {currentUser?.first_name || currentUser?.username} (QC)
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<Logout />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 2 }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Welcome, {currentUser?.first_name || currentUser?.username}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Quality Control Dashboard - Review assigned assets and ensure data quality
          </Typography>
        </Box>

        {/* Statistics Cards */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary">
                    {stats.total_assigned}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Assigned
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="warning.main">
                    {stats.pending}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Review
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="info.main">
                    {stats.in_progress}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    In Progress
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="success.main">
                    {stats.completed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="error.main">
                    {stats.rejected}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rejected
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="secondary.main">
                    {stats.sent_to_supervisor}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    To Supervisor
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Assigned Batches */}
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
              Your Assigned Batches
            </Typography>
            
            {batches.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No batches assigned yet. Please contact your administrator.
              </Alert>
            ) : (
              <List>
                {batches.map((batch, index) => (
                  <React.Fragment key={batch.batch_id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{batch.locale} - {batch.deliverable_type}</span>
                            <Chip 
                              label={`${getCompletionPercentage(batch)}% Complete`}
                              color={getStatusColor(batch)}
                              size="small"
                            />
                          </Typography>
                        }
                        primaryTypographyProps={{ component: 'div' }}
                        secondaryTypographyProps={{ component: 'div' }}
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Batch ID: {batch.batch_id}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Assigned: {batch.assigned_assets} | Completed: {batch.completed_assets} | Pending: {batch.assigned_assets - batch.completed_assets}
                            </Typography>
                            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                              <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={getCompletionPercentage(batch)}
                                  color={getStatusColor(batch)}
                                />
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                {getCompletionPercentage(batch)}%
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Button
                          variant="contained"
                          startIcon={<PlayArrow />}
                          onClick={() => handleStartBatch(batch)}
                          disabled={batch.assigned_assets - batch.completed_assets === 0}
                        >
                          {batch.assigned_assets - batch.completed_assets === 0 ? 'Complete' : 'Start Review'}
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < batches.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

      </Container>
    </Box>
  );
};

export default QCDashboard;