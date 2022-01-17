const weakScript = 'weak.js';
const growScript = 'grow.js';
const hackScript = 'hack.js';
let interval = 100;
const maxRun = 20 * 60 * 1000;

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');
	const target = ns.args[0];
	if (!target) return;
	const startTime = Date.now();
	const jobs = [startTime + ns.getWeakenTime(target)];
	let currentIndex = Math.round((Date.now() - jobs[0]) / interval);
	for (let i = 0; i < 3000; i++) {
		jobs.push(null);
	}

	let initLevel = ns.getPlayer().hacking;
	const maxMoney = ns.getServerMaxMoney(target);
	let hackPercent = ns.hackAnalyze(target)

	let money = maxMoney * 0.5;
	if (target === 'n00dles') {
		money = maxMoney * 0.9;
		// at least 30
		interval = 30;
	}
	if (target === 'phantasy') {
		money = maxMoney * 0.1;
		interval = 200;
	}
	if (target === 'the-hub') {
		//131 TB
		money = maxMoney * 0.5;
		interval = 60;
	}
	if (target === 'rho-construction') {
		money = maxMoney * 0.8;
		interval = 60;
	}
	if (target === 'alpha-ent') {
		money = maxMoney * 0.8;
		interval = 60;
	}
	if (target === '4sigma') {
		money = maxMoney * 0.95;
		interval = 60;
	}
	if (target === 'megacorp') {
		money = maxMoney * 0.95;
		interval = 60;
	}
	let nextHackPosition = 0;
	let nextGrowPosition = 0;
	let nextWeakPosition = 0;

	const maxMoneyPerSecond = money * 1000 / interval / 4 * ns.hackAnalyzeChance(target);
	// const maxRamUsage = ns.getWeakenTime(target) / 4 / interval * ns.getScriptRam(weakScript) * 4
	ns.tprint(`run HWGW on ${target} for ${formatMoney(maxMoneyPerSecond)} and ${(money / maxMoney).toFixed(2)} per ${interval}ms`);

	while (true) {
		currentIndex += 0.5;
		if (currentIndex % Math.round(10000 / interval) === 0) {
			ns.print('offset ', (Date.now() - startTime) % (Math.round(10000 / interval) * interval));
		}
		// /* make sure actions are in order
		if ((jobs[currentIndex] === hackScript || jobs[currentIndex] === growScript) && jobs[currentIndex + 1] !== weakScript) {
			ns.tprint(target, ' wrong job order');
			ns.tprint(jobs
				.filter(
					(item, i) => (i > currentIndex - 100)
						&& (i < currentIndex + 5))
			);
			return;
		}
		// */

		const weakTime = ns.getWeakenTime(target);
		const growTime = ns.getGrowTime(target);
		const hackTime = ns.getHackTime(target);

		// weak needs to be on 2, 4, 6, 8 ...
		const weakPosition = Math.floor((Date.now() + weakTime - jobs[0]) / interval * 2) / 2;
		// hack needs to be on 1, 5, 9 ...
		const hackPosition = Math.floor((Date.now() + hackTime - jobs[0]) / interval * 2) / 2;
		// grow needs to be on 3, 7, 11 ...
		const growPosition = Math.floor((Date.now() + growTime - jobs[0]) / interval * 2) / 2;

		// If the current action will end after the expected position, 
		// it means the expected position will never be filled
		if (weakPosition > nextWeakPosition) {
			// if the expected position is going to insert the action and not insert yet.
			if (nextWeakPosition % 2 === 0 && jobs[nextWeakPosition] !== weakScript) {
				// kill all actions in the batch
				for (let i = 0; i < 4; i++) {
					const position = nextWeakPosition - ((nextWeakPosition - 1) % 4) + i
					const scriptName = jobs[position];
					if (scriptName && scriptName !== 'deleted') {
						ns.kill(scriptName, target, 0, position)
					}
					jobs[position] = 'deleted';
				}
			}
			// move to next position
			nextWeakPosition = Math.ceil(nextWeakPosition + 0.5);
		} else {
			nextWeakPosition = Math.ceil(weakPosition + 0.5);
		}

		if (growPosition > nextGrowPosition) {
			if (nextGrowPosition % 4 === 3 && jobs[nextGrowPosition] !== growScript) {
				for (let i = 0; i < 4; i++) {
					const position = nextGrowPosition - ((nextGrowPosition - 1) % 4) + i
					const scriptName = jobs[position];
					if (scriptName && scriptName !== 'deleted') {
						ns.kill(scriptName, target, 0, position)
					}
					jobs[position] = 'deleted';
				}
			}
			nextGrowPosition = Math.ceil(nextGrowPosition + 0.5);
		} else {
			nextGrowPosition = Math.ceil(growPosition + 0.5);
		}

		if (hackPosition > nextHackPosition) {
			if (nextHackPosition % 4 === 1 && jobs[nextHackPosition] !== hackScript) {
				for (let i = 0; i < 4; i++) {
					const position = nextHackPosition - ((nextHackPosition - 1) % 4) + i
					const scriptName = jobs[position];
					if (scriptName && scriptName !== 'deleted') {
						ns.kill(scriptName, target, 0, position)
					}
					jobs[position] = 'deleted';
				}
			}
			nextHackPosition = Math.ceil(nextHackPosition + 0.5);
		} else {
			nextHackPosition = Math.ceil(hackPosition + 0.5);
		}

		// find the server to run HWGW
		const server = getServers(ns)[0];
		const cores = ns.getServer(server.hostname).cpuCores;
		const weakEffect = ns.weakenAnalyze(1, cores);

		// when security is low, hack percent will be low. We need to use the maximum percent
		hackPercent = Math.max(hackPercent, ns.hackAnalyze(target))
		const hackThreads = Math.floor(money / maxMoney / hackPercent);

		// estimate the percent when hack finishes. assume it will increase because lvlup
		let futureHackPercent = hackPercent * 1.1;
		let levelPerSecond = 0;
		// if there is formulas, use a more accurate estimation
		if (ns.fileExists('Formulas.exe')) {
			const player = ns.getPlayer();
			const targetServer = ns.getServer(target);
			if (!initLevel) {
				initLevel = player.hacking;
			}
			levelPerSecond = (player.hacking - initLevel) / (Date.now() - startTime) * 1000;

			targetServer.hackDifficulty = targetServer.minDifficulty;
			let hackingLevelUps = money / maxMoney >= 0.9 ? 10 : 50;
			player.hacking = hackingLevelUps + player.hacking + Math.ceil(levelPerSecond * hackTime / 1000);
			futureHackPercent = ns.formulas.hacking.hackPercent(targetServer, player);
			if (!futureHackPercent) {
				ns.print('futureHackPercent is NaN')
				futureHackPercent = hackPercent * 1.1;
			}
			// ns.print(futureHackPercent, ' ',hackThreads)
		}

		const weakForHackThreads = Math.ceil(ns.hackAnalyzeSecurity(hackThreads) / weakEffect);
		const growThreads = Math.ceil(ns.growthAnalyze(target, maxMoney / (maxMoney - maxMoney * futureHackPercent * hackThreads), cores));
		const weakForGrowThreads = Math.ceil(ns.growthAnalyzeSecurity(growThreads) / weakEffect);

		const curMoney = ns.getServerMoneyAvailable(target);
		// if (curMoney < (maxMoney - maxMoney * futureHackPercent * (hackThreads + 1))) {
		if (curMoney !== maxMoney && curMoney > (maxMoney - money / 2)) {
			ns.tprint(`${target} curMoney ${curMoney.toFixed(0)}/${maxMoney.toFixed(0)}} ran ${((Date.now() - startTime) / 1000 / 60).toFixed(2)}m lvlup ${ns.getPlayer().hacking - initLevel} lvlRate ${levelPerSecond.toFixed(0)}`)
			ns.tprint(`${target} hackPerc ${(1 - curMoney / maxMoney).toFixed(3)}/${(money / maxMoney).toFixed(3)}=${((1 - curMoney / maxMoney) / (money / maxMoney)).toFixed(3)} ${futureHackPercent}/${hackPercent}=${(futureHackPercent / hackPercent).toFixed(3)}`)
			const dPosition = Math.round((Date.now() - jobs[0]) / interval)
			ns.tprint(jobs
				.filter(
					(item, i) => (i > dPosition - 100)
						&& (i < dPosition + 5))
			);
			return;
		}
		// ns.tprint(jobs
		// 	.filter(
		// 		(item, i) => (i > Math.round((Date.now() - jobs[0]) / interval) - 1)
		// 			&& (i < Math.round((Date.now() - jobs[0]) / interval) + 15))
		// );

		// ns.tprint(`${weakPosition}\t${hackPosition}\t${growPosition}\t${Math.round((Date.now() - jobs[0]) / interval)}\t`
		// 	+ `${weakTime.toFixed(2)}\t${hackTime.toFixed(2)}\t${growTime.toFixed(2)}\t`
		// 	+ `${ns.getServerSecurityLevel(target)}\t${ns.getServerMoneyAvailable(target)}\t`)

		// If the current action will end after the expected position, 
		// it means the expected position will never be filled

		if (weakPosition > 0 && weakPosition % 4 === 2 && !jobs[weakPosition]) {
			if (weakForHackThreads > 0 && !ns.exec(weakScript, server.hostname, weakForHackThreads, target, 0, weakPosition)) {
				ns.tprint('out of memory')
				return;
			}
			jobs[weakPosition] = weakScript;
		}
		if (weakPosition > 0 && weakPosition % 4 === 0 && !jobs[weakPosition]) {
			if (weakForGrowThreads > 0 && !ns.exec(weakScript, server.hostname, weakForGrowThreads, target, 0, weakPosition)) {
				ns.tprint('out of memory')
				return;
			}
			jobs[weakPosition] = weakScript;
		}

		if (growPosition > 0 && growPosition % 4 === 3 && !jobs[growPosition]) {
			if (growThreads > 0 && !ns.exec(growScript, server.hostname, growThreads, target, 0, growPosition)) {
				ns.tprint('out of memory')
				return;
			}
			jobs[growPosition] = growScript;
		}

		if (hackPosition > 0 && hackPosition % 4 === 1 && !jobs[hackPosition]) {
			if (hackThreads > 0 && !ns.exec(hackScript, server.hostname, hackThreads, target, 0, hackPosition)) {
				ns.tprint('out of memory')
				return;
			}
			jobs[hackPosition] = hackScript;
		}

		const script = ns.getRunningScript();
		if (script.onlineRunningTime * 1000 > maxRun) {
			const moneyMade = script.onlineMoneyMade;
			const expMade = script.onlineExpGained;
			const efficiency = jobs.filter(t => t === hackScript).length / jobs.length * 4;
			const totalThreads = hackThreads + weakForGrowThreads + weakForHackThreads + growThreads;
			const estimateRam = (hackThreads * hackTime / interval / 4 + (weakForHackThreads + weakForGrowThreads) * weakTime / interval / 4 + growThreads * growTime / interval / 4) * ns.getScriptRam(weakScript);
			const log = `${target}|buf ${interval}ms|hac ${money / maxMoney}|mon ${formatMoney(moneyMade / maxRun * 1000)}/${formatMoney(maxMoneyPerSecond)}|exp ${expMade.toFixed(0)}|tim ${maxRun / 1000 / 60}m|tds ${totalThreads}|ram ${estimateRam.toFixed(0)}g|eff ${efficiency.toFixed(2)}\n`
			await ns.write('logs.txt', log, 'a');
			ns.tprint(log);
			return;
		}
		await ns.sleep(interval / 2);
	}
}

function getServers(ns) {
	const servers = ns.getPurchasedServers();
	servers.push('home');
	const serverObjs = servers.map(hostname => {
		const res = {
			hostname,
			freeRam: ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname),
			processes: [],
		};
		if (res.hostname === 'home') {
			res.freeRam = res.freeRam * 0.8;
		}
		return res;
	})
	return serverObjs.sort((a, b) => b.freeRam - a.freeRam);
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