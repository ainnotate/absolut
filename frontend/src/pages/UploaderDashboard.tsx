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
  DialogActions
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useDropzone } from 'react-dropzone';
import { authService } from '../services/authService';
import { User } from '../types';

type CategoryType = '.eml' | '.eml + pdf' | '.txt';

interface FileWithPreview extends File {
  preview?: string;
}

interface MetadataFields {
  sender?: string;
  recipient?: string;
  subject?: string;
  date?: string;
  tags?: string;
  description?: string;
}

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
    if (!metadata.sender || !metadata.recipient || !metadata.subject) {
      setError('Please fill in required metadata fields (Sender, Recipient, Subject)');
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
      const response = await fetch('/api/upload', {
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
            Absolute Platform - Upload Dashboard
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
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  onChange={handleCategoryChange}
                  label="Category"
                >
                  <MenuItem value=".eml">.eml</MenuItem>
                  <MenuItem value=".eml + pdf">.eml + pdf</MenuItem>
                  <MenuItem value=".txt">.txt</MenuItem>
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
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Metadata
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Sender *"
                  value={metadata.sender || ''}
                  onChange={handleMetadataChange('sender')}
                  required
                />
                <TextField
                  fullWidth
                  label="Recipient *"
                  value={metadata.recipient || ''}
                  onChange={handleMetadataChange('recipient')}
                  required
                />
                <TextField
                  fullWidth
                  label="Subject *"
                  value={metadata.subject || ''}
                  onChange={handleMetadataChange('subject')}
                  required
                />
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  value={metadata.date || ''}
                  onChange={handleMetadataChange('date')}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Tags"
                  value={metadata.tags || ''}
                  onChange={handleMetadataChange('tags')}
                  helperText="Comma-separated tags"
                />
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={metadata.description || ''}
                  onChange={handleMetadataChange('description')}
                />
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
    </Box>
  );
};

export default UploaderDashboard;