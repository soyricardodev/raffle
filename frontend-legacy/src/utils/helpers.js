import { format, differenceInDays, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

export const formatCurrency = (amount, currency = 'BS') => {
  const formatter = new Intl.NumberFormat('es-VE', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return `${formatter.format(amount)} ${currency}`
}

export const formatDate = (date, pattern = 'dd/MM/yyyy') => {
  return format(new Date(date), pattern, { locale: es })
}

export const formatDateTime = (dateString) => {
  if (!dateString) return ''
  try {
    const [datePart, timePartWithZone] = dateString.split('T')
    const timePart = timePartWithZone?.slice(0, 5)
    if (!datePart || !timePart) return ''
    const [year, month, day] = datePart.split('-')
    return `${day}/${month}/${year}, ${timePart}`
  } catch (error) {
    console.error('Error formatting dateTime:', error)
    return ''
  }
}


export const getDaysRemaining = (date) => {
  return differenceInDays(new Date(date), new Date())
}

export const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    active: 'bg-green-100 text-green-800',
    finished: 'bg-blue-100 text-blue-800',
    draft: 'bg-gray-100 text-gray-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export const getStatusText = (status) => {
  const texts = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    active: 'Activa',
    finished: 'Finalizada',
    draft: 'Borrador',
    available: 'Disponible',
    reserved: 'Reservado',
    sold: 'Vendido'
  }
  return texts[status] || status
}

export const validateFile = (file, maxSize = 5, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) => {
  if (!file) return { valid: false, error: 'No se ha seleccionado ningún archivo' }

  if (file.size > maxSize * 1024 * 1024) {
    return { valid: false, error: `El archivo no debe exceder ${maxSize}MB` }
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de archivo no permitido' }
  }

  return { valid: true }
}


/**
 * @param {string} dateString 
 * @returns {string} 
 */
export const formatDateTimeForInput = (dateString) => {
  if (!dateString) return ''

  try {
    const date = new Date(dateString)
    if (!isValid(date)) return ''

    return format(date, "yyyy-MM-dd'T'HH:mm")
  } catch (error) {
    console.error('Error formatting date for input:', error)
    return ''
  }
}

/**
 * @param {string} dateTimeLocalValue 
 * @returns {string|null}
 */
export const formatDateTimeForMySQL = (dateTimeLocalValue) => {
  if (!dateTimeLocalValue) return null

  try {
    const date = new Date(dateTimeLocalValue)

    if (!isValid(date)) {
      console.error('Invalid date:', dateTimeLocalValue)
      return null
    }

    return format(date, 'yyyy-MM-dd HH:mm:ss')
  } catch (error) {
    console.error('Error converting to MySQL format:', error)
    return null
  }
}

/**
 * @param {string} mysqlDateTime 
 * @returns {Date|null}
 */
export const parseMySQLDateTime = (mysqlDateTime) => {
  if (!mysqlDateTime) return null

  try {
    const isoString = mysqlDateTime.replace(' ', 'T')
    const date = parseISO(isoString)

    return isValid(date) ? date : null
  } catch (error) {
    console.error('Error parsing MySQL datetime:', error)
    return null
  }
}

/**
 * @param {string} dateTimeLocalValue 
 * @param {boolean} mustBeFuture
 * @returns {string|true}
 */
export const validateDateTime = (dateTimeLocalValue, mustBeFuture = false) => {
  if (!dateTimeLocalValue) return true

  try {
    const selectedDate = new Date(dateTimeLocalValue)

    if (!isValid(selectedDate)) {
      return 'Fecha inválida'
    }

    if (mustBeFuture) {
      const now = new Date()
      if (selectedDate <= now) {
        return 'La fecha del sorteo debe ser en el futuro'
      }
    }

    return true
  } catch (error) {
    return 'Error al validar la fecha'
  }
}

/**
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatDateTimeForDisplay = (date) => {
  if (!date) return ''

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date

    if (!isValid(dateObj)) return ''

    return format(dateObj, "EEEE, d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
  } catch (error) {
    console.error('Error formatting date for display:', error)
    return ''
  }
}

export const formatLargeDate = (date) => {
  if (!date) return ''

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date

    if (!isValid(dateObj)) return ''

    return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: es })
  } catch (error) {
    console.error('Error formatting date for display:', error)
    return ''
  }
}

/**
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatDateForDisplay = (date) => {
  if (!date) return ''

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date

    if (!isValid(dateObj)) return ''

    return format(dateObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
  } catch (error) {
    console.error('Error formatting date for display:', error)
    return ''
  }
}

/**
 * @param {string|Date} targetDate 
 * @returns {string}
 */
export const getTimeRemaining = (targetDate) => {
  if (!targetDate) return ''

  try {
    const target = new Date(targetDate)
    const now = new Date()

    if (!isValid(target)) return ''

    const diffInDays = differenceInDays(target, now)

    if (diffInDays < 0) return 'Finalizado'
    if (diffInDays === 0) return '¡Hoy!'
    if (diffInDays === 1) return 'Mañana'
    if (diffInDays < 7) return `${diffInDays} días`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} semanas`

    return `${Math.floor(diffInDays / 30)} meses`
  } catch (error) {
    console.error('Error calculating time remaining:', error)
    return ''
  }
}

/**
 * 
 * @param {string} str 
 * @returns 
 */
export function normalizeString(str) {
	return str
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9\s]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}