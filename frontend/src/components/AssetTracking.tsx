import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
  TextField,
  InputAdornment,
  Grid,
  Avatar
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Search,
  Person,
  Assignment
} from '@mui/icons-material';

interface Asset {
  id: number;
  assetId: string;
  userId: number;
  deliverableType: string;
  metadata: any;
  createdDate: string;
  qc_status?: string;
  qc_completed_by?: number;
  qc_completed_date?: string;
  qc_notes?: string;
  batch_id?: string;
  assigned_to?: number;
  user?: {
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  qc_user?: {
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  files?: Array<{
    id: number;
    filename: string;
    fileType: string;
    s3Key: string;
    md5Hash: string;
    uploadDate: string;
  }>;
}

const AssetRow: React.FC<{ asset: Asset }> = ({ asset }) => {
  const [open, setOpen] = useState(false);


  const getQCStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'needs_revision':
        return 'warning';
      case 'pending':
      default:
        return 'default';
    }
  };

  const formatDate = (dateString?: string) => {
    return dateString ? new Date(dateString).toLocaleString() : 'N/A';
  };

  const getUserDisplayName = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user?.username || 'Unknown User';
  };

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <Typography variant="body2" fontFamily="monospace">
            {asset.assetId}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {asset.deliverableType}
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24 }}>
              <Person fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="body2">
                {getUserDisplayName(asset.user)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {asset.userId}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={asset.qc_status || 'Not Assigned'}
            color={getQCStatusColor(asset.qc_status)}
            size="small"
            variant={asset.qc_status ? 'filled' : 'outlined'}
          />
        </TableCell>
        <TableCell>
          {asset.qc_user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 24, height: 24 }}>
                <Assignment fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="body2">
                  {getUserDisplayName(asset.qc_user)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ID: {asset.assigned_to}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Unassigned
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {asset.files?.length || 0} files
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {formatDate(asset.createdDate)}
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Asset Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        QC Information
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Status:</strong> {asset.qc_status || 'Not Assigned'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Batch ID:</strong> {asset.batch_id || 'Not Assigned'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Completed Date:</strong> {formatDate(asset.qc_completed_date)}
                      </Typography>
                      {asset.qc_notes && (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>Notes:</strong> {asset.qc_notes}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Metadata
                      </Typography>
                      {asset.metadata && (
                        <Box>
                          {Object.entries(asset.metadata).map(([key, value]) => (
                            <Typography key={key} variant="body2" sx={{ mb: 0.5 }}>
                              <strong>{key}:</strong> {String(value)}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Files ({asset.files?.length || 0})
                      </Typography>
                      {asset.files?.map((file, index) => (
                        <Box key={file.id} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="body2">
                            <strong>Filename:</strong> {file.filename}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Type: {file.fileType} | Uploaded: {formatDate(file.uploadDate)}
                          </Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const AssetTracking: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterQcStatus, setFilterQcStatus] = useState<string>('all');

  const fetchAssets = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:5003/api/assets', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch assets: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAssets(data.assets);
      } else {
        throw new Error(data.message || 'Failed to fetch assets');
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      setAssets([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.deliverableType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (asset.qc_user?.username || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTypeFilter = filterType === 'all' || asset.deliverableType === filterType;
    const matchesQcStatusFilter = filterQcStatus === 'all' || asset.qc_status === filterQcStatus;
    
    return matchesSearch && matchesTypeFilter && matchesQcStatusFilter;
  });

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading assets...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Asset Tracking
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Monitor and track all assets with upload and QC workflow information in one unified view.
      </Typography>

      {/* Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {assets.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Assets
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {assets.filter(a => a.qc_status === 'pending' || !a.qc_status).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending QC
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {assets.filter(a => a.qc_status === 'approved').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                QC Approved
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="error.main">
                {assets.filter(a => a.qc_status === 'rejected').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                QC Rejected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search assets by ID, user, or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
        
        <TextField
          select
          label="Filter by Type"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          SelectProps={{
            native: true,
          }}
          sx={{ minWidth: 200 }}
        >
          <option value="all">All Types</option>
          <option value="Raw Email">Raw Email</option>
          <option value="Email + Attachment">Email + Attachment</option>
          <option value="Text Message">Text Message</option>
        </TextField>

        <TextField
          select
          label="Filter by QC Status"
          value={filterQcStatus}
          onChange={(e) => setFilterQcStatus(e.target.value)}
          SelectProps={{
            native: true,
          }}
          sx={{ minWidth: 200 }}
        >
          <option value="all">All QC Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="needs_revision">Needs Revision</option>
        </TextField>
      </Box>

      {/* Unified Assets Table */}
      <TableContainer component={Paper}>
        <Table aria-label="unified assets table">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell><strong>Asset ID</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>User</strong></TableCell>
              <TableCell><strong>QC Status</strong></TableCell>
              <TableCell><strong>QC User</strong></TableCell>
              <TableCell><strong>Files</strong></TableCell>
              <TableCell><strong>Created</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAssets.map((asset) => (
              <AssetRow key={asset.id} asset={asset} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredAssets.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No assets found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search or filter criteria
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AssetTracking;