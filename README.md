# WebPAS
Software web para resolução do problema de alocação de salas

## Instalação e Execução (React + Node.js + MongoDB)

### 1. Pré-requisitos
- Git
- Node.js LTS e npm
- Conta no MongoDB Atlas (ou MongoDB local)
- Windows: PowerShell ou Prompt de Comando

### 2. Clonar o repositório
```bash
git clone https://github.com/GuiEscher/webpas-v2.git
cd webpas-v2
```

### 3. Configurar MongoDB
- Crie um cluster no MongoDB Atlas.
- Crie um Database e um usuário com acesso.
- Copie a Connection String (ex.: `mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority`).

### 4. Variáveis de ambiente (backend)
Crie um arquivo `.env` na pasta `backend` com:
```
REACT_APP_API_URL=http://localhost:5000
ATLAS_URI=ROTA CONEXAO COM O CLUSTER DO MONGO DB
JWT_SECRET=123456
JWT_EXPIRE=30d
```

### 5. Instalar dependências
Backend:
```bash
cd backend
npm install
```
Frontend:
```bash
cd ../frontend
npm install
```

### 6. Adicionar SheetJS ao frontend
No arquivo `public/index.html`, inclua o script do SheetJS:
```html
<!-- Adicione antes do fechamento de </body> -->
<script src="https://git.sheetjs.com/sheetjs/sheetjs/raw/branch/master/dist/xlsx.full.min.js"></script>
```
Ou baixe o arquivo de https://git.sheetjs.com/sheetjs/sheetjs/src/branch/master/dist/xlsx.full.min.js e referencie-o localmente em `public`.

### 7. Iniciar a aplicação
- Terminal 1 (backend na porta 5000):
```bash
cd backend
node server.js
```
- Terminal 2 (frontend na porta 3000):
```bash
cd frontend
npm start
```

### 8. Acessar
- Frontend: http://localhost:3000
- API (exemplo): http://localhost:5000


### 9. Problemas comuns
- Conexão MongoDB: verifique `ATLAS_URI` e IP liberado no Atlas (Network Access).
- CORS: confirme que o backend permite origem `http://localhost:3000`.
- Porta em uso: altere `REACT_APP_API_URL` ou a porta do servidor backend.
- Variáveis do React: após editar `.env`, reinicie `npm start`.
