module.exports = {
    "env": {
        "browser": true,
        "es6": true,
    },
    "parserOptions": { "ecmaVersion": 8 },
    "extends": "eslint:recommended",
    "rules": {
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-use-before-define": [
            "error",
            { "functions": true, "classes": true }
        ],
        "camelcase": [
            "error",
            { "properties": "always" }
        ],
        "eqeqeq": [
            "error",
            "always"
        ],
    }
};
