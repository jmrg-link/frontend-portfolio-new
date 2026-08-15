'use client';

/**
 * Formulario de contacto. El envío lo resuelve una Server Action, así que ni la
 * clave de Turnstile ni la del proveedor de correo salen del servidor y no hay
 * CORS de por medio. El estado de envío viaja por `useActionState`, que es el
 * patrón que documenta React 19 para acciones de formulario.
 *
 * La tecla de envío está bloqueada mientras Turnstile no haya emitido un token
 * —el motivo se dice en la región viva de al lado, porque un botón inerte y
 * mudo no se explica solo—. El token es de un solo uso: al enviar se descarta,
 * y el widget vuelve a emitir uno tras el `reset`. Sin sitekey configurada no
 * hay nada que esperar y la tecla queda libre, que es el modo de desarrollo.
 *
 * Accesibilidad: cada campo obligatorio lleva `required` y su marca en la
 * etiqueta —el asterisco solo no basta—, los errores se asocian con
 * `aria-describedby` y el resultado del envío se anuncia en una región viva.
 */
import { useActionState, useEffect, useRef, useState } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import type { ContactState } from '@/app/actions/contact';
import { submitContact } from '@/app/actions/contact';
import { PushButton } from './primitives';
import { useIsLightTheme } from './theme-toggle';

const INITIAL: ContactState = { status: 'idle' };

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Campo de texto del formulario como **ranura del panel**: sin caja, solo la
 * junta inferior fresada, que se enciende al recibir el foco y en el LED del
 * error. El indicador de foco lo pone el `:focus-visible` global de
 * `globals.css` —vive fuera de `@layer`, así que gana a cualquier utilidad de
 * Tailwind y no se intenta anular aquí—; la junta encendida lo acompaña.
 */
function Field({
  name,
  label,
  type = 'text',
  required,
  placeholder,
  errors,
  textarea,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  errors?: string[];
  textarea?: boolean;
}) {
  const errorId = `${name}-error`;
  const shared = {
    id: name,
    name,
    required,
    placeholder,
    'aria-describedby': errors?.length ? errorId : undefined,
    'aria-invalid': errors?.length ? (true as const) : undefined,
    className: `w-full border-b-2 bg-transparent px-1 py-2.5 text-sm text-silk transition-colors placeholder:text-silk-dim/60 focus:border-led ${
      errors?.length ? 'border-led' : 'border-groove'
    }`,
  };

  return (
    <p className="flex flex-col gap-2">
      <label htmlFor={name} className="plate-label">
        {label}
        {required ? <span className="ml-1 text-led-ink">*</span> : null}
      </label>
      {textarea ? <textarea {...shared} rows={4} /> : <input {...shared} type={type} />}
      {errors?.length ? (
        <span id={errorId} className="text-xs text-led-ink">
          {errors[0]}
        </span>
      ) : null}
    </p>
  );
}

export type ContactFormLabels = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  messagePlaceholder: string;
  submit: string;
  sending: string;
  requiredNote: string;
  success: string;
  verification: string;
  awaitingVerification: string;
};

export function ContactForm({ labels }: { labels: ContactFormLabels }) {
  const [state, formAction, pending] = useActionState(submitContact, INITIAL);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const isLight = useIsLightTheme();
  const [verified, setVerified] = useState(false);
  const locked = Boolean(TURNSTILE_SITE_KEY) && !verified;

  useEffect(() => {
    if (state.status !== 'idle') turnstileRef.current?.reset();
  }, [state]);

  return (
    <form action={formAction} onSubmit={() => setVerified(false)} className="w-full max-w-2xl">
      {/* Campo señuelo: un bot lo rellena, una persona no lo ve ni lo enfoca. */}
      <p className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="firstName"
          label={labels.firstName}
          required
          errors={state.errors?.firstName}
        />
        <Field name="lastName" label={labels.lastName} errors={state.errors?.lastName} />
        <Field
          name="email"
          label={labels.email}
          type="email"
          required
          errors={state.errors?.email}
        />
        <Field name="phone" label={labels.phone} type="tel" errors={state.errors?.phone} />
      </div>

      <div className="mt-5">
        <Field
          name="message"
          label={labels.message}
          placeholder={labels.messagePlaceholder}
          required
          textarea
          errors={state.errors?.message}
        />
      </div>

      {TURNSTILE_SITE_KEY ? (
        <div className="mt-8">
          <span className="plate-label">{labels.verification}</span>
          <div className="mt-3 w-fit rounded-xs border border-groove bg-panel-raised p-2 shadow-[var(--shadow-drop)]">
            <Turnstile
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              options={{ action: 'contact', theme: isLight ? 'light' : 'dark' }}
              onSuccess={() => setVerified(true)}
              onExpire={() => setVerified(false)}
              onError={() => setVerified(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <PushButton type="submit" disabled={pending || locked} glint={false}>
          {pending ? labels.sending : labels.submit}
        </PushButton>
        <p aria-live="polite" className="text-sm text-silk-dim">
          {state.status === 'success' ? (
            <span className="text-led-ink">{labels.success}</span>
          ) : state.status === 'error' && state.message ? (
            <span className="text-led-ink">{state.message}</span>
          ) : locked ? (
            labels.awaitingVerification
          ) : (
            labels.requiredNote
          )}
        </p>
      </div>
    </form>
  );
}
