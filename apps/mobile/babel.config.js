module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated 4 routes worklets through this plugin. Must be the LAST
    // plugin in the chain — moving anything below it breaks codegen.
    plugins: ["react-native-worklets/plugin"],
  };
};
