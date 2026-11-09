import { ref } from 'vue';

const open = ref(false);
const settingsOpen = ref(false);
const settingsSection = ref<string>();
const previewingLook = ref(false);

const openSettings = (section?: string) => {
  settingsSection.value = section;
  settingsOpen.value = true;
};

export const useShell = () => ({
  open,
  settingsOpen,
  settingsSection,
  previewingLook,
  toggle: () => {
    open.value = !open.value;
  },
  openSettings,
  previewLook: () => {
    previewingLook.value = true;
    settingsOpen.value = false;
  },
  endLookPreview: () => {
    previewingLook.value = false;
    openSettings('background');
  },
});
