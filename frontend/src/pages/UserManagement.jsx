import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UserManagement.css';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ 
    username: '', 
    password: '', 
    first_name: '', 
    last_name: '', 
    email: '', 
    role: 'worker', 
    department: '', 
    manager: '',
    photo: null 
  });
  const [editUser, setEditUser] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(null); // Para la vista previa de la foto
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }

    axios.get('http://localhost:8001/api/users/', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => setUsers(response.data))
      .catch(error => {
        console.error('Error fetching users:', error);
        navigate('/');
      });
  }, [navigate]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    const formData = new FormData();
    formData.append('username', newUser.username);
    formData.append('password', newUser.password);
    formData.append('first_name', newUser.first_name);
    formData.append('last_name', newUser.last_name);
    formData.append('email', newUser.email);
    formData.append('role', newUser.role);
    if (newUser.department) formData.append('department', newUser.department);
    if (newUser.manager) formData.append('manager', newUser.manager);
    if (newUser.photo) formData.append('photo', newUser.photo);

    try {
      const response = await axios.post('http://localhost:8001/api/users/', formData, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'multipart/form-data'
        },
      });
      console.log('Usuario creado:', response.data);
      const usersResponse = await axios.get('http://localhost:8001/api/users/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(usersResponse.data);
      setNewUser({ 
        username: '', 
        password: '', 
        first_name: '', 
        last_name: '', 
        email: '', 
        role: 'worker', 
        department: '', 
        manager: '',
        photo: null 
      });
      setSelectedFileName('');
    } catch (error) {
      console.error('Error creando usuario:', error.response?.data);
      alert(`Error al crear usuario: ${JSON.stringify(error.response?.data) || 'Intenta de nuevo'}`);
    }
  };

  const handleDeleteUser = async (id) => {
    // Mostrar mensaje de confirmación antes de eliminar
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar al usuario con ID ${id}? Esta acción no se puede deshacer.`
    );
    
    if (!confirmDelete) {
      // Si el usuario selecciona "Cancelar", no se ejecuta la eliminación
      return;
    }

    const token = localStorage.getItem('accessToken');
    try {
      await axios.delete(`http://localhost:8001/api/users/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter(user => user.id !== id));
      if (editUser && editUser.id === id) setEditUser(null);
    } catch (error) {
      alert(`Error al eliminar usuario: ${error.response?.data?.detail || 'Intenta de nuevo'}`);
    }
  };

  const handleEditUser = (user) => {
    setEditUser({ 
      ...user, 
      password: '', 
      first_name: user.first_name || '', 
      last_name: user.last_name || '', 
      email: user.email || '', 
      department: user.department || '',
      manager: user.manager || '',
      photo: null
    });
    setSelectedFileName('');
    // Si el usuario tiene una foto, la mostramos como vista previa
    if (user.photo) {
      setPreviewPhoto(user.photo); // La URL de la foto ya incluye /media/
    } else {
      setPreviewPhoto(null);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    // Mostrar mensaje de confirmación antes de actualizar
    const confirmUpdate = window.confirm(
      `¿Estás seguro de que deseas actualizar los datos del usuario ${editUser.username}?`
    );

    if (!confirmUpdate) {
      // Si el usuario selecciona "Cancelar", no se ejecuta la actualización
      return;
    }

    const token = localStorage.getItem('accessToken');
    const formData = new FormData();
    formData.append('username', editUser.username);
    if (editUser.password) formData.append('password', editUser.password);
    formData.append('first_name', editUser.first_name);
    formData.append('last_name', editUser.last_name);
    formData.append('email', editUser.email);
    formData.append('role', editUser.role);
    if (editUser.department) formData.append('department', editUser.department);
    if (editUser.manager) formData.append('manager', editUser.manager);
    if (editUser.photo && typeof editUser.photo !== 'string') formData.append('photo', editUser.photo);

    try {
      const response = await axios.put(`http://localhost:8001/api/users/${editUser.id}/`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'multipart/form-data'
        },
      });
      console.log('Usuario actualizado:', response.data);
      const usersResponse = await axios.get('http://localhost:8001/api/users/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(usersResponse.data);
      setEditUser(null);
      setSelectedFileName('');
      setPreviewPhoto(null);
    } catch (error) {
      alert(`Error al actualizar usuario: ${error.response?.data?.detail || 'Intenta de nuevo'}`);
    }
  };

  return (
    <div className="user-management-container">
      <h2>Gestión de Usuarios</h2>

      {/* Formulario para crear usuario */}
      <div className="form-section">
        <h3>Añadir Nuevo Usuario</h3>
        <form onSubmit={handleCreateUser}>
          <input
            type="text"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            placeholder="Nombre de usuario"
            required
          />
          <input
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            placeholder="Contraseña"
            required
          />
          <input
            type="text"
            value={newUser.first_name}
            onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
            placeholder="Nombre"
            required
          />
          <input
            type="text"
            value={newUser.last_name}
            onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
            placeholder="Apellidos"
            required
          />
          <input
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            placeholder="Email"
            required
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="worker">Trabajador</option>
            <option value="manager">Manager</option>
          </select>
          <select
            value={newUser.department}
            onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
          >
            <option value="">Seleccionar grupo</option>
            <option value="G1">G1</option>
            <option value="G2">G2</option>
            <option value="G3">G3</option>
          </select>
          <select
            value={newUser.manager}
            onChange={(e) => setNewUser({ ...newUser, manager: e.target.value })}
          >
            <option value="">Seleccionar manager</option>
            {users.filter(user => user.role === 'manager').map(manager => (
              <option key={manager.id} value={manager.username}>{manager.username}</option>
            ))}
          </select>
          <div className="file-input-wrapper">
            <input
              type="file"
              id="new-photo"
              onChange={(e) => {
                setNewUser({ ...newUser, photo: e.target.files[0] });
                setSelectedFileName(e.target.files[0] ? e.target.files[0].name : '');
              }}
              accept="image/*"
            />
            <label htmlFor="new-photo">Cargar foto</label>
            {selectedFileName && <span className="file-name">{selectedFileName}</span>}
          </div>
          <button type="submit">Añadir Usuario</button>
        </form>
      </div>

      {/* Formulario para editar usuario */}
      {editUser && (
        <div className="form-section">
          <h3>Editar Usuario: {editUser.username}</h3>
          <form onSubmit={handleUpdateUser}>
            <input
              type="text"
              value={editUser.username}
              onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
              placeholder="Nombre de usuario"
              required
            />
            <input
              type="password"
              value={editUser.password}
              onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
              placeholder="Nueva contraseña (opcional)"
            />
            <input
              type="text"
              value={editUser.first_name}
              onChange={(e) => setEditUser({ ...editUser, first_name: e.target.value })}
              placeholder="Nombre"
              required
            />
            <input
              type="text"
              value={editUser.last_name}
              onChange={(e) => setEditUser({ ...editUser, last_name: e.target.value })}
              placeholder="Apellidos"
              required
            />
            <input
              type="email"
              value={editUser.email}
              onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
              placeholder="Email"
              required
            />
            <select
              value={editUser.role}
              onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
            >
              <option value="worker">Trabajador</option>
              <option value="manager">Manager</option>
            </select>
            <select
              value={editUser.department}
              onChange={(e) => setEditUser({ ...editUser, department: e.target.value })}
            >
              <option value="">Seleccionar grupo</option>
              <option value="G1">G1</option>
              <option value="G2">G2</option>
              <option value="G3">G3</option>
            </select>
            <select
              value={editUser.manager}
              onChange={(e) => setEditUser({ ...editUser, manager: e.target.value })}
            >
              <option value="">Seleccionar manager</option>
              {users.filter(user => user.role === 'manager').map(manager => (
                <option key={manager.id} value={manager.username}>{manager.username}</option>
              ))}
            </select>
            <div className="file-input-wrapper">
              <input
                type="file"
                id="edit-photo"
                onChange={(e) => {
                  const file = e.target.files[0];
                  setEditUser({ ...editUser, photo: file });
                  setSelectedFileName(file ? file.name : '');
                  // Mostramos una vista previa de la nueva foto seleccionada
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setPreviewPhoto(reader.result);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setPreviewPhoto(editUser.photo || null);
                  }
                }}
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
            <div className="form-buttons">
              <button type="submit">Guardar Cambios</button>
              <button type="button" onClick={() => { setEditUser(null); setPreviewPhoto(null); setSelectedFileName(''); }} className="cancel-btn">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="users-list">
        <h3>Lista de Usuarios</h3>
        <ul>
          {users.map(user => (
            <li key={user.id}>
              <span>{user.username} - {user.first_name} {user.last_name} - {user.email} - {user.role} - {user.department || 'Sin grupo'} - Manager: {user.manager || 'Sin manager'}</span>
              <div className="button-group">
                <button onClick={() => handleEditUser(user)} className="edit-btn">Editar</button>
                <button onClick={() => handleDeleteUser(user.id)} className="delete-btn">Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <button className="back-btn" onClick={() => navigate('/home')}>Volver al Home</button>
    </div>
  );
}

export default UserManagement;
