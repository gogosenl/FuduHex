const TEST_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
};

module.exports = () => {
  const projectId = process.env.EAS_PROJECT_ID;

  return {
    name: 'Fudu Hex',
    slug: 'fudu-hex',
    version: '1.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    icon: './assets/fudu-icon.png',
    splash: {
      image: './assets/fudu-splash.png',
      resizeMode: 'cover',
      backgroundColor: '#761C38',
    },
    plugins: [
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: process.env.ADMOB_ANDROID_APP_ID || TEST_APP_IDS.android,
          iosAppId: process.env.ADMOB_IOS_APP_ID || TEST_APP_IDS.ios,
        },
      ],
    ],
    ios: {
      bundleIdentifier: 'com.gorsengames.fuduhex',
      buildNumber: '4',
      supportsTablet: false,
      icon: './assets/fudu-icon.png',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      icon: './assets/fudu-icon.png',
      adaptiveIcon: {
        foregroundImage: './assets/fudu-icon.png',
        backgroundColor: '#761C38',
      },
    },
    ...(projectId ? { extra: { eas: { projectId } } } : {}),
  };
};
