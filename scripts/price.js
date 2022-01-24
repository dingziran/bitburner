/** @param {NS} ns **/
export async function main(ns) {
	const res = ['\n'];
	for (let ram = 2; ram < 2000000; ram = ram * 2) {
		res.push(`ram ${ns.nFormat(ram*1000*1000*1000, '0.0b')} will take ${ns.nFormat(ns.getPurchasedServerCost(ram ),'$0.0a')}`);
	}

	ns.tprint(res.join('\n'));
}