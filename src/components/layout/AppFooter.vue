<script setup lang="ts">
import { contact, mapsUrl, whatsappUrl } from '../../content/contact'
import BrandIcon from '../ui/BrandIcon.vue'
import BrandLogo from '../ui/BrandLogo.vue'
</script>

<template>
  <footer class="border-t border-border bg-surface">
    <div class="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 md:px-8">
      <div>
        <RouterLink to="/" aria-label="Origen Consciente, ir al inicio">
          <BrandLogo variant="minimal" loading="lazy" class="h-24 w-auto" />
        </RouterLink>
        <p class="mt-4 max-w-md font-accent text-lg italic text-text-muted">
          {{ contact.tagline }}
        </p>
      </div>

      <div>
        <h2 class="font-display text-xl font-semibold text-accent">Contacto</h2>
        <address class="mt-4 not-italic">
          <ul class="space-y-3 font-body text-sm">
            <li>
              <a
                :href="contact.phoneHref"
                :aria-label="`Llamar al ${contact.phoneDisplay}`"
                class="inline-flex items-center gap-3 text-text transition-colors hover:text-accent"
              >
                <BrandIcon name="phone" decorative class="h-5 w-5" />
                {{ contact.phoneDisplay }}
              </a>
            </li>
            <li>
              <a
                :href="`mailto:${contact.email}`"
                :aria-label="`Enviar correo a ${contact.email}`"
                class="inline-flex items-center gap-3 text-text transition-colors hover:text-accent"
              >
                <BrandIcon name="mail" decorative class="h-5 w-5" />
                {{ contact.email }}
              </a>
            </li>
            <li>
              <a
                :href="whatsappUrl()"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escríbenos por WhatsApp"
                class="inline-flex items-center gap-3 text-text transition-colors hover:text-accent"
              >
                <BrandIcon name="whatsapp" decorative class="h-5 w-5" />
                WhatsApp
              </a>
            </li>
            <li>
              <a
                :href="mapsUrl()"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="`${contact.location} — Ver en Google Maps`"
                class="inline-flex items-center gap-3 text-text-muted transition-colors hover:text-accent"
              >
                <BrandIcon name="map-pin" decorative class="h-5 w-5 shrink-0" />
                {{ contact.location }}
              </a>
            </li>
          </ul>
        </address>
      </div>
    </div>
  </footer>
</template>
