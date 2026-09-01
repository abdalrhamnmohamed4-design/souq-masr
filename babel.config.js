// babel-preset-expo بيكتشف تلقائيًا وجود react-native-reanimated و
// react-native-worklets في node_modules ويظبط الـ plugins المطلوبة
// لهم من غير ما نحتاج نضيفهم يدويًا هنا.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
