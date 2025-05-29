import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './ArchivedNews.css';

function ArchivedNews() {
  const [archivedNews, setArchivedNews] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [userResponse, newsResponse, usersResponse] = await Promise.all([
          axios.get('http://localhost:8001/api/users/me/', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:8001/api/news/archived/', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:8001/api/users/', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setCurrentUser(userResponse.data);
        setArchivedNews(newsResponse.data);
        setUsers(usersResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        navigate('/');
      }
    };

    fetchData();
  }, [navigate]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  /* Función para traducir el rol*/
  const translateRole = (role) => {
    switch (role) {
      case 'worker':
        return 'Trabajador';
      case 'manager':
        return 'Manager';
      default:
        return role;
    }
  };

  return (
    <div className="archived-news-container">
      <header className="header">
        <div className="logo">
          <img src="/logo.png" alt="Logo" style={{ height: '50px' }} />
        </div>
        <nav className="navbar">
          <button onClick={() => navigate('/home')}>Home</button>
          <button onClick={() => navigate('/requests')}>Peticiones</button>
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
                <button onClick={() => localStorage.removeItem('accessToken') && navigate('/')}>Cerrar Sesión</button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="breadcrumbs">
        <span><Link to="/home" className="breadcrumb-link">Home</Link></span> > <span>Noticias Archivadas</span>
      </div>

      <div className="main-content">
        <section className="module">
          <h3>Noticias Archivadas</h3>
          {currentUser ? (
            <>
              <p className="user-info">Usuario: {currentUser.first_name || currentUser.username} - Rol: {translateRole(currentUser.role)}</p>

              {Object.keys(archivedNews).length > 0 ? (
                Object.entries(archivedNews).map(([month, newsList]) => (
                  <div key={month} className="news-month">
                    <h4>{new Date(month + '-01').toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}</h4>
                    <ul className="archived-news-list">
                      {newsList.map(item => {
                        const createdByUser = users.find(user => user.username === item.created_by);
                        return (
                          <li key={item.id} className="news-item">
                            <strong>{item.title}</strong> - {formatDate(item.created_at)}<br />
                            {item.content}<br />
                            <span className="news-department">Dirigido a: {item.department === 'all' ? 'Todos' : item.department}</span><br />
                            <span className="created-by">Creado por: {createdByUser ? createdByUser.first_name : item.created_by}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="no-news">No hay noticias archivadas.</p>
              )}
            </>
          ) : (
            <p className="loading">Cargando...</p>
          )}
          <button className="back-button" onClick={() => navigate('/home')}>Volver a Inicio</button>
        </section>
      </div>
    </div>
  );
}

export default ArchivedNews;
