
const regExpCreator = {
	create : function(opt, libName) {
		const queryChars = this.preprocess(opt.queryChars),
			queryPattern = `([${queryChars}]+)`;

		const chars = this.preprocess(opt.triggerChars),
			triggerPattern = '(^|[' + chars + ']+)';

		if (opt.debug) {
			console.log(libName + ': RegExp trigger pattern - ' + triggerPattern, ' query pattern - ' + queryPattern);
		}
		return new RegExp(`${triggerPattern}${queryPattern}$`, 'u');
	},

	preprocess : function(value) {
		if (value && value.length) {
			const array = value.split(/(\\[pPu]\{[^}]+\}|\\[swdSWDnt]|.)/).filter(s => s.length);
			return array.map((str, i) => this.noEscape(str, i) ? str : this.escapeCharSet(str)).join('');
		}
		return '';
	},

	noEscape : function(str, i) {
		return i === 0 && str === '^' || str.length > 4 || /\\[swdSWDnt]/.test(str);
	},

	escapeCharSet : function(str) {
		return str.replace(/[-^\]\\]/g, '\\$&');
	}
};

export default regExpCreator;
