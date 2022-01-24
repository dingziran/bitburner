/**
 * @deprecated Use ns.nFormat
 * @param {*} input 
 * @returns 
 */
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

/**
 * Return hostnames
 * @param {*} ns 
 * @returns string[]
 */
export const getHosts = (ns) => {
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

const iterateScan = (ns, host, portsRequired, parentHost) => {
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

export const getHostInfo = (ns, hostname, cores, formula) => {
	const player = ns.getPlayer();
	const server = ns.getServer(hostname);
	let growPercent;
	let hackChance = ns.hackAnalyzeChance(hostname);
	let hackExp;
	let hackPercent = ns.hackAnalyze(hostname);
	let growTime = ns.getGrowTime(hostname);
	let hackTime = ns.getHackTime(hostname);
	let weakenTime = ns.getWeakenTime(hostname);
	let growSecurityPerThread = ns.growthAnalyzeSecurity(1);
	let hackSecurityPerThread = ns.hackAnalyzeSecurity(1);
	let weakenSecurityPerThread = ns.weakenAnalyze(1, cores);
	if (formula) {
		growPercent = ns.formula.hacking.growPercent(server, 1, player, cores); // Calculate the percent a server would grow 
		hackChance = ns.formula.hacking.hackChance(server, player) // Calculate hack chance.
		hackExp = ns.formula.hacking.hackExp(server, player) // Calculate hack exp for one thread.
		hackPercent = ns.formula.hacking.hackPercent(server, player) // Calculate hack percent for one thread.
		growTime = ns.formula.hacking.growTime(server, player) // Calculate grow time.
		hackTime = ns.formula.hacking.hackTime(server, player) // Calculate hack time.
		weakenTime = ns.formula.hacking.weakenTime(server, player) // Calculate weaken time.
	}
	/*
	backdoorInstalled	boolean	Flag indicating whether this server has a backdoor installed by a player
	baseDifficulty	number	Initial server security level (i.e. security level when the server was created)
	cpuCores	number	How many CPU cores this server has. Maximum of 8. Affects magnitude of grow and weaken.
	ftpPortOpen	boolean	Flag indicating whether the FTP port is open
	hackDifficulty	number	Server Security Level
	hasAdminRights	boolean	Flag indicating whether player has admin/root access to this server
	hostname	string	Hostname. Must be unique
	httpPortOpen	boolean	Flag indicating whether HTTP Port is open
	ip	string	IP Address. Must be unique
	isConnectedTo	boolean	Flag indicating whether player is curently connected to this server
	maxRam	number	RAM (GB) available on this server
	minDifficulty	number	Minimum server security level that this server can be weakened to
	moneyAvailable	number	How much money currently resides on the server and can be hacked
	moneyMax	number	Maximum amount of money that this server can hold
	numOpenPortsRequired	number	Number of open ports required in order to gain admin/root access
	openPortCount	number	How many ports are currently opened on the server
	organizationName	string	Name of company/faction/etc. that this server belongs to. Optional, not applicable to all Servers
	purchasedByPlayer	boolean	Flag indicating whether this is a purchased server
	ramUsed	number	RAM (GB) used. i.e. unavailable RAM
	requiredHackingSkill	number	Hacking level required to hack this server
	serverGrowth	number	Parameter that affects how effectively this server's money can be increased using the grow() Netscript function
	smtpPortOpen	boolean	Flag indicating whether SMTP Port is open
	sqlPortOpen	boolean	Flag indicating whether SQL Port is open
	sshPortOpen	boolean	Flag indicating whether the SSH Port is open
	*/
	return {
		...server,
		growPercent,
		hackChance,
		hackExp,
		hackPercent,
		growTime,
		hackTime,
		weakenTime,
		growSecurityPerThread,
		hackSecurityPerThread,
		weakenSecurityPerThread,
	}
}

export const getServers = (ns) => {
	const servers = ns.getPurchasedServers();
	servers.push('home');
	const serverObjs = servers.map(hostname => {
		const res = {
			hostname,
			freeRam: ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname),
			maxRam: ns.getServerMaxRam(hostname),
			processes: [],
			ps: ns.ps(hostname),
		};
		// const processes = ns.ps(hostname);
		// for (const process of processes) {
		// 	res.processes.push({
		// 		filename: process.filename,
		// 		target: process.args[0],
		// 		threads: process.threads,
		// 	});
		// }
		return res;
	}).sort((a, b) => b.freeRam - a.freeRam);
	return serverObjs;
}

export const getPS = (ns, hostnames) => {
	return hostnames.flatMap(hostname => ns.ps(hostname).map(pst => ({ ...pst, hostname })))
}