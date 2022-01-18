const scriptInterval = 200; // 200ms
const interval = 4 * 5 * scriptInterval; // check the job per 10s
const hackThreshold = 0.25;
// const hackThreshold = 1; // 1 millions per thread per minute
const weakScript = 'weak.js';
const growScript = 'grow.js';
const hackScript = 'hack.js';

/** @param {NS} ns **/
export async function main(ns) {
	const targetServer = ns.args[0];
	// const skipHack = ns.args[0] ? true : false;
	const weakEffect = ns.weakenAnalyze(1); // TODO: update it to use cpu core
	const weakRam = ns.getScriptRam(weakScript);
	const growRam = ns.getScriptRam(growScript);
	const hackRam = ns.getScriptRam(hackScript);
	ns.disableLog('ALL');
	while (true) {
		if (targetServer
			&& ns.getServerMinSecurityLevel(targetServer) === ns.getServerSecurityLevel(targetServer)
			&& ns.getServerMaxMoney(targetServer) === ns.getServerMoneyAvailable(targetServer)) {
			ns.tprint('finished WG for server ' + targetServer)
			return;
		}
		ns.print('=============================')
		const serverObjs = getServers(ns);
		for (const serverObj of serverObjs) {
			await ns.scp(growScript, 'home', serverObj.hostname);
			await ns.scp(weakScript, 'home', serverObj.hostname);
			await ns.scp(hackScript, 'home', serverObj.hostname);
		}
		const runningHWGWServers = serverObjs.flatMap(obj => obj.processes).filter(pro => pro.filename === 'test.js').map(pro => pro.target);
		const hosts = getHosts(ns).filter(host => (targetServer ? host === ns.args[0] : !runningHWGWServers.includes(host)));
		const hostObjs = hosts.map(host => {
			const res = {};
			res.hostname = host;
			res.weakTime = ns.getWeakenTime(host);
			res.growTime = ns.getGrowTime(host);
			res.hackTime = ns.getHackTime(host);
			res.maxMoney = ns.getServerMaxMoney(host);
			res.money = ns.getServerMoneyAvailable(host);
			res.growthRate = ns.getServerGrowth(host);
			res.hackRate = ns.hackAnalyze(host);
			res.hackChance = ns.hackAnalyzeChance(host);
			res.securityGap = ns.getServerSecurityLevel(host) - ns.getServerMinSecurityLevel(host);
			res.growGap = (ns.getServerMaxMoney(host) || 1) / (ns.getServerMoneyAvailable(host) || 1)
			res.runningWeak = serverObjs.flatMap(obj => obj.processes).filter(pro => pro.target === host && pro.filename === weakScript).length > 0;
			res.runningGrow = serverObjs.flatMap(obj => obj.processes).filter(pro => pro.target === host && pro.filename === growScript).length > 0;
			res.runningHack = serverObjs.flatMap(obj => obj.processes).filter(pro => pro.target === host && pro.filename === hackScript).length > 0;
			return res;
		}).filter(hostObj => hostObj.maxMoney > 0);
		try {
			ns.print('=========weak=========')
			weaken(ns, hostObjs, weakEffect, weakRam)
			ns.print('=========grow=========')
			grow(ns, hostObjs, growRam)
			// if (!skipHack) {
			// 	ns.print('=========hack=========')
			// 	hack(ns, hostObjs, weakEffect, hackRam, weakRam, growRam);
			// }
		} catch (err) {
			ns.print(err.message);
		}
		await ns.sleep(interval);
	}

}

function weaken(ns, hostObjs, weakEffect, weakRam) {
	const sortedHostObjs = hostObjs
		.filter(hostObj => hostObj.securityGap > 0 && !hostObj.runningWeak)
		.sort((a, b) => a.weakTime - b.weakTime);

	for (const hostObj of sortedHostObjs) {
		const serverObjs = getServers(ns);
		const serverToRun = getAvailableServer(serverObjs);
		const threadNeeded = Math.ceil(hostObj.securityGap / weakEffect);
		const maxThreadAllowed = Math.floor(serverToRun.freeRam / weakRam);
		const threadToRun = Math.min(threadNeeded, maxThreadAllowed);
		if (threadToRun <= 0) {
			throw new Error('no available memory')
		}
		ns.exec(weakScript, serverToRun.hostname, threadToRun, hostObj.hostname);
		ns.print(`${serverToRun.hostname}:weak target:${hostObj.hostname} time:${(hostObj.weakTime / 1000 / 60).toFixed(1)}m threads:${threadToRun} gap:${hostObj.securityGap.toFixed(1)} freeRam:${serverToRun.freeRam.toFixed(0)}`)
	}
}

function grow(ns, hostObjs, growRam) {
	const sortedHostObjs = hostObjs
		.filter(hostObj =>
			hostObj.securityGap <= 0
			&& hostObj.growGap > 1
			&& !hostObj.runningWeak
			&& !hostObj.runningGrow)
		.sort((a, b) => a.growTime - b.growTime);

	for (const hostObj of sortedHostObjs) {
		const serverObjs = getServers(ns);
		const serverToRun = getAvailableServer(serverObjs);
		const threadNeeded = Math.ceil(ns.growthAnalyze(hostObj.hostname, hostObj.growGap)); // TODO: add core
		const maxThreadAllowed = Math.floor(serverToRun.freeRam / growRam);
		const threadToRun = Math.min(threadNeeded, maxThreadAllowed);
		if (threadToRun <= 0) {
			throw new Error('no available memory')
		}
		ns.exec(growScript, serverToRun.hostname, threadToRun, hostObj.hostname);
		ns.print(`${serverToRun.hostname}:grow target:${hostObj.hostname} time:${(hostObj.growTime / 1000 / 60).toFixed(1)}m threads:${threadToRun} gap:${hostObj.growGap.toFixed(1)} freeRam:${serverToRun.freeRam.toFixed(0)}`)
	}
}
function hack(ns, hostObjs, weakEffect, hackRam, weakRam, growRam) {
	const sortedHostObjs = hostObjs
		.filter(hostObj =>
			hostObj.securityGap <= 0
			&& hostObj.growGap <= 1
		)
		.sort((a, b) =>
			b.money * b.hackChance
			- a.money * a.hackChance);

	for (const hostObj of sortedHostObjs) {
		const serverObjs = getServers(ns);
		const serverToRun = getAvailableServer(serverObjs);
		const hackThreads = Math.floor(ns.hackAnalyzeThreads(hostObj.hostname, hostObj.money * hackThreshold));
		const weakThreadsForHack = Math.ceil(ns.hackAnalyzeSecurity(hackThreads) / weakEffect)
		const growThreads = Math.ceil(ns.growthAnalyze(hostObj.hostname, 1 / hackThreshold))
		const weakThreadsForGrow = Math.ceil(ns.growthAnalyzeSecurity(growThreads) / weakEffect)
		const threadToRun = hackThreads + weakThreadsForGrow + growThreads + weakThreadsForGrow;
		const ramNeeded = hackRam + weakRam * 2 + growRam;
		const maxThreadAllowed = Math.floor(serverToRun.freeRam / ramNeeded);
		if (threadToRun > maxThreadAllowed) {
			throw new Error(`no available memory ${ramNeeded * threadToRun}/${serverToRun.freeRam}`)
		}
		// We need to make scripts to end by hack weak grow weak 
		const durationPerBatch = Math.max(hostObj.hackTime + scriptInterval * 3, hostObj.weakTime + scriptInterval * 2, hostObj.growTime + scriptInterval);

		ns.exec(hackScript, serverToRun.hostname, hackThreads, hostObj.hostname, durationPerBatch - hostObj.hackTime - scriptInterval * 3);
		ns.exec(weakScript, serverToRun.hostname, weakThreadsForHack, hostObj.hostname, durationPerBatch - hostObj.weakTime - scriptInterval * 2);
		ns.exec(growScript, serverToRun.hostname, growThreads, hostObj.hostname, durationPerBatch - hostObj.growTime - scriptInterval * 1);
		ns.exec(weakScript, serverToRun.hostname, weakThreadsForGrow, hostObj.hostname, durationPerBatch - hostObj.weakTime);

		// ns.print(`${serverToRun.hostname}:hack target:${hostObj.hostname} time:${(durationPerBatch / 1000 / 60).toFixed(1)}m threads:${threadToRun} gap:${hostObj.hackChance.toFixed(1)} freeRam:${serverToRun.freeRam.toFixed(0)}`)
	}
}

function getServers(ns) {
	const purchasedServers = ns.getPurchasedServers();
	const servers = purchasedServers.concat(getHosts(ns))
		.filter(host => purchasedServers.length > 0 ? host !== 'home' : true)
	// servers.push('home');
	// const servers = getHosts(ns).filter(host => host !=='home')
	const serverObjs = servers.map(hostname => {
		const res = {
			hostname,
			freeRam: ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname),
			processes: [],
		};
		if (res.hostname === 'home') {
			res.freeRam = res.freeRam * 0.8;
		}
		const processes = ns.ps(hostname);
		for (const process of processes) {
			if ([weakScript, growScript, hackScript].includes(process.filename)) {
				res.processes.push({
					filename: process.filename,
					target: process.args[0],
					threads: process.threads,
				});
			}
		}
		return res;
	})
	return serverObjs;
}

function getAvailableServer(serverObjs) {
	const serverToRun = serverObjs.sort((a, b) => b.freeRam - a.freeRam)[0];
	return serverToRun;
}

function getHosts(ns) {
	let portsRequired = 0;
	if (ns.fileExists('BruteSSH.exe')) {
		portsRequired++;
	}
	if (ns.fileExists('FTPCrack.exe')) {
		portsRequired++;
	}
	if (ns.fileExists('relaySMTP.exe')) {
		portsRequired++;
	}
	if (ns.fileExists('HTTPWorm.exe')) {
		portsRequired++;
	}
	if (ns.fileExists('SQLInject.exe')) {
		portsRequired++;
	}
	return iterateScan(ns, 'home', portsRequired);
}

function iterateScan(ns, host, portsRequired, parentHost) {
	return [host, ...ns.scan(host).filter(subHost =>
		subHost !== parentHost
		&& ns.getServerRequiredHackingLevel(subHost) <= ns.getHackingLevel()
		&& ns.getServerNumPortsRequired(subHost) <= portsRequired
		&& subHost.indexOf('-server-') === -1
	).map(subHost => {
		if (!ns.hasRootAccess(subHost)) {
			if (ns.fileExists('BruteSSH.exe')) {
				ns.brutessh(subHost);
			}
			if (ns.fileExists('FTPCrack.exe')) {
				ns.ftpcrack(subHost);
			}
			if (ns.fileExists('relaySMTP.exe')) {
				ns.relaysmtp(subHost);
			}
			if (ns.fileExists('HTTPWorm.exe')) {
				ns.httpworm(subHost);
			}
			if (ns.fileExists('SQLInject.exe')) {
				ns.sqlinject(subHost);
			}
			ns.nuke(subHost);
		}
		return subHost
	}).flatMap(subHost => iterateScan(ns, subHost, portsRequired, host))]
}