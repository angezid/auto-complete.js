
const diacritics = {
	chars: ['aàáảãạăằắẳẵặâầấẩẫậäåāą', 'cçćč', 'dđď', 'eèéẻẽẹêềếểễệëěēę', 'iìíỉĩịîïī', 'lł', 'nñňń',
		'oòóỏõọôồốổỗộơởỡớờợöøōő', 'rř', 'sšśșş', 'tťțţ', 'uùúủũụưừứửữựûüůūű', 'yýỳỷỹỵÿ', 'zžżź'],

	obj: {},

	init: function() {
		this.chars.forEach(str => {
			const low = str[0],
				upper = str[0].toUpperCase();

			for (let i = 1; i < str.length; i++) {
				this.obj[str[i]] = low;
				this.obj[str[i].toUpperCase()] = upper;
			}
		});
	},

	replace: function(str) {
		for (let i = 0; i < str.length; i++) {
			if (this.obj[str[i]]) {
				return str.split('').map(ch => this.obj[ch] || ch).join('');
			}
		}
		return str;
	}
};

export default diacritics;

/*const chars = ['aàáảãạăằắẳẵặâầấẩẫậäåāą', 'cçćč', 'dđď', 'eèéẻẽẹêềếểễệëěēę', 'iìíỉĩịîïī', 'lł', 'nñňń',
	'oòóỏõọôồốổỗộơởỡớờợöøōő', 'rř', 'sšśșş', 'tťțţ', 'uùúủũụưừứửữựûüůūű', 'yýỳỷỹỵÿ', 'zžżź'];

const diacritics = {};

chars.forEach(str => {
	const low = str[0],
		upper = str[0].toUpperCase();

	for (let i = 1; i < str.length; i++) {
		diacritics[str[i]] = low;
		diacritics[str[i].toUpperCase()] = upper;
	}
});

export function replaceDiacritics(str) {
	for (let i = 0; i < str.length; i++) {
		if (diacritics[str[i]]) {
			return str.split('').map(ch => diacritics[ch] || ch).join('');
		}
	}
	return str;
}*/

