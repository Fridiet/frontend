module.exports = ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      usesCleartextTraffic: true,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
  };
};