import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCamera, cilCloudUpload, cilSearch, cilVideo, cilXCircle } from '@coreui/icons'

import { useDetectorPlaca, validarImagen } from '../../hooks/useDetectorPlaca'
import ResultadoDeteccion from './ResultadoDeteccion'

const TAMANO_MAXIMO_MB = 4
const TIPOS_ACEPTADOS = 'image/jpeg,image/png'

const MonitoreoEntrada = () => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const inputArchivoRef = useRef(null)

  const [camaraActiva, setCamaraActiva] = useState(false)
  const [errorCamara, setErrorCamara] = useState('')
  const [iniciandoCamara, setIniciandoCamara] = useState(false)

  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [errorArchivo, setErrorArchivo] = useState('')

  const { detectando, resultado, error, detectarPlaca, reiniciar } = useDetectorPlaca()

  // --- Manejo de la cámara ---

  const detenerCamara = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCamaraActiva(false)
  }, [])

  // Liberar la cámara siempre que el componente se desmonte (cambio de vista)
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  const activarCamara = async () => {
    setErrorCamara('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorCamara('Este navegador no soporta el acceso a la cámara.')
      return
    }

    setIniciandoCamara(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCamaraActiva(true)
    } catch (err) {
      setErrorCamara(
        'No se pudo acceder a la cámara. Verifique los permisos del navegador y que ningún otro programa la esté utilizando.',
      )
    } finally {
      setIniciandoCamara(false)
    }
  }

  // --- Manejo de la imagen seleccionada (cámara o archivo) ---

  const limpiarSeleccion = () => {
    setArchivoSeleccionado(null)
    setPreviewUrl((actual) => {
      if (actual) URL.revokeObjectURL(actual)
      return ''
    })
    setErrorArchivo('')
  }

  const establecerImagen = (archivo) => {
    const errorValidacion = validarImagen(archivo)
    if (errorValidacion) {
      setErrorArchivo(errorValidacion)
      return
    }
    limpiarSeleccion()
    setErrorArchivo('')
    setArchivoSeleccionado(archivo)
    setPreviewUrl(URL.createObjectURL(archivo))
    reiniciar()
  }

  const capturarFoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video.videoWidth || !video.videoHeight) {
      setErrorArchivo('La cámara todavía no está lista. Espere un momento e intente de nuevo.')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorArchivo('No se pudo capturar la fotografía. Intente nuevamente.')
          return
        }
        const archivo = new File([blob], `captura-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })
        establecerImagen(archivo)
      },
      'image/jpeg',
      0.92,
    )
  }

  const manejarSeleccionArchivo = (evento) => {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo) return
    establecerImagen(archivo)
  }

  const manejarDetectar = () => {
    if (!archivoSeleccionado) {
      setErrorArchivo('Debe capturar o seleccionar una imagen antes de detectar la placa.')
      return
    }
    detectarPlaca(archivoSeleccionado)
  }

  const procesarOtraImagen = () => {
    limpiarSeleccion()
    reiniciar()
  }

  // Liberar el objeto URL de la vista previa al reemplazarlo o desmontar
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <CRow>
      <CCol xs={12}>
        <h4 className="mb-3">Monitoreo de entrada</h4>
      </CCol>

      {/* Columna izquierda: captura del vehículo */}
      <CCol lg={6} className="mb-4">
        <CCard className="h-100">
          <CCardHeader>
            <strong>Captura del vehículo</strong>
            <div className="small text-body-secondary">
              Use la cámara en tiempo real o seleccione una fotografía almacenada.
            </div>
          </CCardHeader>
          <CCardBody>
            <div
              className="d-flex align-items-center justify-content-center mb-3 rounded overflow-hidden"
              style={{ background: '#000', minHeight: '260px' }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  maxHeight: '360px',
                  display: camaraActiva ? 'block' : 'none',
                }}
              />
              {!camaraActiva && (
                <div className="text-white-50 text-center py-5 px-3">
                  <CIcon icon={cilVideo} size="xl" />
                  <p className="mb-0 mt-2">La cámara está detenida</p>
                </div>
              )}
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3">
              {!camaraActiva ? (
                <CButton color="primary" onClick={activarCamara} disabled={iniciandoCamara}>
                  <CIcon icon={cilVideo} className="me-1" />
                  {iniciandoCamara ? 'Activando cámara...' : 'Activar cámara'}
                </CButton>
              ) : (
                <CButton color="secondary" onClick={detenerCamara}>
                  Detener cámara
                </CButton>
              )}

              <CButton color="dark" onClick={capturarFoto} disabled={!camaraActiva}>
                <CIcon icon={cilCamera} className="me-1" />
                Capturar foto
              </CButton>

              <CButton
                color="light"
                variant="outline"
                onClick={() => inputArchivoRef.current?.click()}
              >
                <CIcon icon={cilCloudUpload} className="me-1" />
                Subir imagen (JPG/PNG)
              </CButton>
              <input
                ref={inputArchivoRef}
                type="file"
                accept={TIPOS_ACEPTADOS}
                className="d-none"
                onChange={manejarSeleccionArchivo}
              />
            </div>

            {errorCamara && (
              <CAlert color="danger" className="d-flex align-items-center gap-2">
                <CIcon icon={cilXCircle} className="flex-shrink-0" />
                <div>{errorCamara}</div>
              </CAlert>
            )}

            {previewUrl && (
              <div className="mb-3">
                <div className="small text-body-secondary mb-1">Vista previa</div>
                <img
                  src={previewUrl}
                  alt="Vista previa de la imagen capturada"
                  className="img-fluid rounded border"
                  style={{ maxHeight: '260px', objectFit: 'contain' }}
                />
              </div>
            )}

            {errorArchivo && (
              <CAlert color="danger" className="d-flex align-items-center gap-2">
                <CIcon icon={cilXCircle} className="flex-shrink-0" />
                <div>{errorArchivo}</div>
              </CAlert>
            )}

            <div className="d-flex flex-wrap gap-2">
              <CButton
                color="success"
                onClick={manejarDetectar}
                disabled={!archivoSeleccionado || detectando}
              >
                <CIcon icon={cilSearch} className="me-1" />
                {detectando ? 'Detectando...' : 'Detectar placa'}
              </CButton>

              {(previewUrl || resultado || error) && (
                <CButton color="secondary" variant="outline" onClick={procesarOtraImagen}>
                  Procesar otra imagen
                </CButton>
              )}
            </div>

            <p className="small text-body-secondary mt-3 mb-0">
              Formatos admitidos: JPG y PNG. Tamaño máximo: {TAMANO_MAXIMO_MB} MiB.
            </p>
          </CCardBody>
        </CCard>
      </CCol>

      {/* Columna derecha: resultados */}
      <CCol lg={6} className="mb-4">
        <CCard className="h-100">
          <CCardHeader>
            <strong>Resultado del reconocimiento</strong>
            <div className="small text-body-secondary">
              Información devuelta por el servicio de reconocimiento de placas.
            </div>
          </CCardHeader>
          <CCardBody>
            <ResultadoDeteccion
              detectando={detectando}
              error={error}
              resultado={resultado}
              imagenPreviaLocal={previewUrl}
              onReintentar={procesarOtraImagen}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </CRow>
  )
}

export default MonitoreoEntrada
