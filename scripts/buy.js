const weakScript = 'weak.js';
const growScript = 'grow.js';
const hackScript = 'hack.js';
/** @param {NS} ns **/
export async function main(ns) {
	while (true) {
		const limit = ns.getPurchasedServerLimit();
		const servers = ns.getPurchasedServers();
		if (servers.length < limit) {
			await buyServer(ns, servers.length);
		} else {
			await replaceServer(ns, servers);
		}
		return;
		await ns.sleep(30 * 1000);
	}
}

async function buyServer(ns, index) {
	const currentMoney = ns.getServerMoneyAvailable('home');
	let i = 0;
	for (; i <= 20; i++) {
		if (currentMoney < ns.getPurchasedServerCost(Math.pow(2, i + 1))) {
			break;
		}
	}
	if (i > 0) {
		const newServerName = '' + index + '-server-' + Math.pow(2, i);
		ns.purchaseServer(newServerName, Math.pow(2, i));
		await ns.scp(growScript, 'home', newServerName);
		await ns.scp(weakScript, 'home', newServerName);
		await ns.scp(hackScript, 'home', newServerName);
		await ns.scp('weakH.js', 'home', newServerName);
		await ns.scp('weakG.js', 'home', newServerName);
		ns.tprint('buy ', newServerName);
	}
}

async function replaceServer(ns, servers) {
	const serverObjs = servers.map(host => {
		const parts = host.split('-');
		return {
			hostname: host,
			index: parseInt(parts[0]),
			ram: parseInt(parts[2]),
		}
	});
	const latestIndex = Math.max(...serverObjs.map(obj => obj.index));
	const smallestServerObj = serverObjs.sort((a, b) => a.ram - b.ram)[0];
	const currentMoney = ns.getServerMoneyAvailable('home');
	let targetRam = smallestServerObj.ram * 2;
	for (let i = 0; i < 20; i++) {
		if (currentMoney < ns.getPurchasedServerCost(targetRam * 2)) {
			break;
		} else {
			targetRam = targetRam * 2;
		}
	}
	if (targetRam === smallestServerObj.ram * 2) {
		ns.print('needs more money to buy next server '+ns.getPurchasedServerCost(targetRam * 2));
	} else {
		ns.deleteServer(smallestServerObj.hostname);
		const newServerName = '' + (latestIndex + 1) + '-server-' + targetRam;
		ns.purchaseServer(newServerName, targetRam);
		await ns.scp(growScript, 'home', newServerName);
		await ns.scp(weakScript, 'home', newServerName);
		await ns.scp(hackScript, 'home', newServerName);
		ns.tprint('replace ', smallestServerObj.hostname, ' with ', newServerName);
	}
}