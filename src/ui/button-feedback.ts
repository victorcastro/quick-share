const SUCCESS_DURATION_MS = 1500;

const timers = new Map<HTMLButtonElement, number>();

export function showButtonSuccess(button: HTMLButtonElement): void {
  window.clearTimeout(timers.get(button));
  button.classList.remove('is-success');
  void button.offsetWidth;
  button.classList.add('is-success');
  timers.set(
    button,
    window.setTimeout(() => {
      button.classList.remove('is-success');
      timers.delete(button);
    }, SUCCESS_DURATION_MS),
  );
}
