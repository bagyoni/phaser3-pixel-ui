const path = require("path");

module.exports = {
	entry: "./js/index.js",
	mode: "production",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "pixel-ui.min.js",
		library: "PixelUIPlugin",
		libraryTarget: "umd"
	},
	externals: {
		phaser: {
			root: "Phaser",
			umd: "phaser",
			commonjs2: "phaser",
			commonjs: "phaser",
			amd: "phaser"
		}
	}
};
