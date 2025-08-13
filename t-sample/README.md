# Telegram-Based Attendance Portal

This is a comprehensive attendance tracking system that uses a Telegram bot to allow employees to log in and out. The data is stored in MongoDB, and HR can access a React-based frontend to view and modify attendance records.

## Features

### Telegram Bot
- Employee attendance tracking via Telegram
- Commands:
  - `/start` - Introduction to the bot
  - `/help` - List available commands
  - `/login` - Clock in for the day
  - `/logout` - Clock out for the day
  - `/status` - Check current attendance status
  - `/employee` - View employee information
- Automatic calculation of working hours
- Error handling for various scenarios

### HR Admin Panel (React Frontend)
- Secure login for HR personnel
- Dashboard with attendance statistics
  - Total employees count
  - Present/absent/late employees for the day
  - Average working hours
- Employee management
  - Add, edit, and deactivate employees
  - View employee details and attendance history
- Attendance reports
  - Filter by date range and employee
  - Edit attendance records (check-in/out times, status, notes)
  - Track modifications to attendance records
- User profile management
  - Update personal information
  - Change password

### Backend API
- RESTful API with Express.js
- MongoDB database for data storage
- JWT authentication for secure access
- Role-based access control (HR, Admin)

## Project Structure

- `/server` - Backend Node.js/Express server with MongoDB connection
  - `/models` - Database schemas
  - `/routes` - API endpoints
  - `/middleware` - Authentication middleware
  - `/scripts` - Utility scripts
- `/telegram-bot` - Telegram bot implementation
- `/client` - React.js frontend application
  - `/src/components` - Reusable UI components
  - `/src/pages` - Application pages
  - `/src/context` - React context providers

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Telegram Bot Token (from BotFather)

### Environment Setup
1. Clone the repository
2. Create a `.env` file in the root directory based on `.env.example`

### Backend Setup
1. Navigate to the server directory: `cd server`
2. Install dependencies: `npm install`
3. Initialize admin user: `node scripts/init-admin.js`
4. Start the server: `npm start` or `npm run dev` for development

### Telegram Bot Setup
1. Navigate to the telegram-bot directory: `cd telegram-bot`
2. Install dependencies: `npm install`
3. Start the bot: `npm start` or `npm run dev` for development

### Frontend Setup
1. Navigate to the client directory: `cd client`
2. Install dependencies: `npm install`
3. Start the client: `npm start`

### Running the Entire Application
From the root directory, you can run all components simultaneously:
```
npm install
npm run dev
```

## Default Admin Credentials
- Email: admin@example.com
- Password: admin123
- **Important**: Change this password after first login!

## Technologies Used

- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Frontend**: React.js, Material-UI, Context API
- **Authentication**: JWT, bcrypt
- **Bot**: Telegram Bot API, node-telegram-bot-api
- **Development**: Nodemon, Concurrently

## License

MIT