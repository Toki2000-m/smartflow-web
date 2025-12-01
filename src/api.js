import axios from 'axios';

// Cambia localhost por la URL de tu backend live
const API = axios.create({
  baseURL: 'https://vita-backend-czgo.onrender.com/api/web', 
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  console.log('Token enviado:', token);
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;
