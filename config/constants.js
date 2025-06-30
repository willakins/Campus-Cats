// Default location (e.g., Georgia Tech)
const DefaultLocation = {
  latitude: 33.7756,
  longitude: -84.3963,
};

const InitialRegion = {
  ...DefaultLocation,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export { DefaultLocation, InitialRegion };
