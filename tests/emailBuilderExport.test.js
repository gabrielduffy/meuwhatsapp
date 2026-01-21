const { exportHtml } = require('../src/utilitarios/emailExport');

describe('Email Builder HTML Export', () => {
    it('should generate valid container HTML with basic styles', () => {
        const blocks = [];
        const html = exportHtml(blocks);

        expect(html).toContain('<table');
        expect(html).toContain('width="100%"');
        expect(html).toContain('bgcolor="#ffffff"');
    });

    it('should correctly render a TEXT block', () => {
        const blocks = [
            {
                type: 'text',
                content: { html: '<h1>Olá Mundo</h1>' },
                styles: { color: '#ff0000', fontSize: 20, textAlign: 'center' }
            }
        ];
        const html = exportHtml(blocks);

        expect(html).toContain('Olá Mundo');
        expect(html).toContain('color: #ff0000');
        expect(html).toContain('font-size: 20px');
        expect(html).toContain('text-align: center');
    });

    it('should correctly render a BUTTON block', () => {
        const blocks = [
            {
                type: 'button',
                content: { text: 'Clique Aqui', url: 'https://google.com' },
                styles: { backgroundColor: '#8b5cf6', color: '#ffffff', borderRadius: 10 }
            }
        ];
        const html = exportHtml(blocks);

        expect(html).toContain('Clique Aqui');
        expect(html).toContain('href="https://google.com"');
        expect(html).toContain('background-color: #8b5cf6');
        expect(html).toContain('border-radius: 10px');
    });

    it('should render a VIDEO block as a linked image (standard email practice)', () => {
        const blocks = [
            {
                type: 'video',
                content: { url: 'https://youtube.com/watch?v=123', thumbnail: 'https://img.youtube.com/vi/123/0.jpg' },
                styles: {}
            }
        ];
        const html = exportHtml(blocks);

        expect(html).toContain('href="https://youtube.com/watch?v=123"');
        expect(html).toContain('src="https://img.youtube.com/vi/123/0.jpg"');
    });
});
