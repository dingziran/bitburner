export const formatMoney = (input) => {
	let suffix = ''
	let money = input;
	if (money / 1000 > 1) {
		money = money / 1000;
		suffix = 'k';
	}
	if (money / 1000 > 1) {
		money = money / 1000;
		suffix = 'm';
	}
	if (money / 1000 > 1) {
		money = money / 1000;
		suffix = 'b';
	}
	if (money / 1000 > 1) {
		money = money / 1000;
		suffix = 't';
	}
	if (money / 1000 > 1) {
		money = money / 1000;
		suffix = 'q';
	}
	return `\$${money.toFixed(3)}${suffix}`
}