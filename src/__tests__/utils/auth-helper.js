const jwt = require('jsonwebtoken');

function getTestToken(usuario = {}) {
    const secret = process.env.JWT_SEGREDO || 'test-secret-key';
    const payload = {
        usuarioId: usuario.id || 1,
        email: usuario.email || 'test@example.com',
        nome: usuario.nome || 'Test User',
        funcao: usuario.funcao || 'admin',
        permissoes: usuario.permissoes || { '*': ['*'] },
        empresaId: usuario.empresaId || 1,
        empresaNome: usuario.empresaNome || 'Test Company'
    };

    return jwt.sign(payload, secret, {
        expiresIn: '1h'
    });
}

module.exports = {
    getTestToken
};
