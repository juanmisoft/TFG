import { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarModule.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { 'es': es },
});

function CalendarModule({ currentUser }) {
  const [events, setEvents] = useState([]);
  const today = new Date();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !currentUser) return;

    const fetchData = async () => {
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [permResponse, vacResponse, shiftResponse, promoResponse] = await Promise.all([
          axios.get('http://localhost:8001/api/permission-requests/', { headers }),
          axios.get('http://localhost:8001/api/vacation-requests/', { headers }),
          axios.get('http://localhost:8001/api/shift-change-requests/', { headers }),
          axios.get('http://localhost:8001/api/promotions/', { headers }),
        ]);

        const approvedPermissions = permResponse.data
          .filter(req => req.status === 'approved' && req.user === currentUser.username)
          .map(req => ({
            title: `Permiso: ${req.reason || 'Sin motivo'}`,
            start: new Date(req.start_date),
            end: req.end_date ? new Date(req.end_date) : new Date(req.start_date),
            allDay: true,
            type: 'permission',
          }));

        const approvedVacations = vacResponse.data
          .filter(req => req.status === 'approved' && req.user === currentUser.username)
          .map(req => ({
            title: `Vacaciones: ${req.period || 'Sin período'}`,
            start: new Date(req.start_date),
            end: req.end_date ? new Date(req.end_date) : new Date(req.start_date),
            allDay: true,
            type: 'vacation',
          }));

        const approvedShifts = shiftResponse.data
          .filter(req => req.status === 'approved' && (req.requester === currentUser.username || req.acceptor === currentUser.username))
          .map(req => ({
            title: `Cambio de turno: ${req.reason || 'Sin motivo'}`,
            start: new Date(req.date),
            end: new Date(req.date),
            allDay: true,
            type: 'shift',
          }));

        const promotions = promoResponse.data
          .map(promo => ({
            title: `Promoción: ${promo.name || promo.title || 'Sin nombre'}`,
            start: new Date(promo.start_date),
            end: promo.end_date ? new Date(promo.end_date) : new Date(promo.start_date),
            allDay: true,
            type: 'promotion',
            isExpired: promo.end_date && new Date(promo.end_date) < today,
          }));

        setEvents([...approvedPermissions, ...approvedVacations, ...approvedShifts, ...promotions]);
      } catch (error) {
        console.error('Error fetching calendar data:', error.response ? error.response.data : error.message);
      }
    };

    fetchData();
  }, [currentUser]);

  const eventStyleGetter = (event) => {
    let backgroundColor;
    if (event.type === 'promotion') {
      backgroundColor = event.isExpired ? '#dc3545' : '#28a745';
    } else {
      backgroundColor = '#007bff';
    }
    return {
      style: {
        backgroundColor,
        borderRadius: '3px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
      },
    };
  };

  return (
    <div className="calendar-module">
      <h3>Calendario</h3>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        defaultView="month"
        views={['month', 'week', 'agenda']}
        messages={{
          month: 'Mes',
          week: 'Semana',
          agenda: 'Agenda',
          day: 'Día',
          today: 'Hoy',
          previous: 'Anterior',
          next: 'Siguiente',
        }}
        culture="es"
        eventPropGetter={eventStyleGetter}
        selectable={false}
      />
    </div>
  );
}

export default CalendarModule;