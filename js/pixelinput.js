const Phaser = require("phaser");
const { getCharacterAtIndex, tintBitmapTextBetween } = require("./helper");

const border = 1;
const padding = 2;

const default_config = {
	x: 0,
	y: 0,
	width: 100,
	height: 10,
	font: "please specify a font",
	font_size: 16,
	border_color: 0x000000,
	bg_color: 0xffffff,
	text_color: 0x000000,
	selection_color: 0x888888,
	selected_text_color: 0xffffff,
	allowed_characters: Phaser.GameObjects.RetroFont.TEXT_SET1,
	tab: "  ",
	character_limit: 256,
	history_limit: 256,
	onRefresh: () => {}
};

class PixelInput extends Phaser.GameObjects.Container {
	constructor(scene, config) {
		super(scene, config.x, config.y);
		this._config = config = Object.assign({}, default_config, config);
		this._allowed_characters = [...config.allowed_characters];
		this._width = config.width;
		this._height = config.height;
		this._history = [];
		this._history_index = -1;
		this._inner_mask = this._createMask();
		this._box = this._createBox();
		this._cursor = this._createCursor();
		this._bmtext = this._createText();
		this._fixLineHeight();
		this._selection_pos = 0; // where the cursor was when we started selecting
		this._cursor_pos = 0;
		this._cursor_height = this._line_height;
		this._refresh();
		this._copy_listener = this._onCopy.bind(this);
		this._cut_listener = this._onCut.bind(this);
		this._paste_listener = this._onPaste.bind(this);
		document.addEventListener("copy", this._copy_listener);
		document.addEventListener("cut", this._cut_listener);
		document.addEventListener("paste", this._paste_listener);
		scene.input.keyboard.on("keydown", this._onKeyDown, this);
	}

	get text() {
		return this._bmtext.text;
	}

	set text(value) {
		// not a user edit, so not saving to history unless this is the first change
		this._insertText(value, 0, Infinity, !this._history.length);
		this._refresh();
	}

	get selectionStart() {
		return Math.min(this._selection_pos, this._cursor_pos);
	}

	get selectionEnd() {
		return Math.max(this._selection_pos, this._cursor_pos);
	}

	get _isDisabled() {
		return !this.visible || !this.active;
	}

	tintText(start, end, color) {
		tintBitmapTextBetween(this._bmtext, start, end, color, true);
	}

	clearHistory() {
		this._history = [];
		this._history_index = -1;
	}

	destroy(fromScene) {
		this.scene.input.keyboard.off("keydown", this._onKeyDown, this);
		document.removeEventListener("copy", this._copy_listener);
		document.removeEventListener("cut", this._cut_listener);
		document.removeEventListener("paste", this._paste_listener);
		super.destroy(fromScene);
		this._inner_mask.geometryMask.destroy(fromScene);
		this._inner_mask.destroy(fromScene);
	}

	_fixLineHeight() {
		// makes sure the y offset of a glyph is always a whole number
		let font = this._bmtext.fontData;
		let scale = this._bmtext.fontSize / font.size;
		let bad_line_height = font.lineHeight * scale;
		let good_line_height = Math.ceil(bad_line_height);
		this._bmtext.setLineSpacing((good_line_height - bad_line_height) / scale);
		this._line_height = good_line_height;
	}

	_createBox() {
		let box = this.scene.add
			.graphics({ x: 0, y: 0 })
			.fillStyle(this._config.border_color)
			.fillRect(0, 0, this._width, this._height)
			.fillStyle(this._config.bg_color)
			.fillRect(border, border, this._width - border * 2, this._height - border * 2);
		this.add(box);
		return box;
	}

	_createCursor() {
		let cursor = this.scene.add.graphics({ x: 0, y: 0 }).setMask(this._inner_mask);
		this.add(cursor);
		return cursor;
	}

	_createText() {
		let text = this.scene.add
			.bitmapText(padding, padding, this._config.font, "", this._config.font_size)
			.setMask(this._inner_mask);
		this.add(text);
		text.tintFill = this._config.text_color;
		return text;
	}

	_createMask() {
		return this.scene.make
			.graphics({ x: this.x + padding, y: this.y + padding })
			.fillStyle(0x000000)
			.fillRect(0, 0, this._width - padding * 2, this._height - padding * 2)
			.createGeometryMask();
	}

	_updateHistory() {
		if (this._bmtext.text === this._history[this._history_index]) {
			return;
		}
		this._history.splice(this._history_index + 1);
		this._history.push(this._bmtext.text);
		if (this._history.length > this._config.history_limit) {
			this._history.splice(0, this._history.length - this._config.history_limit);
		}
		this._history_index = this._history.length - 1;
	}

	_undo() {
		this._history_index = Math.max(-1, this._history_index - 1);
		let text = this._history_index > -1 ? this._history[this._history_index] : "";
		this._insertText(text, 0, Infinity, false);
	}

	_redo() {
		this._history_index = Math.min(this._history.length - 1, this._history_index + 1);
		this._insertText(this._history[this._history_index], 0, Infinity, false);
	}

	_onKeyDown(event) {
		if (this._isDisabled) {
			return;
		}
		this._handleKeystrokes(event) || this._handleKeys(event);
		this._refresh();
	}

	_handleKeystrokes(event) {
		if (!event.ctrlKey) {
			return false;
		}
		switch (event.keyCode) {
			case Phaser.Input.Keyboard.KeyCodes.A:
				this._cursor_pos = this._bmtext.text.length;
				this._selection_pos = 0;
				break;
			case Phaser.Input.Keyboard.KeyCodes.Y:
				this._redo();
				break;
			case Phaser.Input.Keyboard.KeyCodes.Z:
				this._undo();
				break;
		}
		return true;
	}

	_handleKeys(event) {
		let handled = true;
		switch (event.keyCode) {
			case Phaser.Input.Keyboard.KeyCodes.BACKSPACE:
				let start = this.selectionStart;
				if (start === this.selectionEnd) {
					start--;
				}
				start = Math.max(0, start);
				this._insertText("", start, this.selectionEnd);
				break;
			case Phaser.Input.Keyboard.KeyCodes.ENTER:
				this._insertText("\n", this.selectionStart, this.selectionEnd);
				break;
			case Phaser.Input.Keyboard.KeyCodes.LEFT:
				this._cursor_pos = Math.max(0, this._cursor_pos - 1);
				this._selection_pos = event.shiftKey ? this._selection_pos : this._cursor_pos;
				break;
			case Phaser.Input.Keyboard.KeyCodes.RIGHT:
				this._cursor_pos = Math.min(this._bmtext.text.length, this._cursor_pos + 1);
				this._selection_pos = event.shiftKey ? this._selection_pos : this._cursor_pos;
				break;
			case Phaser.Input.Keyboard.KeyCodes.UP:
				this._seekLine(false);
				this._selection_pos = event.shiftKey ? this._selection_pos : this._cursor_pos;
				break;
			case Phaser.Input.Keyboard.KeyCodes.DOWN:
				this._seekLine(true);
				this._selection_pos = event.shiftKey ? this._selection_pos : this._cursor_pos;
				break;
			case Phaser.Input.Keyboard.KeyCodes.TAB:
				this._insertText(this._config.tab, this.selectionStart, this.selectionEnd);
				break;
			default:
				if (!this._allowed_characters.includes(event.key)) {
					handled = false;
					break;
				}
				this._insertText(event.key, this.selectionStart, this.selectionEnd);
				break;
		}
		if (handled) {
			event.preventDefault();
		}
	}

	_onCopy(event) {
		if (this._isDisabled) {
			return;
		}
		let selection = this._bmtext.text.slice(this.selectionStart, this.selectionEnd);
		event.clipboardData.setData("text", selection);
		event.preventDefault();
		event.stopPropagation();
	}

	_onCut(event) {
		if (this._isDisabled) {
			return;
		}
		this._onCopy(event);
		this._insertText("", this.selectionStart, this.selectionEnd);
		this._refresh();
		event.preventDefault();
		event.stopPropagation();
	}

	_onPaste(event) {
		if (this._isDisabled) {
			return;
		}
		let text = event.clipboardData.getData("text");
		this._insertText(text, this.selectionStart, this.selectionEnd);
		this._refresh();
		event.preventDefault();
		event.stopPropagation();
	}

	_seekLine(next_line) {
		if (!this._allowed_characters.includes("\n")) {
			return;
		}
		let last_eol_index = this.text.substring(0, this._cursor_pos).lastIndexOf("\n");
		let cursor_column = this._cursor_pos - last_eol_index;
		let sought_eol_index;
		if (next_line) {
			sought_eol_index = this.text.indexOf("\n", this._cursor_pos);
			sought_eol_index = sought_eol_index < 0 ? this.text.length : sought_eol_index;
		} else {
			sought_eol_index = this.text.substring(0, last_eol_index).lastIndexOf("\n");
		}
		let next_eol_index = this.text.indexOf("\n", sought_eol_index + 1);
		next_eol_index = next_eol_index < 0 ? this.text.length : next_eol_index;
		this._cursor_pos = Math.min(next_eol_index, sought_eol_index + cursor_column);
	}

	_refresh() {
		this._updateTextPosition();
		this._updateSelection();
		this._config.onRefresh();
	}

	_insertText(text, start, end, update_history = true) {
		text = this._sanitizeText(text);
		start = Math.max(0, start);
		let full_text = this._bmtext.text.slice(0, start) + text + this._bmtext.text.slice(end);
		if (full_text.length > this._config.character_limit) {
			return;
		}
		this._bmtext.text = full_text;
		this._cursor_pos = start + text.length;
		this._selection_pos = this._cursor_pos;
		if (update_history) {
			this._updateHistory();
		}
	}

	_sanitizeText(text) {
		return [...text].filter(char => this._allowed_characters.includes(char)).join("");
	}

	_updateTextPosition() {
		if (this._bmtext.width < this._width - padding * 2) {
			this._bmtext.x = padding;
		} else {
			let cursor_x = this._getCursorCoordinates(this._cursor_pos).x;
			let left_offset = Math.max(0, padding - cursor_x);
			let right_offset = Math.max(0, cursor_x - (this._width - padding - 1));
			this._bmtext.x += left_offset - right_offset;
		}
		// BitmapText.height doesn't account for trailing empty lines
		if (this.text.split("\n").length * this._line_height < this._height - padding * 2) {
			this._bmtext.y = padding;
		} else {
			let cursor_y = this._getCursorCoordinates(this._cursor_pos).y;
			let cursor_bottom = cursor_y + this._cursor_height;
			let top_offset = Math.max(0, padding - cursor_y);
			let bottom_offset = Math.max(0, cursor_bottom - (this._height - padding));
			this._bmtext.y += top_offset - bottom_offset;
		}
	}

	_updateSelection() {
		this._drawMultilineSelection(this.selectionStart, this.selectionEnd);
		this._updateSelectionTint();
	}

	_drawSingleLineSelection(start, end) {
		let start_coords = this._getCursorCoordinates(start);
		let start_x = start_coords.x;
		let start_y = start_coords.y;
		let end_x = this._getCursorCoordinates(end).x;
		this._cursor
			.fillStyle(this._config.selection_color)
			.fillRect(start_x, start_y, Math.max(1, end_x - start_x + 1), this._cursor_height);
	}

	_drawMultilineSelection(start, end) {
		this._cursor.clear();
		for (let i = start; i < end; i++) {
			if (this.text[i] === "\n") {
				this._drawSingleLineSelection(start, i);
				start = i + 1;
			}
		}
		this._drawSingleLineSelection(start, end);
	}

	_updateSelectionTint() {
		this._bmtext.setCharacterTint(0, -1, true, this._config.text_color);
		tintBitmapTextBetween(
			this._bmtext,
			this.selectionStart,
			this.selectionEnd,
			this._config.selected_text_color,
			true
		);
	}

	_getCursorCoordinates(char_index) {
		let character = getCharacterAtIndex(this._bmtext, char_index);
		let x = character.idx === char_index ? character.x : character.r + 1;
		return { x: x + this._bmtext.x - 1, y: character.t + this._bmtext.y };
	}
}

module.exports = { PixelInput };
