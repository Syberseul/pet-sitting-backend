module.exports.DogFormData = {
  breedType: "",
  dogName: "",
  weight: "",
  dailyPrice: 0,
  ownerName: "",
  contactNo: "",
  startDate: "",
  endDate: "",
  breedName: "",
  notes: [],
  sex: 0, // 0 - unknown, 1 - male, 2 - female
  desex: false,
};

module.exports.TourListData = {
  startDate: "",
  endDate: "",
  dailyPrice: 0,
  weight: "",
};

module.exports.DogInfo = Object.freeze({
  uid: "",
  breedType: "", // use to search random preview img
  dogName: "",
  ownerId: "", // link to Owner uid
  weight: 0,
  alive: true,
  sex: 0,
  desex: false,
});
