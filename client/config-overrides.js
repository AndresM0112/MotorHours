const { override, addBabelPlugin } = require("customize-cra");

module.exports = override(
    addBabelPlugin([
        "module-resolver",
        {
            root: ["./src"],
            alias: {
                "@api": "./src/api",
                "@assets": "./src/assets",
                "@components": "./src/components",
                "@config": "./src/config",
                "@context": "./src/context",
                "@hook": "./src/hook",
                "@pages": "./src/pages",
                "@styles": "./src/styles",
                "@utils": "./src/utils",
            },
        },
    ])
);
