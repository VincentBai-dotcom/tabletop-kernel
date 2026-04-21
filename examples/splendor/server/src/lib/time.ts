export function subtractMilliseconds(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() - milliseconds);
}
