module.exports = ({ config }) => {
  if (process.env.FRIDIET_EXPO_GO === "1") {
    const android = { ...config.android };
    const ios = { ...config.ios };
    delete android.googleServicesFile;
    delete ios.googleServicesFile;
    return { ...config, android, ios };
  }
  return {
    ...config,
    android: {
      ...config.android,
      usesCleartextTraffic: true,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
  };
};
