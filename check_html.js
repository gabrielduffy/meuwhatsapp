const fs = require('fs');
const html = fs.readFileSync('gmaps_side_panel.html', 'utf8');
const phoneRegex = /phone:tel:(\+?\d+)/g;
let match;
console.log('--- BUSCANDO TELEFONES NO HTML ---');
while ((match = phoneRegex.exec(html)) !== null) {
    console.log('Encontrado item-id:', match[0]);
}

const telRegex = /tel:(\+?\d+)/g;
while ((match = telRegex.exec(html)) !== null) {
    console.log('Encontrado tel:', match[0]);
}

const textPhoneRegex = /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g;
while ((match = textPhoneRegex.exec(html)) !== null) {
    console.log('Encontrado texto:', match[0]);
}
