import { formatMoney } from './utils';
const weakScript = "weak.js";
const growScript = "grow.js";
const hackScript = "hack.js";
let interval = 40;
const maxRun = 20 * 60 * 1000;

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  const target = ns.args[0];
  if (!target) return;
  const startTime = Date.now();
  // HWGW, so the start time is W time minus 1 intervals
  const actionStartTime = startTime + ns.getWeakenTime(target) - interval;
  const jobs = [];
  let currentIndex = 0;
  for (let i = 0; i < 3000; i++) {
    jobs.push(null);
  }

  let initLevel = ns.getPlayer().hacking;
  const maxMoney = ns.getServerMaxMoney(target);
  const money = maxMoney * 0.9;
  let hackPercent = ns.hackAnalyze(target);

  let nextHackPosition = 0;
  let nextGrowPosition = 0;
  let nextWeakPosition = 0;

  const maxMoneyPerSecond =
    ((money * 1000) / interval / 4) * ns.hackAnalyzeChance(target);
  // const maxRamUsage = ns.getWeakenTime(target) / 4 / interval * ns.getScriptRam(weakScript) * 4
  ns.tprint(
    `run HWGW on ${target} for ${formatMoney(maxMoneyPerSecond)} and ${(
      money / maxMoney
    ).toFixed(2)} per ${interval}ms`
  );

  while (true) {
    if (currentIndex % Math.round(10000 / interval) === 0) {
      ns.print(
        "offset ",
        (Date.now() - startTime) % (Math.round(10000 / interval) * interval)
      );
    }
    // /* make sure actions are in order
    // if ((jobs[currentIndex] === hackScript || jobs[currentIndex] === growScript) && jobs[currentIndex + 1] !== weakScript) {
    // 	ns.tprint(target, ' wrong job order');
    // 	ns.tprint(jobs
    // 		.filter(
    // 			(item, i) => (i > currentIndex - 100)
    // 				&& (i < currentIndex + 5))
    // 	);
    // 	return;
    // }
    // */

    const weakTime = ns.getWeakenTime(target);
    const growTime = ns.getGrowTime(target);
    const hackTime = ns.getHackTime(target);

    // weak needs to be on 1, 3, 5, 7 ...
    const weakPosition =
      Math.floor(((Date.now() + weakTime - actionStartTime) / interval) * 2) /
      2;
    // hack needs to be on 0, 4, 8 ...
    const hackPosition =
      Math.floor(((Date.now() + hackTime - actionStartTime) / interval) * 2) /
      2;
    // grow needs to be on 2, 6, 10 ...
    const growPosition =
      Math.floor(((Date.now() + growTime - actionStartTime) / interval) * 2) /
      2;

    // If the current action will end after the expected position,
    // it means the expected position will never be filled
    if (weakPosition >= 0) {
      if (weakPosition > nextWeakPosition) {
        // if the expected position is going to insert the action and not insert yet.
        if (
          nextWeakPosition % 2 === 1 &&
          jobs[nextWeakPosition] !== weakScript
        ) {
          // kill all actions in the batch
          for (let i = 0; i < 4; i++) {
            const position = nextWeakPosition - (nextWeakPosition % 4) + i;
            const scriptName = jobs[position];
            if (scriptName && scriptName !== "deleted") {
              ns.kill(scriptName, target, 0, position);
            }
            jobs[position] = "deleted";
          }
        }
        // move to next position
        nextWeakPosition = Math.ceil(nextWeakPosition + 0.5);
      } else {
        nextWeakPosition = Math.ceil(weakPosition + 0.5);
      }
    }

    if (growPosition >= 0) {
      if (growPosition > nextGrowPosition) {
        if (
          nextGrowPosition % 4 === 2 &&
          jobs[nextGrowPosition] !== growScript
        ) {
          for (let i = 0; i < 4; i++) {
            const position = nextGrowPosition - 2 + i;
            const scriptName = jobs[position];
            if (scriptName && scriptName !== "deleted") {
              ns.kill(scriptName, target, 0, position);
            }
            jobs[position] = "deleted";
          }
        }
        nextGrowPosition = Math.ceil(nextGrowPosition + 0.5);
      } else {
        nextGrowPosition = Math.ceil(growPosition + 0.5);
      }
    }

    if (hackPosition >= 0) {
      if (hackPosition > nextHackPosition) {
        if (
          nextHackPosition % 4 === 1 &&
          jobs[nextHackPosition] !== hackScript
        ) {
          for (let i = 0; i < 4; i++) {
            const position = nextHackPosition - 1 + i;
            const scriptName = jobs[position];
            if (scriptName && scriptName !== "deleted") {
              ns.kill(scriptName, target, 0, position);
            }
            jobs[position] = "deleted";
          }
        }
        nextHackPosition = Math.ceil(nextHackPosition + 0.5);
      } else {
        nextHackPosition = Math.ceil(hackPosition + 0.5);
      }
    }

    // find the server to run HWGW
    const server = getServers(ns)[0];
    const curMoney = ns.getServerMoneyAvailable(target);
    const cores = ns.getServer(server.hostname).cpuCores;
    const weakEffect = ns.weakenAnalyze(1, cores);
    const currentHackPercent = ns.hackAnalyze(target);

    // when security is low, hack percent will be low. We need to use the maximum percent
    hackPercent = Math.max(hackPercent, currentHackPercent);
    const hackThreads = Math.floor(money / maxMoney / hackPercent);

    const weakForHackThreads = Math.ceil(
      ns.hackAnalyzeSecurity(hackThreads) / weakEffect
    );
    const growThreads =
      Math.ceil(
        ns.growthAnalyze(
          target,
          maxMoney / Math.min(curMoney, maxMoney - money),
          cores
        )
      ) * (initLevel > 1500 ? 2 : 1);
    const weakForGrowThreads = Math.ceil(
      ns.growthAnalyzeSecurity(growThreads) / weakEffect
    );

    if (curMoney < (maxMoney - money) / 2) {
      ns.tprint(
        `${target} curMoney ${curMoney.toFixed(0)}/${maxMoney.toFixed(
          0
        )} ran ${((Date.now() - startTime) / 1000 / 60).toFixed(2)}m lvlup ${
          ns.getPlayer().hacking - initLevel
        }`
      );
      const dPosition = Math.round((Date.now() - jobs[0]) / interval);
      ns.tprint(
        jobs.filter((item, i) => i > dPosition - 100 && i < dPosition + 5)
      );
      return;
    }
    // ns.tprint(jobs
    // 	.filter(
    // 		(item, i) => (i > Math.round((Date.now() - jobs[0]) / interval) - 1)
    // 			&& (i < Math.round((Date.now() - jobs[0]) / interval) + 15))
    // );

    // ns.tprint(`${weakPosition}\t${hackPosition}\t${growPosition}\t${Math.round((Date.now() - actionStartTime) / interval)}\t`
    // 	+ `${weakTime.toFixed(2)}\t${hackTime.toFixed(2)}\t${growTime.toFixed(2)}\t`
    // 	+ `${ns.getServerSecurityLevel(target)}\t${ns.getServerMoneyAvailable(target)}\t`)

    // If the current action will end after the expected position,
    // it means the expected position will never be filled

    if (weakPosition > 0 && weakPosition % 4 === 1 && !jobs[weakPosition]) {
      if (
        weakForHackThreads > 0 &&
        !ns.exec(
          weakScript,
          server.hostname,
          weakForHackThreads,
          target,
          0,
          weakPosition
        )
      ) {
        ns.tprint("out of memory");
        return;
      }
      jobs[weakPosition] = weakScript;
    }
    if (weakPosition > 0 && weakPosition % 4 === 3 && !jobs[weakPosition]) {
      if (
        weakForGrowThreads > 0 &&
        !ns.exec(
          weakScript,
          server.hostname,
          weakForGrowThreads,
          target,
          0,
          weakPosition
        )
      ) {
        ns.tprint("out of memory");
        return;
      }
      jobs[weakPosition] = weakScript;
    }

    if (growPosition > 0 && growPosition % 4 === 2 && !jobs[growPosition]) {
      if (
        growThreads > 0 &&
        !ns.exec(
          growScript,
          server.hostname,
          growThreads,
          target,
          0,
          growPosition
        )
      ) {
        ns.tprint("out of memory");
        return;
      }
      jobs[growPosition] = growScript;
    }

    if (hackPosition > 0 && hackPosition % 4 === 0 && !jobs[hackPosition]) {
      if (
        hackThreads > 0 &&
        !ns.exec(
          hackScript,
          server.hostname,
          hackThreads,
          target,
          0,
          hackPosition
        )
      ) {
        ns.tprint("out of memory");
        return;
      }
      jobs[hackPosition] = hackScript;
    }

    const script = ns.getRunningScript();
    if (script.onlineRunningTime * 1000 > maxRun) {
      const moneyMade = script.onlineMoneyMade;
      const expMade = script.onlineExpGained;
      const efficiency =
        (jobs.filter((t) => t === hackScript).length / jobs.length) * 4;
      const totalThreads =
        hackThreads + weakForGrowThreads + weakForHackThreads + growThreads;
      const estimateRam =
        ((hackThreads * hackTime) / interval / 4 +
          ((weakForHackThreads + weakForGrowThreads) * weakTime) /
            interval /
            4 +
          (growThreads * growTime) / interval / 4) *
        ns.getScriptRam(weakScript);
      const log = `${target}|buf ${interval}ms|hac ${
        money / maxMoney
      }|mon ${formatMoney((moneyMade / maxRun) * 1000)}/${formatMoney(
        maxMoneyPerSecond
      )}|exp ${expMade.toFixed(0)}|tim ${
        maxRun / 1000 / 60
      }m|tds ${totalThreads}|ram ${estimateRam.toFixed(
        0
      )}g|eff ${efficiency.toFixed(2)}\n`;
      await ns.write("logs.txt", log, "a");
      ns.tprint(log);
      return;
    }
    // await ns.sleep(interval / 2 - (Date.now() - currentIndex * interval - startTime));
    await ns.sleep(interval / 2);
    currentIndex += 0.5;
  }
}

function getServers(ns) {
  const servers = ns.getPurchasedServers();
  servers.push("home");
  const serverObjs = servers.map((hostname) => {
    const res = {
      hostname,
      freeRam: ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname),
      processes: [],
    };
    if (res.hostname === "home") {
      res.freeRam = res.freeRam * 0.8;
    }
    return res;
  });
  return serverObjs.sort((a, b) => b.freeRam - a.freeRam);
}
