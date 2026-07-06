# EMI Tracker Pro

A modern, premium, mobile-first EMI Tracker Progressive Web App (PWA) built with React, Vite, Firebase, and Tailwind CSS.

## Features

- **Authentication**: Google Login, Email/Password Login, Forgot Password
- **Dashboard**: Beautiful summary cards, graphs (Outstanding Debt, Debt Distribution, Monthly EMI)
- **Loan Management**: Add, Edit, Delete loans with comprehensive details
- **EMI Tracking**: Automatic payment entries, one-tap mark as paid
- **Calendar View**: Monthly calendar with payment status indicators
- **Reports**: Export to Excel, CSV, PDF
- **Smart Features**: Financial health score, debt-to-income ratio, suggestions
- **PWA**: Offline support, installable on mobile and desktop
- **Dark Theme**: Premium dark mode by default

## Tech Stack

- React 18 + Vite
- TypeScript
- Tailwind CSS
- Firebase (Auth, Firestore, Cloud Messaging)
- React Router
- Recharts (Graphs)
- Framer Motion (Animations)
- Lucide React (Icons)
- react-hot-toast (Notifications)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd emi-tracker-pro
```

2. Install dependencies
```bash
npm install
```

3. Set up Firebase
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication (Google, Email/Password)
   - Create Firestore Database
   - Enable Cloud Messaging (optional)
   - Copy your Firebase config

4. Create `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

5. Run the development server
```bash
npm run dev
```

6. Build for production
```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── ui/          # Reusable UI components
│   └── Navigation.tsx
├── contexts/        # React Context providers
├── hooks/           # Custom React hooks
├── lib/             # Firebase configuration
├── pages/           # Page components
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── App.tsx          # Main app component
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Firebase Firestore Structure

### Collections

- **users**: User profiles and settings
- **loans**: Loan details
- **emis**: EMI payment records
- **notifications**: Push notification logs

## Features in Detail

### Dashboard
- Total Outstanding Debt
- Total Monthly EMI
- Total Loans count
- Next EMI Amount & Date
- Overdue Amount
- Paid This Month
- Debt Free Date
- Monthly Debt Reduction %
- Interactive graphs

### Loan Management
- Add/Edit/Delete loans
- Loan types: Home, Personal, Credit Card, Vehicle, Education, Gold, BNPL, Other
- Track outstanding balance, EMI amount, interest rate
- Color-coded loans
- Progress tracking

### EMI Tracking
- Automatic EMI generation
- One-tap mark as paid
- Status: Paid, Pending, Overdue, Skipped
- Payment history
- Late fee tracking

### Calendar
- Monthly view
- Color-coded payment status
- Green: Paid
- Yellow: Upcoming
- Red: Overdue
- Blue: Today's EMI

### Reports
- Monthly reports
- Yearly reports
- Loan-specific reports
- Export to Excel, CSV, PDF

### Settings
- Currency selection
- Date format
- Notification preferences
- Dark mode toggle
- Data export/import
- Account management

## PWA Features

- Offline support with service worker
- Install to home screen
- Fast loading
- Works on Android and Desktop
- Responsive design

## Performance Optimizations

- Code splitting with React Router
- Lazy loading components
- Optimized images
- Efficient re-renders with React Context
- Firebase real-time listeners

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
