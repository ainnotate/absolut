import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Paper,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Refresh,
  Search,
  TrendingUp,
  CheckCircle,
  Assessment
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';

interface ProgressStats {
  totalAssets: number;
  completed: number;
  averagePerDay: number;
}

interface LocaleProgress {
  locale: string;
  completed: number;
  remaining: number;
  total: number;
}

interface DateProgress {
  date: string;
  completed: number;
}

interface UserPerformance {
  username: string;
  completed: number;
  inProgress: number;
  pending: number;
}

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" sx={{ color, fontWeight: 'bold' }}>
            {value.toLocaleString()}
          </Typography>
        </Box>
        <Box sx={{ color, fontSize: '3rem' }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const ProgressTracking: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [localeSearch, setLocaleSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [progressStats, setProgressStats] = useState<ProgressStats>({
    totalAssets: 0,
    completed: 0,
    averagePerDay: 0
  });

  const [localeProgress, setLocaleProgress] = useState<LocaleProgress[]>([]);
  const [dateProgress, setDateProgress] = useState<DateProgress[]>([]);
  const [userPerformance, setUserPerformance] = useState<UserPerformance[]>([]);

  const overallProgressData = [
    { name: 'Completed', value: progressStats.completed, color: '#4caf50' },
    { name: 'Remaining', value: progressStats.totalAssets - progressStats.completed, color: '#e0e0e0' }
  ];

  const filteredLocaleProgress = localeProgress.filter(locale =>
    locale.locale.toLowerCase().includes(localeSearch.toLowerCase())
  );

  const filteredUserPerformance = userPerformance.filter(user =>
    user.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  // API call functions
  const fetchProgressStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`http://localhost:5003/api/admin/progress/stats?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProgressStats(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching progress stats:', error);
    }
  };

  const fetchLocaleProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`http://localhost:5003/api/admin/progress/locale?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLocaleProgress(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching locale progress:', error);
    }
  };

  const fetchDateProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`http://localhost:5003/api/admin/progress/date?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDateProgress(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching date progress:', error);
    }
  };

  const fetchUserPerformance = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`http://localhost:5003/api/admin/progress/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUserPerformance(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching user performance:', error);
    }
  };

  const fetchAllData = async () => {
    setDataLoading(true);
    await Promise.all([
      fetchProgressStats(),
      fetchLocaleProgress(),
      fetchDateProgress(),
      fetchUserPerformance()
    ]);
    setDataLoading(false);
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchAllData().finally(() => setLoading(false));
  };

  // Load data on component mount and when date filters change
  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchAllData();
    }
  }, [startDate, endDate]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Progress Tracking
        </Typography>
        
        {/* Date Filters */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Summary Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Total Assets"
            value={progressStats.totalAssets}
            icon={<Assessment />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Completed"
            value={progressStats.completed}
            icon={<CheckCircle />}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Average/Day"
            value={progressStats.averagePerDay}
            icon={<TrendingUp />}
            color="#ff9800"
          />
        </Grid>
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Locale-wise Progress Chart - Full width */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Locale-wise Progress
              </Typography>
              <TextField
                placeholder="Search locale..."
                size="small"
                value={localeSearch}
                onChange={(e) => setLocaleSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 200 }}
              />
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredLocaleProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="locale" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#4caf50" name="Completed" />
                <Bar dataKey="remaining" fill="#e0e0e0" name="Remaining" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Date-wise Completion Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Date-wise Completion
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dateProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                />
                <Legend />
                <Bar dataKey="completed" fill="#4caf50" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Overall Progress Pie Chart - Moved to right of Date-wise */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Overall Progress
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={overallProgressData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={(entry: any) => 
                    `${entry.name}: ${entry.value.toLocaleString()} (${entry.percent.toFixed(1)}%)`
                  }
                >
                  {overallProgressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* User Performance Chart - Below and stretched full width */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                User Performance
              </Typography>
              <TextField
                placeholder="Search user..."
                size="small"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 200 }}
              />
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredUserPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="username" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#4caf50" name="Completed" />
                <Bar dataKey="inProgress" fill="#ff9800" name="In Progress" />
                <Bar dataKey="pending" fill="#e0e0e0" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProgressTracking;