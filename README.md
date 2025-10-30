# 🏫 WebPAS - Planejador de Alocação de Salas 

**WebPAS** é uma aplicação web projetada para auxiliar na complexa tarefa de **alocação de salas para turmas**, considerando diversas restrições como capacidade, disponibilidade de horários e distâncias entre prédios e departamentos.  
A ferramenta utiliza um **modelo de otimização** para encontrar a melhor distribuição possível.

## 🚀 Funcionalidades Principais

### 🗂️ Cadastro e Gerenciamento

- **Turmas**: disciplinas, horários, professores, etc.

- **Prédios e Salas**: capacidade e disponibilidade por período.

- **Distâncias**: entre prédios e departamentos.

- ### 🧮 Solver de Otimização

- Executa um modelo matemático para encontrar a **alocação ótima de salas** com base nos dados cadastrados e parâmetros definidos (ano, semestre, folga, etc).

- ### 📅 Visualização de Resultados

- Exibe a agenda de alocação de salas de forma clara — por dia da semana e horário — com opções de **visualização e exportação**.

- ### ⚙️ Configurações\nPermite definir **parâmetros gerais do sistema**, ajustando o comportamento da aplicação.

- ## 🧰 Pré-requisitos
  
Antes de começar, certifique-se de ter instalado:

- [Node.js (versão LTS recomendada)](https://nodejs.org/)
- npm ou yarn
- Uma conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) para o banco de dados

## 💻 Instalação e Configuração\n\nSiga os passos abaixo para configurar o ambiente de desenvolvimento:

### 1️⃣ Clonar o Repositório

```bash
git clone <https://github.com/GuiEscher/webpas-v2.git>
cd <nome-da-pasta-do-projeto>
```

### 2️⃣ Configurar o MongoDB Atlas

1. Crie um **cluster gratuito** no MongoDB Atlas.
2. Configure as **permissões de acesso (Network Access)** para permitir conexões do seu IP ou de qualquer IP (`0.0.0.0/0` — **não recomendado para produção**).
3. Crie um **usuário de banco de dados (Database Access)** e anote o nome de usuário e a senha.
4. Obtenha a **string de conexão** do seu cluster (opção *Application Connect*).
5. - Substitua `<password>` pela senha do usuário criado.  \n   - Substitua `<dbname>` pelo nome do banco (exemplo: `webpas_db`).

### 3️⃣ Configurar o Backend

Navegue até a pasta do backend:

```bash
cd backend
```

Crie um arquivo chamado `.env` na raiz da pasta **backend** e adicione:
```env
# URL base onde o frontend espera encontrar a API
REACT_APP_API_URL=http://localhost:5000
# String de conexão obtida do MongoDB Atlas
ATLAS_URI=mongodb+srv://<username>:<password>@<cluster-url>/<dbname>?retryWrites=true&w=majority
# Segredo para assinatura de tokens JWT
JWT_SECRET=123456
# Tempo de expiração do token JWT
JWT_EXPIRE=30d
```
Instale as dependências:
```bash
npm install
# ou
yarn install
```
### 4️⃣ Configurar o Frontend
Navegue até a pasta do frontend:
```bash
# Se estiver na pasta backend, volte um nível:
cd ..
cd frontend
```
#### ➕ Adicionar SheetJS
1. Baixe o arquivo **`xlsx.full.min.js`** no link:
2.  👉 https://git.sheetjs.com/sheetjs/sheetjs/src/branch/master/dist/xlsx.full.min.js
3. Salve o arquivo dentro da pasta `public` do frontend.
4. Abra `public/index.html` e adicione dentro da tag `<head>` ou antes de `</body>`:
```html
<script src=\"%PUBLIC_URL%/xlsx.full.min.js\"></script>
```
#### Instalar dependências
```bash
npm install
# ou
yarn install
```
## ▶️ Executando a Aplicação
### 🖥️ Iniciar o Backend
Abra um terminal na pasta **backend** e execute:
```bash
npm start
# ou
node server.js
```
O servidor backend estará rodando em:  
👉 [http://localhost:5000](http://localhost:5000)
### 🌐 Iniciar o Frontend
Abra outro terminal na pasta **frontend** e execute:
```bash
npm start
# ou
yarn start
```
A aplicação frontend será aberta automaticamente em:  \n👉 [http://localhost:3000](http://localhost:3000)
## ✅ Agora você pode acessar a aplicação e começar a usar o WebPAS!
---


## Passos para fazer a alocação


## Referências
https://github.com/GaiaBR-dev/webpas
