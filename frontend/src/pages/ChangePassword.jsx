import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ChangePassword.css';

function ChangePassword() {
  const [userData, setUserData] = useState({ first_name: '', last_name: '', email: '', photo: null });
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [previewPhoto, setPreviewPhoto] = useState(null); // Para la vista previa de la foto
  const [selectedFileName, setSelectedFileName] = useState(''); // Para mostrar el nombre del archivo seleccionado
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await axios.get('http://localhost:8001/api/users/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserData({
          first_name: response.data.first_name || '',
          last_name: response.data.last_name || '',
          email: response.data.email || '',
          photo: response.data.photo || null, // Incluimos la foto del usuario
        });
        // Si el usuario tiene una foto, la mostramos como vista previa
        if (response.data.photo) {
          setPreviewPhoto(response.data.photo);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/');
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }

    const formData = new FormData();
    formData.append('first_name', userData.first_name);
    formData.append('last_name', userData.last_name);
    formData.append('email', userData.email);
    if (userData.photo && typeof userData.photo !== 'string') {
      formData.append('photo', userData.photo); // Solo añadimos la foto si es un archivo nuevo
    }

    try {
      const response = await axios.patch('http://localhost:8001/api/users/me/', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Datos actualizados exitosamente.');
      setUserData({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        email: response.data.email || '',
        photo: response.data.photo || null,
      });
      setPreviewPhoto(response.data.photo || null); // Actualizamos la vista previa con la nueva foto
      setSelectedFileName(''); // Limpiamos el nombre del archivo seleccionado
    } catch (error) {
      alert(`Error al actualizar datos: ${error.response?.data?.detail || 'Intenta de nuevo'}`);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('Las contraseñas nuevas no coinciden.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:8001/api/users/change_password/', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      alert(response.data.detail);
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      navigate('/home');
    } catch (error) {
      alert(`Error al cambiar contraseña: ${error.response?.data?.detail || 'Intenta de nuevo'}`);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setUserData({ ...userData, photo: file });
    setSelectedFileName(file ? file.name : '');
    // Mostramos una vista previa de la nueva foto seleccionada
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewPhoto(userData.photo || null); // Si no se selecciona una nueva foto, mostramos la existente
    }
  };

  return (
    <div className="change-password-container">
      <h2>Editar Datos</h2>
      <div className="form-section">
        <h3>Datos Personales</h3>
        <form onSubmit={handleUpdateProfile}>
          <input
            type="text"
            value={userData.first_name}
            onChange={(e) => setUserData({ ...userData, first_name: e.target.value })}
            placeholder="Nombre"
            required
          />
          <input
            type="text"
            value={userData.last_name}
            onChange={(e) => setUserData({ ...userData, last_name: e.target.value })}
            placeholder="Apellidos"
            required
          />
          <input
            type="email"
            value={userData.email}
            onChange={(e) => setUserData({ ...userData, email: e.target.value })}
            placeholder="Correo"
            required
          />
          <div className="file-input-wrapper">
            <input
              type="file"
              id="edit-photo"
              onChange={handleFileChange}
              accept="image/*"
            />
            <label htmlFor="edit-photo">Cargar foto</label>
            {selectedFileName && <span className="file-name">{selectedFileName}</span>}
            {previewPhoto ? (
              <div className="photo-preview">
                <p>Foto actual:</p>
                <img
                  src={previewPhoto}
                  alt="Vista previa de la foto"
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%' }}
                  onError={(e) => (e.target.src = '/default-avatar.png')}
                />
              </div>
            ) : (
              <p>No hay foto cargada.</p>
            )}
          </div>
          <button type="submit">Actualizar Datos</button>
        </form>
      </div>

      <div className="form-section">
        <h3>Cambiar Contraseña</h3>
        <form onSubmit={handleChangePassword}>
          <input
            type="password"
            value={passwordData.old_password}
            onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
            placeholder="Contraseña antigua"
            required
          />
          <input
            type="password"
            value={passwordData.new_password}
            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
            placeholder="Nueva contraseña"
            required
          />
          <input
            type="password"
            value={passwordData.confirm_password}
            onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
            placeholder="Confirmar nueva contraseña"
            required
          />
          <button type="submit">Cambiar Contraseña</button>
        </form>
      </div>

      <button className="back-btn" onClick={() => navigate('/home')}>Volver al Home</button>
    </div>
  );
}

export default ChangePassword;