import { useCallback, useState } from 'react'

/**
 * Hook para consumir el endpoint REST de reconocimiento de placas.
 *
 * La URL del endpoint (con su código de acceso) se toma desde la variable
 * de entorno VITE_OCR_ENDPOINT y nunca se escribe directamente en el código.
 *
 * @module useDetectorPlaca
 */

const ENDPOINT_OCR = import.meta.env.VITE_OCR_ENDPOINT

const TAMANO_MAXIMO_BYTES = 4 * 1024 * 1024 // 4 MiB
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png']

const mensajePorCodigoHttp = (status) => {
  switch (status) {
    case 400:
      return 'La imagen está vacía, es inválida o tiene dimensiones no permitidas.'
    case 413:
      return 'La imagen supera el tamaño máximo permitido de 4 MiB.'
    case 415:
      return 'El formato de la imagen no es admitido. Use JPG o PNG.'
    case 502:
      return 'Falló el servicio de reconocimiento de placas o la consulta a la base de datos. Intente nuevamente.'
    case 504:
      return 'Se agotó el tiempo de espera del servicio. Intente nuevamente.'
    default:
      return `Ocurrió un error inesperado del servidor (código ${status}). Intente nuevamente.`
  }
}

/**
 * Valida el tipo y tamaño de un archivo/blob de imagen antes de enviarlo.
 *
 * @param {File|Blob} archivo
 * @returns {string} Mensaje de error, o cadena vacía si es válido.
 */
export const validarImagen = (archivo) => {
  if (!archivo) {
    return 'Debe capturar o seleccionar una imagen antes de continuar.'
  }
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return 'Formato no admitido. Solo se aceptan imágenes JPG o PNG.'
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return 'La imagen supera el tamaño máximo permitido de 4 MiB.'
  }
  return ''
}

export const useDetectorPlaca = () => {
  const [detectando, setDetectando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')

  const detectarPlaca = useCallback(async (archivo) => {
    setError('')

    const errorValidacion = validarImagen(archivo)
    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    if (!ENDPOINT_OCR) {
      setError(
        'No se configuró la variable de entorno VITE_OCR_ENDPOINT. Contacte al administrador.',
      )
      return
    }

    setResultado(null)
    setDetectando(true)

    try {
      const respuesta = await fetch(ENDPOINT_OCR, {
        method: 'POST',
        headers: {
          'Content-Type': archivo.type || 'application/octet-stream',
        },
        body: archivo,
      })

      if (!respuesta.ok) {
        setError(mensajePorCodigoHttp(respuesta.status))
        return
      }

      const datos = await respuesta.json()
      setResultado(datos)
    } catch (err) {
      setError(
        'No se pudo conectar con el servicio de reconocimiento. Verifique su conexión e intente nuevamente.',
      )
    } finally {
      setDetectando(false)
    }
  }, [])

  const reiniciar = useCallback(() => {
    setResultado(null)
    setError('')
  }, [])

  return { detectando, resultado, error, detectarPlaca, reiniciar }
}
