'use server';

import { headers } from 'next/headers';

/**
 * Envío del formulario de contacto. Vive en el propio Next y no en el backend
 * porque su API es privada con Bearer: llamarla desde el navegador exigiría un
 * token en el cliente, y hacerlo desde aquí evita además el CORS. Cuando el
 * backend exponga `POST /contact`, esta acción se reapunta y la interfaz no
 * cambia.
 *
 * Toda la defensa vive dentro de la acción, no en la interfaz: una Server
 * Action es un endpoint POST alcanzable por cualquiera que reproduzca la
 * petición.
 */

export type ContactState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  errors?: Partial<Record<'firstName' | 'lastName' | 'email' | 'phone' | 'message', string[]>>;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Campos del formulario ya normalizados a string. El tipo es cerrado a
 * propósito: un `Record<string, string>` abierto convierte cada acceso en
 * `string | undefined` bajo `noUncheckedIndexedAccess`, y estos campos son
 * exactamente estos cinco.
 */
type ContactFields = Record<'firstName' | 'lastName' | 'email' | 'phone' | 'message', string>;

/**
 * Valida los campos del formulario en el servidor. La validación del navegador
 * es comodidad, no garantía: cualquiera puede saltársela.
 *
 * @param data - Campos recibidos del formulario.
 * @returns Errores por campo; vacío cuando todo es válido.
 */
function validate(data: ContactFields): ContactState['errors'] {
  const errors: ContactState['errors'] = {};
  if (data.firstName.trim().length < 2) {
    errors.firstName = ['Indica tu nombre'];
  }
  if (!EMAIL_PATTERN.test(data.email)) {
    errors.email = ['Revisa el correo'];
  }
  if (data.message.trim().length < 10) {
    errors.message = ['Cuéntame algo más'];
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
}

/**
 * Comprueba el token de Turnstile contra Cloudflare, el mismo flujo que usaba
 * el sitio desplegado: `siteverify` con el secreto, el token y la IP del
 * visitante. Sin `TURNSTILE_SECRET_KEY` configurada la comprobación se omite,
 * para que el formulario siga siendo usable en desarrollo.
 *
 * @param token - Valor de `cf-turnstile-response` enviado por el widget.
 * @param ip - IP del visitante, si el proxy la aporta.
 * @returns `ok`, o el motivo cuando Cloudflare rechaza el token.
 */
async function verifyTurnstile(
  token: string | null,
  ip: string | null,
): Promise<'ok' | 'expired' | 'invalid'> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return 'ok';
  if (!token) return 'invalid';

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  const data = (await res.json()) as {
    success?: boolean;
    'error-codes'?: string[];
  };
  if (data.success === true) return 'ok';
  return data['error-codes']?.includes('timeout-or-duplicate') ? 'expired' : 'invalid';
}

/**
 * Entrega el mensaje por la API de Mailtrap, como hacía el sitio desplegado
 * (mismo remite/destino y mismo formato de asunto). Sin `MAILTRAP_TOKEN` o
 * `CONTACT_EMAIL_TO` se registra en el log y se responde éxito: el mock de
 * desarrollo del sitio viejo, conservado a propósito.
 *
 * @param data - Campos ya validados del formulario.
 * @returns `true` si Mailtrap aceptó el envío (o no hay envío configurado).
 */
async function deliverEmail(data: ContactFields): Promise<boolean> {
  const token = process.env.MAILTRAP_TOKEN;
  const to = process.env.CONTACT_EMAIL_TO;
  if (!token || !to) {
    console.info('[contacto] envío simulado (sin MAILTRAP_TOKEN/CONTACT_EMAIL_TO)', {
      email: data.email,
    });
    return true;
  }

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');
  const lines = [
    `Nombre: ${fullName}`,
    `Email: ${data.email}`,
    data.phone ? `Teléfono: ${data.phone}` : null,
    '',
    data.message,
  ].filter((line) => line !== null);

  const res = await fetch('https://send.api.mailtrap.io/api/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: { email: to, name: 'Portfolio Contact Form' },
      to: [{ email: to }],
      reply_to: { email: data.email },
      subject: `[Portfolio] Nuevo mensaje de ${fullName}`,
      text: lines.join('\n'),
      category: 'contact-form',
    }),
    cache: 'no-store',
  });
  return res.ok;
}

/**
 * Procesa el envío: descarta bots, valida, y entrega el mensaje. Devuelve el
 * error como estado en vez de lanzarlo, que es lo que React recomienda para
 * acciones de formulario.
 *
 * @param _previous - Estado anterior, que esta acción no necesita.
 * @param formData - Campos del formulario.
 * @returns Estado de la operación para la interfaz.
 */
export async function submitContact(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const honeypot = String(formData.get('company') ?? '');
  if (honeypot.trim() !== '') {
    return { status: 'success' };
  }

  const data = {
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    message: String(formData.get('message') ?? ''),
  };

  const errors = validate(data);
  if (errors) {
    return { status: 'error', errors };
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  const verdict = await verifyTurnstile(formData.get('cf-turnstile-response') as string | null, ip);
  if (verdict === 'expired') {
    return {
      status: 'error',
      message: 'La verificación caducó. Vuelve a intentarlo.',
    };
  }
  if (verdict === 'invalid') {
    return { status: 'error', message: 'No se pudo verificar la solicitud.' };
  }

  const delivered = await deliverEmail(data);
  if (!delivered) {
    return { status: 'error', message: 'No se pudo enviar el mensaje.' };
  }
  return { status: 'success' };
}
