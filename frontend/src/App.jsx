import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Promotions from './pages/Promotions';
import Requests from './pages/Requests'; // Asumo que existe
import Calendar from './pages/Calendar'; // Asumo que existe
import News from './pages/News';
import ArchivedNews from './pages/ArchivedNews';
import UserManagement from './pages/UserManagement';
import ChangePassword from './pages/ChangePassword';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/promotions" element={<Promotions />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/news" element={<News />} /> 
        <Route path="/archived-news" element={<ArchivedNews />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/change-password" element={<ChangePassword />} />
      </Routes>
    </Router>
  );
}

export default App;