<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routes } from '../../router';
import BaseButton from '../ui/BaseButton.vue';

type AdminSection = 'inicio' | 'blog' | 'resenas' | 'citas';

const props = withDefaults(
    defineProps<{
        active?: AdminSection | '',
        appointmentsAvailable?: boolean
    }>(),
    {
        active: '',
        appointmentsAvailable: undefined
    }
);

const emit = defineEmits<{ logout: [] }>();

const appointmentsEnabled = computed(
    () => props.appointmentsAvailable ?? routes.some((route) => route.path === '/admin/citas')
);

const sections = computed(() => [
    { key: 'inicio' as const, label: 'Inicio', to: '/admin' },
    { key: 'blog' as const, label: 'Blog', to: '/admin/blog' },
    { key: 'resenas' as const, label: 'Reseñas', to: '/admin/resenas' },
    ...(appointmentsEnabled.value 
        ? [{ key: 'citas' as const, label: 'Citas', to: '/admin/citas' }] 
        : [])
]);
</script>

<template>
    <nav aria-label="Admin" class="border-b border-border bg-surface/60">
        <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 md:px-8">
            <RouterLink
                v-for="section in sections"
                :key="section.key"
                :to="section.to"
                :aria-current="active === section.key ? 'page' : undefined"
                :class="[
                    'min-h-9 rounded-md px-3 py-2 font-body text-sm font-medium transition-colors',
                    active === section.key 
                        ? 'bg-accent-satin/15 text-accent'
                        : 'text-text-muted hover:text-accent'
                ]"
            >
                {{ section.label }}
            </RouterLink>

            <span
                v-if="!appointmentsEnabled"
                aria-disabled
                class="min-h-9 rounded-md px-3 py-2 font-body text-sm text-text-muted/60"
            >
                Citas
            </span>

            <BaseButton type="button" variant="ghost" size="sm" class="ml-auto" @click="emit('logout')">
                Cerrar sesión
            </BaseButton>
        </div>
    </nav>
</template>