import { formatMoney } from './utils';
/** @param {NS} ns **/
export async function main(ns) {
	const hosts = getHosts(ns);
	let output = '';
	output += '\n'
		+ 'hostname\t'
		+ 'skill\t'
		+ 'priority\t'
		+ 'maxMoney  '
		+ 'growthRate '
		+ 'hackRate '
		+ 'chance '
		+ 'securityGap '
		+ 'growthGap '
		+ 'hackTime '
		+ 'growTime '
		+ 'weakenTime'
		// + 'threadsToDouble'
		// + 'threadsToHalf'
		;

	for (const host of hosts) {
		const server = ns.getServer(host);
		const status = getHostStatus(ns, host)
		// ns.tprint(ns.getServer(host));
		// ns.tprint(getHostStatus(ns, host))
		const priority = (status.securityGap === 0 && status.currentMoney === server.moneyMax) ? Math.log10(

			server.moneyMax
			// * server.serverGrowth
			* status.chance
			/ status.weakenTime
			// * status.hackRate || 1
			) : ''
		output += '\n' + [
			pad(server.hostname, 0, 20),
			server.requiredHackingSkill,
			pad(priority, 2),
			formatMoney(server.moneyMax),
			server.serverGrowth,
			pad(status.hackRate, 4),
			pad(status.chance, 2),
			pad(status.securityGap > 0 ? status.securityGap : '', 1, 6),
			pad((server.moneyMax / (status.currentMoney || 1)) > 1 ? (server.moneyMax / (status.currentMoney || 1)) : '', 1, 6),
			pad(status.hackTime / 60000, 1),
			pad(status.growTime / 60000, 1),
			pad(status.weakenTime / 60000, 1),
			// pad(ns.hackAnalyzeThreads(server.hostname, 0.5 * server.moneyMax)),
			// pad(ns.growthAnalyze(server.hostname, 2)),
		].map(i => pad(i)).join('');
		// const s = ns.getServerSecurityLevel(host).toFixed(2).padEnd(10, ' ');
		// const s2 = ns.getServerMinSecurityLevel(host).toFixed(2).padEnd(10, ' ');
		// const s3 = (Math.log10(money / 100000 * hack * grow * hackRate * growth * chance)).toFixed(0).padEnd(10, ' ');
		// output += `${host.padEnd(20, ' ')}${hackLevel}${chance}${growth}${weaken}${grow}${hack}${money}${hackRate}${s}${s2}${s3}\n`;
	}
	ns.tprint(output);
	// ns.tprint('security increase per hack')
	// ns.tprint(ns.hackAnalyzeSecurity(1))
	// ns.tprint('security increase per growth')
	// ns.tprint(ns.growthAnalyzeSecurity(1))
	// ns.tprint('security decrease per weak')
	// ns.tprint(ns.weakenAnalyze(1, 1))

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

function getHostStatus(ns, host) {
	const result = {};
	result.chance = ns.hackAnalyzeChance(host);
	result.weakenTime = ns.getWeakenTime(host);
	result.growTime = ns.getGrowTime(host);
	result.hackTime = ns.getHackTime(host);
	result.hackRate = ns.hackAnalyze(host);
	result.currentSecurity = ns.getServerSecurityLevel(host);
	result.currentMoney = ns.getServerMoneyAvailable(host);
	result.securityGap = ns.getServerSecurityLevel(host) - ns.getServerMinSecurityLevel(host)
	return result;
}

function pad(input, fixed = 0, pad = 10) {
	if (typeof input === 'number') {
		return input.toFixed(fixed).padEnd(pad, ' ');
	}
	return String(input).padEnd(pad, ' ');

}
