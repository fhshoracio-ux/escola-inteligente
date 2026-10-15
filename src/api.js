import axios from 'axios'

const BASE = 'https://escolainteligente-api.6ft7qo.easypanel.host/api/v1'

const api = axios.create({
  baseURL: BASE,
  timeout: 10000,
})

export default api