// WAI-ARIA radio pattern; give each radio `:tabindex="checked ? 0 : -1"`.
const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export const onRadioKeydown = (event: KeyboardEvent) => {
  const radios = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="radio"]:not(:disabled)')];
  const index = radios.indexOf(document.activeElement as HTMLElement);
  if (index < 0) return;
  let target: number;
  if (event.key === 'Home') target = 0;
  else if (event.key === 'End') target = radios.length - 1;
  else if (event.key in STEPS) target = (index + STEPS[event.key]! + radios.length) % radios.length;
  else return;
  event.preventDefault();
  radios[target]!.click();
  radios[target]!.focus();
};
