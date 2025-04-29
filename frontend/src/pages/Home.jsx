import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import CalendarModule from '../components/CalendarModule';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Home.css';

const NavigationButtons = ({ currentMonthDisplay, currentMonth, onPrev, onNext }) => {
  console.log(`Rendering NavigationButtons - Current Month: ${currentMonth}`);
  return (
    <div className="month-navigation" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
      <button onClick={() => { console.log(`Prev button clicked for ${currentMonth}`); onPrev(); }} className="prev-button">Mes Anterior</button>
      <span style={{ fontSize: '24px', color: '#4caf50' }}>{currentMonthDisplay}</span>
      <button onClick={() => { console.log(`Next button clicked for ${currentMonth}`); onNext(); }} className="next-button">Mes Siguiente</button>
    </div>
  );
};

function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [news, setNews] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [users, setUsers] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', assigned_to: '', start_date: '', end_date: '', comments: '' });
  const [newKpi, setNewKpi] = useState({
    worker: '',
    period: '',
    sales_target: '',
    sales_achieved: '',
    warranties_target: '',
    warranties_achieved: '',
    financing_target: '',
    financing_achieved: '',
    reviews_target: '',
    reviews_achieved: ''
  });
  const [newNews, setNewNews] = useState({ title: '', content: '', department: 'all' });
  const [newPromotion, setNewPromotion] = useState({ name: '', code: '', start_date: '', end_date: '' });
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const navigate = useNavigate();
  const location = useLocation();

  const getPeriodOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = -12; i <= 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [userResponse, newsResponse, tasksResponse, kpisResponse, usersResponse, promotionsResponse] = await Promise.all([
          axios.get('http://localhost:8001/api/users/me/', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:8001/api/news/', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:8001/api/tasks/', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`http://localhost:8001/api/kpis/?period=${currentMonth}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:8001/api/users/', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:8001/api/promotions/', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setCurrentUser(userResponse.data);
        setNews(newsResponse.data || []);
        setTasks(tasksResponse.data || []);
        setKpis(kpisResponse.data || []);
        setUsers(usersResponse.data);
        setPromotions(promotionsResponse.data || []);
        console.log(`KPIs loaded for ${currentMonth}:`, kpisResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        navigate('/');
      }
    };

    fetchData();
  }, [navigate, currentMonth]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Sin fecha';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Función para convertir URLs en enlaces clicables
  const renderContentWithLinks = (content) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  };

  const calculatePercentage = (achieved, target) => {
    if (!target || target === 0) return 0;
    return Math.min((achieved / target) * 100, 100).toFixed(1);
  };

  const getProgressColor = (percentage) => {
    if (percentage <= 30) return '#f44336';
    if (percentage <= 60) return '#ff9800';
    if (percentage < 100) return '#ffeb3b';
    return '#4caf50';
  };

  const getStatusColorClass = (percentage) => {
    if (percentage >= 100) return 'achieved-green';
    if (percentage > 80) return 'close-orange';
    return 'below-red';
  };

  const getRemaining = (achieved, target, unit = '') => {
    if (!target || target === 0) return 'N/A';
    const remaining = target - achieved;
    if (remaining > 0) return `Te faltan ${remaining} ${unit} para el objetivo`;
    if (remaining === 0) return '0';
    return `Por encima en: ${Math.abs(remaining)} ${unit}`;
  };

  const getMotivationalMessage = (percentage) => {
    if (percentage >= 100) return '¡Objetivo conseguido! ✔';
    if (percentage > 90) return '¡Un último empujón!';
    if (percentage > 80) return '¡Estás a un paso de conseguirlo!';
    return '¡Sigue así, tú puedes!';
  };

  const getTaskStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En progreso';
      case 'completed': return 'Completada';
      case 'approved': return 'Aprobada';
      case 'rejected': return 'Rechazada';
      default: return status;
    }
  };

  const handleExportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const monthDisplay = new Date(currentMonth + '-01').toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
    doc.text(`Objetivos ${monthDisplay}`, 20, 20);

    const tableData = kpis.map(kpi => {
      const worker = users.find(user => user.username === kpi.worker);
      return [
        worker ? worker.first_name : kpi.worker,
        kpi.period,
        `${kpi.sales_achieved} / ${kpi.sales_target} € (${calculatePercentage(kpi.sales_achieved, kpi.sales_target)}%)`,
        `${kpi.warranties_achieved} / ${kpi.warranties_target} (${calculatePercentage(kpi.warranties_achieved, kpi.warranties_target)}%)`,
        `${kpi.financing_achieved} / ${kpi.financing_target} € (${calculatePercentage(kpi.financing_achieved, kpi.financing_target)}%)`,
        `${kpi.reviews_achieved} / ${kpi.reviews_target} (${calculatePercentage(kpi.reviews_achieved, kpi.reviews_target)}%)`
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [['Trabajador', 'Período', 'Ventas', 'Garantías', 'Financiación', 'Reseñas']],
      body: tableData,
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [22, 160, 133] },
    });

    doc.save(`Objetivos_${currentMonth}.pdf`);
  };

  const handleStartTask = async (taskId) => {
    const token = localStorage.getItem('accessToken');
    try {
      await axios.patch(`http://localhost:8001/api/tasks/${taskId}/`, { status: 'in_progress' }, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(tasks.map(task => (task.id === taskId ? { ...task, status: 'in_progress' } : task)));
    } catch (error) {
      console.error('Error starting task:', error);
    }
  };

  const handleFinishTask = async (taskId) => {
    const token = localStorage.getItem('accessToken');
    try {
      await axios.patch(`http://localhost:8001/api/tasks/${taskId}/`, { status: 'completed' }, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(tasks.map(task => (task.id === taskId ? { ...task, status: 'completed' } : task)));
    } catch (error) {
      console.error('Error finishing task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    const token = localStorage.getItem('accessToken');
    try {
      await axios.delete(`http://localhost:8001/api/tasks/${taskId}/`, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    try {
      const response = await axios.post('http://localhost:8001/api/tasks/', newTask, { headers: { Authorization: `Bearer ${token}` } });
      setTasks([...tasks, response.data]);
      setNewTask({ title: '', assigned_to: '', start_date: '', end_date: '', comments: '' });
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleApproveTask = async (taskId) => {
    const token = localStorage.getItem('accessToken');
    try {
      await axios.patch(`http://localhost:8001/api/tasks/${taskId}/`, { status: 'approved' }, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error approving task:', error);
    }
  };

  const handleRejectTask = async (taskId) => {
    const reason = prompt('Motivo del rechazo:');
    if (reason) {
      const token = localStorage.getItem('accessToken');
      try {
        await axios.patch(`http://localhost:8001/api/tasks/${taskId}/`, { status: 'rejected', rejection_reason: reason }, { headers: { Authorization: `Bearer ${token}` } });
        setTasks(tasks.map(task => (task.id === taskId ? { ...task, status: 'rejected', rejection_reason: reason } : task)));
      } catch (error) {
        console.error('Error rejecting task:', error);
      }
    }
  };

  const handleCreateKpi = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    try {
      const existingKpi = kpis.find(kpi => kpi.worker === newKpi.worker && kpi.period === newKpi.period);
      if (existingKpi) {
        const confirmOverwrite = window.confirm(`Ya existen objetivos para ${newKpi.worker} en ${newKpi.period}. ¿Deseas sobreescribirlos?`);
        if (!confirmOverwrite) return;
      }
      const response = await axios.post('http://localhost:8001/api/kpis/', newKpi, { headers: { Authorization: `Bearer ${token}` } });
      setKpis(kpis.some(kpi => kpi.worker === newKpi.worker && kpi.period === newKpi.period)
        ? kpis.map(kpi => (kpi.worker === newKpi.worker && kpi.period === newKpi.period ? response.data : kpi))
        : [...kpis, response.data]);
      setNewKpi({ worker: '', period: '', sales_target: '', sales_achieved: '', warranties_target: '', warranties_achieved: '', financing_target: '', financing_achieved: '', reviews_target: '', reviews_achieved: '' });
      document.getElementById('kpi-form').style.display = 'none';
    } catch (error) {
      console.error('Error creating KPI:', error);
    }
  };

  const handleMonthChange = (direction) => {
    console.log(`handleMonthChange called with direction: ${direction}, currentMonth: ${currentMonth}`);
    const current = new Date(`${currentMonth}-01`);
    let year = current.getFullYear();
    let month = current.getMonth();
    if (direction === 'prev') {
      month -= 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
    } else if (direction === 'next') {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    const newMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
    console.log(`New month calculated: ${newMonth}`);
    setCurrentMonth(newMonth);
    console.log(`State updated to: ${newMonth}`);
  };

  const handleCreateNews = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    try {
      const response = await axios.post('http://localhost:8001/api/news/', newNews, { headers: { Authorization: `Bearer ${token}` } });
      setNews([...news, response.data]);
      setNewNews({ title: '', content: '', department: 'all' });
      document.getElementById('news-form').style.display = 'none';
    } catch (error) {
      console.error('Error creating news:', error);
    }
  };

  const handleMarkNewsRead = async (newsId) => {
    const token = localStorage.getItem('accessToken');
    try {
      await axios.post(`http://localhost:8001/api/news/${newsId}/mark_as_read/`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setNews(news.map(item => (item.id === newsId ? { ...item, read_by: [...item.read_by, currentUser.username] } : item)));
    } catch (error) {
      console.error('Error marking news as read:', error);
    }
  };

  const handleDeleteNews = async (newsId) => {
    const token = localStorage.getItem('accessToken');
    try {
      await axios.delete(`http://localhost:8001/api/news/${newsId}/`, { headers: { Authorization: `Bearer ${token}` } });
      setNews(news.filter(item => item.id !== newsId));
    } catch (error) {
      console.error('Error deleting news:', error);
    }
  };

  const handleCreatePromotion = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    try {
      console.log('Datos enviados al backend para promoción:', newPromotion);
      const response = await axios.post('http://localhost:8001/api/promotions/', newPromotion, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setPromotions([response.data, ...promotions]);
      setNewPromotion({ name: '', code: '', start_date: '', end_date: '' });
      document.getElementById('promotion-form').style.display = 'none';
    } catch (error) {
      console.error('Error creating promotion:', error.response ? error.response.data : error.message);
    }
  };

  const handleDeletePromotion = async (promotionId) => {
    const token = localStorage.getItem('accessToken');
    try {
      await axios.delete(`http://localhost:8001/api/promotions/${promotionId}/`, { headers: { Authorization: `Bearer ${token}` } });
      setPromotions(promotions.filter(item => item.id !== promotionId));
    } catch (error) {
      console.error('Error deleting promotion:', error);
    }
  };

  const getPromotionCountdown = (startDate, endDate, name) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Establecemos la hora a 00:00:00 para comparar solo las fechas
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const daysToStart = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    const daysToEnd = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    // Comparamos solo las fechas (sin horas) para determinar si la promoción ha terminado
    if (today.getTime() > end.getTime()) {
      return { text: "Promoción Finalizada", className: 'promotion-ended' };
    }

    // Si hoy es el día de finalización, mostramos el mensaje "Hoy termina la promoción"
    if (daysToEnd === 0) {
      return { text: `Hoy termina la promoción: ${name}`, className: 'promotion-ending' };
    }

    // Si la promoción está vigente (hoy es menor o igual a la fecha de fin)
    if (daysToStart > 3) {
      return { text: `En ${daysToStart} día${daysToStart > 1 ? 's' : ''} empieza la promoción`, className: 'promotion-starting' };
    }

    if (daysToStart > 0) {
      return { text: `En ${daysToStart} día${daysToStart > 1 ? 's' : ''} empieza la promoción`, className: 'promotion-starting' };
    }

    if (daysToEnd <= 3 && daysToEnd > 0) {
      return { text: `¡OJO! Queda${daysToEnd > 0 ? 'n' : ''} ${daysToEnd} día${daysToEnd !== 1 ? 's' : ''} para que acabe la promoción`, className: 'promotion-ending' };
    }

    return { text: "Promoción Vigente", className: 'promotion-active' };
  };

  const isNewsRead = (newsItem) => {
    return newsItem.read_by.includes(currentUser?.username);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    navigate('/');
  };

  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter(x => x);
    const breadcrumbs = [];
    let currentPath = '';
    pathnames.forEach((name, index) => {
      currentPath += `/${name}`;
      breadcrumbs.push({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        path: currentPath,
      });
    });
    if (!pathnames.includes('home')) {
      breadcrumbs.unshift({ name: 'Home', path: '/home' });
    }
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
  const currentMonthDisplay = new Date(currentMonth + '-01').toLocaleString('es-ES', {
    month: 'long',
    year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase());

  return (
    <div className="home-container">
      <header className="header">
        <div className="logo">
          <img src="/logo.png" alt="Logo" style={{ height: '50px' }} />
        </div>
        <nav className="navbar">
          <button onClick={() => navigate('/home')}>Home</button>
          <button onClick={() => navigate('/requests')}>Peticiones</button>
          <button>Botón 3</button>
          <button>Botón 4</button>
          <button>Botón 5</button>
          <button>Botón 6</button>
        </nav>
        <div className="user-profile">
          {currentUser && (
            <>
              <img
                src={currentUser.photo || '/default-avatar.png'}
                alt="Avatar"
                className="avatar"
                onError={(e) => (e.target.src = '/default-avatar.png')}
              />
              <span>Bienvenid@, {currentUser.first_name || currentUser.username}</span>
              <div className="dropdown">
                {currentUser.role === 'worker' && <button onClick={() => navigate('/change-password')}>Cambiar datos</button>}
                {currentUser.role === 'manager' && <button onClick={() => navigate('/user-management')}>Gestionar Usuarios</button>}
                <button onClick={handleLogout}>Cerrar Sesión</button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="breadcrumbs">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.path}>
            {index > 0 && ' > '}
            <Link to={crumb.path} className="breadcrumb-link">
              {crumb.name}
            </Link>
          </span>
        ))}
      </div>

      <div className="main-content">
        <section key={currentMonth} className="module dashboard">
          <h3>Dashboard (KPIs)</h3>
          <NavigationButtons
            currentMonthDisplay={currentMonthDisplay}
            currentMonth={currentMonth}
            onPrev={() => handleMonthChange('prev')}
            onNext={() => handleMonthChange('next')}
          />
          {currentUser?.role === 'worker' && (
            <div className="kpi-worker">
              {kpis.length === 0 && <p>No hay KPIs para este mes.</p>}
              {kpis.filter(kpi => kpi.worker === currentUser.username).map(kpi => (
                <div key={kpi.id} className="kpi-item">
                  <h4>Período: {kpi.period}</h4>
                  <table className="kpi-table">
                    <thead>
                      <tr>
                        <th>Métrica</th>
                        <th>Progreso</th>
                        <th>Estado</th>
                        <th>¿Cómo voy?</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Ventas</td>
                        <td>
                          <div className="progress-bar">
                            <div className="progress" style={{ width: `${calculatePercentage(kpi.sales_achieved, kpi.sales_target)}%`, backgroundColor: getProgressColor(calculatePercentage(kpi.sales_achieved, kpi.sales_target)) }}>
                              {calculatePercentage(kpi.sales_achieved, kpi.sales_target)}%
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="objective"><strong>Objetivo:</strong> {kpi.sales_target}€</span><br />
                          <span className={getStatusColorClass(calculatePercentage(kpi.sales_achieved, kpi.sales_target))}>Conseguido: {kpi.sales_achieved}€</span>
                        </td>
                        <td className={getStatusColorClass(calculatePercentage(kpi.sales_achieved, kpi.sales_target))}>
                          {getMotivationalMessage(calculatePercentage(kpi.sales_achieved, kpi.sales_target))}<br />
                          <span>{getRemaining(kpi.sales_achieved, kpi.sales_target, '€')}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>Garantías</td>
                        <td>
                          <div className="progress-bar">
                            <div className="progress" style={{ width: `${calculatePercentage(kpi.warranties_achieved, kpi.warranties_target)}%`, backgroundColor: getProgressColor(calculatePercentage(kpi.warranties_achieved, kpi.warranties_target)) }}>
                              {calculatePercentage(kpi.warranties_achieved, kpi.warranties_target)}%
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="objective"><strong>Objetivo:</strong> {kpi.warranties_target}</span><br />
                          <span className={getStatusColorClass(calculatePercentage(kpi.warranties_achieved, kpi.warranties_target))}>Conseguido: {kpi.warranties_achieved}</span>
                        </td>
                        <td className={getStatusColorClass(calculatePercentage(kpi.warranties_achieved, kpi.warranties_target))}>
                          {getMotivationalMessage(calculatePercentage(kpi.warranties_achieved, kpi.warranties_target))}<br />
                          <span>{getRemaining(kpi.warranties_achieved, kpi.warranties_target)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>Financiación</td>
                        <td>
                          <div className="progress-bar">
                            <div className="progress" style={{ width: `${calculatePercentage(kpi.financing_achieved, kpi.financing_target)}%`, backgroundColor: getProgressColor(calculatePercentage(kpi.financing_achieved, kpi.financing_target)) }}>
                              {calculatePercentage(kpi.financing_achieved, kpi.financing_target)}%
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="objective"><strong>Objetivo:</strong> {kpi.financing_target}€</span><br />
                          <span className={getStatusColorClass(calculatePercentage(kpi.financing_achieved, kpi.financing_target))}>Conseguido: {kpi.financing_achieved}€</span>
                        </td>
                        <td className={getStatusColorClass(calculatePercentage(kpi.financing_achieved, kpi.financing_target))}>
                          {getMotivationalMessage(calculatePercentage(kpi.financing_achieved, kpi.financing_target))}<br />
                          <span>{getRemaining(kpi.financing_achieved, kpi.financing_target, '€')}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>Reseñas</td>
                        <td>
                          <div className="progress-bar">
                            <div className="progress" style={{ width: `${calculatePercentage(kpi.reviews_achieved, kpi.reviews_target)}%`, backgroundColor: getProgressColor(calculatePercentage(kpi.reviews_achieved, kpi.reviews_target)) }}>
                              {calculatePercentage(kpi.reviews_achieved, kpi.reviews_target)}%
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="objective"><strong>Objetivo:</strong> {kpi.reviews_target}</span><br />
                          <span className={getStatusColorClass(calculatePercentage(kpi.reviews_achieved, kpi.reviews_target))}>Conseguido: {kpi.reviews_achieved}</span>
                        </td>
                        <td className={getStatusColorClass(calculatePercentage(kpi.reviews_achieved, kpi.reviews_target))}>
                          {getMotivationalMessage(calculatePercentage(kpi.reviews_achieved, kpi.reviews_target))}<br />
                          <span>{getRemaining(kpi.reviews_achieved, kpi.reviews_target)}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
          {currentUser?.role === 'manager' && (
            <div className="kpi-manager">
              <div id="kpi-form" style={{ display: 'none' }}>
                <h4>Cargar Objetivos</h4>
                <form onSubmit={handleCreateKpi}>
                  <select value={newKpi.worker} onChange={e => setNewKpi({ ...newKpi, worker: e.target.value })} required>
                    <option value="">Seleccionar trabajador</option>
                    {users.filter(user => user.role === 'worker').map(user => <option key={user.id} value={user.username}>{user.first_name || user.username}</option>)}
                  </select>
                  <select value={newKpi.period} onChange={e => setNewKpi({ ...newKpi, period: e.target.value })} required>
                    <option value="">Seleccionar período</option>
                    {getPeriodOptions().map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <input type="number" value={newKpi.sales_target} onChange={e => setNewKpi({ ...newKpi, sales_target: e.target.value })} placeholder="Objetivo Ventas (€)" required />
                  <input type="number" value={newKpi.sales_achieved} onChange={e => setNewKpi({ ...newKpi, sales_achieved: e.target.value })} placeholder="Ventas Conseguidas (€)" required />
                  <input type="number" value={newKpi.warranties_target} onChange={e => setNewKpi({ ...newKpi, warranties_target: e.target.value })} placeholder="Objetivo Garantías" required />
                  <input type="number" value={newKpi.warranties_achieved} onChange={e => setNewKpi({ ...newKpi, warranties_achieved: e.target.value })} placeholder="Garantías Conseguidas" required />
                  <input type="number" value={newKpi.financing_target} onChange={e => setNewKpi({ ...newKpi, financing_target: e.target.value })} placeholder="Objetivo Financiación (€)" required />
                  <input type="number" value={newKpi.financing_achieved} onChange={e => setNewKpi({ ...newKpi, financing_achieved: e.target.value })} placeholder="Financiación Conseguida (€)" required />
                  <input type="number" value={newKpi.reviews_target} onChange={e => setNewKpi({ ...newKpi, reviews_target: e.target.value })} placeholder="Objetivo Reseñas" required />
                  <input type="number" value={newKpi.reviews_achieved} onChange={e => setNewKpi({ ...newKpi, reviews_achieved: e.target.value })} placeholder="Reseñas Conseguidas" required />
                  <button type="submit">Guardar Objetivos</button>
                </form>
              </div>
              {kpis.length === 0 && <p>No hay KPIs para este mes.</p>}
              <table>
                <thead>
                  <tr>
                    <th>Trabajador</th><th>Período</th><th>Ventas</th><th>Garantías</th><th>Financiación</th><th>Reseñas</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map(kpi => {
                    const worker = users.find(user => user.username === kpi.worker);
                    return (
                      <tr key={kpi.id}>
                        <td>{worker ? worker.first_name : kpi.worker}</td>
                        <td>{kpi.period}</td>
                        <td>
                          <div className="progress-bar">
                            <div className="progress" style={{ width: `${calculatePercentage(kpi.sales_achieved, kpi.sales_target)}%`, backgroundColor: getProgressColor(calculatePercentage(kpi.sales_achieved, kpi.sales_target)) }}>
                              {calculatePercentage(kpi.sales_achieved, kpi.sales_target)}%
                            </div>
                          </div>
                          <span>{kpi.sales_achieved} / {kpi.sales_target} €</span><br />
                        </td>
                        <td>
                          <div className="progress-bar">
                            <div className="progress" style={{ width: `${calculatePercentage(kpi.warranties_achieved, kpi.warranties_target)}%`, backgroundColor: getProgressColor(calculatePercentage(kpi.warranties_achieved, kpi.warranties_target)) }}>
                              {calculatePercentage(kpi.warranties_achieved, kpi.warranties_target)}%
                            </div>
                          </div>
                          <span>{kpi.warranties_achieved} / {kpi.warranties_target}</span><br />
                        </td>
                        <td>
                          <div className="progress-bar">
                            <div className="progress" style={{ width: `${calculatePercentage(kpi.financing_achieved, kpi.financing_target)}%`, backgroundColor: getProgressColor(calculatePercentage(kpi.financing_achieved, kpi.financing_target)) }}>
                              {calculatePercentage(kpi.financing_achieved, kpi.financing_target)}%
                            </div>
                          </div>
                          <span>{kpi.financing_achieved} / {kpi.financing_target} €</span><br />
                        </td>
                        <td>
                          <div className="progress-bar">
                            <div className="progress" style={{ width: `${calculatePercentage(kpi.reviews_achieved, kpi.reviews_target)}%`, backgroundColor: getProgressColor(calculatePercentage(kpi.reviews_achieved, kpi.reviews_target)) }}>
                              {calculatePercentage(kpi.reviews_achieved, kpi.reviews_target)}%
                            </div>
                          </div>
                          <span>{kpi.reviews_achieved} / {kpi.reviews_target}</span><br />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
                <button onClick={() => document.getElementById('kpi-form').style.display = 'block'}>Cargar Objetivos</button>
                <button onClick={handleExportToPDF}>Exportar a PDF</button>
              </div>
            </div>
          )}
        </section>

        <section className="module tasks">
          <h3>Tareas</h3>
          {currentUser?.role === 'worker' && (
            <div className="task-worker">
              {tasks.length === 0 ? (
                <p style={{ color: '#4caf50', fontStyle: 'italic' }}>¡No tienes tareas pendientes, disfruta del momento!</p>
              ) : (
                <ul className="task-list">
                  {tasks.filter(task => task.assigned_to === currentUser.username).map(task => {
                    const assignedUser = users.find(user => user.username === task.assigned_to);
                    const createdByUser = users.find(user => user.username === task.created_by);
                    return (
                      <li key={task.id} className={`task-item ${task.status}`}>
                        <div>
                          {task.title} - Asignada por: {createdByUser ? createdByUser.first_name : task.created_by}<br />
                          Fecha Inicio: {formatDate(task.start_date)} - Fecha Fin: {formatDate(task.end_date)}<br />
                          Comentarios: {task.comments || 'N/A'}<br />
                          Asignada a: {assignedUser ? assignedUser.first_name : task.assigned_to}<br />
                          Estado: {getTaskStatusLabel(task.status)}
                          {task.status === 'approved' && <span className="status-icon approved">✔</span>}
                          {task.status === 'rejected' && <><span className="status-icon rejected">✘</span><br />Motivo del rechazo: {task.rejection_reason}</>}
                        </div>
                        <div className="task-actions">
                          {task.status === 'pending' && <button onClick={() => handleStartTask(task.id)}>Iniciar</button>}
                          {task.status === 'in_progress' && <button onClick={() => handleFinishTask(task.id)}>Finalizar</button>}
                          {(task.status === 'approved' || task.status === 'rejected') && <button onClick={() => handleDeleteTask(task.id)}>Eliminar</button>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          {currentUser?.role === 'manager' && (
            <>
              <div className="task-create">
                <h4>Crear Nueva Tarea</h4>
                <form onSubmit={handleCreateTask}>
                  <input type="text" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Título" required />
                  <select value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })} required>
                    <option value="">Seleccionar trabajador</option>
                    {users.filter(user => user.role === 'worker').map(user => (
                      <option key={user.id} value={user.username}>{user.first_name || user.username}</option>
                    ))}
                  </select>
                  <input type="date" value={newTask.start_date} onChange={e => setNewTask({ ...newTask, start_date: e.target.value })} required />
                  <input type="date" value={newTask.end_date} onChange={e => setNewTask({ ...newTask, end_date: e.target.value })} required />
                  <textarea value={newTask.comments} onChange={e => setNewTask({ ...newTask, comments: e.target.value })} placeholder="Comentarios" />
                  <button type="submit">Crear Tarea</button>
                </form>
              </div>
              <div className="task-manage">
                <h4>Tareas de los Trabajadores</h4>
                <ul className="task-list">
                  {tasks.filter(task => task.created_by === currentUser.username).map(task => {
                    const assignedUser = users.find(user => user.username === task.assigned_to);
                    const createdByUser = users.find(user => user.username === task.created_by);
                    return (
                      <li key={task.id} className={`task-item ${task.status}`}>
                        {task.title} - Asignada por: {createdByUser ? createdByUser.first_name : task.created_by} - Asignada a: {assignedUser ? assignedUser.first_name : task.assigned_to} - Estado: {getTaskStatusLabel(task.status)}<br />
                        Fecha Inicio: {formatDate(task.start_date)} - Fecha Fin: {formatDate(task.end_date)}<br />
                        Comentarios: {task.comments || 'N/A'}
                        {task.status === 'rejected' && <> - Motivo del rechazo: {task.rejection_reason}</>}
                        <div className="task-actions">
                          {task.status === 'completed' && (
                            <>
                              <button onClick={() => handleApproveTask(task.id)}>Aprobar</button>
                              <button onClick={() => handleRejectTask(task.id)}>Rechazar</button>
                            </>
                          )}
                          {task.status === 'rejected' && <button onClick={() => handleDeleteTask(task.id)}>Eliminar</button>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </section>

        <section className="module calendar">
          {currentUser && <CalendarModule currentUser={currentUser} />}
        </section>

        <section className="module split-container">
          <div className="news-module">
            <h3>Noticias</h3>
            {currentUser?.role === 'manager' && (
              <>
                <button onClick={() => document.getElementById('news-form').style.display = 'block'}>Crear Noticia</button>
                <div id="news-form" style={{ display: 'none' }}>
                  <h4>Crear Noticia</h4>
                  <form onSubmit={handleCreateNews}>
                    <input type="text" value={newNews.title} onChange={e => setNewNews({ ...newNews, title: e.target.value })} placeholder="Título" required />
                    <textarea value={newNews.content} onChange={e => setNewNews({ ...newNews, content: e.target.value })} placeholder="Contenido" required />
                    <select value={newNews.department} onChange={e => setNewNews({ ...newNews, department: e.target.value })} required>
                      <option value="all">Todos</option>
                      <option value="G1">G1</option>
                      <option value="G2">G2</option>
                      <option value="G3">G3</option>
                    </select>
                    <button type="submit">Crear Noticia</button>
                  </form>
                </div>
                <div className="news-list">
                  {news.map(item => {
                    const createdByUser = users.find(user => user.username === item.created_by);
                    return (
                      <div key={item.id} className="news-item">
                        <div className="news-header">
                          <strong>{item.title}</strong>
                          <span className="news-date">{formatDate(item.created_at)}</span>
                        </div>
                        <div className="news-content" dangerouslySetInnerHTML={{ __html: renderContentWithLinks(item.content) }} />
                        <div className="news-footer">
                          <span className="news-department">Dirigido a: {item.department === 'all' ? 'Todos' : item.department}</span>
                          <span className="news-created-by">Creado por: {createdByUser ? createdByUser.first_name : item.created_by}</span>
                        </div>
                        <div className="news-actions">
                          {!isNewsRead(item) ? (
                            <button onClick={() => handleMarkNewsRead(item.id)}>Marcar como leída</button>
                          ) : (
                            <button onClick={() => handleDeleteNews(item.id)}>Eliminar</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {currentUser?.role === 'worker' && (
              <table className="news-table">
                <thead>
                  <tr><th>Título</th><th>Fecha</th><th>Contenido</th><th>Acción</th></tr>
                </thead>
                <tbody>
                  {news.map(item => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{formatDate(item.created_at)}</td>
                      <td dangerouslySetInnerHTML={{ __html: renderContentWithLinks(item.content) }} />
                      <td>
                        {!isNewsRead(item) ? (
                          <button onClick={() => handleMarkNewsRead(item.id)}>Marcar como leída</button>
                        ) : (
                          <button disabled>Leída</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={() => navigate('/archived-news')}>Noticias Leídas</button>
          </div>

          <div className="promotions-module">
            <h3>Promociones</h3>
            {currentUser?.role === 'manager' && (
              <>
                <button onClick={() => document.getElementById('promotion-form').style.display = 'block'}>Crear Promoción</button>
                <div id="promotion-form" style={{ display: 'none' }}>
                  <h4>Crear Promoción</h4>
                  <form onSubmit={handleCreatePromotion}>
                    <input type="text" value={newPromotion.name} onChange={e => setNewPromotion({ ...newPromotion, name: e.target.value })} placeholder="Nombre" required />
                    <input type="text" value={newPromotion.code} onChange={e => setNewPromotion({ ...newPromotion, code: e.target.value })} placeholder="Código" required />
                    <input type="date" value={newPromotion.start_date} onChange={e => setNewPromotion({ ...newPromotion, start_date: e.target.value })} required />
                    <input type="date" value={newPromotion.end_date} onChange={e => setNewPromotion({ ...newPromotion, end_date: e.target.value })} required />
                    <button type="submit">Crear Promoción</button>
                  </form>
                </div>
              </>
            )}
            <div className="promotions-list">
              {promotions.map(item => {
                const { text, className } = getPromotionCountdown(item.start_date, item.end_date, item.name);
                return (
                  <div key={item.id} className={`promotion-item ${className}`}>
                    <div className="promotion-header">
                      <strong>{item.name || 'Sin nombre'}</strong>
                      <span className="promotion-code">Código: {item.code}</span>
                    </div>
                    <div className="promotion-dates">
                      <span>Inicio: {formatDate(item.start_date)}</span>
                      <span>Fin: {formatDate(item.end_date)}</span>
                    </div>
                    <div className="promotion-footer">
                      {text && <span className="promotion-countdown">{text}</span>}
                      {currentUser?.role === 'manager' && (
                        <button onClick={() => handleDeletePromotion(item.id)}>Eliminar</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;