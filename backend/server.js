const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const errorHandler = require('./middleware/errorHandler')
const cookieParser = require('cookie-parser')
const {protect} = require("./middleware/auth")

require('dotenv').config()

const app = express()
app.use(cookieParser())
const port = process.env.PORT || 5000

// CORS: aceita o FRONTEND_URL definido em produção e QUALQUER porta localhost
// em desenvolvimento (o CRA sobe em 3000, 3001, 3003... conforme disponível).
const corsOptions = {
    credentials: true,
    origin: function (origin, callback) {
        // Sem origin (curl/health check) — permite.
        if (!origin) return callback(null, true);
        // Qualquer localhost / 127.0.0.1 em qualquer porta (dev).
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        // Origem explícita de produção.
        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
            return callback(null, true);
        }
        return callback(null, false);
    },
};
app.use(cors(corsOptions))

// Adicionado para lidar com requisições de pre-flight (CORS)
app.options('*', cors(corsOptions));

app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({limit: '5mb', extended: true}));

const uri = process.env.ATLAS_URI
mongoose.connect(uri,{useNewUrlParser:true})
const connection = mongoose.connection
connection.once('open',()=>{
    console.log("MongoDB database connection estabilished successfully")
})

const salasRouter = require('./routes/salas')
const turmasRouter = require('./routes/turmas')
const distanciasRouter = require('./routes/distancias')
const resultadosRouter = require('./routes/resultados')
const configsRouter = require('./routes/config')
const authenticationRouter = require('./routes/authentication')
const testeGLPKRouter = require('./routes/testeGLPK')

// --- CORREÇÃO APLICADA AQUI ---
// Removemos o 'protect' para que ele não bloqueie mais as requisições do navegador.
// A segurança agora é gerenciada dentro de cada arquivo de rota.
app.use('/salas', salasRouter)
app.use('/turmas', turmasRouter)
app.use('/distancias', distanciasRouter)
app.use('/resultados', protect, resultadosRouter); // Adicione protect aqui
// --- FIM DA CORREÇÃO ---
app.use('/teste-auth', protect, (req, res) => res.json({ user: req.user?._id }))
app.use('/configs',configsRouter)
app.use('/auth',authenticationRouter)
app.use('/teste',testeGLPKRouter)

app.use(errorHandler)

const server = app.listen(port,()=>{
    console.log(`Server running on port : ${port}`)
})

process.on("unhandledRejection",(err,promise)=>{
    console.log(`Logged Error : ${err}`)
    server.close(()=>process.exit(1))
})