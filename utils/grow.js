/** @param {NS} ns **/
export async function main(ns) {
	if (ns.args[1]) {
		await ns.sleep(parseInt(ns.args[1]));
	}
	await ns.grow(ns.args[0]);
}