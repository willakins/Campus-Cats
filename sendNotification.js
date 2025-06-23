import axios from 'axios';

const sendPushNotification = async () => {
  const expoPushToken = 'ExpoPushToken[S0L5jqKCP-iCqRBQqTTV-f]';

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: 'Hello from Firebase!',
    body: 'This is a test notification 🚀',
    data: { screen: 'home' },
  };

  try {
    const response = await axios.post(
      'https://exp.host/--/api/v2/push/send',
      message,
    );
    console.log('Notification sent:', response.data);
  } catch (error) {
    console.error(
      'Error sending notification:',
      error.response?.data || error.message,
    );
  }
};

sendPushNotification();
