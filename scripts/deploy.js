/** @param {NS} ns **/
export async function main(ns) {
	const hosts = getHosts(ns)
	const script = "basic_wgh.js"
	const scriptRam = ns.getScriptRam(script);
	for (let host of hosts) {
		if (host === 'home') {
			continue;
		}
		const serverRam = ns.getServerMaxRam(host);
		const threads = Math.floor(serverRam / scriptRam);
		if (threads > 0) {
			await ns.scp(script, "home", host);
			ns.killall(host);
			ns.exec(script, host, threads, 'joesguns');
		}
	}
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