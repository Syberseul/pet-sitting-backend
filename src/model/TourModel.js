module.exports.TourInfo = Object.freeze({
  createdAt: new Date().getTime(),

  breedType: "", // use to get suggested dailyPrice
  dogId: "", // link to dog uid
  dogName: "",
  weight: 0,
  dailyPrice: 0,
  ownerId: "", // link to owner uid
  ownerName: "",
  isFromWx: false,
  wxId: "",
  startDate: new Date(),
  endDate: new Date(),
  notes: [], // additional information
});
