import { getHosts, getServers, getPS } from './utils.js';

/** @param {NS} ns **/
export async function main(ns) {
	const weakRam = ns.getScriptRam('weakH.js');
	const hackRam = ns.getScriptRam('hack.js');
	const growRam = ns.getScriptRam('grow.js');
	const hasFormula = ns.fileExists('Formulas.exe');
	const player = ns.getPlayer();
	const hosts = getHosts(ns);
	const servers = getServers(ns);
	const totalRam = servers.reduce((mem, cur) => mem + cur.maxRam, 0);
	const ps = getPS(ns, servers.map(s => s.hostname))
	let output = '';
	output += '\n'
		+ 'hostname\t'
		+ 'skill\t'
		+ 'priority\t'
		+ 'maxMoney  '
		+ 'growthRate '
		// + 'hackRate '
		+ 'chance '
		+ 'securityGap '
		+ 'growthGap '
		+ 'hackTime '
		+ 'growTime '
		+ 'weakenTime '
		+ 'ramAssigned '
		+ 's '
		// + 'hackExp '
		// + 'growExp '
		// + 'weakenExp '
		// + 'threadsToDouble'
		// + 'threadsToHalf'
		;

	for (const host of hosts) {
		const server = ns.getServer(host);
		const status = getHostStatus(ns, host)
		// ns.tprint(ns.getServer(host));
		// ns.tprint(getHostStatus(ns, host))
		const priority =
			(status.securityGap === 0 && status.currentMoney === server.moneyMax)
				? Math.log10(

					server.moneyMax
					* server.serverGrowth
					* status.chance
					/ status.weakenTime
					* status.hackRate || 1
				) : ''
		output += '\n' + [
			pad(server.hostname, 0, 20),
			server.requiredHackingSkill,
			pad(priority, 2),
			formatMoney(server.moneyMax),
			server.serverGrowth,
			// pad(status.hackRate, 4),
			pad(status.chance, 2),
			pad(status.securityGap > 0 ? status.securityGap : '', 1, 6),
			pad((server.moneyMax / (status.currentMoney || 1)) > 1 ? (server.moneyMax / (status.currentMoney || 1)) : '', 1, 6),
			pad(status.hackTime / 60000, 1),
			pad(status.growTime / 60000, 1),
			pad(status.weakenTime / 60000, 1),
			pad(ps.filter(p => p.args[0] === server.hostname).reduce((mem, cur) => {
				if (cur.filename === 'hack.js') {
					return mem + cur.threads * hackRam;
				} else if (cur.filename === 'grow.js') {
					return mem + cur.threads * growRam;
				} else if (['weak.js', 'weakH.js', 'weakG.js'].includes(cur.filename)) {
					return mem + cur.threads * weakRam;
				} else {
					return mem + ns.getRunningScript(cur.pid, cur.hostname, cur.args).ramUsage;
				}
			}, 0) || '', 1),
			pad(status.securityGap === 0 && hasFormula ? ns.nFormat((1 - 1 / ns.formulas.hacking.growPercent(server, totalRam / 5 / status.growTime * 200 * 4 / growRam, player, 1)) * server.moneyMax * status.chance, '0.0a') : '', 0)
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
	ns.tprint(`freeRam ${ns.nFormat(servers.reduce((mem, cur) => mem + cur.freeRam, 0) * 1000 * 1000 * 1000, '0.0 b')}/${ns.nFormat(servers.reduce((mem, cur) => mem + cur.maxRam, 0) * 1000 * 1000 * 1000, '0.0 b')}`)

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

function formatMoney(input) {
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
	return `\$${money.toFixed(3)}${suffix}`
}