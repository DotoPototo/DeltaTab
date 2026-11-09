import { shallowRef } from 'vue';

// A modal makes everything outside it inert, top layer or not, so toasts with Undo render inside the top one.
export const openModals = shallowRef<HTMLElement[]>([]);

export const pushModal = (el: HTMLElement) => (openModals.value = [...openModals.value.filter((m) => m !== el), el]);
export const removeModal = (el: HTMLElement) => (openModals.value = openModals.value.filter((m) => m !== el));
