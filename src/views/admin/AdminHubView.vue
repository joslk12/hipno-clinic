<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AdminLogin from '@/components/admin/AdminLogin.vue';
import AdminNav from '@/components/admin/AdminNav.vue';
import { usePageMeta } from '@/composables/usePageMeta';
import { routes } from '@/router';
import { AdminBlogApiError, getSession, logout } from '@/services/adminBlog';

usePageMeta({
    title: 'Panel de administración | Origen Consciente',
    description: 'Área privada para administrar el blog, las reseñas y las citas.',
    path: '/admin',
    robots: 'noindex, nofollow'
});

const checking = ref(true);
const authenticated = ref(false);
const error = ref('');

const appointmentsAvailable = computed(() => 
    routes.some((route) => route.path === '/admin/citas')
);

async function checkSession() {
    checking.value = true;

    try {
        await getSession();
        handleAuthenticated();
    } catch(caught) {
        if (caught instanceof AdminBlogApiError && caught.status === 401) {
            authenticated.value = false;
        } else {
            error.value = caught instanceof AdminBlogApiError
                ? caught.message
                : 'No pudimos verificar la sesión'
        }
    } finally {
        checking.value = false;
    }
}

function handleAuthenticated() {
    authenticated.value = true;
    error.value = '';
}

async function handleLogout() {
    try {
        await logout()
    } finally {
        authenticated.value = false;
    }
}

onMounted(checkSession);
</script>

<template>
    <div>
        <div>
            <div v-if="error" class="mx-auto max-w-6xl px-4 pt-6 md:px-8">
                <div class="rounded-xl border border-red-500/40 bg-red-500/10" role="alert">
                    <p class="font-body text-sm text-red-500">{{ error }}</p>
                </div>
            </div>
        </div>

        <div v-if="checking"
            class="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center px-4 font-body text-sm text-text-muted"
            role="status"
            aria-live="polite"
        >
            Verificando Sesión
        </div>

        <AdminLogin v-else-if="!authenticated" @authenticated="handleAuthenticated" />

        <template v-else>
            <AdminNav active="inicio" @logout="handleLogout" />

            <div class="mx-auto mx-w-6xl px-4 py-12 md:px-8">
                <p class="font-body text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                    Administración
                </p>
                <h1 class="mt-1 font-display text-3xl font-semibold text-accent">
                    Panel de Administración
                </h1>
                <p class="mt-3 font-body text-sm text-text-muted">
                    Elige una sección para continuar. Todas usan la misma sesión.
                </p>

                <ul class="mt-8 grid gap-4 md:grid-cols-3">
                    <li>
                        <RouterLink 
                            to="/admin/blog"
                            class="block h-full rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent"
                        >
                            <h2 class="font-display text-xl font-semibold text-accent">Blog</h2>
                            <p class="mt-2 font-body text-sm text-text-muted">Crea, edita y publica artículos.</p>
                        </RouterLink>
                    </li>
                    <li>
                        <RouterLink 
                            to="/admin/resenas"
                            class="block h-full rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent"
                        >
                            <h2 class="font-display text-xl font-semibold text-accent">Reseñas</h2>
                            <p class="mt-2 font-body text-sm text-text-muted">Registra clientes y envía ligas privadas.</p>
                        </RouterLink>
                    </li>
                    <li>
                        <RouterLink
                            v-if="appointmentsAvailable"
                            to="/admin/citas"
                            class="block h-full rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent"
                        >
                            <h2 class="font-display text-xl font-semibold text-accent">Citas</h2>
                            <p class="mt-2 font-body text-sm text-text-muted">
                                Administra disponibilidad y reservas.
                            </p>
                        </RouterLink>
                        <div
                            v-else
                            aria-disabled="true"
                            class="block h-full rounded-xl border border-border bg-surface-alt p-6 opacity-70"
                        >
                            <h2 class="font-display text-xl font-semibold text-accent">Citas</h2>
                            <p class="mt-2 font-body text-sm text-text-muted">Próximamente.</p>
                        </div>
                    </li>
                </ul>
            </div>
        </template>
    </div>
</template>