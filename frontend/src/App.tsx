import {
  BrowserRouter as Router,
} from 'react-router-dom';
import './App.css';
import { AuthGate } from './components/auth/AuthGate';
import { ToastHost } from './components/notifications/ToastHost';
import AppRoutes from './AppRoutes';



function App() {
  return (
    <Router>
      <AuthGate>
        <ToastHost />
        <AppRoutes />
      </AuthGate>
    </Router>
  );
}

export default App;