import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  GetApp,
  FilterList,
  Description,
  TableChart
} from '@mui/icons-material';

interface ExportFilters {
  locale?: string;
  deliverableType?: string;
  qcStatus?: string;
  bookingCategory?: string;
  dateFrom?: string;
  dateTo?: string;
}

const DataExport: React.FC = () => {
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({});
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<'all' | 'filtered'>('all');

  const handleExportAll = async () => {
    setExporting(true);
    setExportType('all');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5003/api/admin/export/qc-results', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const today = new Date().toISOString().split('T')[0];
        link.download = `QC_Results_${today}.xlsx`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      // Handle error - could show a snackbar here
    } finally {
      setExporting(false);
    }
  };

  const handleExportWithFilters = () => {
    setFilterDialogOpen(true);
  };

  const handleFilteredExport = async () => {
    setExporting(true);
    setExportType('filtered');
    setFilterDialogOpen(false);
    
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`http://localhost:5003/api/admin/export/qc-results?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const today = new Date().toISOString().split('T')[0];
        link.download = `QC_Results_Filtered_${today}.xlsx`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Filtered export failed');
      }
    } catch (error) {
      console.error('Filtered export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Box sx={{ mb: 3 }}>
          <GetApp sx={{ fontSize: 80, color: 'primary.main' }} />
        </Box>
        
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
          Export QC Results
        </Typography>
        
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Download all quality control results as an Excel file. The export includes detailed 
          information for each image with their QC status and reject reasons.
        </Typography>
      </Box>

      {/* Info Cards */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', backgroundColor: 'primary.50' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TableChart sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h5" color="primary.main" fontWeight="bold">
                  Export Format
                </Typography>
              </Box>
              
              <Stack spacing={1.5}>
                <Typography variant="body1">
                  • One row per image (3 rows per asset)
                </Typography>
                <Typography variant="body1">
                  • Asset metadata (ID, region, category)
                </Typography>
                <Typography variant="body1">
                  • Image status and reject reasons
                </Typography>
                <Typography variant="body1">
                  • QC completion details
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', backgroundColor: 'success.50' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Description sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h5" color="success.main" fontWeight="bold">
                  File Details
                </Typography>
              </Box>
              
              <Stack spacing={1.5}>
                <Typography variant="body1">
                  • Format: Excel (.xlsx)
                </Typography>
                <Typography variant="body1">
                  • Includes: All completed QC data
                </Typography>
                <Typography variant="body1">
                  • Filename: QC_Results_YYYY-MM-DD
                </Typography>
                <Typography variant="body1">
                  • Ready for analysis
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Export Buttons */}
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={exporting && exportType === 'all' ? <CircularProgress size={20} color="inherit" /> : <GetApp />}
            onClick={handleExportAll}
            disabled={exporting}
            sx={{ 
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            {exporting && exportType === 'all' ? 'EXPORTING...' : 'EXPORT ALL'}
          </Button>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            startIcon={<FilterList />}
            onClick={handleExportWithFilters}
            disabled={exporting}
            sx={{ 
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            EXPORT WITH FILTERS
          </Button>
        </Grid>
      </Grid>

      {/* Export Filters Dialog */}
      <Dialog 
        open={filterDialogOpen} 
        onClose={() => setFilterDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Export with Filters
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Locale</InputLabel>
                <Select
                  value={filters.locale || ''}
                  onChange={(e) => setFilters({ ...filters, locale: e.target.value })}
                  label="Locale"
                >
                  <MenuItem value="">All Locales</MenuItem>
                  <MenuItem value="en_US">English (US)</MenuItem>
                  <MenuItem value="zh_HK">Chinese (HK)</MenuItem>
                  <MenuItem value="nl_NL">Dutch (NL)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Deliverable Type</InputLabel>
                <Select
                  value={filters.deliverableType || ''}
                  onChange={(e) => setFilters({ ...filters, deliverableType: e.target.value })}
                  label="Deliverable Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="Raw Email">Raw Email</MenuItem>
                  <MenuItem value="Email + Attachment">Email + Attachment</MenuItem>
                  <MenuItem value="Text Message">Text Message</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>QC Status</InputLabel>
                <Select
                  value={filters.qcStatus || ''}
                  onChange={(e) => setFilters({ ...filters, qcStatus: e.target.value })}
                  label="QC Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="needs_revision">Needs Revision</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Booking Category"
                value={filters.bookingCategory || ''}
                onChange={(e) => setFilters({ ...filters, bookingCategory: e.target.value })}
                placeholder="e.g., Flight - Third-party provider"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date From"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date To"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {/* Active Filters Display */}
          {Object.keys(filters).some(key => filters[key as keyof ExportFilters]) && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Active Filters:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {Object.entries(filters).map(([key, value]) => {
                  if (value) {
                    return (
                      <Chip
                        key={key}
                        label={`${key}: ${value}`}
                        onDelete={() => setFilters({ ...filters, [key]: '' })}
                        color="primary"
                        variant="outlined"
                      />
                    );
                  }
                  return null;
                })}
              </Stack>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={clearFilters} disabled={exporting}>
            Clear All
          </Button>
          <Button onClick={() => setFilterDialogOpen(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleFilteredExport}
            disabled={exporting}
            startIcon={exporting && exportType === 'filtered' ? <CircularProgress size={20} color="inherit" /> : <GetApp />}
          >
            {exporting && exportType === 'filtered' ? 'Exporting...' : 'Export Filtered Data'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataExport;