import axios from 'axios';

const http = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    withCredentials: true,  // Envia cookies/JWT
    headers: { 'Content-Type': 'application/json' }
});

export default http;