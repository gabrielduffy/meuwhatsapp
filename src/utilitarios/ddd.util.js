/**
 * Utilitário para mapeamento de cidades e seus respectivos DDDs
 */

const dddMap = {
    // São Paulo
    'são paulo': ['11'],
    'santos': ['13'],
    'campinas': ['19'],
    'são josé dos campos': ['12'],
    'ribeirão preto': ['16'],
    'sorocaba': ['15'],
    'são josé do rio preto': ['17'],
    'bauru': ['14'],
    'presidente prudente': ['18'],

    // Rio de Janeiro
    'rio de janeiro': ['21'],
    'niterói': ['21'],
    'são gonçalo': ['21'],
    'campos dos goytacazes': ['22'],
    'petrópolis': ['24'],
    'volta redonda': ['24'],

    // Minas Gerais
    'belo horizonte': ['31'],
    'uberlândia': ['34'],
    'juiz de fora': ['32'],
    'contagem': ['31'],
    'betim': ['31'],
    'montes claros': ['38'],
    'uberaba': ['34'],
    'governador valadares': ['33'],
    'ipatinga': ['31'],

    // Espírito Santo
    'vitória': ['27'],
    'vila velha': ['27'],
    'serra': ['27'],

    // Paraná
    'curitiba': ['41'],
    'londrina': ['43'],
    'maringá': ['44'],
    'ponta grossa': ['42'],
    'cascavel': ['45'],
    'foz do iguaçu': ['45'],

    // Santa Catarina
    'florianópolis': ['48'],
    'joinville': ['47'],
    'blumenau': ['47'],
    'itajaí': ['47'],

    // Rio Grande do Sul
    'porto alegre': ['51'],
    'caxias do sul': ['54'],
    'pelotas': ['53'],
    'santa maria': ['55'],

    // Bahia
    'salvador': ['71'],
    'feira de santana': ['75'],
    'vitória da conquista': ['77'],

    // Pernambuco
    'recife': ['81'],
    'olinda': ['81'],
    'jaboatão dos guararapes': ['81'],
    'caruaru': ['81'],
    'petrolina': ['87'],

    // Ceará
    'fortaleza': ['85'],
    'juazeiro do norte': ['88'],

    // Outros
    'brasília': ['61'],
    'goiânia': ['62'],
    'cuiabá': ['65'],
    'campo grande': ['67'],
    'manaus': ['92'],
    'belém': ['91'],
    'maceió': ['82'],
    'natal': ['84'],
    'terezina': ['86'],
    'joão pessoa': ['83'],
    'aracaju': ['79'],
    'porto velho': ['69'],
    'rio branco': ['68'],
    'macapá': ['96'],
    'boa vista': ['95'],
    'palmas': ['63']
};

/**
 * Retorna os DDDs válidos para uma determinada cidade
 * @param {string} cidade 
 * @returns {string[]} Lista de DDDs ou array vazio se não encontrar
 */
function obterDDDsDaCidade(cidade) {
    if (!cidade) return [];

    const cidadeLimpa = cidade.toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos

    // Busca exata ou que contenha o nome
    for (const [key, ddds] of Object.entries(dddMap)) {
        const keyLimpa = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (cidadeLimpa.includes(keyLimpa) || keyLimpa.includes(cidadeLimpa)) {
            return ddds;
        }
    }

    return [];
}

/**
 * Valida se um telefone pertence ao DDD da cidade
 * @param {string} telefone Telefone formatado (ex: 55119...)
 * @param {string[]} dddsValidos Lista de DDDs permitidos
 * @returns {boolean}
 */
function validarDDD(telefone, dddsValidos) {
    if (!dddsValidos || dddsValidos.length === 0) return true; // Se não temos referência, aceitamos

    if (!telefone || telefone.length < 4) return false;

    // Extrai o DDD (posições 2 e 3 do 55119...)
    const dddLead = telefone.substring(2, 4);

    // Validação especial: Se for do estado de SP (começa com 1), aceitamos se o DDD for 1X
    if (dddsValidos[0].startsWith('1')) {
        return dddLead.startsWith('1');
    }

    return dddsValidos.includes(dddLead);
}

module.exports = {
    obterDDDsDaCidade,
    validarDDD
};
