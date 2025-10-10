import React, { useState, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Button,
  TextField,
  Grid,
  Alert,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  SelectChangeEvent,
  AppBar,
  Toolbar,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useDropzone } from 'react-dropzone';
import { authService } from '../services/authService';
import { User } from '../types';

const API_BASE = 'http://localhost:5003';

type CategoryType = '.eml' | '.eml + pdf' | '.txt';

interface FileWithPreview extends File {
  preview?: string;
}

interface MetadataFields {
  assetOwnerGender?: string;
  assetOwnerAge?: string;
  locale?: string;
  sourceName?: string;
  bookingCategory?: string;
  bookingType?: string;
}

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

const UploaderDashboard: React.FC = () => {
  const user: User | null = authService.getUser();
  const [category, setCategory] = useState<CategoryType>('.eml');
  const [emlFile, setEmlFile] = useState<FileWithPreview | null>(null);
  const [pdfFile, setPdfFile] = useState<FileWithPreview | null>(null);
  const [txtFile, setTxtFile] = useState<FileWithPreview | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [metadata, setMetadata] = useState<MetadataFields>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [duplicateDialog, setDuplicateDialog] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState<string>('');
  const [guidelinesDialog, setGuidelinesDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [termsDialog, setTermsDialog] = useState(false);

  const handleLogout = () => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.disableAutoSelect();
      try {
        window.google.accounts.id.cancel();
      } catch (e) {
        // Ignore if no active flow
      }
    }
    
    authService.logout();
    localStorage.removeItem('g_state');
    sessionStorage.clear();
    window.location.href = '/';
  };

  const handleCategoryChange = (event: SelectChangeEvent<CategoryType>) => {
    setCategory(event.target.value as CategoryType);
    // Reset files when category changes
    setEmlFile(null);
    setPdfFile(null);
    setTxtFile(null);
    setTextContent('');
    setError('');
    setSuccess('');
  };

  const handleMetadataChange = (field: keyof MetadataFields) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setMetadata({ ...metadata, [field]: event.target.value });
  };

  const handleCategorySelect = (value: string) => {
    setSelectedCategory(value);
    setSelectedSubcategory(''); // Reset subcategory when category changes
    setMetadata({ ...metadata, bookingCategory: '' }); // Reset the combined value
  };

  const handleSubcategorySelect = (value: string) => {
    setSelectedSubcategory(value);
    // Combine category and subcategory for backend
    if (selectedCategory && value) {
      setMetadata({ ...metadata, bookingCategory: `${selectedCategory} - ${value}` });
    }
  };

  const onDropEml = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setEmlFile(file);
      setError('');
    }
  }, []);

  const onDropPdf = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setPdfFile(file);
      setError('');
    }
  }, []);

  const onDropTxt = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setTxtFile(file);
      // Read file content
      const reader = new FileReader();
      reader.onload = (e) => {
        setTextContent(e.target?.result as string);
      };
      reader.readAsText(file);
      setError('');
    }
  }, []);

  const emlDropzone = useDropzone({
    onDrop: onDropEml,
    maxFiles: 1,
    multiple: false,
    noClick: false,
    noKeyboard: false,
    disabled: false
  });

  const pdfDropzone = useDropzone({
    onDrop: onDropPdf,
    maxFiles: 1,
    multiple: false,
    noClick: false,
    noKeyboard: false,
    disabled: false
  });

  const txtDropzone = useDropzone({
    onDrop: onDropTxt,
    maxFiles: 1,
    multiple: false,
    noClick: false,
    noKeyboard: false,
    disabled: false
  });

  const removeFile = (type: 'eml' | 'pdf' | 'txt') => {
    switch (type) {
      case 'eml':
        setEmlFile(null);
        break;
      case 'pdf':
        setPdfFile(null);
        break;
      case 'txt':
        setTxtFile(null);
        setTextContent('');
        break;
    }
  };

  const validateForm = (): boolean => {
    if (category === '.eml' && !emlFile) {
      setError('Please upload an .eml file');
      return false;
    }
    if (category === '.eml + pdf' && (!emlFile || !pdfFile)) {
      setError('Please upload both .eml and PDF files');
      return false;
    }
    if (category === '.txt' && !txtFile && !textContent.trim()) {
      setError('Please upload a .txt file or enter text content');
      return false;
    }
    if (!metadata.assetOwnerGender || !metadata.assetOwnerAge || !metadata.locale || 
        !metadata.sourceName || !metadata.bookingCategory || !metadata.bookingType) {
      setError('Please fill in all required metadata fields');
      return false;
    }
    if (!termsAgreed) {
      setError('Please read and agree to the terms');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('category', category);
    
    if (emlFile) formData.append('emlFile', emlFile);
    if (pdfFile) formData.append('pdfFile', pdfFile);
    if (txtFile) {
      formData.append('txtFile', txtFile);
    } else if (textContent && category === '.txt') {
      formData.append('textContent', textContent);
    }
    
    formData.append('metadata', JSON.stringify(metadata));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle duplicate file conflict specially
        if (response.status === 409) {
          let userFriendlyMessage = 'Duplicate file detected';
          
          // Extract file type from backend message and create user-friendly message
          const backendMessage = errorData.error || '';
          if (backendMessage.includes('EML file')) {
            userFriendlyMessage = 'EML file already exists';
          } else if (backendMessage.includes('PDF file')) {
            userFriendlyMessage = 'PDF file already exists';
          } else if (backendMessage.includes('Text') || backendMessage.includes('TXT')) {
            userFriendlyMessage = 'Text file already exists';
          }
          
          setDuplicateMessage(userFriendlyMessage);
          setDuplicateDialog(true);
          return;
        }
        
        throw new Error(errorData.error || errorData.detail || 'Upload failed');
      }

      const result = await response.json();
      setSuccess('Files uploaded successfully!');
      
      // Reset form
      setEmlFile(null);
      setPdfFile(null);
      setTxtFile(null);
      setTextContent('');
      setMetadata({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };


  const DropzoneArea = ({ dropzone, file, type, label }: any) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const droppedFile = e.dataTransfer.files[0];
        handleFileChange(droppedFile, type);
      }
    };

    const handleClick = () => {
      console.log('Dropzone clicked, opening file dialog');
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileChange(e.target.files[0], type);
      }
    };

    const handleFileChange = (selectedFile: File, fileType: string) => {
      switch (fileType) {
        case 'eml':
          setEmlFile(selectedFile);
          break;
        case 'pdf':
          setPdfFile(selectedFile);
          break;
        case 'txt':
          setTxtFile(selectedFile);
          const reader = new FileReader();
          reader.onload = (e) => {
            setTextContent(e.target?.result as string);
          };
          reader.readAsText(selectedFile);
          break;
      }
      setError('');
    };
    
    return (
      <Paper
        sx={{
          p: 3,
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'grey.400',
          backgroundColor: dragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.3s',
          minHeight: '150px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          },
          '&:focus': {
            outline: 'none',
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          }
        }}
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        tabIndex={0}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          accept={type === 'eml' ? '.eml' : type === 'pdf' ? '.pdf' : '.txt'}
        />
        {file ? (
          <Box sx={{ textAlign: 'center' }}>
            <InsertDriveFileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="body1" gutterBottom>
              {file.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {(file.size / 1024).toFixed(2)} KB
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                removeFile(type);
              }}
              sx={{ ml: 2 }}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {dragActive ? 'Drop file here' : `Drag & drop ${label} here`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click anywhere in this area to select file
            </Typography>
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Absolute Booking Data Collection Platform - Upload Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {user && (
              <>
                <Avatar src={user.profile_picture} sx={{ width: 32, height: 32 }}>
                  {user.first_name?.[0] || user.username[0]}
                </Avatar>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <Typography variant="body2">
                    {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                  </Typography>
                  <Chip 
                    label={user.role === 'upload_user' ? 'Upload User' : user.role} 
                    size="small" 
                    color="success"
                  />
                </Box>
              </>
            )}
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          Document Upload
        </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload Documents
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Deliverable Type</InputLabel>
                <Select
                  value={category}
                  onChange={handleCategoryChange}
                  label="Deliverable Type"
                >
                  <MenuItem value=".eml">Raw Email</MenuItem>
                  <MenuItem value=".eml + pdf">Email + Attachment</MenuItem>
                  <MenuItem value=".txt">Text Message</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ mt: 3 }}>
                {category === '.eml' && (
                  <DropzoneArea
                    dropzone={emlDropzone}
                    file={emlFile}
                    type="eml"
                    label=".eml file"
                  />
                )}

                {category === '.eml + pdf' && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        EML File
                      </Typography>
                      <DropzoneArea
                        dropzone={emlDropzone}
                        file={emlFile}
                        type="eml"
                        label=".eml file"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        PDF File
                      </Typography>
                      <DropzoneArea
                        dropzone={pdfDropzone}
                        file={pdfFile}
                        type="pdf"
                        label="PDF file"
                      />
                    </Grid>
                  </Grid>
                )}

                {category === '.txt' && (
                  <>
                    <DropzoneArea
                      dropzone={txtDropzone}
                      file={txtFile}
                      type="txt"
                      label=".txt file"
                    />
                    <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                      Or enter text directly:
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      variant="outlined"
                      placeholder="Enter or paste your text here..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      disabled={!!txtFile}
                    />
                  </>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Guidelines and QA Feedback Section - Bottom Left */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ backgroundColor: '#e8f4f8' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Important Guidelines
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    • Assets older than 2 years are not accepted
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    • Submit assets that contain more content in native/local languages
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    • Ensure attachments match the original email
                  </Typography>
                  <Button
                    size="small"
                    sx={{ mt: 1, textTransform: 'none' }}
                    onClick={() => setGuidelinesDialog(true)}
                  >
                    Click to know more →
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ backgroundColor: '#fff3cd' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom color="warning.dark">
                    Top 5 QA Feedback
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                    <strong>1. Outdated Assets:</strong> More than 2 years old
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                    <strong>2. Invalid Format:</strong> Only SMS acceptable for bookings
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                    <strong>3. Email Type:</strong> Must be confirmation/cancellation/modification
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                    <strong>4. Language:</strong> Must be in native language, not English
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>5. Attachment Mismatch:</strong> PDF must match email attachment
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Metadata
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Asset Owner Gender */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Asset Owner Gender *</strong>
                  </Typography>
                  <FormControl fullWidth required>
                    <Select
                      value={metadata.assetOwnerGender || ''}
                      onChange={(e) => setMetadata({ ...metadata, assetOwnerGender: e.target.value })}
                      displayEmpty
                    >
                      <MenuItem value="">Select Gender</MenuItem>
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                      <MenuItem value="Others">Others</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Asset Owner Age */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Asset Owner Age *</strong>
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="For eg: 87"
                    type="number"
                    value={metadata.assetOwnerAge || ''}
                    onChange={handleMetadataChange('assetOwnerAge')}
                    required
                  />
                </Box>

                {/* Locale */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Locale *</strong>
                  </Typography>
                  <Box sx={{ mb: 1, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="caption" display="block">
                      • <strong>zh_TW:</strong> Traditional Chinese (Taiwan 🇹🇼)
                    </Typography>
                    <Typography variant="caption" display="block">
                      • <strong>zh_HK:</strong> Traditional Chinese (Hong Kong 🇭🇰)
                    </Typography>
                    <Typography variant="caption" display="block">
                      • <strong>vi_VN:</strong> Vietnamese (Vietnam 🇻🇳)
                    </Typography>
                    <Typography variant="caption" display="block">
                      • <strong>nl_NL:</strong> Dutch (Netherlands 🇳🇱)
                    </Typography>
                    <Typography variant="caption" display="block">
                      • <strong>nl_BE:</strong> Dutch / Flemish (Belgium 🇧🇪)
                    </Typography>
                    <Typography variant="caption" display="block">
                      • <strong>da_DK:</strong> Danish (Denmark 🇩🇰)
                    </Typography>
                    <Typography variant="caption" display="block">
                      • <strong>sv_SE:</strong> Swedish (Sweden 🇸🇪)
                    </Typography>
                    <Typography variant="caption" display="block">
                      • <strong>nb_NO:</strong> Norwegian - Bokmål (Norway 🇳🇴)
                    </Typography>
                    <Typography variant="caption" display="block">
                      • <strong>tr_TR:</strong> Turkish (Turkey 🇹🇷)
                    </Typography>
                  </Box>
                  <FormControl fullWidth required>
                    <InputLabel>Choose</InputLabel>
                    <Select
                      value={metadata.locale || ''}
                      onChange={(e) => setMetadata({ ...metadata, locale: e.target.value })}
                      label="Choose"
                    >
                      <MenuItem value="zh_TW">zh_TW</MenuItem>
                      <MenuItem value="zh_HK">zh_HK</MenuItem>
                      <MenuItem value="vi_VN">vi_VN</MenuItem>
                      <MenuItem value="nl_NL">nl_NL</MenuItem>
                      <MenuItem value="nl_BE">nl_BE</MenuItem>
                      <MenuItem value="da_DK">da_DK</MenuItem>
                      <MenuItem value="sv_SE">sv_SE</MenuItem>
                      <MenuItem value="nb_NO">nb_NO</MenuItem>
                      <MenuItem value="tr_TR">tr_TR</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Source Name */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Source Name *</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Booking company name (For eg: agoda.com, booking.com). All lower case. No white space in front
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="e.g., agoda.com, booking.com"
                    value={metadata.sourceName || ''}
                    onChange={handleMetadataChange('sourceName')}
                    required
                  />
                </Box>

                {/* Booking Category */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Booking Category *</strong>
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <FormControl fullWidth required>
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
                      <FormControl fullWidth required disabled={!selectedCategory}>
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
                  {metadata.bookingCategory && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Selected: {metadata.bookingCategory}
                    </Typography>
                  )}
                </Box>

                {/* Booking Type */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Booking Type *</strong>
                  </Typography>
                  <FormControl fullWidth required>
                    <Select
                      value={metadata.bookingType || ''}
                      onChange={(e) => setMetadata({ ...metadata, bookingType: e.target.value })}
                      displayEmpty
                    >
                      <MenuItem value="">Select Booking Type</MenuItem>
                      <MenuItem value="Invitation">Invitation</MenuItem>
                      <MenuItem value="Confirmation">Confirmation</MenuItem>
                      <MenuItem value="Modification">Modification</MenuItem>
                      <MenuItem value="Cancellation">Cancellation</MenuItem>
                      <MenuItem value="Deliverable Type">Deliverable Type</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Terms and Conditions Checkbox */}
                <Box sx={{ mt: 3, display: 'flex', alignItems: 'flex-start' }}>
                  <Checkbox
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    required
                    sx={{ p: 0, mr: 1 }}
                  />
                  <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                    I have read and agree to the{' '}
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => setTermsDialog(true)}
                      sx={{ 
                        p: 0, 
                        minWidth: 'auto', 
                        textTransform: 'none',
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                        textDecoration: 'underline'
                      }}
                    >
                      terms
                    </Button>
                    <span style={{ color: 'black' }}> *</span>
                  </Typography>
                </Box>

              </Box>
            </CardContent>
          </Card>

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleSubmit}
            disabled={uploading}
            startIcon={<CloudUploadIcon />}
            sx={{ mt: 3 }}
          >
            {uploading ? 'Uploading...' : 'Submit'}
          </Button>

          {uploading && <LinearProgress sx={{ mt: 1 }} />}
        </Grid>
      </Grid>
    </Container>

      {/* Duplicate File Dialog */}
      <Dialog 
        open={duplicateDialog} 
        onClose={() => setDuplicateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'warning.main' }}>
          📁 Duplicate File Detected
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {duplicateMessage}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Please choose a different file or modify the existing file before uploading.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDuplicateDialog(false)} 
            variant="contained"
            color="primary"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detailed Guidelines Dialog */}
      <Dialog 
        open={guidelinesDialog} 
        onClose={() => setGuidelinesDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#e8f4f8', color: 'primary.main' }}>
          📋 Detailed Submission Guidelines
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" paragraph>
            <strong>Assets older than 2 years are not accepted.</strong> Submit the assets that contains more content in native/local languages.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Trackers:
          </Typography>
          <Typography variant="body2" paragraph>
            • Submission Tracker<br />
            • Combination Tracker<br />
            • Vietnam Performance Table
          </Typography>

          <Typography variant="h6" gutterBottom>
            Required Information:
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Asset Owner Gender:</strong> Male or Female
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Asset Owner Age:</strong> For eg: 87
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Locale:</strong> The language/region code of the content (e.g., zh_TW, nl_NL).
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Source Name:</strong> The name of the booking or message provider (e.g., American Airlines).
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Booking Category:</strong> The general type of service booked (e.g., Flight, Hotel).
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Booking Type:</strong> The status or action related to the booking (e.g., Confirmation, Invitation).
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Deliverable Type:</strong> The format of the original content you are submitting (e.g., Raw Email, Text Messages).
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Transcribed Text Content:</strong> The raw, pasted text of a text message conversation.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Upload Fields:
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Upload Text Screenshot:</strong> The file upload field for the screenshot image of the text message.
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Upload EML - Raw Email:</strong> The file upload field for the primary .eml file (used when submitting only a raw email).
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Upload EML - With Attachments:</strong> The file upload field for the primary .eml file (used when submitting an email that contains the attachments).
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Upload Attachments (PDF):</strong> The file upload field for the required .pdf attachment.
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Participant Consent and Indemnification:</strong> Your acceptance of the legal terms and consent to share the files. Required for submission.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setGuidelinesDialog(false)} 
            variant="contained"
            color="primary"
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      {/* Terms and Conditions Dialog */}
      <Dialog 
        open={termsDialog} 
        onClose={() => setTermsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#f5f5f5', color: 'primary.main' }}>
          📄 Participant Consent and Indemnification
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Participant Consent and Indemnification *
          </Typography>
          
          <Typography variant="body2" paragraph>
            I confirm that I am the sole owner or authorized agent for the files I am submitting. I warrant that I have the full legal right to share this content and that doing so does not violate any third-party rights, laws, or contracts.
          </Typography>

          <Typography variant="body2" paragraph>
            I grant Firstsource a perpetual, irrevocable, royalty-free license to use and analyze this content for its business purposes.
          </Typography>

          <Typography variant="body2" paragraph>
            I agree to indemnify, defend, and hold Firstsource harmless from and against any and all losses, costs, liabilities, and expenses (including reasonable attorney's fees) relating to or arising out of any claim that my submission breaches these terms or violates any law or third-party right.
          </Typography>

          <Typography variant="body2" paragraph>
            I read the QA feedback given in the form description.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setTermsDialog(false)} 
            variant="outlined"
            color="secondary"
          >
            Close
          </Button>
          <Button 
            onClick={() => {
              setTermsAgreed(true);
              setTermsDialog(false);
            }} 
            variant="contained"
            color="primary"
          >
            I Agree
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UploaderDashboard;