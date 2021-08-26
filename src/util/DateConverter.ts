import dayjs from "dayjs";

export abstract class DateConverter {
  static parseDate(dateStr: string): Date {
    return dayjs(dateStr).toDate();
  }
  static formatDate(date: Date, formatStr: string): string {
    return dayjs(date).format(formatStr);
  }
}
