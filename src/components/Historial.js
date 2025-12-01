import React, { useEffect, useState } from 'react';
import API from '../api';
import moment from 'moment';
import './Historial.css';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";


export default function Historial() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados para filtros
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Modal de receta
  const [recetaModalOpen, setRecetaModalOpen] = useState(false);
  const [recetaSeleccionada, setRecetaSeleccionada] = useState(null);

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [citasPorPagina, setCitasPorPagina] = useState(10);

  const getMedicoId = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user"));
      return u?._id || u?.id;
    } catch { return null; }
  };

  const fetchHistorial = async () => {
    setLoading(true);
    try {
      const medicoId = getMedicoId();
      if (!medicoId) {
        setError("No hay médico en sesión.");
        return;
      }

      const { data } = await API.get(`/appointments/historial/${medicoId}`);

      const citasOrdenadas = (data.historial || []).sort((a, b) => {
        const fechaA = moment(`${a.fecha} ${a.hora}`, 'YYYY-MM-DD HH:mm');
        const fechaB = moment(`${b.fecha} ${b.hora}`, 'YYYY-MM-DD HH:mm');
        return fechaB - fechaA;
      });

      setHistorial(citasOrdenadas);
    } catch (err) {
      console.error(err);
      setError("Error cargando historial");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorial();
  }, []);

  const verReceta = async (citaId) => {
    try {
      const { data } = await API.get(`/appointments/${citaId}/receta`);

      if (data.success && data.receta) {
        setRecetaSeleccionada(data.receta);
        setRecetaModalOpen(true);
      } else {
        alert('Esta cita no tiene receta asociada');
      }
    } catch (err) {
      console.error(err);
      alert('Error al cargar la receta');
    }
  };

  const citasFiltradas = historial.filter(cita => {
    const paciente = cita.pacienteId
      ? `${cita.pacienteId.nombre} ${cita.pacienteId.apellido}`.toLowerCase()
      : '';
    const motivo = (cita.motivo || '').toLowerCase();
    const idCita = (cita._id || '').toLowerCase();

    const cumpleBusqueda =
      paciente.includes(busqueda.toLowerCase()) ||
      motivo.includes(busqueda.toLowerCase()) ||
      idCita.includes(busqueda.toLowerCase());

    const fechaCita = moment.utc(cita.fecha).format('YYYY-MM-DD');
    const cumpleFechaInicio = !fechaInicio || fechaCita >= fechaInicio;
    const cumpleFechaFin = !fechaFin || fechaCita <= fechaFin;

    return cumpleBusqueda && cumpleFechaInicio && cumpleFechaFin;
  });

  const limpiarFiltros = () => {
    setBusqueda('');
    setFechaInicio('');
    setFechaFin('');
    setPaginaActual(1); // Resetear a página 1
  };

  // Calcular índices de paginación
  const indexUltimaCita = paginaActual * citasPorPagina;
  const indexPrimeraCita = indexUltimaCita - citasPorPagina;
  const citasPaginadas = citasFiltradas.slice(indexPrimeraCita, indexUltimaCita);
  const totalPaginas = Math.ceil(citasFiltradas.length / citasPorPagina);

  const cambiarPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generarBotonesPaginas = () => {
    const botones = [];
    const maxBotones = 5;
    let inicio = Math.max(1, paginaActual - Math.floor(maxBotones / 2));
    let fin = Math.min(totalPaginas, inicio + maxBotones - 1);

    if (fin - inicio < maxBotones - 1) {
      inicio = Math.max(1, fin - maxBotones + 1);
    }

    // Botón Primera Página
    if (inicio > 1) {
      botones.push(
        <button
          key="first"
          onClick={() => cambiarPagina(1)}
          className="pagination-btn"
        >
          1
        </button>
      );
      if (inicio > 2) {
        botones.push(<span key="dots-start" className="pagination-dots">...</span>);
      }
    }

    // Botones numerados
    for (let i = inicio; i <= fin; i++) {
      botones.push(
        <button
          key={i}
          onClick={() => cambiarPagina(i)}
          className={`pagination-btn ${paginaActual === i ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }

    // Botón Última Página
    if (fin < totalPaginas) {
      if (fin < totalPaginas - 1) {
        botones.push(<span key="dots-end" className="pagination-dots">...</span>);
      }
      botones.push(
        <button
          key="last"
          onClick={() => cambiarPagina(totalPaginas)}
          className="pagination-btn"
        >
          {totalPaginas}
        </button>
      );
    }

    return botones;
  };



  // --- PÉGALO AQUÍ (antes del return) ---
  const generatePDF = async (receta) => {
    const element = document.getElementById("receta-layout-print");

    if (!element) {
      console.error("❌ No existe el layout oculto para imprimir PDF");
      return;
    }

    element.style.display = "block";

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`receta_${receta._id}.pdf`);

    element.style.display = "none";
  };
  // --- FIN DEL PUNTO 1 ---


  // ⬇️ Luego ya siguen tus validaciones
  if (loading) return <p>Cargando historial...</p>;
  if (error) return <p>{error}</p>;

  return (

    <div className="historial-citas">
      <div className="page-header-historial">
        <h2>Historial de Citas Completadas</h2>
        <span className="material-icons header-icon">assignment</span>
      </div>

      {/* FILTROS */}
      <div className="filtros-container">
        <div className="filtro-busqueda">
          <span className="material-icons input-icon">search</span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por paciente, motivo o ID de cita"
          />
        </div>

        <div className="filtros-fecha">
          <div className="fecha-input-group">
            <label>
              <span className="material-icons">event</span>
              Desde
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          <div className="fecha-input-group">
            <label>
              <span className="material-icons">event</span>
              Hasta
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>

        {(busqueda || fechaInicio || fechaFin) && (
          <button className="btn-limpiar" onClick={limpiarFiltros}>
            <span className="material-icons">clear</span>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="resultados-info">
        <span className="material-icons">info</span>
        <p>
          Mostrando {indexPrimeraCita + 1} - {Math.min(indexUltimaCita, citasFiltradas.length)} de {citasFiltradas.length} citas
          {citasFiltradas.length !== historial.length && ` (${historial.length} en total)`}
        </p>

        <select
          value={citasPorPagina}
          onChange={(e) => {
            setCitasPorPagina(Number(e.target.value));
            setPaginaActual(1);
          }}
          className="items-per-page"
        >
          <option value={10}>10 por página</option>
          <option value={25}>25 por página</option>
          <option value={50}>50 por página</option>
          <option value={100}>100 por página</option>
        </select>
      </div>

      {citasFiltradas.length === 0 ? (
        <div className="empty-state">
          <span className="material-icons">folder_open</span>
          <p>No hay citas que coincidan con los filtros aplicados</p>
        </div>
      ) : (
        <>
          <ul className="historial-list">
            {citasPaginadas.map((cita) => (
              <li key={cita._id} className="historial-item">
                <div className="cita-header">
                  <div className="paciente-info">
                    <span className="material-icons user-icon">account_circle</span>
                    <span className="paciente-nombre">
                      {cita.pacienteId
                        ? `${cita.pacienteId.nombre} ${cita.pacienteId.apellido}`
                        : 'Paciente no disponible'}
                    </span>
                  </div>
                  <span className="badge badge-success">
                    <span className="material-icons">check_circle</span>
                    Completada
                  </span>
                </div>

                <div className="cita-detalles">
                  <div className="detalle-item">
                    <span className="material-icons">calendar_today</span>
                    <div>
                      <span className="detalle-label">Fecha</span>
                      <span className="detalle-value">{moment.utc(cita.fecha).format('DD/MM/YYYY')}</span>
                    </div>
                  </div>

                  <div className="detalle-item">
                    <span className="material-icons">schedule</span>
                    <div>
                      <span className="detalle-label">Hora</span>
                      <span className="detalle-value">{cita.hora}</span>
                    </div>
                  </div>

                  <div className="detalle-item">
                    <span className="material-icons">assignment</span>
                    <div>
                      <span className="detalle-label">Motivo</span>
                      <span className="detalle-value">{cita.motivo}</span>
                    </div>
                  </div>

                  {cita.especialidadId && (
                    <div className="detalle-item">
                      <span className="material-icons">medical_services</span>
                      <div>
                        <span className="detalle-label">Especialidad</span>
                        <span className="detalle-value">{cita.especialidadId.nombre}</span>
                      </div>
                    </div>
                  )}

                  <div className="detalle-item">
                    <span className="material-icons">payments</span>
                    <div>
                      <span className="detalle-label">Costo</span>
                      <span className="detalle-value">${cita.monto}</span>
                    </div>
                  </div>

                  <div className="detalle-item detalle-id">
                    <span className="material-icons">fingerprint</span>
                    <div>
                      <span className="detalle-label">ID de Cita</span>
                      <span className="detalle-value">{cita._id}</span>
                    </div>
                  </div>

                  {cita.comentarios && (
                    <div className="notas-consulta">
                      <div className="notas-header">
                        <span className="material-icons">description</span>
                        <strong>Notas médicas</strong>
                      </div>
                      <p>{cita.comentarios}</p>
                    </div>
                  )}
                </div>

                <div className="acciones">
                  <div className="acciones">
                    {cita.recetaId ? (
                      <button onClick={() => verReceta(cita._id)} className="btn-ver-receta">
                        Ver Receta
                      </button>
                    ) : (
                      <span className="texto-sin-receta">Este paciente no requirió receta médica</span>
                    )}
                  </div>

                </div>
              </li>
            ))}
          </ul>

          {/* PAGINACIÓN */}
          {totalPaginas > 1 && (
            <div className="pagination-container">
              <button
                onClick={() => cambiarPagina(paginaActual - 1)}
                disabled={paginaActual === 1}
                className="pagination-btn pagination-nav"
              >
                <span className="material-icons">chevron_left</span>
                Anterior
              </button>

              <div className="pagination-numbers">
                {generarBotonesPaginas()}
              </div>

              <button
                onClick={() => cambiarPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas}
                className="pagination-btn pagination-nav"
              >
                Siguiente
                <span className="material-icons">chevron_right</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* MODAL: Ver Receta */}
      {recetaModalOpen && recetaSeleccionada && (
        <div className="sf-modal-backdrop" onClick={() => setRecetaModalOpen(false)}>
          <div
            className="sf-modal receta-view-modal"
            id="receta-medica-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                <span className="material-icons">receipt_long</span>
                Receta Médica
              </h3>
              <button className="btn-close-modal" onClick={() => setRecetaModalOpen(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="receta-info">
              <div className="info-item">
                <span className="material-icons">calendar_today</span>
                <div>
                  <strong>Fecha de emisión</strong>
                  <p>{moment.utc(recetaSeleccionada.fecha).format('DD/MM/YYYY HH:mm')}</p>
                </div>
              </div>

              {recetaSeleccionada.medicoId && (
                <div className="info-item">
                  <span className="material-icons">person</span>
                  <div>
                    <strong>Médico</strong>
                    <p>Dr. {recetaSeleccionada.medicoId.nombre} {recetaSeleccionada.medicoId.apellido}</p>
                  </div>
                </div>
              )}

              {recetaSeleccionada.pacienteId && (
                <div className="info-item">
                  <span className="material-icons">account_circle</span>
                  <div>
                    <strong>Paciente</strong>
                    <p>{recetaSeleccionada.pacienteId.nombre} {recetaSeleccionada.pacienteId.apellido}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="medicamentos-receta">
              <h4>
                <span className="material-icons">medication</span>
                Medicamentos Prescritos
              </h4>
              {recetaSeleccionada.medicamentos.map((med, index) => (
                <div key={index} className="medicamento-detalle">
                  <div className="medicamento-numero">{index + 1}</div>
                  <div className="medicamento-info">
                    <h5>{med.nombre}</h5>
                    <div className="medicamento-grid">
                      <div><strong>Dosis:</strong> {med.dosis}</div>
                      <div><strong>Frecuencia:</strong> {med.frecuencia}</div>
                      <div><strong>Duración:</strong> {med.duracion}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {recetaSeleccionada.observaciones && (
              <div className="observaciones-receta">
                <h4>
                  <span className="material-icons">note</span>
                  Observaciones Adicionales
                </h4>
                <p>{recetaSeleccionada.observaciones}</p>
              </div>
            )}

            <div className="modal-actions">

              {/* ✔️ BOTÓN PDF MODIFICADO */}
              <button
                className="btn-primary"
                onClick={() => generatePDF(recetaSeleccionada)}
              >
                <span className="material-icons">picture_as_pdf</span>
                Descargar PDF
              </button>

              {/* BOTÓN CERRAR */}
              <button className="btn-secondary" onClick={() => setRecetaModalOpen(false)}>
                <span className="material-icons">close</span>
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
      {/* LAYOUT OCULTO PARA PDF */}
      {recetaSeleccionada && (
        <div
          id="receta-layout-print"
          style={{
            display: "none",
            fontFamily: "Arial, sans-serif",
            padding: "25px",
            width: "210mm",
            background: "white",
            color: "#000",
            lineHeight: "1.4"
          }}
        >
          {/* ENCABEZADO */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, fontSize: "20px" }}>Receta Médica</h2>
            <hr style={{ marginTop: "10px" }} />
          </div>

          {/* FECHA */}
          <p><strong>Fecha:</strong> {moment.utc(recetaSeleccionada.fecha).format("DD/MM/YYYY HH:mm")}</p>


          {/* MÉDICO */}
          <p>
            <strong>Médico:</strong> Dr. {recetaSeleccionada.medicoId.nombre} {recetaSeleccionada.medicoId.apellido}
          </p>

          {/* PACIENTE */}
          <p>
            <strong>Paciente:</strong> {recetaSeleccionada.pacienteId.nombre} {recetaSeleccionada.pacienteId.apellido}
          </p>

          <br />

          {/* MEDICAMENTOS */}
          <h3 style={{ fontSize: "16px" }}>Medicamentos</h3>
          <ul>
            {recetaSeleccionada.medicamentos.map((med, index) => (
              <li key={index} style={{ marginBottom: "8px" }}>
                <strong>{med.nombre}</strong><br />
                Dosis: {med.dosis}<br />
                Frecuencia: {med.frecuencia}<br />
                Duración: {med.duracion}
              </li>
            ))}
          </ul>

          <br />

          {/* OBSERVACIONES */}
          <h3 style={{ fontSize: "16px" }}>Observaciones</h3>
          <p>{recetaSeleccionada.observaciones || "N/A"}</p>

          <br /><br /><br />

          {/* FIRMA DEL MÉDICO */}
          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <div style={{
              borderTop: "1px solid #000",
              width: "60%",
              margin: "0 auto",
              paddingTop: "5px"
            }}>
              Dr. {recetaSeleccionada.medicoId.nombre} {recetaSeleccionada.medicoId.apellido}
            </div>
            <p style={{ fontSize: "12px", marginTop: "4px" }}>Firma del médico</p>
          </div>

          <br /><br />

          {/* PIE DE PÁGINA */}
          <hr />
          <p style={{ textAlign: "center", fontSize: "10px", marginTop: "10px" }}>
            Sistema Médico — Documento generado automáticamente
          </p>
        </div>
      )}
    </div>
  );
}