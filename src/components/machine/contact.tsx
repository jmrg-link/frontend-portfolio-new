/**
 * Botonera final de contacto: el formulario de consulta junto al correo
 * directo y las teclas de canal (GitHub, LinkedIn, Manfred). El envío lo
 * resuelve una Server Action del propio Next: el backend todavía no expone
 * `POST /contact`.
 */
import { getTranslations } from 'next-intl/server';
import type { SiteSettings } from '@/lib/api/queries';
import { PanelSection } from './primitives';
import { ContactForm } from './contact-form';

/**
 * Tecla de canal: enlace externo con etiqueta serigrafiada.
 */
function ChannelKey({ href, name }: { href: string; name: string }) {
  return (
    <a
      href={href}
      rel="noreferrer noopener"
      target="_blank"
      className="plate-label rounded-xs border border-groove bg-panel-raised px-3 py-2 transition-colors hover:border-led hover:text-led-ink active:translate-y-px"
    >
      {name}
    </a>
  );
}

export async function ContactKeypad({
  settings,
  title,
}: {
  settings: SiteSettings | null;
  title: string;
}) {
  const t = await getTranslations();
  if (!settings) return null;

  return (
    <PanelSection id="contact" title={title} sideLabel="BOTONERA">
      <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-14">
        <aside className="flex h-fit flex-col gap-7 rounded-md border border-groove bg-panel-raised p-6 shadow-[var(--shadow-drop)]">
          <div>
            <span className="plate-label">{t('contact.direct')}</span>
            <a
              href={`mailto:${settings.email}`}
              className="mt-2 flex min-h-6 items-center font-spec text-sm break-all text-led-ink tracking-wider hover:underline"
            >
              {settings.email}
            </a>
          </div>
          <div>
            <span className="plate-label">{t('contact.channels')}</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {settings.github ? <ChannelKey href={settings.github} name="GitHub" /> : null}
              {settings.linkedin ? <ChannelKey href={settings.linkedin} name="LinkedIn" /> : null}
              {settings.manfred ? <ChannelKey href={settings.manfred} name="Manfred" /> : null}
            </div>
          </div>
        </aside>

        <ContactForm
          labels={{
            firstName: t('contact.firstName'),
            lastName: t('contact.lastName'),
            email: t('contact.email'),
            phone: t('contact.phone'),
            message: t('contact.message'),
            messagePlaceholder: t('contact.messagePlaceholder'),
            submit: t('contact.submit'),
            sending: t('contact.sending'),
            requiredNote: t('contact.requiredNote'),
            success: t('contact.success'),
            verification: t('contact.verification'),
            awaitingVerification: t('contact.awaitingVerification'),
          }}
        />
      </div>
    </PanelSection>
  );
}
