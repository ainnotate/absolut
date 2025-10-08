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
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  Logout,
  PlayArrow,
  SupervisorAccount,
  CheckCircle,
  Cancel,
  ContactSupport,
  Assessment,
  People,
  TrendingUp,
  Warning
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface SupervisorStats {
  total_for_review: number;
  pending_review: number;
  approved: number;
  rejected: number;
  consulted: number;
  myReviews?: {
    my_reviews: number;
    my_approved: number;
    my_rejected: number;
    my_consulted: number;
  };
}

interface QCPerformance {
  id: number;
  username: string;
  email: string;
  total_reviewed: number;
  approved: number;
  rejected: number;
  sent_to_supervisor: number;
  supervisor_approved: number;
  supervisor_rejected: number;
}

interface AssetForReview {
  id: number;
  asset_id: string;
  deliverable_type: string;
  uploader_username: string;
  qc_username: string;
  qc_completed_date: string;
  metadata: any;
  files: any[];
}

const API_BASE = 'http://192.168.29.158:5003';

const SupervisorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SupervisorStats | null>(null);
  const [qcPerformance, setQCPerformance] = useState<QCPerformance[]>([]);
  const [assetsForReview, setAssetsForReview] = useState<AssetForReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const currentUser = authService.getUser();

  useEffect(() => {
    fetchSupervisorData();
  }, []);

  const fetchSupervisorData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch supervisor statistics
      const statsResponse = await fetch(`${API_BASE}/api/supervisor/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch QC performance
      const performanceResponse = await fetch(`${API_BASE}/api/supervisor/qc-performance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json();
        setQCPerformance(performanceData.performance || []);
      }

      // Fetch assets for review
      const reviewResponse = await fetch(`${API_BASE}/api/supervisor/review-queue?status=pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (reviewResponse.ok) {
        const reviewData = await reviewResponse.json();
        setAssetsForReview(reviewData.assets || []);
      }
    } catch (error) {
      console.error('Error fetching supervisor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/';
  };

  const handleStartReview = () => {
    navigate('/supervisor/review');
  };

  const calculateAccuracy = (performance: QCPerformance) => {
    if (performance.sent_to_supervisor === 0) return 100;
    const correct = performance.supervisor_approved;
    const total = performance.supervisor_approved + performance.supervisor_rejected;
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  };

  const getPerformanceColor = (accuracy: number): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' => {
    if (accuracy >= 90) return 'success';
    if (accuracy >= 70) return 'warning';
    return 'error';
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
          <SupervisorAccount sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Supervisor Dashboard - Absolute Platform
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {currentUser?.first_name || currentUser?.username} (Supervisor)
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
            Supervisor Dashboard - Review QC decisions and monitor team performance
          </Typography>
        </Box>

        {/* Statistics Cards */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="warning.main">
                    {stats.pending_review}
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
                  <Typography variant="h4" color="primary">
                    {stats.total_for_review}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total For Review
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="success.main">
                    {stats.approved}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Approved
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
                  <Typography variant="h4" color="info.main">
                    {stats.consulted}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Consulted
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="secondary.main">
                    {stats.myReviews?.my_reviews || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    My Reviews
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Review Queue */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">
                <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
                Review Queue
              </Typography>
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={handleStartReview}
                disabled={!stats || stats.pending_review === 0}
              >
                Start Reviewing
              </Button>
            </Box>
            
            {assetsForReview.length === 0 ? (
              <Alert severity="info">
                No assets pending supervisor review at this time.
              </Alert>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {assetsForReview.length} assets awaiting your review
                </Typography>
                <List>
                  {assetsForReview.slice(0, 5).map((asset) => (
                    <ListItem key={asset.id} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {asset.asset_id}
                            </Typography>
                            <Chip label={asset.deliverable_type} size="small" />
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            Uploaded by: {asset.uploader_username} | 
                            Reviewed by: {asset.qc_username} | 
                            QC Date: {new Date(asset.qc_completed_date).toLocaleDateString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                {assetsForReview.length > 5 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                    And {assetsForReview.length - 5} more...
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Performance Monitoring */}
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              <People sx={{ mr: 1, verticalAlign: 'middle' }} />
              QC Team Performance
            </Typography>
            
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>QC User</strong></TableCell>
                    <TableCell align="center"><strong>Total Reviewed</strong></TableCell>
                    <TableCell align="center"><strong>Approved</strong></TableCell>
                    <TableCell align="center"><strong>Rejected</strong></TableCell>
                    <TableCell align="center"><strong>Sent to Supervisor</strong></TableCell>
                    <TableCell align="center"><strong>Supervisor Approved</strong></TableCell>
                    <TableCell align="center"><strong>Accuracy</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qcPerformance.map((performance) => {
                    const accuracy = calculateAccuracy(performance);
                    return (
                      <TableRow key={performance.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2 }}>
                              {performance.username.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2">{performance.username}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {performance.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">{performance.total_reviewed}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={performance.approved} 
                            color="success" 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={performance.rejected} 
                            color="error" 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="center">{performance.sent_to_supervisor}</TableCell>
                        <TableCell align="center">{performance.supervisor_approved}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={accuracy}
                                color={getPerformanceColor(accuracy)}
                              />
                            </Box>
                            <Typography 
                              variant="body2" 
                              color={getPerformanceColor(accuracy) + '.main'}
                            >
                              {accuracy}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {qcPerformance.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No QC performance data available yet.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Actions & Guidelines
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" paragraph>
                  <strong>1. Review Priority:</strong> Focus on assets flagged by QC users for consultation first.
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>2. Quality Standards:</strong> Ensure metadata accuracy and file quality meet platform standards.
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>3. Feedback:</strong> Provide clear, constructive feedback to help QC users improve.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" paragraph>
                  <strong>4. Performance Monitoring:</strong> Regularly check team accuracy rates and provide guidance.
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>5. Escalation:</strong> Flag complex issues or policy questions for administrative review.
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>6. Documentation:</strong> Keep detailed notes for training and quality improvement purposes.
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default SupervisorDashboard;