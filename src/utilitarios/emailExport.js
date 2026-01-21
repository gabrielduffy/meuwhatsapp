/**
 * Utilitário para exportar a estrutura JSON do Email Builder para HTML compatível com provedores de e-mail.
 */

function exportHtml(blocks) {
    const content = blocks.map(block => renderBlock(block)).join('');

    return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Email</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style type="text/css">
        body { margin: 0; padding: 0; min-width: 100%; font-family: sans-serif; }
        .content { width: 100%; max-width: 600px; }
        @media screen and (max-width: 600px) {
            .content { width: 100% !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#ffffff">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" class="content" style="border-collapse: collapse;">
                    ${content}
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

function renderBlock(block) {
    const { type, content, styles } = block;

    // Converte estilos JSON para CSS Inline
    const inlineStyle = Object.entries(styles || {}).map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        const cssValue = typeof value === 'number' && !['lineHeight', 'opacity', 'zIndex'].includes(key) ? `${value}px` : value;
        return `${cssKey}: ${cssValue};`;
    }).join(' ');

    const wrapperStyle = `padding: ${styles?.paddingTop || 0}px ${styles?.paddingRight || 0}px ${styles?.paddingBottom || 0}px ${styles?.paddingLeft || 0}px;`;

    switch (type) {
        case 'text':
            return `
                <tr>
                    <td style="${wrapperStyle} ${inlineStyle}">
                        ${content.html}
                    </td>
                </tr>
            `;
        case 'image':
            return `
                <tr>
                    <td align="${styles?.textAlign || 'center'}" style="${wrapperStyle}">
                        <a href="${content.link || '#'}" target="_blank" style="text-decoration: none;">
                            <img src="${content.url}" alt="${content.alt || ''}" width="100%" style="display: block; border: 0; ${inlineStyle}" />
                        </a>
                    </td>
                </tr>
            `;
        case 'button':
            return `
                <tr>
                    <td align="${styles?.textAlign || 'center'}" style="${wrapperStyle}">
                        <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate;">
                            <tr>
                                <td align="center" bgcolor="${styles?.backgroundColor || '#000000'}" style="border-radius: ${styles?.borderRadius || 0}px;">
                                    <a href="${content.url}" target="_blank" style="display: inline-block; padding: 12px 24px; color: ${styles?.color || '#ffffff'}; text-decoration: none; font-weight: bold; font-family: sans-serif; ${inlineStyle}">
                                        ${content.text}
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            `;
        case 'divider':
            return `
                <tr>
                    <td style="${wrapperStyle}">
                        <hr style="border: none; border-top: ${content.height || 1}px solid ${content.color || '#e2e8f0'}; margin: 0;" />
                    </td>
                </tr>
            `;
        case 'spacer':
            return `<tr><td height="${styles?.paddingTop || 20}" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>`;
        case 'video':
            return `
                <tr>
                    <td align="center" style="${wrapperStyle}">
                        <a href="${content.url}" target="_blank" style="position: relative; display: block; text-decoration: none;">
                            <img src="${content.thumbnail}" width="100%" style="display: block; border: 0; ${inlineStyle}" />
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                                <!-- Placeholder for Play Icon -->
                                <div style="width: 60px; height: 60px; background: rgba(0,0,0,0.6); border-radius: 50%; border: 2px solid white;"></div>
                            </div>
                        </a>
                    </td>
                </tr>
            `;
        case 'header':
            return `
                <tr>
                    <td style="${wrapperStyle} border-bottom: 1px solid #f1f5f9;">
                         <table width="100%">
                            <tr>
                                <td>${content.logoUrl ? `<img src="${content.logoUrl}" height="30" />` : ''}</td>
                                <td align="right"><h1 style="margin: 0; font-size: 18px; ${inlineStyle}">${content.title}</h1></td>
                            </tr>
                         </table>
                    </td>
                </tr>
            `;
        case 'footer':
            return `
                 <tr>
                    <td align="center" style="${wrapperStyle} border-top: 1px solid #eeeeee;">
                        <p style="font-size: 12px; color: #999999;">${content.companyName || 'Sua Empresa'} &copy; 2026</p>
                        <p style="font-size: 10px;">
                            <a href="#" style="color: #0000ee;">Unsubscribe</a> | <a href="#" style="color: #0000ee;">Preferências</a>
                        </p>
                    </td>
                </tr>
            `;
        default:
            return '';
    }
}

module.exports = { exportHtml };
