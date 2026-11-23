import { defineStore } from 'pinia'
import type { ScheduleSlot } from '../types/appointments'

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
    feedback: '',
    selectedSlot: null as ScheduleSlot | null,
    slotError: ''
  }),
  actions: {
    selectService(id: string) {
      this.selectedServiceId = id
    },
    clearService() {
      this.selectedServiceId = null
    },
    selectSlot(slot: ScheduleSlot) {
      this.selectedSlot = slot
      this.slotError = ''
    },
    clearSlot() {
      this.selectedSlot = null
    },
    setSlotError(message = '') {
      this.slotError = message
      if (message) this.selectedSlot = null
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
      this.selectedSlot = null
      this.slotError = ''
    }
  }
})
