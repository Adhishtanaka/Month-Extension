export function debounce(func: Function, delay: number = 5000): Function {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => func(...args), delay);
  };
}

export function getLocalToday(): string {
  const utcNow = new Date();
  const timezoneOffset = utcNow.getTimezoneOffset();
  const now = new Date(utcNow.getTime() - (timezoneOffset * 60000));
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); 
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
