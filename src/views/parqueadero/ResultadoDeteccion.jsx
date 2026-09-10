import React from 'react'
import PropTypes from 'prop-types'
import { CAlert, CBadge, CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBan,
  cilCheckCircle,
  cilReload,
  cilShieldAlt,
  cilWarning,
  cilXCircle,
} from '@coreui/icons'

const formatearPorcentaje = (valor) => {
  if (typeof valor !== 'number') return '—'
  return `${(valor * 100).toFixed(1)} %`
}

const ImagenMarcada = ({ src }) => {
  if (!src) return null
  return (
    <img
      src={src}
      alt="Vehículo con la placa detectada"
      className="img-fluid rounded mb-3 border"
      style={{ width: '100%', objectFit: 'contain', maxHeight: '360px', background: '#000' }}
    />
  )
}
ImagenMarcada.propTypes = { src: PropTypes.string }

const FilaDato = ({ etiqueta, valor }) => (
  <div className="d-flex justify-content-between py-1 border-bottom">
    <span className="text-body-secondary">{etiqueta}</span>
    <strong className="text-end">{valor ?? '—'}</strong>
  </div>
)
FilaDato.propTypes = { etiqueta: PropTypes.string, valor: PropTypes.node }

const ResultadoDeteccion = ({ detectando, error, resultado, imagenPreviaLocal, onReintentar }) => {
  if (detectando) {
    return (
      <div className="text-center py-5">
        <CSpinner color="success" />
        <p className="mt-3 mb-0">Procesando imagen, por favor espere...</p>
      </div>
    )
  }

  if (error) {
    return (
      <>
        <CAlert color="danger" className="d-flex align-items-start gap-2">
          <CIcon icon={cilXCircle} className="flex-shrink-0 mt-1" />
          <div>{error}</div>
        </CAlert>
        <CButton color="secondary" variant="outline" onClick={onReintentar}>
          <CIcon icon={cilReload} className="me-1" />
          Reintentar
        </CButton>
      </>
    )
  }

  if (!resultado) {
    return (
      <div className="text-center text-body-secondary py-5">
        Capture o cargue una imagen y presione <strong>Detectar placa</strong> para ver el resultado
        del reconocimiento aquí.
      </div>
    )
  }

  const imagenMarcada = resultado.imagen_marcada
    ? `data:${resultado.imagen_marcada.mime_type};base64,${resultado.imagen_marcada.base64}`
    : imagenPreviaLocal

  // --- Vehículo encontrado y registrado ---
  if (resultado.estado === 'encontrado' && resultado.vehiculo_encontrado) {
    const vehiculo = resultado.vehiculo ?? {}
    return (
      <>
        <ImagenMarcada src={imagenMarcada} />

        <CAlert color="success" className="d-flex align-items-center gap-2">
          <CIcon icon={cilCheckCircle} className="flex-shrink-0" />
          <strong>VEHÍCULO REGISTRADO</strong>
        </CAlert>

        <FilaDato
          etiqueta="Placa"
          valor={
            <CBadge color="dark" className="fs-6">
              {resultado.placa}
            </CBadge>
          }
        />
        <FilaDato etiqueta="Confianza OCR" valor={formatearPorcentaje(resultado.confianza)} />

        <div className="row text-center my-3">
          {vehiculo.foto_url && (
            <div className="col">
              <img
                src={vehiculo.foto_url}
                alt="Fotografía del vehículo"
                className="rounded mb-1"
                style={{ width: '100%', maxWidth: '140px', height: '100px', objectFit: 'cover' }}
              />
              <div className="small text-body-secondary">Vehículo</div>
            </div>
          )}
          {vehiculo.foto_propietario_url && (
            <div className="col">
              <img
                src={vehiculo.foto_propietario_url}
                alt="Fotografía del propietario"
                className="rounded-circle mb-1"
                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
              />
              <div className="small text-body-secondary">Propietario</div>
            </div>
          )}
        </div>

        <FilaDato etiqueta="Marca" valor={vehiculo.marca} />
        <FilaDato etiqueta="Modelo" valor={vehiculo.modelo} />
        <FilaDato etiqueta="Año" valor={vehiculo.anio} />
        <FilaDato etiqueta="Color" valor={vehiculo.color} />
        <FilaDato etiqueta="Tipo" valor={vehiculo.tipo} />
        <FilaDato etiqueta="Propietario" valor={vehiculo.propietario_nombre} />
        <FilaDato etiqueta="Cédula" valor={vehiculo.cedula_enmascarada} />
        <FilaDato
          etiqueta="Autorización"
          valor={
            <CBadge color={vehiculo.autorizado ? 'success' : 'danger'}>
              {vehiculo.autorizado ? 'Autorizado' : 'No autorizado'}
            </CBadge>
          }
        />

        <CButton color="secondary" variant="outline" className="mt-3" onClick={onReintentar}>
          <CIcon icon={cilReload} className="me-1" />
          Procesar otra imagen
        </CButton>
      </>
    )
  }

  // --- Placa detectada pero no registrada en Supabase ---
  if (resultado.estado === 'no_registrado') {
    return (
      <>
        <ImagenMarcada src={imagenMarcada} />

        <CAlert color="danger" className="d-flex align-items-center gap-2">
          <CIcon icon={cilBan} className="flex-shrink-0" />
          <strong>VEHÍCULO NO REGISTRADO</strong>
        </CAlert>

        <FilaDato
          etiqueta="Placa detectada"
          valor={
            <CBadge color="dark" className="fs-6">
              {resultado.placa}
            </CBadge>
          }
        />
        <FilaDato etiqueta="Confianza OCR" valor={formatearPorcentaje(resultado.confianza)} />

        <CAlert color="warning" className="mt-3 mb-0">
          Esta placa no existe en la base de datos de Supabase. No se autoriza el ingreso.
        </CAlert>

        <CButton color="secondary" variant="outline" className="mt-3" onClick={onReintentar}>
          <CIcon icon={cilReload} className="me-1" />
          Procesar otra imagen
        </CButton>
      </>
    )
  }

  // --- No se detectó ninguna placa ---
  if (resultado.estado === 'sin_placa') {
    return (
      <>
        <ImagenMarcada src={imagenMarcada} />
        <CAlert color="warning" className="d-flex align-items-center gap-2">
          <CIcon icon={cilWarning} className="flex-shrink-0" />
          <div>No se detectó ninguna placa en la imagen. Intente con otra fotografía.</div>
        </CAlert>
        <CButton color="secondary" variant="outline" onClick={onReintentar}>
          <CIcon icon={cilReload} className="me-1" />
          Procesar otra imagen
        </CButton>
      </>
    )
  }

  // --- Confianza demasiado baja ---
  if (resultado.estado === 'baja_confianza') {
    return (
      <>
        <ImagenMarcada src={imagenMarcada} />
        <CAlert color="warning" className="d-flex align-items-center gap-2">
          <CIcon icon={cilWarning} className="flex-shrink-0" />
          <div>
            La confianza del reconocimiento es muy baja
            {typeof resultado.confianza === 'number'
              ? ` (${formatearPorcentaje(resultado.confianza)})`
              : ''}
            . Vuelva a capturar la imagen con mejor iluminación y enfoque.
          </div>
        </CAlert>
        <CButton color="secondary" variant="outline" onClick={onReintentar}>
          <CIcon icon={cilReload} className="me-1" />
          Capturar nuevamente
        </CButton>
      </>
    )
  }

  // --- Varias placas detectadas ---
  if (resultado.estado === 'multiples_placas') {
    return (
      <>
        <ImagenMarcada src={imagenMarcada} />
        <CAlert color="warning" className="d-flex align-items-center gap-2">
          <CIcon icon={cilWarning} className="flex-shrink-0" />
          <div>
            Se detectaron varias placas en la imagen. Capture una imagen con un solo vehículo.
          </div>
        </CAlert>
        <CButton color="secondary" variant="outline" onClick={onReintentar}>
          <CIcon icon={cilReload} className="me-1" />
          Procesar otra imagen
        </CButton>
      </>
    )
  }

  // --- Estado desconocido / no controlado explícitamente ---
  return (
    <>
      <ImagenMarcada src={imagenMarcada} />
      <CAlert color="secondary" className="d-flex align-items-center gap-2">
        <CIcon icon={cilShieldAlt} className="flex-shrink-0" />
        <div>Estado de respuesta no reconocido: {String(resultado.estado)}</div>
      </CAlert>
      <CButton color="secondary" variant="outline" onClick={onReintentar}>
        <CIcon icon={cilReload} className="me-1" />
        Procesar otra imagen
      </CButton>
    </>
  )
}

ResultadoDeteccion.propTypes = {
  detectando: PropTypes.bool.isRequired,
  error: PropTypes.string,
  resultado: PropTypes.object,
  imagenPreviaLocal: PropTypes.string,
  onReintentar: PropTypes.func.isRequired,
}

export default ResultadoDeteccion
