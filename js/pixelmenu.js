const Phaser = require("phaser");

const default_config = {
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	font: "please specify a font",
	font_size: 16,
	button_height: 20,
	button_padding: 3,
	button_spacing: 5,
	border_color: 0x000000,
	text_color: 0x000000,
	bg_color: 0xffffff,
	highlight_bg_color: 0x888888,
	highlight_text_color: 0xffffff
};

class PixelMenu extends Phaser.GameObjects.Container {
	constructor(scene, config) {
		super(scene, config.x, config.y);
		this._config = config = Object.assign({}, default_config, config);
		let mask = this.scene.make
			.graphics({ x: config.x, y: config.y })
			.fillStyle(0x000000)
			.fillRect(0, 0, this._config.width, this._config.height)
			.createGeometryMask();
		this.setMask(mask);
		scene.input.keyboard
			.addKey(Phaser.Input.Keyboard.KeyCodes.UP, true, true)
			.on("down", this._onUp, this);
		scene.input.keyboard
			.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, true, true)
			.on("down", this._onDown, this);
	}

	set options(options) {
		this.removeAll(true);
		this._buttons = [];
		for (let i = 0; i < options.length; i++) {
			let y = i * (this._config.button_height + this._config.button_spacing);
			let button = this._createButton(options[i], y);
			this.add(button);
			this._buttons.push(button);
		}
		this.selection = 0;
	}

	set selection(index) {
		this._selection = Math.max(0, Math.min(this._buttons.length - 1, index));
		this._buttons.forEach(button => this._setHighlight(button, false));
		let button = this._buttons[this._selection];
		if (!button) {
			return;
		}
		this._setHighlight(button, true);
		let display_y = button.y + this.y;
		this.y +=
			Math.max(this._config.y - display_y, 0) -
			Math.max(
				display_y + this._config.button_height - this._config.y - this._config.height,
				0
			);
	}

	get selection() {
		return this._selection;
	}

	get _enabled() {
		return this.visible && this.active;
	}

	_createButton(text, y) {
		let container = this.scene.add.container(0, y);
		let frame = this.scene.add
			.graphics({ x: 0, y: 0 })
			.fillStyle(this._config.border_color)
			.fillRect(0, 0, this._config.width, this._config.button_height);
		container.add(frame);
		let bg = this.scene.add.graphics({ x: 0, y: 0 });
		container.add(bg);
		let label = this.scene.add.bitmapText(
			this._config.button_padding,
			0,
			this._config.font,
			text,
			this._config.font_size
		);
		let max_width = this._config.width - this._config.button_padding * 2;
		if (label.width > max_width) {
			label.text += "...";
		}
		while (label.width > max_width) {
			label.text = label.text.slice(0, -4) + "...";
		}
		label.y = (this._config.button_height - label.height) / 2;
		container.add(label);
		return container;
	}

	_setHighlight(button, on) {
		let bg_color = on ? this._config.highlight_bg_color : this._config.bg_color;
		let fg_color = on ? this._config.highlight_text_color : this._config.text_color;
		button.list[1]
			.clear()
			.fillStyle(bg_color)
			.fillRect(1, 1, this._config.width - 2, this._config.button_height - 2);
		button.list[2].setTintFill(fg_color);
	}

	_onUp() {
		if (this._enabled) {
			this.selection--;
		}
	}

	_onDown() {
		if (this._enabled) {
			this.selection++;
		}
	}
}

module.exports = { PixelMenu };
