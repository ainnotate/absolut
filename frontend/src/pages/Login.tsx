import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Divider,
  Tab,
  Tabs,
  Container
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { authService } from '../services/authService';
import { LoginCredentials, RegisterData } from '../types';

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
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Login: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loginForm, setLoginForm] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  const [registerForm, setRegisterForm] = useState<RegisterData>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.login(loginForm);
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.register(registerForm);
      setSuccess('Registration successful! Welcome to Absolute Booking Data Collection Platform!');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };


  const renderGoogleButtons = React.useCallback(() => {
    if (window.google && window.google.accounts) {
      const loginButton = document.getElementById('google-signin-button');
      const registerButton = document.getElementById('google-signin-button-register');
      
      if (loginButton && tabValue === 0) {
        loginButton.innerHTML = '';
        window.google.accounts.id.renderButton(loginButton, { 
          theme: 'outline', 
          size: 'large',
          width: 360,
          text: 'signin_with',
          locale: 'en'
        });
      }
      
      if (registerButton && tabValue === 1) {
        registerButton.innerHTML = '';
        window.google.accounts.id.renderButton(registerButton, { 
          theme: 'outline', 
          size: 'large',
          width: 360,
          text: 'signup_with',
          locale: 'en'
        });
      }
    }
  }, [tabValue]);

  React.useEffect(() => {
    // Aggressively clear Google-related storage and cookies
    try {
      // Clear localStorage
      localStorage.removeItem('g_state');
      sessionStorage.removeItem('g_state');
      const googleKeys = Object.keys(localStorage).filter(key => key.startsWith('g_'));
      googleKeys.forEach(key => localStorage.removeItem(key));
      
      // Clear any Google-related cookies by setting them to expire
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      // Force clear session
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          window.google.accounts.id.disableAutoSelect();
          window.google.accounts.id.cancel();
        } catch (e) {
          // Ignore
        }
      }
    } catch (e) {
      // Ignore storage errors
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID!,
          callback: async (response: any) => {
            try {
              setLoading(true);
              await authService.googleLogin({ credential: response.credential });
              setSuccess('Google login successful! Redirecting...');
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1000);
            } catch (error) {
              setError(error instanceof Error ? error.message : 'Google login failed');
            } finally {
              setLoading(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false,
          state_cookie_domain: 'localhost'
        });
        
        // Aggressively disable automatic sign-in
        window.google.accounts.id.disableAutoSelect();
        
        // Clear any existing Google state
        try {
          window.google.accounts.id.cancel();
        } catch (e) {
          // Ignore if no active flow
        }
        
        renderGoogleButtons();
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [renderGoogleButtons]);

  React.useEffect(() => {
    renderGoogleButtons();
  }, [tabValue, renderGoogleButtons]);

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h3" gutterBottom align="center">
          Absolute Booking Data Collection Platform
        </Typography>
        
        <Card sx={{ width: '100%', mt: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="auth tabs">
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ m: 2 }}>
              {success}
            </Alert>
          )}

          <TabPanel value={tabValue} index={0}>
            <form onSubmit={handleLoginSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username or Email"
                name="username"
                autoComplete="username"
                autoFocus
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
              
              <Divider sx={{ my: 2 }}>OR</Divider>
              
              <Box id="google-signin-button" sx={{ mt: 1, display: 'flex', justifyContent: 'center', minHeight: '44px' }}></Box>
            </form>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <form onSubmit={handleRegisterSubmit}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  margin="normal"
                  fullWidth
                  id="first_name"
                  label="First Name"
                  name="first_name"
                  value={registerForm.first_name}
                  onChange={(e) => setRegisterForm({ ...registerForm, first_name: e.target.value })}
                />
                <TextField
                  margin="normal"
                  fullWidth
                  id="last_name"
                  label="Last Name"
                  name="last_name"
                  value={registerForm.last_name}
                  onChange={(e) => setRegisterForm({ ...registerForm, last_name: e.target.value })}
                />
              </Box>
              <TextField
                margin="normal"
                required
                fullWidth
                id="register_username"
                label="Username"
                name="username"
                autoComplete="username"
                value={registerForm.username}
                onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="register_password"
                label="Password"
                type="password"
                id="register_password"
                autoComplete="new-password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
              
              <Divider sx={{ my: 2 }}>OR</Divider>
              
              <Box id="google-signin-button-register" sx={{ mt: 1, display: 'flex', justifyContent: 'center', minHeight: '44px' }}></Box>
            </form>
          </TabPanel>
        </Card>
      </Box>
    </Container>
  );
};

export default Login;