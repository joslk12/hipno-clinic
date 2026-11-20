export interface ProfilePillar {
  title: string
  description: string
}

export const profile = {
  name: 'Maricela Aguilar Enríquez',
  role: 'Especialista en Hipnosis Regresiva y Regenerativa',
  summary:
    'Acompaño procesos de transformación profunda para comprender el origen de los patrones, liberar cargas emocionales y recuperar el equilibrio.',
  history:
    'Maricela Aguilar Enríquez es especialista en hipnosis regresiva y regenerativa, con certificaciones en hipnosis clínica y acompañamiento emocional. Su trayectoria combina formación profesional, práctica clínica y un enfoque profundo del bienestar. Acompaña a personas que buscan comprender el origen de sus patrones, liberar cargas emocionales y recuperar su equilibrio.',
  philosophy:
    'La hipnosis clínica es una herramienta de transformación profunda: permite acceder a la raíz de aquello que limita, integrar la experiencia y abrir espacio para nuevas formas de sentir y vivir.',
  pillars: [
    {
      title: 'Empatía y Entorno Seguro',
      description:
        'Un espacio confidencial, libre de juicios y cuidado en cada etapa del proceso.'
    },
    {
      title: 'Enfoque Regenerativo Holístico',
      description:
        'Integra mente, emoción y energía para favorecer una transformación sostenible.'
    },
    {
      title: 'Resultados Orientados al Bienestar Integral',
      description:
        'Objetivos claros y acompañamiento respetuoso para recuperar el equilibrio y la tranquilidad.'
    }
  ] satisfies ProfilePillar[]
} as const
