import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

console.log('🌐 API URL configured:', API_URL);

// Obtener token del localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Headers con autenticación
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getAuthToken()}`
});

// Configurar axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 segundos 
})

// agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Si es FormData, NO establecer Content-Type manualmente (dejar que el navegador lo haga con boundary)
  // Esto es crítico para que el navegador establezca el boundary correcto en multipart/form-data
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  console.log('📤 API Request:', config.method?.toUpperCase(), config.url, config.params);
  return config
}, (error) => {
  console.error('💥 Request error:', error);
  return Promise.reject(error);
})

// errores
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('💥 API Error:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      url: error.config?.url
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// API de autenticación
export const authAPI = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response;
    } catch (error) {
      throw error;
    }
  },
  verifyToken: async () => {
    try {
      const response = await api.get('/auth/verify');
      return response;
    } catch (error) {
      console.error('❌ Token verification failed:', error.response?.data || error.message);
      throw error;
    }
  },
  createUser: (userData) => api.post('/auth/users', userData)
}

// API de rifas
export const raffleAPI = {
  getAll: (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
      if (value === undefined || value === null) return acc;
      acc[key] = Array.isArray(value) ? value.join(',') : value;
      return acc;
    }, {});
    return api.get('/raffles', { params: cleanParams });
  },
  getById: (id) => api.get(`/raffles/${id}`),
  create: (data) => api.post('/raffles', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/raffles/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/raffles/${id}`),
  getDashboardStats: () => api.get('/raffles/admin/dashboard'),
  getPauseInfo: (raffleId) => api.get(`/raffles/${raffleId}/pause-info`),
  getPublishRaffles: (limit, page) => api.get(`/raffles/publish/all?limit=${limit}&page=${page}`),
  publishRaffle: (id, status) => api.put(`/raffles/${id}/publish`, {
    'publish': status
  })
}

// API de tickets
export const ticketAPI = {
  getByRaffle: (raffleId, params) => api.get(`/tickets/raffle/${raffleId}`, { params }),

  verify: (searchData) => {
    const filteredData = Object.keys(searchData).reduce((acc, key) => {
      const value = searchData[key];
      if (value && value.toString().trim()) {
        acc[key] = value.toString().trim();
      }
      return acc;
    }, {});
    return api.post('/tickets/verify', filteredData);
  },
  advancedSearch: (searchParams) => {
    console.log('🔍 [API] Advanced ticket search with params:', searchParams);
    return api.get('/tickets/search', { params: searchParams });
  },
  getAvailable: (raffleId, quantity) => api.get(`/tickets/raffle/${raffleId}/available`, {
    params: { quantity }
  }),
  getStats: (raffleId) => {
    console.log('📊 [API] Getting ticket stats for raffle:', raffleId);
    return api.get(`/tickets/raffle/${raffleId}/stats`);
  },

}

// API de compras
export const purchaseAPI = {
  create: (data) => {
    // NO establecer Content-Type manualmente - el interceptor ya maneja FormData correctamente
    // Timeout aumentado a 120 segundos para Android con conexiones móviles lentas y archivos grandes
    return api.post('/purchases', data, {
      timeout: 120000
    })
  },
  getAll: (params = {}) => {
    console.log('🔍 [API] Getting purchases with params:', params);

    const cleanParams = Object.keys(params).reduce((acc, key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            acc[key] = value.join(',');
          }
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {});
    return api.get('/purchases', { params: cleanParams });
  },
  getClientPurchases: (params = {}) => {
    console.log('🔍 [API] Getting client purchases with params:', params);

    const cleanParams = Object.keys(params).reduce((acc, key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== 'all') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            acc[key] = value.join(',');
          }
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {});
    return api.get('/purchases/client-purchases', { params: cleanParams });
  },
  getAnalyticsPurchases: (params = {}) => {
    console.log('🔍 [API] Getting analytics purchases with params:', params);

    const cleanParams = Object.keys(params).reduce((acc, key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== 'all') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            acc[key] = value.join(',');
          }
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {});
    return api.get('/purchases/analytics', { params: cleanParams });
  },
  getById: (id) => api.get(`/purchases/${id}`),
  updateStatus: (id, data) => api.put(`/purchases/${id}/status`, data),
  reassignStatus: (id, data) => api.put(`/purchases/${id}/tickets/reassign`, data),
  addTickets: (id, quantity) => {
    console.log(`➕ Adding ${quantity} tickets to purchase ${id}`);
    return api.put(`/purchases/${id}/tickets/add`, { quantity })
  },
  removeTickets: (id, quantity) => {
    console.log(`➖ Removing ${quantity} tickets from purchase ${id}`);
    return api.put(`/purchases/${id}/tickets/remove`, { quantity })
  }
}

// API de configuración
export const configAPI = {
  getAll: () => api.get('/config'),
  getByKey: (key) => api.get(`/config/${key}`),
  update: (key, value) => api.put(`/config/${key}`, { value }),
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/config/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

// Servicio API para emails
export const emailAPI = {
  getLogs: async (filters = {}) => {
    try {
      console.log('📧 Obteniendo logs de emails con filtros:', filters);

      const queryParams = new URLSearchParams();

      if (filters.email_type && filters.email_type !== 'all') {
        queryParams.append('email_type', filters.email_type);
      }

      if (filters.status && filters.status !== 'all') {
        queryParams.append('status', filters.status);
      }

      if (filters.recipient_email && filters.recipient_email.trim()) {
        queryParams.append('recipient_email', filters.recipient_email.trim());
      }

      if (filters.search && filters.search.trim()) {
        queryParams.append('search', filters.search.trim());
      }

      if (filters.limit) {
        queryParams.append('limit', filters.limit);
      }

      if (filters.page) {
        queryParams.append('page', filters.page);
      }

      const response = await fetch(
        `${API_URL}/admin/emails/logs?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo logs de emails:', error);
      throw error;
    }
  },
  getStats: async () => {
    try {
      const response = await fetch(
        `${API_URL}/admin/emails/stats`,
        {
          method: 'GET',
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Estadísticas de emails obtenidas:', data);
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de emails:', error);
      throw error;
    }
  },
  resendEmail: async (logId) => {
    try {
      const response = await fetch(
        `${API_URL}/admin/emails/resend/${logId}`,
        {
          method: 'POST',
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error reenviando email:', error);
      throw error;
    }
  },
  sendTestEmail: async (testData) => {
    try {
      const response = await fetch(
        `${API_URL}/admin/emails/test`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(testData)
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error enviando email de prueba:', error);
      throw error;
    }
  },
  getEmailConfig: async () => {
    try {
      const response = await fetch(
        `${API_URL}/config/email_settings`,
        {
          method: 'GET',
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo configuración de emails:', error);
      throw error;
    }
  },
  updateEmailConfig: async (config) => {
    try {
      const response = await fetch(
        `${API_URL}/config/email_settings`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ value: config })
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error actualizando configuración de emails:', error);
      throw error;
    }
  }
};

export const utilsAPI = {
  normalizeCedula: (cedula) => {
    if (!cedula) return '';
    return cedula.toString().replace(/[\s\-\.VEve]/g, '').toUpperCase();
  },
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  formatPhone: (phone) => {
    if (!phone) return '';
    return phone.toString().replace(/[^\d+]/g, '');
  },
  validateTicketNumber: (ticketNumber) => {
    if (!ticketNumber) return false;
    // Debe ser un número entero positivo
    const num = parseInt(ticketNumber);
    return !isNaN(num) && num > 0;
  }
}

export default api