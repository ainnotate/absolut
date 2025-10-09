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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  SelectChangeEvent
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

// Define category and subcategory mappings
const categorySubcategories: Record<string, string[]> = {
  'Flight': ['Airline', 'Third-party provider'],
  'Hotel': ['Hotel', 'Third-party provider'],
  'Restaurant': ['Directly from restaurant', 'Reservation providers'],
  'Rental Car': ['Rental car companies', 'Third-party provider'],
  'Train': ['Train company', 'Third-party provider'],
  'Bus': ['Bus company', 'Third-party provider'],
  'Ferry': ['Ferry company'],
  'Movie': ['Movie theater', 'Movie ticket provider'],
  'Shows': ['Show ticket provider'],
  'Party Invitations': ['Invitation Provider – Text', 'Invitation Provider – Image'],
  'Appointments': ['Doctor Appointments']
};

const QCInterface: React.FC = () => {
  const navigate = useNavigate();
  const { batchId } = useParams<{ batchId: string }>();
  const [currentAsset, setCurrentAsset] = useState<Asset | null>(null);
  const [assetFiles, setAssetFiles] = useState<AssetFile[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editedMetadata, setEditedMetadata] = useState<any>({});
  const [sendToSupervisor, setSendToSupervisor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileContents, setFileContents] = useState<{ [key: string]: string }>({});
  const [translatedContent, setTranslatedContent] = useState<{ [key: string]: string }>({});
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [assetStatus, setAssetStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [localRejectReason, setLocalRejectReason] = useState('');

  const currentUser = authService.getUser();

  useEffect(() => {
    if (batchId) {
      fetchNextAsset();
    }
  }, [batchId]);

  useEffect(() => {
    if (currentAsset) {
      setEditedMetadata(currentAsset.metadata || {});
      setAssetStatus('pending');
      setLocalRejectReason('');
      
      // Initialize booking category dropdowns
      const bookingCategory = currentAsset.metadata?.bookingCategory || '';
      if (bookingCategory.includes(' - ')) {
        const [category, subcategory] = bookingCategory.split(' - ');
        setSelectedCategory(category);
        setSelectedSubcategory(subcategory);
      } else {
        setSelectedCategory('');
        setSelectedSubcategory('');
      }
    }
  }, [currentAsset]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Don't handle shortcuts if reject dialog is open
      if (rejectDialog) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'a':
          event.preventDefault();
          handleApprove();
          break;
        case 'r':
          event.preventDefault();
          handleReject();
          break;
        case 's':
          event.preventDefault();
          if (canSubmit()) {
            handleSubmit();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [assetStatus, rejectDialog]);

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
        setFileContents({});
        setTranslatedContent({});
        setAssetStatus('pending');
        setLocalRejectReason('');
        
        // Load file contents and auto-translate
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
      let content = '';
      
      if (file.file_type.toLowerCase() === 'pdf') {
        // Extract text from PDF using the new endpoint
        const response = await fetch(`${API_BASE}/api/qc/pdf-text/${encodeURIComponent(file.s3_key)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const pdfData = await response.json();
          content = pdfData.text;
        }
      } else {
        // Load content directly for non-PDF files
        const response = await fetch(`${API_BASE}/api/qc/file/${encodeURIComponent(file.s3_key)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          content = await response.text();
        }
      }
      
      if (content) {
        setFileContents(prev => ({
          ...prev,
          [file.s3_key]: content
        }));
        
        // Auto-translate the content
        handleTranslate(file.s3_key, content);
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

  const handleCategorySelect = (value: string) => {
    setSelectedCategory(value);
    setSelectedSubcategory(''); // Reset subcategory when category changes
    setEditedMetadata((prev: any) => ({ ...prev, bookingCategory: '' })); // Reset the combined value
  };

  const handleSubcategorySelect = (value: string) => {
    setSelectedSubcategory(value);
    // Combine category and subcategory for backend
    if (selectedCategory && value) {
      setEditedMetadata((prev: any) => ({ ...prev, bookingCategory: `${selectedCategory} - ${value}` }));
    }
  };

  const handleTranslate = async (fileKey: string, content: string) => {
    try {
      const token = localStorage.getItem('token');
      
      // Call the real translation API
      const response = await fetch(`${API_BASE}/api/translation/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: content,
          targetLanguage: 'en', // Default to English, can be made configurable
          sourceLanguage: 'auto' // Auto-detect source language
        })
      });

      if (response.ok) {
        const translationResult = await response.json();
        setTranslatedContent(prev => ({
          ...prev,
          [fileKey]: translationResult.translatedText
        }));
        
        // Show success message with detected language
        setSnackbar({
          open: true,
          message: `Translated from ${translationResult.sourceLanguage} to ${translationResult.targetLanguage}`,
          severity: 'success'
        });
      } else {
        throw new Error('Translation failed');
      }
    } catch (error) {
      console.error('Error translating content:', error);
      setSnackbar({
        open: true,
        message: 'Translation failed. Please try again.',
        severity: 'error'
      });
    }
  };

  const canSubmit = () => {
    return assetStatus !== 'pending';
  };

  const handleApprove = () => {
    setAssetStatus('approved');
    setLocalRejectReason('');
    setSnackbar({
      open: true,
      message: 'Asset marked as approved',
      severity: 'success'
    });
  };

  const handleReject = () => {
    setRejectDialog(true);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      setSnackbar({
        open: true,
        message: 'Please provide a reason for rejection',
        severity: 'error'
      });
      return;
    }
    setAssetStatus('rejected');
    setLocalRejectReason(rejectReason);
    setRejectDialog(false);
    setSnackbar({
      open: true,
      message: 'Asset marked as rejected',
      severity: 'success'
    });
    setRejectReason('');
  };

  const handleSubmit = async () => {
    if (!currentAsset || !canSubmit()) return;

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
          action: assetStatus,
          rejectReason: assetStatus === 'rejected' ? localRejectReason : undefined,
          updatedMetadata: editedMetadata,
          sendToSupervisor,
          notes: ''
        })
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: `Asset ${assetStatus} and submitted successfully`,
          severity: 'success'
        });
        
        // Reset form
        setSendToSupervisor(false);
        setAssetStatus('pending');
        setLocalRejectReason('');
        
        // Move to next asset
        setTimeout(() => {
          fetchNextAsset();
        }, 1000);
      } else {
        throw new Error(`Failed to submit asset`);
      }
    } catch (error) {
      console.error(`Error submitting asset:`, error);
      setSnackbar({
        open: true,
        message: `Failed to submit asset`,
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

    if (!content) {
      return <CircularProgress />;
    }

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{file.filename}</Typography>
          <Button
            startIcon={<Translate />}
            onClick={() => handleTranslate(file.s3_key, content)}
            disabled={!content}
          >
            Re-translate
          </Button>
        </Box>

        {file.file_type.toLowerCase() === 'pdf' ? (
          <Stack spacing={3}>
            {/* PDF Viewer */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                PDF Document
              </Typography>
              <Box sx={{ height: 400, border: '1px solid #ccc', overflow: 'hidden' }}>
                <object
                  data={`${API_BASE}/api/qc/file/${encodeURIComponent(file.s3_key)}?token=${localStorage.getItem('token')}`}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  aria-label={file.filename}
                >
                  <embed
                    src={`${API_BASE}/api/qc/file/${encodeURIComponent(file.s3_key)}?token=${localStorage.getItem('token')}`}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                  />
                  <p>Your browser does not support PDFs. 
                    <a href={`${API_BASE}/api/qc/file/${encodeURIComponent(file.s3_key)}?token=${localStorage.getItem('token')}`}>
                      Download the PDF
                    </a>
                  </p>
                </object>
              </Box>
            </Box>

            {/* Translation */}
            {translation && (
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Translation
                </Typography>
                <Paper sx={{ p: 2, maxHeight: 300, overflow: 'auto', bgcolor: 'lightblue', opacity: 0.8 }}>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {translation}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Stack>
        ) : (
          <Stack spacing={3}>
            {/* Original Content */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Original Content
              </Typography>
              <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto', bgcolor: 'grey.50' }}>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {content}
                </Typography>
              </Paper>
            </Box>
            
            {/* Action Buttons */}
            <Box>
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
                <Button
                  variant={assetStatus === 'approved' ? 'contained' : 'outlined'}
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={handleApprove}
                  disabled={submitting}
                  size="large"
                  sx={{ minWidth: 150 }}
                >
                  {assetStatus === 'approved' ? '✓ Approved' : 'Approve (a)'}
                </Button>
                <Button
                  variant={assetStatus === 'rejected' ? 'contained' : 'outlined'}
                  color="error"
                  startIcon={<Cancel />}
                  onClick={handleReject}
                  disabled={submitting}
                  size="large"
                  sx={{ minWidth: 150 }}
                >
                  {assetStatus === 'rejected' ? '✗ Rejected' : 'Reject (r)'}
                </Button>
              </Stack>
              
              {/* Status Display */}
              {assetStatus !== 'pending' && (
                <Box sx={{ textAlign: 'center', p: 1.5, mt: 1.5, bgcolor: 'grey.100', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Status: <strong>{assetStatus === 'approved' ? 'Approved' : `Rejected - ${localRejectReason}`}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Press 's' or click Submit to save and continue
                  </Typography>
                </Box>
              )}
            </Box>
            
            {/* Translation Section */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Translation
              </Typography>
              <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto', bgcolor: 'blue.50', border: '1px solid', borderColor: 'primary.light' }}>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {translation || 'Translation loading...'}
                </Typography>
              </Paper>
            </Box>
          </Stack>
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

      <Box sx={{ p: 2 }}>
        <Grid container spacing={3}>
          {/* Left side - File viewer */}
          <Grid item xs={12} md={8}>
            <Box sx={{ height: 'calc(100vh - 120px)', overflow: 'auto' }}>
              {assetFiles.map((file, index) => (
                <Box key={file.id} sx={{ mb: index < assetFiles.length - 1 ? 3 : 0 }}>
                  {renderFileContent(file)}
                </Box>
              ))}
            </Box>
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
                    {/* Asset Owner Gender */}
                    <FormControl fullWidth size="small">
                      <InputLabel>Asset Owner Gender</InputLabel>
                      <Select
                        value={editedMetadata.assetOwnerGender || ''}
                        onChange={(e) => handleMetadataChange('assetOwnerGender', e.target.value)}
                        label="Asset Owner Gender"
                      >
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                        <MenuItem value="Others">Others</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Asset Owner Age */}
                    <TextField
                      label="Asset Owner Age"
                      type="number"
                      value={editedMetadata.assetOwnerAge || ''}
                      onChange={(e) => handleMetadataChange('assetOwnerAge', e.target.value)}
                      fullWidth
                      size="small"
                    />

                    {/* Locale */}
                    <FormControl fullWidth size="small">
                      <InputLabel>Locale</InputLabel>
                      <Select
                        value={editedMetadata.locale || ''}
                        onChange={(e) => handleMetadataChange('locale', e.target.value)}
                        label="Locale"
                      >
                        <MenuItem value="zh_TW">zh_TW - Traditional Chinese (Taiwan 🇹🇼)</MenuItem>
                        <MenuItem value="zh_HK">zh_HK - Traditional Chinese (Hong Kong 🇭🇰)</MenuItem>
                        <MenuItem value="vi_VN">vi_VN - Vietnamese (Vietnam 🇻🇳)</MenuItem>
                        <MenuItem value="nl_NL">nl_NL - Dutch (Netherlands 🇳🇱)</MenuItem>
                        <MenuItem value="nl_BE">nl_BE - Dutch / Flemish (Belgium 🇧🇪)</MenuItem>
                        <MenuItem value="da_DK">da_DK - Danish (Denmark 🇩🇰)</MenuItem>
                        <MenuItem value="sv_SE">sv_SE - Swedish (Sweden 🇸🇪)</MenuItem>
                        <MenuItem value="nb_NO">nb_NO - Norwegian - Bokmål (Norway 🇳🇴)</MenuItem>
                        <MenuItem value="tr_TR">tr_TR - Turkish (Turkey 🇹🇷)</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Source Name */}
                    <TextField
                      label="Source Name"
                      value={editedMetadata.sourceName || ''}
                      onChange={(e) => handleMetadataChange('sourceName', e.target.value)}
                      fullWidth
                      size="small"
                      placeholder="e.g., agoda.com, booking.com"
                    />

                    {/* Booking Category */}
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        <strong>Booking Category</strong>
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Category</InputLabel>
                            <Select
                              value={selectedCategory}
                              onChange={(e) => handleCategorySelect(e.target.value)}
                              label="Category"
                            >
                              {Object.keys(categorySubcategories).map((cat) => (
                                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small" disabled={!selectedCategory}>
                            <InputLabel>Subcategory</InputLabel>
                            <Select
                              value={selectedSubcategory}
                              onChange={(e) => handleSubcategorySelect(e.target.value)}
                              label="Subcategory"
                            >
                              {selectedCategory && categorySubcategories[selectedCategory]?.map((subcat) => (
                                <MenuItem key={subcat} value={subcat}>{subcat}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                      {editedMetadata.bookingCategory && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Selected: {editedMetadata.bookingCategory}
                        </Typography>
                      )}
                    </Box>

                    {/* Booking Type */}
                    <FormControl fullWidth size="small">
                      <InputLabel>Booking Type</InputLabel>
                      <Select
                        value={editedMetadata.bookingType || ''}
                        onChange={(e) => handleMetadataChange('bookingType', e.target.value)}
                        label="Booking Type"
                      >
                        <MenuItem value="Invitation">Invitation</MenuItem>
                        <MenuItem value="Confirmation">Confirmation</MenuItem>
                        <MenuItem value="Modification">Modification</MenuItem>
                        <MenuItem value="Cancellation">Cancellation</MenuItem>
                        <MenuItem value="Deliverable Type">Deliverable Type</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </AccordionDetails>
              </Accordion>


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
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<Save />}
                      onClick={handleSubmit}
                      disabled={submitting || !canSubmit()}
                      fullWidth
                    >
                      {submitting ? 'Submitting...' : canSubmit() ? 'Submit & Next (s)' : 'Mark Approve/Reject First'}
                    </Button>
                  </Box>
                </Box>
              </Card>

            </Stack>
          </Grid>
        </Grid>
      </Box>

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