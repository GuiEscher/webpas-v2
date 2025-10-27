const handleServerResponses = (collection, response, setNotify) => {
    // 1. Verificação de Segurança: Garante que nunca quebre, mesmo com erros inesperados.
    if (!response || !response.data) {
        setNotify({
            isOpen: true,
            message: 'Ocorreu um erro de comunicação com o servidor.',
            type: 'error'
        });
        return;
    }

    // 2. Extrai o status e os dados da resposta para facilitar o uso.
    const { status, data } = response;

    // 3. Lógica Unificada baseada no Status da Resposta
    
    // CASO DE SUCESSO (Status 2xx)
    if (status >= 200 && status < 300) {
        setNotify({
            isOpen: true,
            message: data.msg || data || "Operação realizada com sucesso!", // Usa a msg do backend ou um texto padrão
            type: 'success'
        });
        return;
    }

    // CASO DE CONFLITO (Status 409 - para o upload de CSV e outros)
    if (status === 409) {
        setNotify({
            isOpen: true,
            message: data.msg || "Conflito: os dados já existem.", // Mensagem do backend
            type: 'warning' // 'warning' é mais apropriado para conflitos
        });
        return;
    }

    // OUTROS CASOS DE ERRO (Status 4xx, 5xx)
    // Aqui podemos usar a lógica antiga que você tinha para códigos de erro específicos
    if (data.code === 11000 && data.writeErrors) { // Erro de duplicidade do MongoDB
        let message = `Um item já está cadastrado.`;
        if (collection === 'turmas') {
            const turmaError = data.writeErrors[0].op.turma;
            const disciplinaError = data.writeErrors[0].op.nomeDisciplina;
            message = `A turma "${turmaError}" da disciplina "${disciplinaError}" já está cadastrada.`;
        } else if (collection === 'salas') {
            const salaError = data.writeErrors[0].op.numeroSala;
            const predioError = data.writeErrors[0].op.predio;
            message = `A sala "${salaError}" do prédio "${predioError}" já está cadastrada.`;
        }
        setNotify({ isOpen: true, message, type: 'warning' });
    } else {
        // Para todos os outros erros, mostra a mensagem vinda do servidor
        setNotify({
            isOpen: true,
            message: data.msg || "Ocorreu um erro.",
            type: 'error'
        });
    }
};

export default handleServerResponses;