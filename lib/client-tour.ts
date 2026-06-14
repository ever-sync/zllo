import AsyncStorage from '@react-native-async-storage/async-storage';

const CLIENT_TOUR_KEY = 'zllo.client.tour.v1';

export async function hasSeenClientTour(): Promise<boolean> {
  const v = await AsyncStorage.getItem(CLIENT_TOUR_KEY);
  return v === '1';
}

export async function markClientTourSeen(): Promise<void> {
  await AsyncStorage.setItem(CLIENT_TOUR_KEY, '1');
}
