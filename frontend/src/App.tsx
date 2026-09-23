import {
  BrowserRouter as Router,
} from 'react-router-dom';
import './App.css';
import { AuthGate } from './components/auth/AuthGate';
import AppRoutes from './AppRoutes';



function App() {
  return (
    <Router>
      <AuthGate>
        <AppRoutes />
      </AuthGate>
    </Router>
  );
}

export default App;