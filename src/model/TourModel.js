module.exports.TourInfo = Object.freeze({
  createdAt: new Date().getTime(),

  breedType: "", // use to get suggested dailyPrice
  dogId: "", // link to dog uid
  dogName: "",
  sex: 0,
  desex: false,
  weight: 0,
  dailyPrice: 0,
  ownerId: "", // link to owner uid
  ownerName: "",
  isFromWx: false,
  wxId: "",
  finished: false, // value to determine if tour is finished or not - picked up
  startDate: new Date(),
  endDate: new Date(),
  notes: [], // additional information
});
