export type ServiceOrnamentName = 'golden-ratio-1' | 'golden-ratio-2' | 'divider-3' | 'regenerative' | 'regressive' | 'healing' | 'divider-2' | 'divider-1'

export function serviceOrnament(icon: string): ServiceOrnamentName {
  if (icon === 'golden-ratio-01') return 'golden-ratio-1'
  if (icon === 'golden-ratio-02') return 'golden-ratio-2'
  if (icon === 'regenerative') return 'regenerative'
  if (icon === 'regressive') return 'regressive'
  if (icon === 'healing') return 'healing'
  if (icon === 'divider-2') return 'divider-2'
  if (icon === 'divider-1') return 'divider-1'
  return 'divider-3'
}
