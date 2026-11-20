import { defineStore } from 'pinia'

export interface ContactForm {
  name: string
  email: string
  phone: string
  message: string
}

export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

const emptyForm = (): ContactForm => ({ name: '', email: '', phone: '', message: '' })

export const useBookingStore = defineStore('booking', {
  state: () => ({
    selectedServiceId: null as string | null,
    form: emptyForm(),
    errors: {} as Partial<Record<keyof ContactForm, string>>,
    status: 'idle' as SubmitStatus,
    feedback: ''
  }),
  actions: {
    selectService(id: string) {
      this.selectedServiceId = id
    },
    clearService() {
      this.selectedServiceId = null
    },
    setField(field: keyof ContactForm, value: string) {
      this.form[field] = value
      delete this.errors[field]
    },
    setErrors(errors: Partial<Record<keyof ContactForm, string>>) {
      this.errors = errors
    },
    setStatus(status: SubmitStatus, feedback = '') {
      this.status = status
      this.feedback = feedback
    },
    clearFields() {
      this.form = emptyForm()
      this.errors = {}
    },
    reset() {
      this.selectedServiceId = null
      this.form = emptyForm()
      this.errors = {}
      this.status = 'idle'
      this.feedback = ''
    }
  }
})
