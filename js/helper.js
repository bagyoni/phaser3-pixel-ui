function getCharacterAtIndex(bitmap_text, char_index) {
	let default_chr = { i: -1, idx: -1 };
	let characters = bitmap_text.getTextBounds().characters;
	let rightmost = characters
		.filter(c => c.idx <= char_index)
		.reduce((rightmost, c) => (rightmost.idx < c.idx ? c : rightmost), default_chr);
	if (bitmap_text.text[char_index - 1] === "\n" || char_index === 0) {
		let lines = bitmap_text.text.slice(0, char_index).split("\n").length - 1;
		return {
			i: rightmost.i,
			idx: rightmost.idx,
			x: 1,
			r: 0,
			t: lines * getLineHeight(bitmap_text)
		};
	}
	return rightmost;
}

function getLineHeight(bitmap_text) {
	let font = bitmap_text.fontData;
	let scale = bitmap_text.fontSize / font.size;
	return (font.lineHeight + bitmap_text.lineSpacing) * scale;
}

function tintBitmapTextBetween(bitmap_text, start, end, color, tintFill) {
	let chr_start = getCharacterAtIndex(bitmap_text, start);
	let chr_end = getCharacterAtIndex(bitmap_text, end);
	let start_i = chr_start.i + (chr_start.idx < start ? 1 : 0);
	let end_i = chr_end.i + (chr_end.idx < end ? 1 : 0);
	bitmap_text.setCharacterTint(start_i, end_i - start_i, tintFill, color);
}

module.exports = { getCharacterAtIndex, getLineHeight, tintBitmapTextBetween };
