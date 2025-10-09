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
  Avatar,
  Tabs,
  Tab
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Search,
  FilterList,
  Person,
  CloudUpload,
  Assignment
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

interface QCAsset {
  id: number;
  assetId: string;
  userId: number;
  deliverableType: string;
  metadata: any;
  createdDate: string;
  qcStatus?: string;
  qcCompletedBy?: number;
  qcCompletedDate?: string;
  qcNotes?: string;
  batchId?: string;
  assignedTo?: number;
  user?: {
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  qcUser?: {
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`asset-tabpanel-${index}`}
      aria-labelledby={`asset-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
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

const QCAssetRow: React.FC<{ asset: QCAsset }> = ({ asset }) => {
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
          <Chip
            label={asset.deliverableType}
            color={getDeliverableTypeColor(asset.deliverableType)}
            size="small"
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {asset.qcStatus || 'pending'}
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24 }}>
              <Assignment fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="body2">
                {asset.qcUser ? getUserDisplayName(asset.qcUser) : 'Unassigned'}
              </Typography>
              {asset.assignedTo && (
                <Typography variant="caption" color="text.secondary">
                  ID: {asset.assignedTo}
                </Typography>
              )}
            </Box>
          </Box>
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
                QC Asset Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        QC Information
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Status:</strong> {asset.qcStatus || 'Pending'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Batch ID:</strong> {asset.batchId || 'Not Assigned'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Completed Date:</strong> {formatDate(asset.qcCompletedDate)}
                      </Typography>
                      {asset.qcNotes && (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>Notes:</strong> {asset.qcNotes}
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
  const [tabValue, setTabValue] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [qcAssets, setQcAssets] = useState<QCAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [qcLoading, setQcLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [qcSearchTerm, setQcSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [qcFilterStatus, setQcFilterStatus] = useState<string>('all');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

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

  const fetchQCAssets = async () => {
    try {
      setQcLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch real QC assets with actual QC status from database
      const response = await fetch('http://192.168.29.158:5003/api/assets', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch QC assets: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Filter only assets that have QC assignments or are in QC workflow
        const qcAssetsData = data.assets
          .filter((asset: any) => asset.batch_id || asset.assigned_to || asset.qc_status)
          .map((asset: any) => ({
            ...asset,
            qcStatus: asset.qc_status || 'pending',
            assignedTo: asset.assigned_to,
            batchId: asset.batch_id,
            qcCompletedBy: asset.qc_completed_by,
            qcCompletedDate: asset.qc_completed_date,
            qcNotes: asset.qc_notes,
            qcUser: asset.qc_user
          }));
        setQcAssets(qcAssetsData);
      } else {
        throw new Error(data.message || 'Failed to fetch QC assets');
      }
    } catch (error) {
      console.error('Error fetching QC assets:', error);
      setQcAssets([]);
    } finally {
      setQcLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchQCAssets();
  }, []);

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.deliverableType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || asset.deliverableType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const filteredQCAssets = qcAssets.filter(asset => {
    const matchesSearch = asset.assetId.toLowerCase().includes(qcSearchTerm.toLowerCase()) ||
                         asset.deliverableType.toLowerCase().includes(qcSearchTerm.toLowerCase()) ||
                         (asset.qcUser?.username || '').toLowerCase().includes(qcSearchTerm.toLowerCase());
    
    const matchesFilter = qcFilterStatus === 'all' || asset.qcStatus === qcFilterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (loading && qcLoading) {
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
        Monitor and track uploaded assets and QC workflow progress across the platform.
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="asset tracking tabs">
          <Tab 
            icon={<CloudUpload />} 
            label="Upload Asset Tracking" 
            iconPosition="start"
            id="asset-tab-0"
            aria-controls="asset-tabpanel-0"
          />
          <Tab 
            icon={<Assignment />} 
            label="QC Asset Tracking" 
            iconPosition="start"
            id="asset-tab-1"
            aria-controls="asset-tabpanel-1"
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {/* Upload Asset Tracking */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search uploaded assets..."
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

        {/* Upload Statistics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="primary">
                  {assets.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Uploaded
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

        {/* Upload Assets Table */}
        <TableContainer component={Paper}>
          <Table aria-label="uploaded assets table">
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
              No uploaded assets found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filter criteria
            </Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* QC Asset Tracking */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search QC assets..."
            value={qcSearchTerm}
            onChange={(e) => setQcSearchTerm(e.target.value)}
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
            label="Filter by QC Status"
            value={qcFilterStatus}
            onChange={(e) => setQcFilterStatus(e.target.value)}
            SelectProps={{
              native: true,
            }}
            sx={{ minWidth: 200 }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </TextField>
        </Box>

        {/* QC Statistics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="primary">
                  {qcAssets.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total in QC
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="warning.main">
                  {qcAssets.filter(a => a.qcStatus === 'pending').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="info.main">
                  {qcAssets.filter(a => a.qcStatus === 'in_progress').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In Progress
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="success.main">
                  {qcAssets.filter(a => a.qcStatus === 'completed').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* QC Assets Table */}
        <TableContainer component={Paper}>
          <Table aria-label="qc assets table">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell><strong>Asset ID</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>QC Status</strong></TableCell>
                <TableCell><strong>QC User</strong></TableCell>
                <TableCell><strong>Created</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredQCAssets.map((asset) => (
                <QCAssetRow key={asset.id} asset={asset} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredQCAssets.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No QC assets found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filter criteria
            </Typography>
          </Box>
        )}
      </TabPanel>
    </Box>
  );
};

export default AssetTracking;