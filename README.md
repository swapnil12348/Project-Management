# Project Management Software

A full-stack project management application built with React and Node.js, featuring real-time collaboration, task tracking, team management, and comprehensive analytics.

## ✨ Features

- **Workspace Management** - Create and manage multiple workspaces for different teams
- **Project Tracking** - Organize work into projects with detailed overviews and analytics
- **Task Management** - Create, assign, and track tasks with deadlines and priorities
- **Team Collaboration** - Invite team members, assign roles, and collaborate in real-time
- **Calendar View** - Visualize project timelines and task deadlines
- **Analytics Dashboard** - Track project progress with comprehensive statistics
- **Activity Feeds** - Stay updated with recent activities across projects
- **Comment System** - Discuss tasks and projects with threaded comments
- **Dark/Light Theme** - Customizable UI theme preferences

## 🛠️ Tech Stack

### Frontend
- **React** - UI framework
- **Redux Toolkit** - State management
- **React Router** - Navigation
- **Vite** - Build tool and dev server
- **Clerk** - Authentication and user management

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Prisma** - ORM for database operations
- **Neon Database** - Serverless PostgreSQL database
- **Inngest** - Background jobs and workflows
- **Nodemailer** - Email notifications via Brevo SMTP

### Deployment
- **Vercel** - Hosting platform for both frontend and backend

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v16 or higher)
- npm or yarn
- Git

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Install Dependencies

#### Install root dependencies (if any)
```bash
npm install
```

#### Install client dependencies
```bash
cd client
npm install
```

#### Install server dependencies
```bash
cd ../server
npm install
```

### 3. Environment Setup

#### Client Environment Variables

Create a `.env` file in the `client` directory:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YWJsZS1iZWUtMTUuY2xlcmsuYWNjb3VudHMuZGV2JA
VITE_API_URL=http://localhost:3000
```

#### Server Environment Variables

Create a `.env` file in the `server` directory:

```env
NODE_ENV=development

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Neon Database
DATABASE_URL=
DIRECT_URL=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Email Configuration (Brevo SMTP)
SENDER_EMAIL=
SMTP_USER=
SMTP_PASS=
```

### 4. Database Setup

Run Prisma migrations to set up your database schema:

```bash
cd server
npx prisma generate
npx prisma db push
```

Optional - Seed the database (if you have seed data):
```bash
npx prisma db seed
```

### 5. Run the Application

#### Development Mode

Open two terminal windows:

**Terminal 1 - Run the backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Run the frontend:**
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

#### Production Build

**Build the client:**
```bash
cd client
npm run build
```

**Start the server:**
```bash
cd server
npm start
```

## 📁 Project Structure

```
├── client/                 # Frontend application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── app/           # Redux store configuration
│   │   ├── assets/        # Images, icons, and static files
│   │   ├── components/    # Reusable React components
│   │   ├── configs/       # API and configuration files
│   │   ├── features/      # Redux slices
│   │   ├── pages/         # Page components
│   │   └── App.jsx        # Main app component
│   └── package.json
│
├── server/                # Backend application
│   ├── configs/           # Configuration files
│   ├── controllers/       # Route controllers
│   ├── inngest/           # Background job definitions
│   ├── middlewares/       # Express middlewares
│   ├── prisma/            # Database schema and config
│   ├── routes/            # API routes
│   └── server.js          # Entry point
│
└── package.json           # Root package file
```

## 🔑 Key Components

### Frontend Components

- **Navbar** - Main navigation and user menu
- **Sidebar** - Primary navigation sidebar
- **ProjectsSidebar** - Project-specific navigation
- **MyTasksSidebar** - Personal task management
- **Dashboard** - Overview of all projects and tasks
- **ProjectDetails** - Detailed project view with tasks and analytics
- **ProjectCalendar** - Calendar view of project timeline
- **ProjectAnalytics** - Visual analytics and statistics
- **TaskDetails** - Detailed task view with comments
- **Team** - Team member management
- **WorkspaceDropdown** - Switch between workspaces

### Backend Routes

- `/api/workspaces` - Workspace CRUD operations
- `/api/projects` - Project management
- `/api/tasks` - Task operations
- `/api/comments` - Comment management

## 🔐 Authentication

This application uses [Clerk](https://clerk.com) for authentication. Features include:
- Email/password authentication
- Social login options
- User management
- Session handling
- Webhook integration

## 📧 Email Notifications

Email notifications are handled through Brevo (formerly Sendinblue) SMTP service using Nodemailer for:
- Task assignments
- Project invitations
- Status updates
- Activity notifications

## ⚙️ Background Jobs

[Inngest](https://www.inngest.com) is used for handling background jobs and workflows:
- Scheduled notifications
- Data processing
- Event-driven workflows

## 🚢 Deployment

### Deploy to Vercel

Both the client and server are configured for Vercel deployment.

#### Deploy Backend

```bash
cd server
vercel
```

#### Deploy Frontend

```bash
cd client
vercel
```

Make sure to add all environment variables in the Vercel dashboard under Project Settings → Environment Variables.

## 📝 Available Scripts

### Client Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Server Scripts

```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
```

## 🤝 Contributing

Please read [CONTRIBUTING.md](./client/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📜 License

This project is licensed under the terms specified in [LICENSE.md](./client/LICENSE.md).

## 🐛 Known Issues

- Check the Issues tab on GitHub for current known issues
- Report new issues with detailed reproduction steps

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Contact: swapnilsh100@gmail.com

## 🙏 Acknowledgments

- [Clerk](https://clerk.com) - Authentication
- [Neon](https://neon.tech) - Serverless PostgreSQL
- [Inngest](https://www.inngest.com) - Background jobs
- [Brevo](https://www.brevo.com) - Email service
- [Vercel](https://vercel.com) - Hosting platform

---

**Note:** Remember to replace placeholder credentials with your own when setting up the application. Never commit `.env` files to version control.
