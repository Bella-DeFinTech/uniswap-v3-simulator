export function getDate(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0,
  millisecond: number = 0
): Date {
  let date = new Date();
  date.setFullYear(year, month - 1, day);
  date.setHours(hour, minute, second, millisecond);
  return date;
}

export function getYesterday(date: Date): Date {
  return new Date(date.getTime() - 24 * 60 * 60 * 1000);
}

export function getTomorrow(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

export function format(date: Date, fmt: string): string {
  type template = {
    "M+": number;
    "d+": number;
    "H+": number;
    "m+": number;
    "s+": number;
    "q+": number;
    S: number;
  };
  var o: template = {
    "M+": date.getMonth() + 1,
    "d+": date.getDate(),
    "H+": date.getHours(),
    "m+": date.getMinutes(),
    "s+": date.getSeconds(),
    "q+": Math.floor((date.getMonth() + 3) / 3),
    S: date.getMilliseconds(),
  };
  if (/(y+)/.test(fmt))
    fmt = fmt.replace(
      RegExp.$1,
      (date.getFullYear() + "").substr(4 - RegExp.$1.length)
    );
  let k: keyof template;
  for (k in o)
    if (new RegExp("(" + k + ")").test(fmt))
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1
          ? "" + o[k]
          : ("00" + o[k]).substr(("" + o[k]).length)
      );
  return fmt;
}
