const { TourStatus } = require("../enum");

exports.getTourStatus = (tourInfo) => {
  const { startDate, endDate } = tourInfo;

  if (!startDate || !endDate) return TourStatus.PENDING;

  const today = new Date().setHours(0, 0, 0, 0);
  const start = _parseDate(startDate);
  const end = _parseDate(endDate);

  if (today < start) return TourStatus.PENDING;
  else if (today <= end) return TourStatus.DELIVERED;
  else return TourStatus.FINISHED;
};

exports.getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const date = today.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${date}`;
};

exports.checkTourIsFinished = (tourInfo) => {
  const { endDate, status } = tourInfo;

  if (status === TourStatus.FINISHED || !endDate) return true;

  const today = new Date().setHours(0, 0, 0, 0);
  const end = _parseDate(endDate);

  return today > end;
};

const _parseDate = (str) => {
  const [year, month, day] = str.split("-").map(Number);
  return new Date(year, month - 1, day);
};

exports.isDateBeforeToday = (date) => {
  if (!date) return true;
  const parts = date.split("-");
  if (parts.length !== 3) return true;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const inputDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);
  return inputDate < today;
};
