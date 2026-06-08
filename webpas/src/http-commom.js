import axios from 'axios';

const http = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'https://webpas-v2-backend.onrender.com/',
    withCredentials: true,  // Envia cookies/JWT
    headers: { 'Content-Type': 'application/json' }
});

export default http;