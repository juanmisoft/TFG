import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function News() {
  const [news, setNews] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [newNews, setNewNews] = useState({ title: '', content: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }

    axios.get('http://localhost:8001/api/users/me/', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => setCurrentUser(response.data))
      .catch(error => {
        console.error('Error fetching user:', error);
        navigate('/');
      });

    axios.get('http://localhost:8001/api/news/', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => setNews(response.data))
      .catch(error => console.error('Error fetching news:', error));
  }, [navigate]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    try {
      await axios.post('http://localhost:8001/api/news/', newNews, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const response = await axios.get('http://localhost:8001/api/news/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNews(response.data);
      setNewNews({ title: '', content: '' });
    } catch (error) {
      console.error('Error creating news:', error.response?.data || error.message);
      alert(`Error al crear noticia: ${error.response?.data?.detail || 'Intenta de nuevo'}`);
    }
  };

  const handleMarkAsRead = async (id) => {
    const token = localStorage.getItem('accessToken');
    try {
      await axios.post(`http://localhost:8001/api/news/${id}/mark_as_read/`, {}, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const response = await axios.get('http://localhost:8001/api/news/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNews(response.data); // Actualiza la lista para eliminar la noticia marcada
    } catch (error) {
      console.error('Error marking news as read:', error.response?.data || error.message);
      alert(`Error al marcar como leída: ${error.response?.data?.detail || 'Intenta de nuevo'}`);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Noticias</h2>
      {currentUser ? (
        <>
          <p>Usuario: {currentUser.username} - Rol: {currentUser.role}</p>

          {/* Crear noticia (solo managers) */}
          {currentUser.role === 'manager' && (
            <form onSubmit={handleCreate} style={{ marginBottom: '20px' }}>
              <input
                type="text"
                value={newNews.title}
                onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                placeholder="Título"
                style={{ display: 'block', margin: '10px 0' }}
                required
              />
              <textarea
                value={newNews.content}
                onChange={(e) => setNewNews({ ...newNews, content: e.target.value })}
                placeholder="Contenido"
                style={{ display: 'block', margin: '10px 0', width: '100%', height: '100px' }}
                required
              />
              <button type="submit">Crear Noticia</button>
            </form>
          )}

          {/* Noticias no leídas */}
          <h3>Noticias Actuales</h3>
          {news.length > 0 ? (
            <ul>
              {news.map(item => (
                <li key={item.id} style={{ marginBottom: '15px' }}>
                  <strong>{item.title}</strong> - {formatDate(item.created_at)}<br />
                  {item.content}<br />
                  Creado por: {item.created_by}<br />
                  <button onClick={() => handleMarkAsRead(item.id)} style={{ marginTop: '5px' }}>
                    Marcar como leída
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay noticias nuevas.</p>
          )}

          {/* Botón para ver noticias archivadas */}
          <button
            onClick={() => navigate('/archived-news')}
            style={{ marginTop: '20px', marginBottom: '20px' }}
          >
            Ver Noticias Archivadas
          </button>
        </>
      ) : (
        <p>Cargando...</p>
      )}
      <button onClick={() => navigate('/dashboard')} style={{ marginTop: '20px' }}>Volver al Dashboard</button>
    </div>
  );
}

export default News;