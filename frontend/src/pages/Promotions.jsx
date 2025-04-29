import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Promotions() {
  const [currentUser, setCurrentUser] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [pastPromotions, setPastPromotions] = useState([]);
  const [showPast, setShowPast] = useState(false);
  const [newPromotion, setNewPromotion] = useState({
    name: '',
    code: '',
    start_date: '',
    end_date: '',
  });
  const navigate = useNavigate();

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

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

    axios.get('http://localhost:8001/api/promotions/', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => setPromotions(response.data))
      .catch(error => console.error('Error fetching promotions:', error));
  }, [navigate]);

  const handlePromotionSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    try {
      await axios.post('http://localhost:8001/api/promotions/', newPromotion, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const response = await axios.get('http://localhost:8001/api/promotions/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPromotions(response.data);
      setNewPromotion({ name: '', code: '', start_date: '', end_date: '' });
    } catch (error) {
      console.error('Error creating promotion (full response):', error.response);
      const errorMessage = error.response?.data?.detail || 
                          (error.response?.data && Object.entries(error.response.data)
                            .map(([key, value]) => `${key}: ${value}`).join(', ')) || 
                          'Verifica los datos';
      alert('Error al crear promoción: ' + errorMessage);
    }
  };

  const fetchPastPromotions = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await axios.get('http://localhost:8001/api/promotions/past/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPastPromotions(response.data);
      setShowPast(true);
    } catch (error) {
      console.error('Error fetching past promotions:', error);
      alert('Error al cargar promociones pasadas');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Promociones</h2>
      {currentUser ? (
        <>
          <p>Usuario: {currentUser.username} - Rol: {currentUser.role}</p>

          <h3>Promociones Actuales y Futuras</h3>
          {promotions.length > 0 ? (
            <ul>
              {promotions.map(promo => (
                <li key={promo.id}>
                  {promo.name} - {promo.code} ({formatDate(promo.start_date)} a {formatDate(promo.end_date)})
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay promociones actuales o futuras.</p>
          )}

          <button onClick={fetchPastPromotions} style={{ marginTop: '10px', padding: '8px 16px' }}>
            Ver Promociones Pasadas
          </button>
          {showPast && (
            <>
              <h3>Promociones Pasadas</h3>
              {pastPromotions.length > 0 ? (
                <ul>
                  {pastPromotions.map(promo => (
                    <li key={promo.id}>
                      {promo.name} - {promo.code} ({formatDate(promo.start_date)} a {formatDate(promo.end_date)})
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No hay promociones pasadas.</p>
              )}
            </>
          )}

          {currentUser.role === 'manager' && (
            <>
              <h3>Crear Promoción</h3>
              <form onSubmit={handlePromotionSubmit} style={{ maxWidth: '600px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="name">Nombre:</label>
                  <input
                    id="name"
                    type="text"
                    value={newPromotion.name}
                    onChange={(e) => setNewPromotion({ ...newPromotion, name: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="code">Código:</label>
                  <input
                    id="code"
                    type="text"
                    value={newPromotion.code}
                    onChange={(e) => setNewPromotion({ ...newPromotion, code: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="start_date">Fecha de Inicio:</label>
                  <input
                    id="start_date"
                    type="date"
                    value={newPromotion.start_date}
                    onChange={(e) => setNewPromotion({ ...newPromotion, start_date: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="end_date">Fecha de Fin:</label>
                  <input
                    id="end_date"
                    type="date"
                    value={newPromotion.end_date}
                    onChange={(e) => setNewPromotion({ ...newPromotion, end_date: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                    required
                  />
                </div>
                <button type="submit" style={{ padding: '10px', width: '100%' }}>Crear Promoción</button>
              </form>
            </>
          )}
        </>
      ) : (
        <p>Cargando...</p>
      )}
      <button onClick={() => navigate('/home')} style={{ marginTop: '20px', padding: '8px 16px' }}>Volver a Inicio</button>
    </div>
  );
}

export default Promotions;