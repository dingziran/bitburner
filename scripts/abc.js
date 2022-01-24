import { getHosts, getServers, getPS, getHostInfo } from './utils';

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');
	const hosts = getHosts(ns);

	const hostObjs = hosts.map(host => getHostInfo(ns, host, 1));
	const lines = ['']
	for (const hostObj of hostObjs) {
		const moneyPerThreadPerMinute = hostObj.moneyAvailable * hostObj.hackPercent * hostObj.hackChance / (hostObj.weakenTime / 60 / 1000)
		lines.push(`${hostObj.hostname} mptm ${ns.nFormat(moneyPerThreadPerMinute, '0.0a')}`)
	}
	ns.print(lines.join('\n'))

	const host = ns.args[0];
	const hostToRun = hostObjs.find(hostObj => hostObj.hostname === host);
	const startTime = Date.now();
	const duration = (ns.args[1] || 10) * 60 * 1000;
	const hp = ns.args[2] || 0.1
	const buffer = 200;
	// for (let i = 0; i < 200000; i++) {
	// run 10 minute
	ns.tprint(`host ${host}`
		+ ` buffer ${buffer}ms`
		+ ` hp ${hp}`
		+ ` maxMoney ${ns.nFormat(hostToRun.moneyMax, '0.0a')}`
		// + ` threads ${hostObj.moneyAvailable * hp * hostObj.hackChance / (hostObj.weakenTime / 60 / 1000)}`
		+ ` hackChance ${hostToRun.hackChance}`
		+ ` maxMoney ${ns.nFormat(hostToRun.moneyMax * hp * hostToRun.hackChance / buffer / 4 * 1000, '0.0a')}/s`);
	// return;
	while (Date.now() < startTime + duration) {
		const servers = getServers(ns);
		const ps = getPS(ns, servers.map(s => s.hostname));
		// ns.tprint(ps);
		const server = servers[0];
		await ns.scp('weakH.js', 'home', server.hostname);
		await ns.scp('weakG.js', 'home', server.hostname);
		const actions = ps.filter(p => p.args[0] === host && p.args[2]).sort((a, b) => a.args[2] - b.args[2]);
		// get current end time
		const hackTime = ns.getHackTime(hostToRun.hostname);
		const growTime = ns.getGrowTime(hostToRun.hostname);
		const weakenTime = ns.getWeakenTime(hostToRun.hostname);

		// ns.print('=>>', actions.filter(a => a.args[2] < Date.now() + weakenTime).map(a => `${a.filename}+${((a.args[2] - Date.now()) / 1000).toFixed(0)}`).join('|'));

		const hackNeighbours = findNeighbours(actions, Date.now() + hackTime);
		const growNeighbours = findNeighbours(actions, Date.now() + growTime);
		const weakenNeighbours = findNeighbours(actions, Date.now() + weakenTime);

		const hackThreads = Math.floor(hp / hostToRun.hackPercent);
		const weakHackThreads = Math.ceil(hostToRun.hackSecurityPerThread * hackThreads / hostToRun.weakenSecurityPerThread)
		const growThreads = Math.ceil(ns.growthAnalyze(hostToRun.hostname, 1 / (1 - hp), 1));
		const weakGrowThreads = Math.ceil(hostToRun.growSecurityPerThread * growThreads / hostToRun.weakenSecurityPerThread)
		// ns.tprint(`weakHT ${weakHackThreads} weakGT ${weakGrowThreads}`);
		// 0h,buffer,1wh,buffer,2g,buffer,3wg,buffer,4h,buffer,5wh,buffer,6g,buffer,7wg,buffer
		// Insert weakH if there is no other action around
		// ns.tprint(weakenNeighbours)
		if (!(Date.now() + weakenTime - weakenNeighbours[0]?.args[2] < 4 * buffer)
			|| (weakenNeighbours[0]?.filename === 'weakG.js'
				&& !(Date.now() + weakenTime - weakenNeighbours[0]?.args[2] < 2 * buffer))
		) {

			ns.print(`wekH add [${formatNeighbour(weakenNeighbours[0])},${formatNeighbour(weakenNeighbours[1])}]`);
			ns.exec('weakH.js', server.hostname, weakHackThreads, host, 0, Date.now() + weakenTime);
		} else {
			ns.print(`wekH skip [${formatNeighbour(weakenNeighbours[0])},${formatNeighbour(weakenNeighbours[1])}]`);
		}

		// Insert weakG after weakH
		if ((weakenNeighbours[0]?.filename === 'weakH.js'
			&& (Date.now() + weakenTime - weakenNeighbours[0]?.args[2] < 2 * buffer)) || weakenNeighbours[0]?.filename === 'grow.js'
			// && (Date.now() + weakenTime - weakenNeighbours[0]?.args[2] >= 2 * buffer)
			// && weakenNeighbours[1]?.filename === 'weakH.js'
			// && (weakenNeighbours[1]?.args[2] - Date.now() - weakenTime < 2 * buffer)
			// && (weakenNeighbours[1]?.args[2] - Date.now() - weakenTime >= 2 * buffer)
		) {
			ns.print(`wekG add [${formatNeighbour(weakenNeighbours[0])},${formatNeighbour(weakenNeighbours[1])}]`);
			ns.exec('weakG.js', server.hostname, weakGrowThreads, host, 0, Date.now() + weakenTime);
		} else {
			ns.print(`wekG skip [${formatNeighbour(weakenNeighbours[0])},${formatNeighbour(weakenNeighbours[1])}]`);
		}

		// Insert grow between weahH and weakG
		if (growNeighbours[0]?.filename === 'weakH.js'
			// && (Date.now() + growTime - growNeighbours[0]?.args[2] >= 1 * buffer)
			&& growNeighbours[1]?.filename === 'weakG.js'
			// && (growNeighbours[1]?.args[2] - Date.now() - growTime >= 1 * buffer)
		) {
			ns.print(`grow add [${formatNeighbour(growNeighbours[0])},${formatNeighbour(growNeighbours[1])}]`);
			ns.exec('grow.js', server.hostname, growThreads, host, 0, Date.now() + growTime);
		} else {
			ns.print(`grow skip [${formatNeighbour(growNeighbours[0])},${formatNeighbour(growNeighbours[1])}]`);
		}


		if (hackNeighbours[0]?.filename === 'weakG.js'
			// && (Date.now() + hackTime - hackNeighbours[0]?.args[2] >= 1 * buffer)
			&& hackNeighbours[1]?.filename === 'weakH.js'
			&& (hackNeighbours[1] ? findNeighbours(actions, hackNeighbours[1].args[2])[1]?.filename === 'grow.js' : false)
			// && (hackNeighbours[1]?.args[2] - Date.now() - hackTime >= 1 * buffer)
		) {
			ns.print(`hack add [${formatNeighbour(hackNeighbours[0])},${formatNeighbour(hackNeighbours[1])}]`);
			ns.exec('hack.js', server.hostname, hackThreads, host, 0, Date.now() + hackTime);
		} else {
			ns.print(`hack skip [${formatNeighbour(hackNeighbours[0])},${formatNeighbour(hackNeighbours[1])}]`)
		}
		await ns.sleep(buffer);
	}

	const cs = ns.getRunningScript();
	const line = `\n${hostToRun.hostname}`
		+ ` exp ${ns.nFormat(cs.onlineExpGained / duration * 1000, '0.0')}|`
		+ ` money/s ${ns.nFormat(cs.onlineMoneyMade / duration * 1000, '0.0a')}`
		+ ` buffer ${buffer}ms`
		+ ` hp ${hp}`
		+ ` maxMoney ${ns.nFormat(hostToRun.moneyMax, '0.0a')}`
		+ ` hackChance ${hostToRun.hackChance}`
		+ ` max/s ${ns.nFormat(hostToRun.moneyMax * hp * hostToRun.hackChance / buffer / 4 * 1000, '0.0a')}/s`;
	ns.tprint(line);
	ns.write('logs_abc.txt', line, 'a');
	// ns.tprint(JSON.stringify(getHostInfo(ns, host, 1),4, ' '))

}

function formatNeighbour(neighbour) {
	return `${neighbour?.filename}+${((neighbour?.args[2] - Date.now()) / 1000).toFixed(1)}`
}

function findNeighbours(actions, ts) {
	let index = -1;
	for (let i = 0; i < actions.length; i++) {
		if (actions[i].args[2] > ts) {
			break;
		}
		index = i;
	}
	// <=, >
	return [actions[index], actions[index + 1]]
}