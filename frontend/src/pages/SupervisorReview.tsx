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
  TextField,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material';
import {
  Logout,
  CheckCircle,
  Cancel,
  ContactSupport,
  ArrowBack,
  Edit,
  ExpandMore,
  Description,
  PictureAsPdf,
  Email,
  TextSnippet,
  Download,
  CompareArrows,
  Person,
  Schedule
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface Asset {
  id: number;
  asset_id: string;
  user_id: number;
  deliverable_type: string;
  metadata: any;
  metadata_before?: any;
  metadata_after?: any;
  created_date: string;
  uploader_username: string;
  uploader_email: string;
  qc_username: string;
  qc_email: string;
  qc_action: string;
  qc_reject_reason?: string;
  qc_notes?: string;
  qc_completed_date: string;
}

interface AssetFile {
  id: number;
  filename: string;
  file_type: string;
  s3_key: string;
}

const API_BASE = 'http://192.168.29.158:5003';

const SupervisorReview: React.FC = () => {
  const navigate = useNavigate();
  const [currentAsset, setCurrentAsset] = useState<Asset | null>(null);
  const [assetFiles, setAssetFiles] = useState<AssetFile[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [editedMetadata, setEditedMetadata] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedFileTab, setSelectedFileTab] = useState(0);
  const [fileContents, setFileContents] = useState<{ [key: string]: string }>({});
  const [actionDialog, setActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'approved' | 'rejected' | 'consulted' | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const currentUser = authService.getUser();

  useEffect(() => {
    fetchNextAsset();
  }, []);

  useEffect(() => {
    if (currentAsset) {
      setEditedMetadata(currentAsset.metadata || {});
    }
  }, [currentAsset]);

  const fetchNextAsset = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/supervisor/next-review`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch next asset');
      }

      const data = await response.json();
      
      if (data.asset) {
        setCurrentAsset(data.asset);
        setAssetFiles(data.files || []);
        setHasNext(data.hasNext);
        setSelectedFileTab(0);
        setFileContents({});
        setSupervisorNotes('');
        
        // Load file contents
        data.files?.forEach((file: AssetFile) => {
          loadFileContent(file);
        });
      } else {
        // No more assets
        setSnackbar({
          open: true,
          message: 'No more assets to review!',
          severity: 'success'
        });
        setTimeout(() => navigate('/supervisor'), 2000);
      }
    } catch (error) {
      console.error('Error fetching next asset:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch next asset',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFileContent = async (file: AssetFile) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/api/qc/file/${encodeURIComponent(file.s3_key)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const content = await response.text();
        setFileContents(prev => ({
          ...prev,
          [file.s3_key]: content
        }));
      }
    } catch (error) {
      console.error(`Error loading file content for ${file.filename}:`, error);
    }
  };

  const handleMetadataChange = (field: string, value: any) => {
    setEditedMetadata((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAction = (action: 'approved' | 'rejected' | 'consulted') => {
    setSelectedAction(action);
    setActionDialog(true);
  };

  const handleConfirmAction = async () => {
    if (!currentAsset || !selectedAction) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/supervisor/review/${currentAsset.asset_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: selectedAction,
          notes: supervisorNotes,
          updatedMetadata: editedMetadata
        })
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: `Asset ${selectedAction} successfully`,
          severity: 'success'
        });
        
        setActionDialog(false);
        setSelectedAction(null);
        
        // Move to next asset
        setTimeout(() => {
          fetchNextAsset();
        }, 1000);
      } else {
        throw new Error(`Failed to ${selectedAction} asset`);
      }
    } catch (error) {
      console.error(`Error ${selectedAction} asset:`, error);
      setSnackbar({
        open: true,
        message: `Failed to ${selectedAction} asset`,
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/';
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'eml': return <Email />;
      case 'pdf': return <PictureAsPdf />;
      case 'txt': return <TextSnippet />;
      default: return <Description />;
    }
  };

  const renderFileContent = (file: AssetFile) => {
    const content = fileContents[file.s3_key];

    if (!content) {
      return <CircularProgress />;
    }

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{file.filename}</Typography>
          <Button
            startIcon={<Download />}
            onClick={() => {
              const token = localStorage.getItem('token');
              window.open(`${API_BASE}/api/qc/file-url/${encodeURIComponent(file.s3_key)}?token=${token}`);
            }}
          >
            Download
          </Button>
        </Box>

        {file.file_type.toLowerCase() === 'pdf' ? (
          <Box sx={{ height: 600, border: '1px solid #ccc' }}>
            <iframe
              src={`${API_BASE}/api/qc/file/${encodeURIComponent(file.s3_key)}?token=${localStorage.getItem('token')}`}
              width="100%"
              height="100%"
              title={file.filename}
            />
          </Box>
        ) : (
          <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto', bgcolor: 'grey.50' }}>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {content}
            </Typography>
          </Paper>
        )}
      </Box>
    );
  };

  const renderMetadataComparison = () => {
    if (!currentAsset?.metadata_before && !currentAsset?.metadata_after) {
      return null;
    }

    const before = currentAsset.metadata_before || {};
    const after = currentAsset.metadata_after || {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">
            <CompareArrows sx={{ mr: 1, verticalAlign: 'middle' }} />
            Metadata Changes by QC
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" gutterBottom>Original</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" gutterBottom>After QC</Typography>
            </Grid>
            {Array.from(allKeys).map((key) => {
              const beforeValue = before[key] || '';
              const afterValue = after[key] || '';
              const hasChanged = beforeValue !== afterValue;
              
              return (
                <React.Fragment key={key}>
                  <Grid item xs={6}>
                    <TextField
                      label={key}
                      value={beforeValue}
                      disabled
                      fullWidth
                      size="small"
                      sx={{ 
                        '& .MuiInputBase-input': { 
                          bgcolor: hasChanged ? '#ffebee' : 'transparent' 
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label={key}
                      value={afterValue}
                      disabled
                      fullWidth
                      size="small"
                      sx={{ 
                        '& .MuiInputBase-input': { 
                          bgcolor: hasChanged ? '#e8f5e8' : 'transparent' 
                        }
                      }}
                    />
                  </Grid>
                </React.Fragment>
              );
            })}
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentAsset) {
    return (
      <Container>
        <Alert severity="info">No assets available for supervisor review</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/supervisor')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Supervisor Review - {currentAsset.asset_id}
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {currentUser?.username} (Supervisor)
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<Logout />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          {/* Left side - File viewer */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ height: 'calc(100vh - 200px)' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={selectedFileTab} 
                  onChange={(_, newValue) => setSelectedFileTab(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {assetFiles.map((file, index) => (
                    <Tab 
                      key={file.id}
                      icon={getFileIcon(file.file_type)}
                      label={file.filename}
                      iconPosition="start"
                    />
                  ))}
                </Tabs>
              </Box>
              
              <Box sx={{ p: 2, height: 'calc(100% - 48px)', overflow: 'auto' }}>
                {assetFiles[selectedFileTab] && renderFileContent(assetFiles[selectedFileTab])}
              </Box>
            </Paper>
          </Grid>

          {/* Right side - Asset info and controls */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              {/* Asset Info */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Asset Information</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2">ID: {currentAsset.asset_id}</Typography>
                    <Chip 
                      label={currentAsset.deliverable_type} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  </Box>
                  <Typography variant="body2">Files: {assetFiles.length}</Typography>
                  <Typography variant="body2">Created: {new Date(currentAsset.created_date).toLocaleString()}</Typography>
                </CardContent>
              </Card>

              {/* QC Review Info */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>QC Review Details</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Person sx={{ mr: 1 }} />
                    <Box>
                      <Typography variant="body2">Uploader: {currentAsset.uploader_username}</Typography>
                      <Typography variant="body2">QC User: {currentAsset.qc_username}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Schedule sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      QC Date: {new Date(currentAsset.qc_completed_date).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label={`QC ${currentAsset.qc_action}`}
                      color={currentAsset.qc_action === 'approved' ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  {currentAsset.qc_reject_reason && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Reject Reason:
                      </Typography>
                      <Typography variant="body2">
                        {currentAsset.qc_reject_reason}
                      </Typography>
                    </Box>
                  )}
                  {currentAsset.qc_notes && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        QC Notes:
                      </Typography>
                      <Typography variant="body2">
                        {currentAsset.qc_notes}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Metadata comparison */}
              {renderMetadataComparison()}

              {/* Current Metadata Editor */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">Current Metadata</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    {Object.entries(editedMetadata).map(([key, value]) => (
                      <TextField
                        key={key}
                        label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        value={value as string}
                        onChange={(e) => handleMetadataChange(key, e.target.value)}
                        fullWidth
                        size="small"
                      />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Supervisor Notes */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Supervisor Notes</Typography>
                  <TextField
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="Add your supervisor review notes..."
                    value={supervisorNotes}
                    onChange={(e) => setSupervisorNotes(e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => handleAction('approved')}
                    disabled={submitting}
                    fullWidth
                    size="small"
                  >
                    Approve
                  </Button>
                </Grid>
                <Grid item xs={4}>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={() => handleAction('rejected')}
                    disabled={submitting}
                    fullWidth
                    size="small"
                  >
                    Reject
                  </Button>
                </Grid>
                <Grid item xs={4}>
                  <Button
                    variant="contained"
                    color="info"
                    startIcon={<ContactSupport />}
                    onClick={() => handleAction('consulted')}
                    disabled={submitting}
                    fullWidth
                    size="small"
                  >
                    Consult
                  </Button>
                </Grid>
              </Grid>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog} onClose={() => setActionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Confirm {selectedAction?.charAt(0).toUpperCase()}{selectedAction?.slice(1)} Action
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to {selectedAction} this asset?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Asset ID: {currentAsset?.asset_id}
          </Typography>
          {supervisorNotes && (
            <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Notes:</Typography>
              <Typography variant="body2">{supervisorNotes}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmAction} 
            variant="contained" 
            color={selectedAction === 'approved' ? 'success' : selectedAction === 'rejected' ? 'error' : 'info'}
          >
            Confirm {selectedAction?.charAt(0).toUpperCase()}{selectedAction?.slice(1)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SupervisorReview;