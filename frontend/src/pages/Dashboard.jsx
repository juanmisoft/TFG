import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [newKpi, setNewKpi] = useState({
    worker: '',
    period: new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase()),
    sales_target: '',
    sales_achieved: '',
    warranties_target: 0,
    warranties_achieved: 0,
    financing_target: '',
    financing_achieved: '',
    reviews_target: 0,
    reviews_achieved: 0,
  });
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

    axios.get('http://localhost:8001/api/kpis/', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => setKpis(response.data))
      .catch(error => console.error('Error fetching KPIs:', error));
  }, [navigate]);

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const parseCurrency = (value) => {
    if (!value) return '';
    return value.replace(/[^\d,]/g, '').replace(',', '.');
  };

  const handleKpiSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    const formattedKpi = {
      worker: newKpi.worker,
      period: newKpi.period,
      sales_target: parseFloat(parseCurrency(newKpi.sales_target)) || 0,
      sales_achieved: parseFloat(parseCurrency(newKpi.sales_achieved)) || 0,
      warranties_target: parseInt(newKpi.warranties_target, 10) || 0,
      warranties_achieved: parseInt(newKpi.warranties_achieved, 10) || 0,
      financing_target: parseFloat(parseCurrency(newKpi.financing_target)) || 0,
      financing_achieved: parseFloat(parseCurrency(newKpi.financing_achieved)) || 0,
      reviews_target: parseInt(newKpi.reviews_target, 10) || 0,
      reviews_achieved: parseInt(newKpi.reviews_achieved, 10) || 0,
    };

    const existingKpi = kpis.find(kpi => kpi.worker === newKpi.worker && kpi.period === newKpi.period);
    if (existingKpi) {
      const confirmOverwrite = window.confirm(
        `Ya existe un KPI para ${newKpi.worker} en ${newKpi.period}. ¿Deseas sobreescribir los datos existentes?`
      );
      if (!confirmOverwrite) return;
    }

    try {
      await axios.post('http://localhost:8001/api/kpis/', formattedKpi, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const response = await axios.get('http://localhost:8001/api/kpis/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setKpis(response.data);
      setNewKpi({
        worker: '',
        period: new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase()),
        sales_target: '',
        sales_achieved: '',
        warranties_target: 0,
        warranties_achieved: 0,
        financing_target: '',
        financing_achieved: '',
        reviews_target: 0,
        reviews_achieved: 0,
      });
    } catch (error) {
      console.error('Error creating KPI:', error.response ? error.response.data : error.message);
      alert('Error al cargar KPI: ' + (error.response?.data?.detail || 'Verifica los datos'));
    }
  };

  const calculatePercentage = (achieved, target) => {
    return target > 0 ? ((achieved / target) * 100).toFixed(2) : 0;
  };

  const getProgressMessage = (achieved, target) => {
    const percentage = calculatePercentage(achieved, target);
    if (percentage >= 100) return 'Objetivo conseguido';
    if (percentage > 80) return 'Te queda muy poco';
    return '';
  };

  const workerKpis = kpis.filter(kpi => kpi.worker === currentUser?.username);
  const currentMonth = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  const departmentKpis = kpis.filter(kpi => 
    currentUser?.subordinates?.some(sub => sub === kpi.worker) && kpi.period === currentMonth
  );

  const generateIndividualReport = (worker) => {
    const workerKpis = kpis.filter(kpi => kpi.worker === worker);
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Informe Histórico de KPIs - ${worker}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = workerKpis.map(kpi => {
      const salesMet = calculatePercentage(kpi.sales_achieved, kpi.sales_target) >= 100 ? '✔' : '✘';
      const warrantiesMet = calculatePercentage(kpi.warranties_achieved, kpi.warranties_target) >= 100 ? '✔' : '✘';
      const financingMet = calculatePercentage(kpi.financing_achieved, kpi.financing_target) >= 100 ? '✔' : '✘';
      const reviewsMet = calculatePercentage(kpi.reviews_achieved, kpi.reviews_target) >= 100 ? '✔' : '✘';
      return [
        kpi.period,
        `${formatCurrency(kpi.sales_achieved)} / ${formatCurrency(kpi.sales_target)} (${salesMet})`,
        `${kpi.warranties_achieved} / ${kpi.warranties_target} (${warrantiesMet})`,
        `${formatCurrency(kpi.financing_achieved)} / ${formatCurrency(kpi.financing_target)} (${financingMet})`,
        `${kpi.reviews_achieved} / ${kpi.reviews_target} (${reviewsMet})`,
      ];
    });

    autoTable(doc, {  // Usamos autoTable como función directa
      head: [['Período', 'Ventas', 'Garantías', 'Financiaciones', 'Reseñas']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [22, 160, 133], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      didDrawCell: (data) => {
        if (data.cell.text.includes('✔')) {
          doc.setTextColor(0, 255, 0);
        } else if (data.cell.text.includes('✘')) {
          doc.setTextColor(255, 0, 0);
        }
        doc.text(data.cell.text, data.cell.x + 2, data.cell.y + 5);
        doc.setTextColor(0);
      },
    });

    doc.save(`Informe_KPIs_${worker}.pdf`);
  };

  const generateDepartmentReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Informe Histórico de KPIs - Departamento (${currentUser.department})`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = kpis
      .filter(kpi => currentUser.subordinates.includes(kpi.worker))
      .map(kpi => {
        const salesMet = calculatePercentage(kpi.sales_achieved, kpi.sales_target) >= 100 ? '✔' : '✘';
        const warrantiesMet = calculatePercentage(kpi.warranties_achieved, kpi.warranties_target) >= 100 ? '✔' : '✘';
        const financingMet = calculatePercentage(kpi.financing_achieved, kpi.financing_target) >= 100 ? '✔' : '✘';
        const reviewsMet = calculatePercentage(kpi.reviews_achieved, kpi.reviews_target) >= 100 ? '✔' : '✘';
        return [
          kpi.worker,
          kpi.period,
          `${formatCurrency(kpi.sales_achieved)} / ${formatCurrency(kpi.sales_target)} (${salesMet})`,
          `${kpi.warranties_achieved} / ${kpi.warranties_target} (${warrantiesMet})`,
          `${formatCurrency(kpi.financing_achieved)} / ${formatCurrency(kpi.financing_target)} (${financingMet})`,
          `${kpi.reviews_achieved} / ${kpi.reviews_target} (${reviewsMet})`,
        ];
      });

    autoTable(doc, {  // Usamos autoTable como función directa
      head: [['Trabajador', 'Período', 'Ventas', 'Garantías', 'Financiaciones', 'Reseñas']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [22, 160, 133], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      didDrawCell: (data) => {
        if (data.cell.text.includes('✔')) {
          doc.setTextColor(0, 255, 0);
        } else if (data.cell.text.includes('✘')) {
          doc.setTextColor(255, 0, 0);
        }
        doc.text(data.cell.text, data.cell.x + 2, data.cell.y + 5);
        doc.setTextColor(0);
      },
    });

    doc.save(`Informe_KPIs_Departamento_${currentUser.department}.pdf`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dashboard</h2>
      {currentUser ? (
        <>
          <p>Usuario: {currentUser.username} - Rol: {currentUser.role}</p>

          {currentUser.role === 'worker' && (
            <>
              <h3>Tus KPIs</h3>
              {workerKpis.length > 0 ? workerKpis.map(kpi => (
                <div key={kpi.id} style={{ marginBottom: '20px' }}>
                  <h4>{kpi.period}</h4>
                  <div>
                    <p>Ventas: {formatCurrency(kpi.sales_achieved)} / {formatCurrency(kpi.sales_target)}</p>
                    <progress value={kpi.sales_achieved} max={kpi.sales_target} style={{ width: '100%' }} />
                    <p style={{ color: calculatePercentage(kpi.sales_achieved, kpi.sales_target) >= 100 ? 'green' : 'orange' }}>
                      {getProgressMessage(kpi.sales_achieved, kpi.sales_target)}
                    </p>
                  </div>
                  <div>
                    <p>Garantías: {kpi.warranties_achieved} / {kpi.warranties_target}</p>
                    <progress value={kpi.warranties_achieved} max={kpi.warranties_target} style={{ width: '100%' }} />
                    <p style={{ color: calculatePercentage(kpi.warranties_achieved, kpi.warranties_target) >= 100 ? 'green' : 'orange' }}>
                      {getProgressMessage(kpi.warranties_achieved, kpi.warranties_target)}
                    </p>
                  </div>
                  <div>
                    <p>Financiaciones: {formatCurrency(kpi.financing_achieved)} / {formatCurrency(kpi.financing_target)}</p>
                    <progress value={kpi.financing_achieved} max={kpi.financing_target} style={{ width: '100%' }} />
                    <p style={{ color: calculatePercentage(kpi.financing_achieved, kpi.financing_target) >= 100 ? 'green' : 'orange' }}>
                      {getProgressMessage(kpi.financing_achieved, kpi.financing_target)}
                    </p>
                  </div>
                  <div>
                    <p>Reseñas: {kpi.reviews_achieved} / {kpi.reviews_target}</p>
                    <progress value={kpi.reviews_achieved} max={kpi.reviews_target} style={{ width: '100%' }} />
                    <p style={{ color: calculatePercentage(kpi.reviews_achieved, kpi.reviews_target) >= 100 ? 'green' : 'orange' }}>
                      {getProgressMessage(kpi.reviews_achieved, kpi.reviews_target)}
                    </p>
                  </div>
                </div>
              )) : (
                <p>No hay KPIs disponibles.</p>
              )}
            </>
          )}

          {currentUser.role === 'manager' && (
            <>
              <h3>Cargar KPIs</h3>
              <form onSubmit={handleKpiSubmit} style={{ maxWidth: '600px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="worker">Trabajador:</label>
                  <select
                    id="worker"
                    value={newKpi.worker}
                    onChange={(e) => setNewKpi({ ...newKpi, worker: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                  >
                    <option value="">Selecciona un trabajador</option>
                    {currentUser.subordinates && currentUser.subordinates.length > 0 ? (
                      currentUser.subordinates.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))
                    ) : (
                      <option value="" disabled>No hay subordinados</option>
                    )}
                  </select>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="period">Período:</label>
                  <input
                    id="period"
                    type="text"
                    value={newKpi.period}
                    onChange={(e) => setNewKpi({ ...newKpi, period: e.target.value })}
                    placeholder="Ej. Marzo 2025"
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="sales_target">Objetivo de Ventas (€):</label>
                  <input
                    id="sales_target"
                    type="text"
                    value={newKpi.sales_target}
                    onChange={(e) => setNewKpi({ ...newKpi, sales_target: e.target.value })}
                    placeholder="Ej. 1234,56"
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="sales_achieved">Ventas Logradas (€):</label>
                  <input
                    id="sales_achieved"
                    type="text"
                    value={newKpi.sales_achieved}
                    onChange={(e) => setNewKpi({ ...newKpi, sales_achieved: e.target.value })}
                    placeholder="Ej. 1234,56"
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="warranties_target">Objetivo de Garantías:</label>
                  <input
                    id="warranties_target"
                    type="number"
                    value={newKpi.warranties_target}
                    onChange={(e) => setNewKpi({ ...newKpi, warranties_target: e.target.value })}
                    placeholder="0"
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="warranties_achieved">Garantías Logradas:</label>
                  <input
                    id="warranties_achieved"
                    type="number"
                    value={newKpi.warranties_achieved}
                    onChange={(e) => setNewKpi({ ...newKpi, warranties_achieved: e.target.value })}
                    placeholder="0"
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="financing_target">Objetivo de Financiaciones (€):</label>
                  <input
                    id="financing_target"
                    type="text"
                    value={newKpi.financing_target}
                    onChange={(e) => setNewKpi({ ...newKpi, financing_target: e.target.value })}
                    placeholder="Ej. 1234,56"
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="financing_achieved">Financiaciones Logradas (€):</label>
                  <input
                    id="financing_achieved"
                    type="text"
                    value={newKpi.financing_achieved}
                    onChange={(e) => setNewKpi({ ...newKpi, financing_achieved: e.target.value })}
                    placeholder="Ej. 1234,56"
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="reviews_target">Objetivo de Reseñas:</label>
                  <input
                    id="reviews_target"
                    type="number"
                    value={newKpi.reviews_target}
                    onChange={(e) => setNewKpi({ ...newKpi, reviews_target: e.target.value })}
                    placeholder="0"
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="reviews_achieved">Reseñas Logradas:</label>
                  <input
                    id="reviews_achieved"
                    type="number"
                    value={newKpi.reviews_achieved}
                    onChange={(e) => setNewKpi({ ...newKpi, reviews_achieved: e.target.value })}
                    placeholder="0"
                    style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <button type="submit" style={{ padding: '10px', width: '100%' }}>Cargar KPI</button>
              </form>

              <h3>Resumen de KPIs del Departamento - {currentMonth}</h3>
              {departmentKpis.length > 0 ? (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Trabajador</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Período</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>% Ventas</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>% Garantías</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>% Financiaciones</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>% Reseñas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentKpis.map(kpi => (
                        <tr key={kpi.id}>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{kpi.worker}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{kpi.period}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{calculatePercentage(kpi.sales_achieved, kpi.sales_target)}%</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{calculatePercentage(kpi.warranties_achieved, kpi.warranties_target)}%</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{calculatePercentage(kpi.financing_achieved, kpi.financing_target)}%</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{calculatePercentage(kpi.reviews_achieved, kpi.reviews_target)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '20px' }}>
                    <h4>Informes Históricos</h4>
                    <select
                      onChange={(e) => e.target.value && generateIndividualReport(e.target.value)}
                      style={{ padding: '8px', marginRight: '10px' }}
                    >
                      <option value="">Selecciona un trabajador para informe individual</option>
                      {currentUser.subordinates.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                    <button
                      onClick={generateDepartmentReport}
                      style={{ padding: '8px 16px' }}
                    >
                      Generar Informe Departamental
                    </button>
                  </div>
                </>
              ) : (
                <p>No hay KPIs para el departamento en {currentMonth}.</p>
              )}
            </>
          )}
        </>
      ) : (
        <p>Cargando...</p>
      )}
      <button onClick={() => navigate('/home')} style={{ marginTop: '20px' }}>Volver a Inicio</button>
    </div>
  );
}

export default Dashboard;
