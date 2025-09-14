# Patients Management System

A modern web application for managing patients and healthcare staff, built with Next.js, MongoDB, and Mongoose.

## Features

- User registration with role-based fields (Employee/Manager)
- Document upload and management
- Modern UI with glass morphism effects
- Responsive design for all devices
- MongoDB database integration

## Getting Started

### Prerequisites

- Node.js 18.x or later
- MongoDB Atlas account or local MongoDB instance

### Setting Up MongoDB

1. **Create a MongoDB Atlas Account**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
   - Sign up for a free account
   - Create a new cluster (the free tier is sufficient for development)

2. **Configure Database Access**:
   - Create a database user with read/write permissions
   - Under "Network Access", add your IP address or allow access from anywhere for development

3. **Get Your Connection String**:
   - Click "Connect" on your cluster
   - Select "Connect your application"
   - Copy the connection string (it will look like: `mongodb+srv://username:password@cluster0.mongodb.net/`)
   - Replace `<username>` and `<password>` with your database user credentials

4. **Configure Environment Variables**:
   - Create a `.env.local` file in the project root
   - Add your MongoDB connection string:
   ```
   MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/patients_management?retryWrites=true&w=majority
   ```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/patients_management.git
cd patients_management
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/src/app` - Next.js App Router pages and API routes
- `/src/components` - Reusable UI components
- `/src/lib` - Utility functions and database connection
- `/src/models` - Mongoose models for MongoDB
- `/public` - Static assets and uploaded files

## Database Schema

### User Model

The application uses a flexible user schema with role-specific fields:

**Common Fields**:
- `userType`: 'employee' or 'manager'
- `firstName`: User's first name
- `lastName`: User's last name
- `email`: Unique email address
- `phone`: Contact phone number

**Manager-specific Fields**:
- `post`: Job position/title
- `class`: Classification level

**Employee-specific Fields**:
- `opiqPermit`: Path to uploaded OPIQ permit file
- `rcr`: Path to uploaded RCR document

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

For MongoDB, continue using your MongoDB Atlas cluster in production, but make sure to:
1. Set up proper authentication
2. Restrict network access
3. Configure environment variables in your hosting platform