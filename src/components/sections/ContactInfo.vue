<script setup lang="ts">
import { contact, whatsappUrl } from '../../content/contact'
import BrandIcon from '../ui/BrandIcon.vue'
</script>

<template>
  <div>
    <h2 class="font-display text-2xl font-semibold text-accent">Contacto directo</h2>
    <address class="mt-5 not-italic">
      <ul class="space-y-4 font-body text-sm">
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
            :href="`mailto:${contact.email}`"
            :aria-label="`Enviar correo a ${contact.email}`"
            class="inline-flex items-center gap-3 text-text transition-colors hover:text-accent"
          >
            <BrandIcon name="mail" decorative class="h-5 w-5" />
            {{ contact.email }}
          </a>
        </li>
        <li class="flex items-center gap-3 text-text-muted">
          <BrandIcon name="map-pin" decorative class="h-5 w-5" />
          {{ contact.location }}
        </li>
      </ul>
    </address>
  </div>
</template>
