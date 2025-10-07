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
  Button,
  TextField,
  InputAdornment,
  Grid,
  Avatar
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Search,
  FilterList,
  Person
} from '@mui/icons-material';

interface Asset {
  id: number;
  assetId: string;
  userId: number;
  deliverableType: string;
  metadata: any;
  createdDate: string;
  user?: {
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

  const getDeliverableTypeColor = (type: string) => {
    switch (type) {
      case 'Raw Email':
        return 'primary';
      case 'Email + Attachment':
        return 'secondary';
      case 'Text Message':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
          <Chip
            label={asset.deliverableType}
            color={getDeliverableTypeColor(asset.deliverableType)}
            size="small"
          />
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
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Asset Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
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
                
                <Grid item xs={12} md={6}>
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

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://192.168.29.158:5003/api/assets', {
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

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.deliverableType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || asset.deliverableType === filterType;
    
    return matchesSearch && matchesFilter;
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
        Monitor and track all uploaded assets across the platform. View asset details, metadata, and associated files.
      </Typography>

      {/* Search and Filter Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search assets..."
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
        
      </Box>

      {/* Statistics Cards */}
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
              <Typography variant="h4" color="success.main">
                {assets.filter(a => a.deliverableType === 'Raw Email').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Raw Emails
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="secondary.main">
                {assets.filter(a => a.deliverableType === 'Email + Attachment').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Email + Attachments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main">
                {assets.filter(a => a.deliverableType === 'Text Message').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Text Messages
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Assets Table */}
      <TableContainer component={Paper}>
        <Table aria-label="assets table">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell><strong>Asset ID</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>User</strong></TableCell>
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