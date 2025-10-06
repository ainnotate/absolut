# Absolute Platform

A modern web platform with multi-role authentication and management system featuring four distinct user roles.

## Features

- **Multi-Role Authentication System**
  - Admin: Full system access and user management
  - Supervisor: Team oversight and QC override capabilities
  - QC User: Quality control review and approval
  - Upload User: File upload and tracking

- **Google OAuth Integration**
  - Login and register with Google accounts
  - Seamless authentication experience

- **Role-Based Access Control**
  - Permission-based system
  - Role-specific dashboards and features

- **Modern Tech Stack**
  - Frontend: React with TypeScript and Material-UI
  - Backend: Node.js with Express
  - Database: SQLite with role-permission management
  - Authentication: JWT with Google OAuth

## Project Structure

```
Absolute/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Authentication & authorization
│   │   ├── models/         # Database models and schemas
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic services
│   │   └── utils/          # Utility functions and scripts
│   └── package.json
└── frontend/               # React TypeScript application
    ├── src/
    │   ├── components/     # Reusable React components
    │   ├── pages/         # Page components
    │   ├── services/      # API service layer
    │   ├── types/         # TypeScript type definitions
    │   └── utils/         # Utility functions
    └── package.json
```

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   cd /Users/lalithprakash/Projects/Haidata_Projects/Absolute
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run generate-secret  # Generate JWT secret
   # Update .env file with the generated secret
   npm run seed            # Create default users
   npm run dev            # Start development server
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm start              # Start React development server
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Default Users

After running the seed script, you can login with these default accounts:

| Role | Username | Email | Password |
|------|----------|--------|----------|
| Admin | admin | admin@absolute.com | admin123 |
| Supervisor | supervisor1 | supervisor@absolute.com | supervisor123 |
| QC User | qc_user1 | qc@absolute.com | qc123 |
| Upload User | uploader1 | uploader@absolute.com | upload123 |

## User Roles & Permissions

### Admin
- Manage all users and their roles
- View system analytics and performance metrics
- Configure system settings
- Export platform data
- Full access to all features

### Supervisor
- Monitor team performance
- Override QC decisions
- Assign tasks to team members
- Generate performance reports
- View all uploads across the platform

### QC User
- Review and approve/reject uploaded files
- Add comments to uploads
- View assigned uploads for review
- Track review history and performance

### Upload User
- Upload new files for review
- View personal upload history
- Track upload status and review progress
- Edit uploads before QC review

## Google OAuth Setup

To enable Google authentication:

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google+ API
3. Create OAuth 2.0 credentials
4. Add your domain to authorized origins
5. Update environment variables:
   - Backend: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - Frontend: `REACT_APP_GOOGLE_CLIENT_ID`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Standard login
- `POST /api/auth/google-login` - Google OAuth login
- `POST /api/auth/register` - User registration
- `PUT /api/auth/change-role` - Change user role (Admin/Supervisor only)

### Health Check
- `GET /api/health` - API health status

## Development

### Running Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is proprietary and confidential.