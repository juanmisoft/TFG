import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Requests.css';

function Requests() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [vacationRequests, setVacationRequests] = useState([]);
  const [shiftChangeRequests, setShiftChangeRequests] = useState([]);
  const [newPermission, setNewPermission] = useState({ start_date: '', end_date: '', reason: '' });
  const [newVacation, setNewVacation] = useState({ start_date: '', end_date: '', period: '' });
  const [newShiftChange, setNewShiftChange] = useState({ date: '', acceptor: '', reason: '' });
  const [editRequest, setEditRequest] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('No hay token, redirigiendo a login');
      navigate('/');
      return;
    }

    const fetchData = async () => {
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [userResponse, usersResponse, permResponse, vacResponse, shiftResponse] = await Promise.all([
          axios.get('http://localhost:8001/api/users/me/', { headers }),
          axios.get('http://localhost:8001/api/users/', { headers }),
          axios.get('http://localhost:8001/api/permission-requests/', { headers }),
          axios.get('http://localhost:8001/api/vacation-requests/', { headers }),
          axios.get('http://localhost:8001/api/shift-change-requests/', { headers }),
        ]);

        setCurrentUser(userResponse.data);
        setUsers(usersResponse.data);
        setPermissionRequests(permResponse.data.map(req => ({ ...req, isHidden: req.hidden_by.includes(userResponse.data.username) })));
        setVacationRequests(vacResponse.data.map(req => ({ ...req, isHidden: req.hidden_by.includes(userResponse.data.username) })));
        setShiftChangeRequests(shiftResponse.data.map(req => ({ ...req, isHidden: req.hidden_by.includes(userResponse.data.username) })));
      } catch (error) {
        console.error('Error en fetchData:', error.response ? error.response.data : error.message);
        navigate('/');
      }
    };

    fetchData();
  }, [navigate]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Sin fecha';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  };

  const datesOverlap = (start1, end1, start2, end2) => {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);
    return s1 <= e2 && s2 <= e1;
  };

  const validateDates = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      alert('No es posible crear una solicitud donde la fecha de fin sea anterior a la fecha de inicio.');
      return false;
    }
    return true;
  };

  const getUserFirstName = (username) => {
    const user = users.find(user => user.username === username);
    return user ? user.first_name : username;
  };

  const handleCreatePermission = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }

    if (!validateDates(newPermission.start_date, newPermission.end_date)) return;

    const permissionData = {
      start_date: newPermission.start_date,
      end_date: newPermission.end_date,
      reason: newPermission.reason,
    };
    try {
      const response = await axios.post('http://localhost:8001/api/permission-requests/', permissionData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPermissionRequests([...permissionRequests, { ...response.data, isHidden: false }]);
      setNewPermission({ start_date: '', end_date: '', reason: '' });
    } catch (error) {
      console.error('Error creando permiso:', error.response ? error.response.data : error.message);
    }
  };

  const handleCreateVacation = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }

    if (!validateDates(newVacation.start_date, newVacation.end_date)) return;

    const vacationData = {
      start_date: newVacation.start_date,
      end_date: newVacation.end_date,
      period: newVacation.period,
    };

    const newVacationDays = calculateDays(newVacation.start_date, newVacation.end_date);
    if (newVacationDays > 31) {
      if (!window.confirm('La solicitud excede los 31 días. ¿Deseas continuar?')) return;
    }

    const existingVacationDays = vacationRequests
      .filter(req => req.user === currentUser?.username && (req.status === 'pending' || req.status === 'approved'))
      .reduce((total, req) => total + calculateDays(req.start_date, req.end_date), 0);

    const totalDays = existingVacationDays + newVacationDays;
    if (totalDays > 31) {
      const message = `Según tus peticiones llevas ${totalDays} días de vacaciones. ¿Desea continuar?`;
      if (!window.confirm(message)) return;
    }

    const overlappingRequest = vacationRequests.find(req =>
      req.user === currentUser?.username &&
      (req.status === 'pending' || req.status === 'approved') &&
      datesOverlap(newVacation.start_date, newVacation.end_date, req.start_date, req.end_date)
    );

    if (overlappingRequest) {
      const message = `Ya hay una petición de vacaciones en curso del ${formatDate(overlappingRequest.start_date)} al ${formatDate(overlappingRequest.end_date)} que coincide con estas fechas. ¿Quieres reemplazarla?`;
      if (!window.confirm(message)) return;

      try {
        await axios.delete(`http://localhost:8001/api/vacation-requests/${overlappingRequest.id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVacationRequests(vacationRequests.filter(req => req.id !== overlappingRequest.id));
      } catch (error) {
        console.error('Error eliminando solicitud existente:', error.response ? error.response.data : error.message);
        return;
      }
    }

    try {
      const response = await axios.post('http://localhost:8001/api/vacation-requests/', vacationData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVacationRequests([...vacationRequests, { ...response.data, isHidden: false }]);
      setNewVacation({ start_date: '', end_date: '', period: '' });
    } catch (error) {
      console.error('Error creando vacaciones:', error.response ? error.response.data : error.message);
    }
  };

  const handleCreateShiftChange = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }
    if (newShiftChange.acceptor === currentUser?.username) {
      alert('No puedes solicitar un cambio contigo mismo');
      return;
    }
    const shiftChangeData = {
      date: newShiftChange.date,
      acceptor: newShiftChange.acceptor,
      reason: newShiftChange.reason,
    };
    try {
      const response = await axios.post('http://localhost:8001/api/shift-change-requests/', shiftChangeData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShiftChangeRequests([...shiftChangeRequests, { ...response.data, isHidden: false }]);
      setNewShiftChange({ date: '', acceptor: '', reason: '' });
    } catch (error) {
      console.error('Error creando cambio de turno:', error.response ? error.response.data : error.message);
    }
  };

  const handleHideRequest = async (type, id) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }
    try {
      await axios.post(`http://localhost:8001/api/${type}/${id}/hide/`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (type === 'permission-requests') {
        setPermissionRequests(permissionRequests.map(req => req.id === id ? { ...req, isHidden: true, hidden_by: [...req.hidden_by, currentUser.username] } : req));
      } else if (type === 'vacation-requests') {
        setVacationRequests(vacationRequests.map(req => req.id === id ? { ...req, isHidden: true, hidden_by: [...req.hidden_by, currentUser.username] } : req));
      } else if (type === 'shift-change-requests') {
        setShiftChangeRequests(shiftChangeRequests.map(req => req.id === id ? { ...req, isHidden: true, hidden_by: [...req.hidden_by, currentUser.username] } : req));
      }
    } catch (error) {
      console.error('Error ocultando solicitud:', error.response ? error.response.data : error.message);
    }
  };

  const handleApproveRequest = async (type, id) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }
    try {
      const response = await axios.post(`http://localhost:8001/api/${type}/${id}/approve/`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (type === 'permission-requests') {
        setPermissionRequests(permissionRequests.map(req => req.id === id ? { ...req, status: 'approved', reviewed_by: currentUser.username } : req));
      } else if (type === 'vacation-requests') {
        setVacationRequests(vacationRequests.map(req => req.id === id ? { ...req, status: 'approved', reviewed_by: currentUser.username } : req));
      } else if (type === 'shift-change-requests') {
        setShiftChangeRequests(shiftChangeRequests.map(req => req.id === id ? { ...req, status: 'approved', reviewed_by: currentUser.username } : req));
      }
      console.log(`${type} aprobado:`, response.data);
    } catch (error) {
      console.error('Error aprobando solicitud:', error.response ? error.response.data : error.message);
    }
  };

  const handleRejectRequest = async (type, id) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }
    const reason = prompt('Motivo del rechazo:');
    if (!reason) return;
    try {
      const response = await axios.post(`http://localhost:8001/api/${type}/${id}/reject/`, { review_reason: reason }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (type === 'permission-requests') {
        setPermissionRequests(permissionRequests.map(req => req.id === id ? { ...req, status: 'rejected', review_reason: reason, reviewed_by: currentUser.username } : req));
      } else if (type === 'vacation-requests') {
        setVacationRequests(vacationRequests.map(req => req.id === id ? { ...req, status: 'rejected', review_reason: reason, reviewed_by: currentUser.username } : req));
      } else if (type === 'shift-change-requests') {
        setShiftChangeRequests(shiftChangeRequests.map(req => req.id === id ? { ...req, status: 'rejected', review_reason: reason, reviewed_by: currentUser.username } : req));
      }
      console.log(`${type} rechazado:`, response.data);
    } catch (error) {
      console.error('Error rechazando solicitud:', error.response ? error.response.data : error.message);
    }
  };

  const handleModifyRequest = async (type, id) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }
    const request = 
      type === 'permission-requests' ? permissionRequests.find(req => req.id === id) :
      type === 'vacation-requests' ? vacationRequests.find(req => req.id === id) :
      shiftChangeRequests.find(req => req.id === id);

    setEditRequest({ type, id, ...request });
  };

  const handleSubmitModify = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }
    const reason = prompt('Motivo de la modificación:');
    if (!reason) return;

    const updatedData = {
      start_date: editRequest.start_date,
      end_date: editRequest.end_date,
      reason: editRequest.reason || editRequest.reason || '',
      period: editRequest.period || '',
      acceptor: editRequest.acceptor || '',
      review_reason: reason,
    };

    try {
      const response = await axios.patch(`http://localhost:8001/api/${editRequest.type}/${editRequest.id}/`, updatedData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (editRequest.type === 'permission-requests') {
        setPermissionRequests(permissionRequests.map(req => req.id === editRequest.id ? { ...req, ...response.data, status: 'modified', review_reason: reason, reviewed_by: currentUser.username } : req));
      } else if (editRequest.type === 'vacation-requests') {
        setVacationRequests(vacationRequests.map(req => req.id === editRequest.id ? { ...req, ...response.data, status: 'modified', review_reason: reason, reviewed_by: currentUser.username } : req));
      } else if (editRequest.type === 'shift-change-requests') {
        setShiftChangeRequests(shiftChangeRequests.map(req => req.id === editRequest.id ? { ...req, ...response.data, status: 'modified', review_reason: reason, reviewed_by: currentUser.username } : req));
      }
      setEditRequest(null);
    } catch (error) {
      console.error('Error modificando solicitud:', error.response ? error.response.data : error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  return (
    <div className="requests-container">
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
              <img src={currentUser.photo || '/default-avatar.png'} alt="Avatar" className="avatar" onError={(e) => (e.target.src = '/default-avatar.png')} />
              <span>Bienvenido, {currentUser.first_name || currentUser.username}</span>
              <div className="dropdown">
                {currentUser.role === 'worker' && <button onClick={() => navigate('/change-password')}>Cambiar Contraseña</button>}
                {currentUser.role === 'manager' && <button onClick={() => navigate('/user-management')}>Gestionar Usuarios</button>}
                <button onClick={handleLogout}>Cerrar Sesión</button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="breadcrumbs">
        <span><Link to="/home" className="breadcrumb-link">Home</Link></span>
        <span> → </span>
        <span>Peticiones</span>
      </div>

      <div className="main-content">
        <section className="module">
          <h3>Solicitar Permiso</h3>
          <form onSubmit={handleCreatePermission}>
            <input type="date" value={newPermission.start_date} onChange={e => setNewPermission({ ...newPermission, start_date: e.target.value })} required />
            <input type="date" value={newPermission.end_date} onChange={e => setNewPermission({ ...newPermission, end_date: e.target.value })} required />
            <textarea value={newPermission.reason} onChange={e => setNewPermission({ ...newPermission, reason: e.target.value })} placeholder="Motivo" required />
            <button type="submit">Solicitar</button>
          </form>
        </section>

        <section className="module">
          <h3>Solicitar Vacaciones</h3>
          <form onSubmit={handleCreateVacation}>
            <input type="date" value={newVacation.start_date} onChange={e => setNewVacation({ ...newVacation, start_date: e.target.value })} required />
            <input type="date" value={newVacation.end_date} onChange={e => setNewVacation({ ...newVacation, end_date: e.target.value })} required />
            <input type="text" value={newVacation.period} onChange={e => setNewVacation({ ...newVacation, period: e.target.value })} placeholder="Período (ej. 2025-Q1)" required />
            <button type="submit">Solicitar</button>
          </form>
        </section>

        <section className="module">
          <h3>Solicitar Cambio de Turno</h3>
          <form onSubmit={handleCreateShiftChange}>
            <input type="date" value={newShiftChange.date} onChange={e => setNewShiftChange({ ...newShiftChange, date: e.target.value })} required />
            <select value={newShiftChange.acceptor} onChange={e => setNewShiftChange({ ...newShiftChange, acceptor: e.target.value })} required>
              <option value="">Seleccionar compañero</option>
              {users
                .filter(user => user.username !== currentUser?.username && user.department === currentUser?.department)
                .map(user => (
                  <option key={user.id} value={user.username}>{user.first_name} ({user.department})</option>
                ))}
            </select>
            <textarea value={newShiftChange.reason} onChange={e => setNewShiftChange({ ...newShiftChange, reason: e.target.value })} placeholder="Motivo" required />
            <button type="submit">Solicitar</button>
          </form>
        </section>

        {editRequest && (
          <section className="module">
            <h3>Modificar Solicitud</h3>
            <form onSubmit={handleSubmitModify}>
              <input type="date" value={editRequest.start_date} onChange={e => setEditRequest({ ...editRequest, start_date: e.target.value })} required />
              <input type="date" value={editRequest.end_date} onChange={e => setEditRequest({ ...editRequest, end_date: e.target.value })} required />
              {editRequest.type === 'vacation-requests' && (
                <input type="text" value={editRequest.period} onChange={e => setEditRequest({ ...editRequest, period: e.target.value })} placeholder="Período" required />
              )}
              {(editRequest.type === 'permission-requests' || editRequest.type === 'shift-change-requests') && (
                <textarea value={editRequest.reason} onChange={e => setEditRequest({ ...editRequest, reason: e.target.value })} placeholder="Motivo" required />
              )}
              {editRequest.type === 'shift-change-requests' && (
                <select value={editRequest.acceptor} onChange={e => setEditRequest({ ...editRequest, acceptor: e.target.value })} required>
                  <option value="">Seleccionar compañero</option>
                  {users
                    .filter(user => user.username !== currentUser?.username && user.department === currentUser?.department)
                    .map(user => (
                      <option key={user.id} value={user.username}>{user.first_name} ({user.department})</option>
                    ))}
                </select>
              )}
              <button type="submit">Guardar Cambios</button>
              <button type="button" onClick={() => setEditRequest(null)}>Cancelar</button>
            </form>
          </section>
        )}

        <section className="module">
          <h3>Tus Peticiones</h3>
          <h4>Permisos</h4>
          <ul>
            {permissionRequests
              .filter(req => !req.isHidden)
              .map(req => (
                <li key={req.id} className={req.status === 'approved' ? 'approved' : req.status === 'rejected' ? 'rejected' : req.status === 'modified' ? 'modified' : ''}>
                  {currentUser?.role === 'manager' && `Solicitante: ${getUserFirstName(req.user)} - `}
                  {formatDate(req.start_date)} - {formatDate(req.end_date)}: {req.reason} - {req.status}
                  {req.status === 'rejected' && ` (Motivo: ${req.review_reason})`}
                  {req.status === 'modified' && ` (Modificado por: ${getUserFirstName(req.reviewed_by)}, Motivo: ${req.review_reason})`}
                  {(req.status === 'approved' || req.status === 'rejected') && (
                    <button className="hide-btn" onClick={() => handleHideRequest('permission-requests', req.id)}>Ocultar</button>
                  )}
                  {currentUser?.role === 'manager' && (req.status === 'pending' || req.status === 'approved') && (
                    <>
                      {req.status === 'pending' && (
                        <>
                          <button className="approve-btn" onClick={() => handleApproveRequest('permission-requests', req.id)}>Aprobar</button>
                          <button className="reject-btn" onClick={() => handleRejectRequest('permission-requests', req.id)}>Rechazar</button>
                        </>
                      )}
                      <button className="modify-btn" onClick={() => handleModifyRequest('permission-requests', req.id)}>Modificar</button>
                    </>
                  )}
                </li>
              ))}
          </ul>

          <h4>Vacaciones</h4>
          <ul>
            {vacationRequests
              .filter(req => !req.isHidden)
              .map(req => (
                <li key={req.id} className={req.status === 'approved' ? 'approved' : req.status === 'rejected' ? 'rejected' : req.status === 'modified' ? 'modified' : ''}>
                  {currentUser?.role === 'manager' && `Solicitante: ${getUserFirstName(req.user)} - `}
                  {formatDate(req.start_date)} - {formatDate(req.end_date)} ({req.period}): {req.status}
                  {req.status === 'rejected' && ` (Motivo: ${req.review_reason})`}
                  {req.status === 'modified' && ` (Modificado por: ${getUserFirstName(req.reviewed_by)}, Motivo: ${req.review_reason})`}
                  {(req.status === 'approved' || req.status === 'rejected') && (
                    <button className="hide-btn" onClick={() => handleHideRequest('vacation-requests', req.id)}>Ocultar</button>
                  )}
                  {currentUser?.role === 'manager' && (req.status === 'pending' || req.status === 'approved') && (
                    <>
                      {req.status === 'pending' && (
                        <>
                          <button className="approve-btn" onClick={() => handleApproveRequest('vacation-requests', req.id)}>Aprobar</button>
                          <button className="reject-btn" onClick={() => handleRejectRequest('vacation-requests', req.id)}>Rechazar</button>
                        </>
                      )}
                      <button className="modify-btn" onClick={() => handleModifyRequest('vacation-requests', req.id)}>Modificar</button>
                    </>
                  )}
                </li>
              ))}
          </ul>

          <h4>Cambios de Turno</h4>
          <ul>
            {shiftChangeRequests
              .filter(req => !req.isHidden)
              .map(req => (
                <li key={req.id} className={req.status === 'approved' ? 'approved' : req.status === 'rejected' ? 'rejected' : req.status === 'modified' ? 'modified' : ''}>
                  Solicitante: {getUserFirstName(req.requester)} - {formatDate(req.date)} con {getUserFirstName(req.acceptor)} - {req.reason} - {req.status}
                  {req.status === 'rejected' && ` (Motivo: ${req.review_reason})`}
                  {req.status === 'modified' && ` (Modificado por: ${getUserFirstName(req.reviewed_by)}, Motivo: ${req.review_reason})`}
                  {(req.status === 'approved' || req.status === 'rejected') && (
                    <button className="hide-btn" onClick={() => handleHideRequest('shift-change-requests', req.id)}>Ocultar</button>
                  )}
                  {req.status === 'pending' && req.acceptor === currentUser?.username && (
                    <>
                      <button className="approve-btn" onClick={() => handleApproveRequest('shift-change-requests', req.id)}>Aprobar</button>
                      <button className="reject-btn" onClick={() => handleRejectRequest('shift-change-requests', req.id)}>Rechazar</button>
                    </>
                  )}
                  {currentUser?.role === 'manager' && (req.status === 'pending' || req.status === 'approved') && (
                    <button className="modify-btn" onClick={() => handleModifyRequest('shift-change-requests', req.id)}>Modificar</button>
                  )}
                </li>
              ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default Requests;
