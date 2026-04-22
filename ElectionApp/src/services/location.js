import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

const CAMPUS_BOUNDARIES = {
  minLat: 24.84232,
  maxLat: 24.84392,
  minLng: 93.93783,
  maxLng: 93.93985,
};

export const isWithinCampusBoundary = ({ latitude, longitude }) => {
  return (
    latitude >= CAMPUS_BOUNDARIES.minLat &&
    latitude <= CAMPUS_BOUNDARIES.maxLat &&
    longitude >= CAMPUS_BOUNDARIES.minLng &&
    longitude <= CAMPUS_BOUNDARIES.maxLng
  );
};

export const getCurrentLocation = async () => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Location permission denied');
    }
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      error => reject(error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });
};
