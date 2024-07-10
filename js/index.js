const Phaser = require("phaser");
const { PixelMenu } = require("./pixelmenu");
const { PixelInput } = require("./pixelinput");
const Helpers = require("./helper");

class PixelUIPlugin extends Phaser.Plugins.BasePlugin {
	constructor(pluginManager) {
		super(pluginManager);
	}

	static get DEFAULT_CFG() {
		return {
			key: "PixelUI",
			plugin: PixelUIPlugin,
			start: true
		};
	}

	static get Helpers() {
		return Helpers;
	}

	init() {
		this.pluginManager.registerGameObject("pixelInput", this._addPixelInput);
		this.pluginManager.registerGameObject("pixelMenu", this._addPixelMenu);
	}

	_addPixelInput(config) {
		let input = new PixelInput(this.scene, config);
		this.displayList.add(input);
		return input;
	}

	_addPixelMenu(config) {
		let menu = new PixelMenu(this.scene, config);
		this.displayList.add(menu);
		return menu;
	}
}

module.exports = PixelUIPlugin;
