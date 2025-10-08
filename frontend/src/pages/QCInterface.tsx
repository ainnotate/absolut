import React, { useState, useEffect, useCallback } from 'react';
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
  TextField,
  FormControl,
  FormControlLabel,
  Select,
  MenuItem,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  InputLabel,
  Chip,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Logout,
  CheckCircle,
  Cancel,
  Save,
  ArrowBack,
  NavigateBefore,
  NavigateNext,
  Edit,
  Translate,
  ExpandMore,
  Description,
  PictureAsPdf,
  Email,
  TextSnippet,
  Download,
  Visibility
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../services/authService';

interface Asset {
  id: number;
  asset_id: string;
  user_id: number;
  deliverable_type: string;
  metadata: any;
  created_date: string;
  uploader_username: string;
  uploader_email: string;
  qc_status: string;
  qc_notes?: string;
}

interface AssetFile {
  id: number;
  filename: string;
  file_type: string;
  s3_key: string;
}

const API_BASE = 'http://192.168.29.158:5003';

const QCInterface: React.FC = () => {
  const navigate = useNavigate();
  const { batchId } = useParams<{ batchId: string }>();
  const [currentAsset, setCurrentAsset] = useState<Asset | null>(null);
  const [assetFiles, setAssetFiles] = useState<AssetFile[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editedMetadata, setEditedMetadata] = useState<any>({});
  const [qcNotes, setQcNotes] = useState('');
  const [sendToSupervisor, setSendToSupervisor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFileTab, setSelectedFileTab] = useState(0);
  const [fileContents, setFileContents] = useState<{ [key: string]: string }>({});
  const [translatedContent, setTranslatedContent] = useState<{ [key: string]: string }>({});
  const [showTranslation, setShowTranslation] = useState<{ [key: string]: boolean }>({});
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const currentUser = authService.getUser();

  useEffect(() => {
    if (batchId) {
      fetchNextAsset();
    }
  }, [batchId]);

  useEffect(() => {
    if (currentAsset) {
      setEditedMetadata(currentAsset.metadata || {});
      setQcNotes(currentAsset.qc_notes || '');
    }
  }, [currentAsset]);

  const fetchNextAsset = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/qc/batch/${batchId}/next`, {
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
        setTranslatedContent({});
        setShowTranslation({});
        
        // Load file contents
        data.files?.forEach((file: AssetFile) => {
          loadFileContent(file);
        });
      } else {
        // No more assets
        setSnackbar({
          open: true,
          message: 'No more assets to review in this batch!',
          severity: 'success'
        });
        setTimeout(() => navigate('/qc'), 2000);
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

  const handleTranslate = async (fileKey: string, content: string) => {
    try {
      // Mock translation - in real implementation, call translation service
      const mockTranslation = `[TRANSLATED] ${content}`;
      setTranslatedContent(prev => ({
        ...prev,
        [fileKey]: mockTranslation
      }));
      setShowTranslation(prev => ({
        ...prev,
        [fileKey]: true
      }));
    } catch (error) {
      console.error('Error translating content:', error);
    }
  };

  const handleApprove = async () => {
    await submitReview('approved');
  };

  const handleReject = () => {
    setRejectDialog(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setSnackbar({
        open: true,
        message: 'Please provide a reason for rejection',
        severity: 'error'
      });
      return;
    }
    setRejectDialog(false);
    await submitReview('rejected', rejectReason);
    setRejectReason('');
  };

  const submitReview = async (action: 'approved' | 'rejected', reason?: string) => {
    if (!currentAsset) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/qc/review/${currentAsset.asset_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          rejectReason: reason,
          updatedMetadata: editedMetadata,
          sendToSupervisor,
          notes: qcNotes
        })
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: `Asset ${action} successfully`,
          severity: 'success'
        });
        
        // Reset form
        setSendToSupervisor(false);
        setQcNotes('');
        
        // Move to next asset
        setTimeout(() => {
          fetchNextAsset();
        }, 1000);
      } else {
        throw new Error(`Failed to ${action} asset`);
      }
    } catch (error) {
      console.error(`Error ${action} asset:`, error);
      setSnackbar({
        open: true,
        message: `Failed to ${action} asset`,
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
    const translation = translatedContent[file.s3_key];
    const showTrans = showTranslation[file.s3_key];

    if (!content) {
      return <CircularProgress />;
    }

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{file.filename}</Typography>
          <Stack direction="row" spacing={1}>
            <Button
              startIcon={<Translate />}
              onClick={() => handleTranslate(file.s3_key, content)}
              disabled={!content}
            >
              Translate
            </Button>
            <Button
              startIcon={<Download />}
              onClick={() => {
                // Download file
                const token = localStorage.getItem('token');
                window.open(`${API_BASE}/api/qc/file-url/${encodeURIComponent(file.s3_key)}?token=${token}`);
              }}
            >
              Download
            </Button>
          </Stack>
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
          <>
            <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto', bgcolor: 'grey.50' }}>
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {showTrans ? translation : content}
              </Typography>
            </Paper>
            
            {translation && (
              <Box sx={{ mt: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowTranslation(prev => ({
                    ...prev,
                    [file.s3_key]: !showTrans
                  }))}
                >
                  {showTrans ? 'Show Original' : 'Show Translation'}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
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
        <Alert severity="info">No assets available for review</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/qc')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            QC Review - {currentAsset.asset_id}
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {currentUser?.username} (QC)
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

          {/* Right side - Metadata and controls */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              {/* Asset Info */}
              <Card>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Asset Information</Typography>
                  <Typography variant="body2">ID: {currentAsset.asset_id}</Typography>
                  <Typography variant="body2">Type: {currentAsset.deliverable_type}</Typography>
                  <Typography variant="body2">Uploader: {currentAsset.uploader_username}</Typography>
                  <Typography variant="body2">Created: {new Date(currentAsset.created_date).toLocaleString()}</Typography>
                  <Typography variant="body2">Files: {assetFiles.length}</Typography>
                </Box>
              </Card>

              {/* Metadata Editor */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">Metadata</Typography>
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

              {/* QC Notes */}
              <Card>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>QC Notes</Typography>
                  <TextField
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="Add your review notes..."
                    value={qcNotes}
                    onChange={(e) => setQcNotes(e.target.value)}
                  />
                </Box>
              </Card>

              {/* Supervisor Consultation */}
              <Card>
                <Box sx={{ p: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sendToSupervisor}
                        onChange={(e) => setSendToSupervisor(e.target.checked)}
                      />
                    }
                    label="Send to Supervisor for Review"
                  />
                </Box>
              </Card>

              {/* Action Buttons */}
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={handleApprove}
                  disabled={submitting}
                  fullWidth
                >
                  Approve
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={handleReject}
                  disabled={submitting}
                  fullWidth
                >
                  Reject
                </Button>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Asset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for Rejection"
            multiline
            rows={4}
            fullWidth
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Please provide a clear reason for rejecting this asset..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmReject} variant="contained" color="error">
            Reject Asset
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

export default QCInterface;