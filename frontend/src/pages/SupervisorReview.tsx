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
  TextField,
  CircularProgress,
  Stack,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Logout,
  CheckCircle,
  Cancel,
  Save,
  ArrowBack,
  Description,
  PictureAsPdf,
  Email,
  TextSnippet,
  ExpandMore,
  Translate,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5003/api';

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

interface AssetDetails {
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
  uploader_name?: string;
  uploader_email?: string;
  qc_username?: string;
  qc_email?: string;
}

interface FileDetails {
  id: number;
  filename: string;
  file_type: string;
  s3_key: string;
  md5_hash: string;
  upload_date: string;
}

const SupervisorReview: React.FC = () => {
  const navigate = useNavigate();
  const { assetId } = useParams<{ assetId: string }>();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [assetFiles, setAssetFiles] = useState<FileDetails[]>([]);
  const [fileContents, setFileContents] = useState<{ [key: string]: string }>({});
  const [translatedContent, setTranslatedContent] = useState<{ [key: string]: string }>({});
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [assetStatus, setAssetStatus] = useState<'approved' | 'rejected'>('approved');
  const [editedMetadata, setEditedMetadata] = useState<any>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Sequential review state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [assetList, setAssetList] = useState<string[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    if (assetId) {
      loadAsset();
    }
    loadSequentialReviewState();
  }, [assetId]);

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

  const loadSequentialReviewState = () => {
    const storedList = sessionStorage.getItem('supervisorAssetList');
    const storedIndex = sessionStorage.getItem('supervisorAssetIndex');
    
    if (storedList && storedIndex) {
      const list = JSON.parse(storedList);
      const index = parseInt(storedIndex);
      setAssetList(list);
      setCurrentIndex(index);
      setHasNext(index < list.length - 1);
      setHasPrevious(index > 0);
    }
  };

  const loadAsset = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/supervisor/assets/${assetId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAsset(data.asset);
        setAssetFiles(data.files);
        
        // Set initial status from QC decision
        if (data.asset.qc_status) {
          setAssetStatus(data.asset.qc_status as 'approved' | 'rejected');
        }
        if (data.asset.supervisor_notes) {
          setSupervisorNotes(data.asset.supervisor_notes);
        }
        
        // Initialize metadata for editing
        setEditedMetadata(data.asset.metadata || {});
        
        // Initialize booking category dropdowns
        const bookingCategory = data.asset.metadata?.bookingCategory || '';
        if (bookingCategory.includes(' - ')) {
          const [category, subcategory] = bookingCategory.split(' - ');
          setSelectedCategory(category);
          setSelectedSubcategory(subcategory);
        }

        // Load file contents and auto-translate
        setFileContents({});
        setTranslatedContent({});
        data.files?.forEach((file: FileDetails) => {
          loadFileContent(file);
        });
      } else {
        const errorData = await response.json();
        setSnackbar({ open: true, message: errorData.error || 'Failed to load asset', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to load asset', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadFileContent = async (file: FileDetails) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/qc/file/${encodeURIComponent(file.s3_key)}?token=${token}`);
      
      if (response.ok) {
        const content = await response.text();
        setFileContents(prev => ({
          ...prev,
          [file.s3_key]: content
        }));
        
        // Auto-translate the content
        handleTranslate(file.s3_key, content);
      }
    } catch (error) {
      console.error('Error loading file content:', error);
    }
  };

  const handleTranslate = async (fileKey: string, content: string) => {
    try {
      const token = localStorage.getItem('token');
      
      // Call the real translation API
      const response = await fetch(`${API_URL}/translation/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: content,
          targetLanguage: 'en', // Translate to English
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

  const handleApprove = () => {
    setAssetStatus('approved');
    setSnackbar({
      open: true,
      message: 'Asset marked as approved',
      severity: 'success'
    });
  };

  const handleReject = () => {
    setAssetStatus('rejected');
    setSnackbar({
      open: true,
      message: 'Asset marked as rejected',
      severity: 'success'
    });
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

  const canSubmit = () => {
    return assetStatus && (assetStatus !== asset?.qc_status || supervisorNotes.trim() || JSON.stringify(editedMetadata) !== JSON.stringify(asset?.metadata));
  };

  const handleSubmit = async () => {
    if (!asset || !canSubmit()) return;

    try {
      setSubmitting(true);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/supervisor/assets/${assetId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: assetStatus,
          supervisor_notes: supervisorNotes,
          updated_metadata: editedMetadata
        })
      });

      if (response.ok) {
        setSnackbar({ open: true, message: 'Supervisor review submitted successfully', severity: 'success' });
        
        // Auto-navigate to next asset if in sequential review mode
        setTimeout(() => {
          if (hasNext) {
            navigateToNext();
          } else {
            navigateBackToDashboard();
          }
        }, 1500);
      } else {
        const errorData = await response.json();
        setSnackbar({ open: true, message: errorData.error || 'Failed to submit review', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to submit review', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const navigateToNext = () => {
    if (hasNext && currentIndex < assetList.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextAssetId = assetList[nextIndex];
      sessionStorage.setItem('supervisorAssetIndex', nextIndex.toString());
      navigate(`/supervisor/review/${nextAssetId}`);
    }
  };

  const navigateToPrevious = () => {
    if (hasPrevious && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevAssetId = assetList[prevIndex];
      sessionStorage.setItem('supervisorAssetIndex', prevIndex.toString());
      navigate(`/supervisor/review/${prevAssetId}`);
    }
  };

  const navigateBackToDashboard = () => {
    navigate('/supervisor/dashboard');
  };

  const handleLogout = async () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'eml': return <Email />;
      case 'pdf': return <PictureAsPdf />;
      case 'txt': return <TextSnippet />;
      default: return <Description />;
    }
  };

  const renderFileContent = (file: FileDetails) => {
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
              <Box sx={{ height: 600, border: '1px solid #ccc', overflow: 'hidden' }}>
                <object
                  data={`${API_URL}/qc/file/${encodeURIComponent(file.s3_key)}?token=${localStorage.getItem('token')}`}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  aria-label={file.filename}
                >
                  <embed
                    src={`${API_URL}/qc/file/${encodeURIComponent(file.s3_key)}?token=${localStorage.getItem('token')}`}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                  />
                  <p>Your browser does not support PDFs. 
                    <a href={`${API_URL}/qc/file/${encodeURIComponent(file.s3_key)}?token=${localStorage.getItem('token')}`}>
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
                  disabled={submitting || asset?.qc_status === 'approved'}
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
                  disabled={submitting || asset?.qc_status === 'rejected'}
                  size="large"
                  sx={{ minWidth: 150 }}
                >
                  {assetStatus === 'rejected' ? '✗ Rejected' : 'Reject (r)'}
                </Button>
              </Stack>
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

  if (!asset) {
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
          <IconButton color="inherit" onClick={navigateBackToDashboard}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Supervisor Review - {asset.asset_id}
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {currentUser?.username} (Supervisor)
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<Logout />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        <Grid container spacing={3}>
          {/* Left side - File viewer and buttons (same as QC interface) */}
          <Grid item xs={12} md={8}>
            <Box sx={{ height: 'calc(100vh - 120px)', overflow: 'auto' }}>
              {assetFiles.map((file, index) => (
                <Box key={file.id} sx={{ mb: index < assetFiles.length - 1 ? 3 : 0 }}>
                  {renderFileContent(file)}
                </Box>
              ))}
            </Box>
          </Grid>

          {/* Right side - Supervisor controls */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              {/* Asset Info */}
              <Card>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Asset Information</Typography>
                  <Typography variant="body2">ID: {asset.asset_id}</Typography>
                  <Typography variant="body2">Type: {asset.deliverable_type}</Typography>
                  <Typography variant="body2">Uploader: {asset.uploader_name || 'N/A'}</Typography>
                  <Typography variant="body2">Created: {new Date(asset.created_date).toLocaleString()}</Typography>
                  <Typography variant="body2">Files: {assetFiles.length}</Typography>
                </Box>
              </Card>

              {/* Editable Metadata */}
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
                              {Object.keys(categorySubcategories).map((category) => (
                                <MenuItem key={category} value={category}>
                                  {category}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Subcategory</InputLabel>
                            <Select
                              value={selectedSubcategory}
                              onChange={(e) => handleSubcategorySelect(e.target.value)}
                              label="Subcategory"
                              disabled={!selectedCategory}
                            >
                              {selectedCategory && categorySubcategories[selectedCategory]?.map((subcategory) => (
                                <MenuItem key={subcategory} value={subcategory}>
                                  {subcategory}
                                </MenuItem>
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

              {/* Supervisor Notes */}
              <Card>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Supervisor Notes</Typography>
                  <TextField
                    multiline
                    rows={4}
                    fullWidth
                    placeholder="Add guidance notes for the QC team..."
                    value={supervisorNotes}
                    onChange={(e) => setSupervisorNotes(e.target.value)}
                  />
                </Box>
              </Card>

              {/* Submit Button */}
              <Card>
                <Box sx={{ p: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Save />}
                    onClick={handleSubmit}
                    disabled={submitting || !canSubmit()}
                    fullWidth
                    size="large"
                  >
                    {submitting ? 'Submitting...' : canSubmit() ? 'Submit Review' : 'No Changes to Submit'}
                  </Button>
                </Box>
              </Card>

            </Stack>
          </Grid>
        </Grid>
      </Box>

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