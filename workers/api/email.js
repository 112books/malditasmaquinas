/**
 * email.js — Template HTML compartit per a tots els correus
 *
 * Ús: emailHtml({ titol, contingut, cta_text, cta_url })
 *   contingut: HTML intern (paràgrafs, blockquotes, etc.)
 *   cta_text / cta_url: botó opcional al peu del contingut
 */

const BASE = 'https://malditasmaquinas.com';
const LOGO = `${BASE}/img/dimoni-roig-banyes-blanques.png`;

export function emailHtml({ titol = 'MalditasMaquinas', contingut = '', cta_text = '', cta_url = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(titol)}</title>
</head>
<body style="margin:0;padding:0;background:#0d0c0b;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0d0c0b;">
  <tr><td align="center" style="padding:2rem 1rem;">

    <table width="600" cellpadding="0" cellspacing="0" role="presentation"
      style="max-width:600px;width:100%;background:#181714;border-left:3px solid #bf3d08;">

      <!-- CAPÇALERA -->
      <tr>
        <td style="padding:1.5rem 2rem;border-bottom:1px solid #1e1c1a;">
          <a href="${BASE}" style="text-decoration:none;display:inline-block;vertical-align:middle;">
            <img src="${LOGO}" alt="" width="40" height="40"
              style="display:inline-block;vertical-align:middle;margin-right:.6rem;">
            <span style="vertical-align:middle;font-size:1.1rem;color:#e2ddd6;font-family:Georgia,'Times New Roman',serif;letter-spacing:-.01em;">
              Malditas<b>Maquinas</b>.
            </span>
          </a>
        </td>
      </tr>

      <!-- CONTINGUT -->
      <tr>
        <td style="padding:2rem;color:#e2ddd6;font-size:.95rem;line-height:1.7;">
          ${contingut}
        </td>
      </tr>

      ${cta_text && cta_url ? `
      <!-- CTA -->
      <tr>
        <td style="padding:0 2rem 2rem;">
          <a href="${cta_url}"
            style="display:inline-block;background:#e04d10;color:#e2ddd6;
                   text-decoration:none;padding:.85rem 2rem;
                   font-size:.85rem;font-family:'Courier New',monospace;
                   letter-spacing:.04em;">
            ${esc(cta_text)} →
          </a>
        </td>
      </tr>` : ''}

      <!-- PEU RGPD -->
      <tr>
        <td style="padding:1.25rem 2rem;border-top:1px solid #1e1c1a;
                   font-size:.72rem;color:#7a7570;line-height:1.65;">
          <p style="margin:0 0 .4rem;">
            Has rebut aquest correu perquè ets client de
            <a href="${BASE}" style="color:#e04d10;text-decoration:none;">MalditasMaquinas.com</a>.
          </p>
          <p style="margin:0 0 .4rem;">
            Responsable del tractament: Joan Martínez Serres · NIF 38121766W ·
            <a href="mailto:hola@malditasmaquinas.com" style="color:#e04d10;text-decoration:none;">hola@malditasmaquinas.com</a>
          </p>
          <p style="margin:0;">
            Pots exercir els teus drets RGPD (accés, rectificació, supressió) escrivint al correu anterior. ·
            <a href="${BASE}/privacitat/" style="color:#e04d10;text-decoration:none;">Política de privacitat</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/**
 * Versió admin (sense peu RGPD, per a notificacions internes)
 */
export function emailAdminHtml({ titol = 'MalditasMaquinas · Admin', contingut = '', cta_text = '', cta_url = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(titol)}</title>
</head>
<body style="margin:0;padding:0;background:#0d0c0b;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0d0c0b;">
  <tr><td align="center" style="padding:2rem 1rem;">

    <table width="600" cellpadding="0" cellspacing="0" role="presentation"
      style="max-width:600px;width:100%;background:#181714;border-left:3px solid #bf3d08;">

      <!-- CAPÇALERA -->
      <tr>
        <td style="padding:1.5rem 2rem;border-bottom:1px solid #1e1c1a;">
          <a href="${BASE}" style="text-decoration:none;display:inline-block;vertical-align:middle;">
            <img src="${LOGO}" alt="" width="40" height="40"
              style="display:inline-block;vertical-align:middle;margin-right:.6rem;">
            <span style="vertical-align:middle;font-size:1.1rem;color:#e2ddd6;font-family:Georgia,'Times New Roman',serif;">
              Malditas<b>Maquinas</b>. <span style="font-size:.8rem;color:#7a7570;">· Admin</span>
            </span>
          </a>
        </td>
      </tr>

      <!-- CONTINGUT -->
      <tr>
        <td style="padding:2rem;color:#e2ddd6;font-size:.95rem;line-height:1.7;">
          ${contingut}
        </td>
      </tr>

      ${cta_text && cta_url ? `
      <tr>
        <td style="padding:0 2rem 2rem;">
          <a href="${cta_url}"
            style="display:inline-block;background:#e04d10;color:#e2ddd6;
                   text-decoration:none;padding:.85rem 2rem;
                   font-size:.85rem;font-family:'Courier New',monospace;letter-spacing:.04em;">
            ${esc(cta_text)} →
          </a>
        </td>
      </tr>` : ''}

      <tr>
        <td style="padding:1rem 2rem;border-top:1px solid #1e1c1a;font-size:.7rem;color:#7a7570;">
          Notificació interna · MalditasMaquinas.com
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'MalditasMaquinas <hola@malditasmaquinas.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
