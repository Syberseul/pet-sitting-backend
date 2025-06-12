const { TourStatus } = require("../enum");

exports.getTourStatus = (tourInfo) => {
  const { startDate, endDate } = tourInfo;

  if (!startDate || !endDate) return TourStatus.PENDING;

  const _parseDate = (str) => {
    const [year, month, day] = str.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

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
