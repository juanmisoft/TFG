import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';

moment.locale('es', { week: { dow: 1 } });
const localizer = momentLocalizer(moment);

function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [view] = useState('month');
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
      return;
    }

    axios.get('http://localhost:8001/api/users/me/', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        setCurrentUser(response.data);
      })
      .catch(error => {
        console.error('Error fetching user:', error);
        navigate('/');
      });

    Promise.all([
      axios.get('http://localhost:8001/api/permission-requests/', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('http://localhost:8001/api/vacation-requests/', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('http://localhost:8001/api/shift-change-requests/', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('http://localhost:8001/api/promotions/', { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(([permResponse, vacResponse, shiftResponse, promoResponse]) => {
        const permissionEvents = permResponse.data.map(req => ({
          id: `permission-${req.id}`,
          title: `Permiso: ${req.reason}`,
          start: new Date(req.start_date),
          end: new Date(req.end_date),
          allDay: true,
          resource: { type: 'permission', status: req.status, user: req.user, id: req.id },
        }));
        const vacationEvents = vacResponse.data.map(req => ({
          id: `vacation-${req.id}`,
          title: `Vacaciones: ${req.period}`,
          start: new Date(req.start_date),
          end: new Date(req.end_date),
          allDay: true,
          resource: { type: 'vacation', status: req.status, user: req.user, id: req.id },
        }));
        const shiftEvents = shiftResponse.data.map(req => ({
          id: `shift-${req.id}`,
          title: `Cambio de turno con ${req.acceptor}`,
          start: new Date(req.date),
          end: new Date(req.date),
          allDay: true,
          resource: { type: 'shift', status: req.status, user: req.requester, id: req.id },
        }));
        const promoEvents = promoResponse.data.map(promo => ({
          id: `promo-${promo.id}`,
          title: `Promoción: ${promo.name} (${promo.code})`,
          start: new Date(promo.start_date),
          end: new Date(promo.end_date),
          allDay: true,
          resource: { type: 'promotion', id: promo.id },
        }));

        const allEvents = [...permissionEvents, ...vacationEvents, ...shiftEvents, ...promoEvents];
        setEvents(allEvents);

        const today = moment();
        const promoNotifications = promoResponse.data.flatMap(promo => {
          const start = moment(promo.start_date);
          const end = moment(promo.end_date);
          const alerts = [];
          if (start.diff(today, 'days') === 2) alerts.push(`Dentro de 2 días empieza la promoción ${promo.name} (${start.format('DD-MM-YYYY')})`);
          if (start.diff(today, 'days') === 1) alerts.push(`Queda 1 día para que empiece la promoción ${promo.name} (${start.format('DD-MM-YYYY')})`);
          if (end.diff(today, 'days') === 2) alerts.push(`Dentro de 2 días finaliza la promoción ${promo.name} (${end.format('DD-MM-YYYY')})`);
          if (end.diff(today, 'days') === 1) alerts.push(`Queda 1 día para que finalice la promoción ${promo.name} (${end.format('DD-MM-YYYY')})`);
          return alerts;
        });
        setNotifications(promoNotifications);
      })
      .catch(error => {
        console.error('Error fetching calendar data:', error);
      });
  }, [navigate]);

  const eventStyleGetter = (event) => {
    let backgroundColor;
    if (event.resource.type === 'promotion') {
      backgroundColor = '#3174ad';
    } else {
      backgroundColor = event.resource.status === 'pending' ? '#ff0000' : '#00ff00';
    }
    return { style: { backgroundColor } };
  };

  const handleEventClick = (event) => {
    if (event.resource.type === 'promotion') {
      navigate(`/promotions`);
    } else if (currentUser.role === 'manager') {
      navigate(`/requests`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Calendario</h2>
      {currentUser ? (
        <>
          <p>Usuario: {currentUser.username} - Rol: {currentUser.role}</p>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500, marginTop: '20px' }}
            defaultView={view}
            views={['month', 'week']}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleEventClick}
            messages={{
              today: 'Hoy',
              previous: 'Anterior',
              next: 'Siguiente',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              agenda: 'Agenda',
              date: 'Fecha',
              time: 'Hora',
              event: 'Evento',
              noEventsInRange: 'No hay eventos en este rango',
            }}
          />
          {notifications.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3>Notificaciones</h3>
              <ul>
                {notifications.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p>Cargando...</p>
      )}
      <button onClick={() => navigate('/dashboard')} style={{ marginTop: '20px' }}>Volver al Dashboard</button>
    </div>
  );
}

export default CalendarPage;