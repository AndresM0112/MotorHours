import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import duration from "dayjs/plugin/duration";
import customParseFormat from "dayjs/plugin/customParseFormat";

// Configurar los plugins de dayjs
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(duration);
dayjs.extend(customParseFormat);

const DEFAULT_TIMEZONE = "America/Bogota";
dayjs.tz.setDefault(DEFAULT_TIMEZONE);

const formatDate = (date, format = "YYYY-MM-DD") => dayjs(date).format(format);

const formatDateTime = (date, format = "YYYY-MM-DD HH:mm:ss") =>
  dayjs(date).format(format);

const getCurrentDate = (format = "YYYY-MM-DD") => dayjs().format(format);

const getCurrentDateTime = (format = "YYYY-MM-DD HH:mm:ss") =>
  dayjs().format(format);

const convertToTimezone = (date, timezone = DEFAULT_TIMEZONE) =>
  dayjs(date).tz(timezone).format();

const isBefore = (date1, date2) => dayjs(date1).isBefore(date2);

const isAfter = (date1, date2) => dayjs(date1).isAfter(date2);

const isSame = (date1, date2, granularity = "day") =>
  dayjs(date1).isSame(date2, granularity);

const addTime = (date, amount, unit = "day") =>
  dayjs(date).add(amount, unit).format();

const subtractTime = (date, amount, unit = "day") =>
  dayjs(date).subtract(amount, unit).format();

const calculateDuration = (startDate, endDate, unit = "seconds") =>
  dayjs(endDate).diff(dayjs(startDate), unit);

export default {
  formatDate,
  formatDateTime,
  getCurrentDate,
  getCurrentDateTime,
  convertToTimezone,
  isBefore,
  isAfter,
  isSame,
  addTime,
  subtractTime,
  calculateDuration,
  DEFAULT_TIMEZONE,
};
