import { formatMoney } from './utils';
/** @param {NS} ns **/
export async function main(ns) {
	const hackDefault = ns.formulas.hacknetNodes.constants();
	const nodes = ns.hacknet.numNodes();
	for (let index = 0; index < nodes; index++) {
		const stats = ns.hacknet.getNodeStats(index);
		// const ns.hacknet.getPurchaseNodeCost()
		// const updateCCost = ns.hacknet.getCacheUpgradeCost(index, n)
		const coreLevel = hackDefault.MaxCores - stats.cores;
		const ramLevel = hackDefault.MaxRam - stats.ram;
		const levelLevel = hackDefault.MaxLevel - stats.level
		const coreCost = ns.hacknet.getCoreUpgradeCost(index, coreLevel)
		const ramCost = ns.hacknet.getRamUpgradeCost(index, ramLevel);
		const levelCost = ns.hacknet.getLevelUpgradeCost(index, levelLevel);
		if (coreLevel > 0) {
			ns.hacknet.upgradeCore(index, coreLevel)
			ns.tprint(`Update hacknode:${index} core ${coreLevel} cost ${formatMoney(coreCost)}`);
		}
		if (ramLevel > 0) {
			ns.hacknet.upgradeRam(index, ramLevel)
			ns.tprint(`Update hacknode:${index} ram ${ramLevel} cost ${formatMoney(ramCost)}`);
		}
		if (levelLevel > 0) {
			ns.hacknet.upgradeLevel(index, levelLevel)
			ns.tprint(`Update hacknode:${index} leve ${levelLevel} cost ${formatMoney(levelCost)}`);
		}
		// ns.tprint([index, coreCost, ramCost, levelLevel].join('|'))
	}
	// ns.tprint(hackDefault.MaxCores, ' ', hackDefault.MaxLevel, ' ', hackDefault.MaxRam);
	// ns.tprint(nodes, ' ', ns.hacknet.maxNumNodes(), ' ', ns.hacknet.numHashes());
	ns.tprint(`Purchased: ${ns.hacknet.purchaseNode()} cost ${formatMoney(ns.hacknet.getPurchaseNodeCost())}`)
	
}