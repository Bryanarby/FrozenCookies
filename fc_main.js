function setOverrides() {
  // Caching
  
  FrozenCookies.recalculateCaches = true;
  FrozenCookies.caches = {};
  FrozenCookies.caches.nextPurchase = {};
  FrozenCookies.caches.recommendationList = [];
  FrozenCookies.caches.buildings = [];
  FrozenCookies.caches.upgrades = [];
  FrozenCookies.caches.logs = [];
  FrozenCookies.caches.costReduction = {};

  FrozenCookies.autoCookies = [];
  // Set all cycleable preferences
  _.keys(FrozenCookies.preferenceValues).forEach(function(preference) {
    FrozenCookies[preference] = preferenceParse(preference, FrozenCookies.preferenceValues[preference].default);
  });

  logEvent("Load", "Initial Load of Frozen Cookies v " + FrozenCookies.branch + "." + FrozenCookies.version + ". (You should only ever see this once.)");

  FrozenCookies.frequency = 100;
  FrozenCookies.efficiencyWeight = 1.0;
  
  // Separate because these are user-input values
  FrozenCookies.cookieClickSpeed = preferenceParse('cookieClickSpeed',0);
  FrozenCookies.frenzyClickSpeed = preferenceParse('frenzyClickSpeed',0);
  FrozenCookies.HCResetValue = preferenceParse('HCResetValue',500);
  
  // Becomes 0 almost immediately after user input, so default to 0
  FrozenCookies.timeTravelAmount = 0;
  
  // Get historical data
  FrozenCookies.non_gc_time = Number(localStorage.getItem('nonFrenzyTime'));
  FrozenCookies.gc_time = Number(localStorage.getItem('frenzyTime'));
  FrozenCookies.lastHCAmount = Number(localStorage.getItem('lastHCAmount'));
  FrozenCookies.lastHCTime = Number(localStorage.getItem('lastHCTime'));
  FrozenCookies.prevLastHCTime = Number(localStorage.getItem('prevLastHCTime'));
  FrozenCookies.maxHCPercent = Number(localStorage.getItem('maxHCPercent'));

  // Set default values for calculations
  FrozenCookies.last_gc_state = (Game.frenzy > 0);
  FrozenCookies.last_gc_time = Date.now();
  FrozenCookies.lastCPS = Game.cookiesPs;
  FrozenCookies.lastCookieCPS = 0;
  FrozenCookies.lastUpgradeCount = 0;
  FrozenCookies.currentBank = {'cost': 0, 'efficiency' : 0};
  FrozenCookies.targetBank = {'cost': 0, 'efficiency' : 0};
  FrozenCookies.disabledPopups = true;
  
  // Allow autoCookie to run
  FrozenCookies.processing = false;
  FrozenCookies.resetting = false;
  
  FrozenCookies.cookieBot = 0;
  FrozenCookies.autoclickBot = 0;
  FrozenCookies.autoFrenzyBot = 0;
  FrozenCookies.frenzyClickBot = 0;

  //TODO find the appropriate place for this, or change how it works.
  //used against log spamming and unneeded checks.
  FrozenCookies.HCResetReady = false;
  FrozenCookies.clickedGC = false;
  FrozenCookies.clickedReindeer = false;
  FrozenCookies.logWindow = 2;
  
  if (!blacklist[FrozenCookies.blacklist]) {
    FrozenCookies.blacklist = 'none';
  }
  nextPurchase(true);
  Beautify = fcBeautify;
  Game.sayTime = function(time,detail) {return timeDisplay(time/Game.fps);}
  Game.oldReset = Game.Reset;
  Game.Reset = fcReset;
  Game.Win = fcWin;
  Game.oldBackground = Game.DrawBackground;
  Game.DrawBackground = function() {Game.oldBackground(); updateTimers();}
  // Remove the following when turning on tooltop code
  Game.RebuildStore();
  Game.RebuildUpgrades();
  beautifyUpgradesAndAchievements();
  // Replace Game.Popup references with event logging
  eval("Game.goldenCookie.click = " + Game.goldenCookie.click.toString().replace(/Game\.Popup\((.+)\)\;/g, 'logEvent("GC", $1, true);'));
  eval("Game.UpdateWrinklers = " + Game.UpdateWrinklers.toString().replace(/Game\.Popup\((.+)\)\;/g, 'logEvent("Wrinkler", $1, true);'));
  eval("Game.seasonPopup.click = " + Game.seasonPopup.click.toString().replace(/Game\.Popup\((.+)\)\;/g, 'logEvent("Reindeer", $1, true);'));
  /*
  eval("Game.Draw = " + Game.Draw.toString()
    .replace(/if \(Game.cookies>=me.price\) l\('product'\+me.id\).className='product enabled'; else l\('product'\+me.id\).className='product disabled';/, '(Game.cookies >= me.price) ? $("#product"+me.id).addClass("enabled").removeClass("disabled") : $("#product"+me.id).addClass("disabled").removeClass("enabled");')
    .replace(/if \(Game.cookies>=me.basePrice\) l\('upgrade'\+i\).className='crate upgrade enabled'; else l\('upgrade'\+i\).className='crate upgrade disabled';/, '(Game.cookies >= me.basePrice) ? $("#upgrade"+me.id).addClass("enabled").removeClass("disabled") : $("#upgrade"+me.id).addClass("disabled").removeClass("enabled");'));
  Game.RebuildStore=function(recalculate) {rebuildStore(recalculate);}
  Game.RebuildUpgrades=function(recalculate) {rebuildUpgrades(recalculate);}
  Game.RebuildStore(true);
  Game.RebuildUpgrades(true);
*/
}

function preferenceParse(setting, defaultVal) {
  var value = localStorage.getItem(setting);
  if (typeof(value) == 'undefined' || value == null || isNaN(Number(value))) {
    value = defaultVal;
    localStorage.setItem(setting, value);
  }
  return Number(value);
}

// var full_history = [];  // This may be a super leaky thing

function formatEveryThirdPower(notations) {
  return function (value) {
    var base = 0,
      notationValue = '';
    if (value >= 1000000 && Number.isFinite(value)) {
      value /= 1000;
      while(Math.round(value) >= 1000){
        value /= 1000;
        base++;
      }
      if (base > notations.length) {
        return 'Infinity';
      } else {
        notationValue = notations[base];
      }
    }
    return ( Math.round(value * 1000) / 1000.0 ) + notationValue;
  };
}

function scientificNotation(value) {
  if (value === 0 || !Number.isFinite(value) || (Math.abs(value) > 1 && Math.abs(value) < 100)) {
    return rawFormatter(value);
  }
  var sign = value > 0 ? '' : '-';
  value = Math.abs(value);
  var exp = Math.floor(Math.log(value)/Math.LN10);
  var num = Math.round((value/Math.pow(10, exp)) * 100) / 100;
  var output = num.toString();
  if (num === Math.round(num)) {
    output += '.00';
  } else if (num * 10 === Math.round(num * 10)) {
    output += '0';
  }
  return sign + output + '*10^' + exp;
}

function rawFormatter(value) {
  return Math.round(value * 1000) / 1000;
}

var numberFormatters = [
  rawFormatter,
  formatEveryThirdPower([
    '',
    ' million',
    ' billion',
    ' trillion',
    ' quadrillion',
    ' quintillion',
    ' sextillion',
    ' septillion'
  ]),

  formatEveryThirdPower([
    '',
    ' M',
    ' B',
    ' T',
    ' Qa',
    ' Qi',
    ' Sx',
    ' Sp'
  ]),

  formatEveryThirdPower([
    '',
    ' M',
    ' G',
    ' T',
    ' P',
    ' E',
    ' Z',
    ' Y'
  ]),
  scientificNotation
];

function fcBeautify (value, floats) {
  var negative = (value < 0);
  value = Math.abs(value);
  if(floats > 0){
    value=Math.floor(value);  
    value=Math.round(value*10000000)/10000000;//get rid of weird rounding errors
  }
  var formatter = numberFormatters[FrozenCookies.numberDisplay];
  var output = formatter(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return negative ? '-' + output : output;
}

// Runs numbers in upgrades and achievements through our beautify function
function beautifyUpgradesAndAchievements() {
  function beautifyFn(str) {
    return Beautify(parseInt(str.replace(/,/, ''), 10));
  }

  var numre = /\d\d?\d?(?:,\d\d\d)*/;
  Game.AchievementsById.forEach(function (ach) {
    ach.desc = ach.desc.replace(numre, beautifyFn);
  });

  // These might not have any numbers in them, but just in case...
  Game.UpgradesById.forEach(function (upg) {
    upg.desc = upg.desc.replace(numre, beautifyFn);
  });
}

function timeDisplay(seconds) {
  if (seconds === '---' || seconds === 0) {
    return 'Done!';
  } else if (seconds == Number.POSITIVE_INFINITY) {
    return 'Never!'
  }
  seconds = Math.floor(seconds);
  var days, hours, minutes;
  days = Math.floor(seconds / (24 * 60 * 60));
  days = (days > 0) ? Beautify(days) + 'd ' : '';
  seconds %= (24 * 60 * 60);
  hours = Math.floor(seconds / (60 * 60));
  hours = (hours > 0) ? hours + 'h ' : '';
  seconds %= (60 * 60);
  minutes = Math.floor(seconds / 60);
  minutes = (minutes > 0) ? minutes + 'm ' : '';
  seconds %= 60;
  seconds = (seconds > 0) ? seconds + 's' : '';
  return (days + hours + minutes + seconds).trim();
}

function fcReset(bypass) {
  FrozenCookies.resetting = true;
  Game.oldReset(bypass);
  FrozenCookies.nonFrenzyTime = 0;
  FrozenCookies.frenzyTime = 0;
  FrozenCookies.last_gc_state = (Game.frenzy > 0);
  FrozenCookies.last_gc_time = Date.now();
  FrozenCookies.lastHCAmount = Game.HowMuchPrestige(Game.cookiesEarned + Game.cookiesReset);
  FrozenCookies.lastHCTime = Date.now();
  FrozenCookies.maxHCPercent = 0;
  FrozenCookies.prevLastHCTime = Date.now();
  FrozenCookies.lastCps = 0;
  FrozenCookies.HCResetReady = false;
  FrozenCookies.clickedGC = false;
  FrozenCookies.clickedReindeer = false;

  updateLocalStorage();
  recommendationList(true);
  FrozenCookies.resetting = false;
}

function updateLocalStorage() {
  _.keys(FrozenCookies.preferenceValues).forEach(function(preference) {
    localStorage[preference] = FrozenCookies[preference];
  });
  
  localStorage.frenzyClickSpeed = FrozenCookies.frenzyClickSpeed;
  localStorage.cookieClickSpeed = FrozenCookies.cookieClickSpeed;
  localStorage.HCResetValue = FrozenCookies.HCResetValue;
  localStorage.nonFrenzyTime = FrozenCookies.non_gc_time;
  localStorage.frenzyTime = FrozenCookies.gc_time;
  localStorage.lastHCAmount = FrozenCookies.lastHCAmount;
  localStorage.maxHCPercent = FrozenCookies.maxHCPercent;
  localStorage.lastHCTime = FrozenCookies.lastHCTime;
  localStorage.prevLastHCTime = FrozenCookies.prevLastHCTime;
}

function divCps(value, cps) {
  var result = 0;
  if (value) {
    if (cps) {
      result = value / cps;
    } else {
      result = Number.POSITIVE_INFINITY;
    }
  }
  return result;
}

function nextHC(tg) {
  var futureHC = Math.ceil(Math.sqrt((Game.cookiesEarned + Game.cookiesReset)/0.5e12+0.25)-0.5);
  var nextHC = futureHC*(futureHC+1)*0.5e12;
  var toGo = nextHC - (Game.cookiesEarned + Game.cookiesReset);
  return tg ? toGo : timeDisplay(divCps(toGo, Game.cookiesPs));
}

function copyToClipboard (text) {
  window.prompt ("Copy to clipboard: Ctrl+C, Enter", text);
}
 
function getBuildingSpread () {
  return Game.ObjectsById.map(function(a){return a.amount;}).join('/')
}

// Press 'b' to pop up a copyable window with building spread. 
document.addEventListener('keydown', function(event) {
  if(event.keyCode == 66) {
    copyToClipboard(getBuildingSpread());
  }
});

// Press 'a' to toggle autobuy.
document.addEventListener('keydown', function(event) {
  if(event.keyCode == 65) {
    Game.Toggle('autoBuy','autobuyButton','Autobuy OFF','Autobuy ON');
    toggleFrozen('autoBuy');
  }
});

// Press 'c' to toggle auto-GC
document.addEventListener('keydown', function(event) {
  if(event.keyCode == 67) {
    Game.Toggle('autoGC','autogcButton','Autoclick GC OFF','Autoclick GC ON');
    toggleFrozen('autoGC');
  }
});

function writeFCButton(setting) {
  var current = FrozenCookies[setting];
}

function getSpeed(current) {
  var newSpeed = prompt('How many times per second do you want to click? (Current maximum is 250 clicks per second)',current);
  if (typeof(newSpeed) == 'undefined' || newSpeed == null || isNaN(Number(newSpeed)) || Number(newSpeed) < 0 || Number(newSpeed) > 250) {
    newSpeed = current;
  }
  return Number(newSpeed);
}

function updateSpeed(base) {
  var newSpeed = getSpeed(FrozenCookies[base]);
  if (newSpeed != FrozenCookies[base]) {
    FrozenCookies[base] = newSpeed;
    updateLocalStorage();
    FCStart();
  }
}

//to store without limit.
function getLimit(current) {
  var newLimit = prompt('New limit :',current);
  if (typeof(newLimit) == 'undefined' || newLimit == null || isNaN(Number(newLimit)) || Number(newLimit) < 0) {
    newLimit = current;
  }
  return Number(newLimit);
}

function updateLimit(base) {
  var newLimit = getLimit(FrozenCookies[base]);
  if (newLimit != FrozenCookies[base]) {
    FrozenCookies[base] = newLimit;
    updateLocalStorage();
    FCStart();
  }
}

function updateTimeTravelAmount() {
  var newAmount = prompt("Warning: Time travel is highly unstable, and large values are highly likely to either cause long delays or crash the game. Be careful!\nHow much do you want to time travel by? This will happen instantly.");
  if (typeof(newAmount) === 'undefined' || newAmount === null || isNaN(Number(newAmount)) || Number(newAmount) < 0) {
    newAmount = 0;
  }
  FrozenCookies.timeTravelAmount = newAmount;
}

//return a function by name
//there's probably a better way to do this but yeah..
function getFunctionByName(functionName){
  switch (functionName) {
    case 'autoBlacklistOff': return this.autoBlacklistOff; break;
    case 'autoBuy': return this.autoBuy; break;
//    case 'autoClick': return this.autoClick; break;
    case 'autoFrenzy': return this.autoFrenzyClick; break;
    case 'logging': return this.logging; break;
    case 'autoGC': return this.autoGC; break;
    case 'autoHCReset': return this.autoHCReset; break;
    case 'autoReindeer': return this.autoReindeer; break;
    case 'autoWrinkler': return this.autoWrinkler; break;
    default: return null; break;
  }
}

//update the array of functions that need to be called in autoCookie()
function updateAutoCookies(preferenceName, value) {
  var func = getFunctionByName(preferenceName);
  var index = FrozenCookies.autoCookies.indexOf(func);
  //on/off?
  if (value == 1) {
    //if not found
    if (index == -1) {
    	if (func !== null) {
        FrozenCookies.processing = true;
    	  FrozenCookies.autoCookies.push(getFunctionByName(preferenceName));
    	  logEvent('AutoManager', 'Turned on ' + preferenceName);
    	}
    }
  } else {
    if (index > -1) {
      FrozenCookies.processing = true;
      FrozenCookies.autoCookies.splice(index,1);
    	logEvent('AutoManager', 'Turned ' + preferenceName + ' off');
    }
  }
}

function cyclePreference(preferenceName) {
  var preference = FrozenCookies.preferenceValues[preferenceName];
  if (preference) {
    var display = preference.display;
    var current = FrozenCookies[preferenceName];
    var preferenceButton = $('#' + preferenceName + 'Button');
    if (display && display.length > 0 && preferenceButton && preferenceButton.length > 0) {
      var newValue = (current + 1) % display.length;
      preferenceButton[0].innerText = display[newValue];
      FrozenCookies[preferenceName] = newValue;
      updateAutoCookies(preferenceName, newValue);
      updateLocalStorage();
      FrozenCookies.recalculateCaches = true;
      Game.RebuildStore();
      Game.RebuildUpgrades();
      FCStart();
    }  
  }
}

function toggleFrozen(setting) {
  if (!Number(localStorage.getItem(setting))) {
    localStorage.setItem(setting,1);
    FrozenCookies[setting] = 1;
  } else {
    localStorage.setItem(setting,0);
    FrozenCookies[setting] = 0;
  }
  FCStart();
}

function autoBlacklistOff() {
  switch (FrozenCookies.blacklist) {
    case 1:
      FrozenCookies.blacklist = (Game.cookiesEarned >= 1000000) ? 0 : 1;
      break;
    case 2:
      FrozenCookies.blacklist = (Game.cookiesEarned >= 1000000000) ? 0 : 2;
      break;
    case 3:
      FrozenCookies.blacklist = haveAllHalloween() ? 0 : 3;
      break;
  }
}

function getProbabilityList(listType) {
  return cumulativeProbabilityList[listType][getProbabilityModifiers(listType)];
}

function getProbabilityModifiers(listType) {
  switch (listType) {
    case "golden":
      return Game.Has('Lucky day') + Game.Has('Serendipity');
    case "reindeer":
      return Game.Has('Reindeer baking grounds');
  }
  return 0;
}

function cumulativeProbability(listType, start, stop) {
  return 1 - ((1 - getProbabilityList(listType)[stop]) / (1 - getProbabilityList(listType)[start]));
}

function probabilitySpan(listType, start, endProbability) {
  var startProbability = getProbabilityList(listType)[start];
  return _.sortedIndex(getProbabilityList(listType), (startProbability + endProbability - startProbability * endProbability));
}

function baseCps() {
  var frenzyMod = (Game.frenzy > 0) ? Game.frenzyPower : 1;
  return Game.cookiesPs / frenzyMod;
}

function baseClickingCps(clickSpeed) {
  var clickFrenzyMod = (Game.clickFrenzy > 0) ? 777 : 1;
  var frenzyMod = (Game.frenzy > 0) ? Game.frenzyPower : 1;
  var cpc = Game.mouseCps() / (clickFrenzyMod * frenzyMod);
  return clickSpeed * cpc;
}

function cookieValue(bankAmount) {
  var cps = baseCps();
  var clickCps = baseClickingCps(FrozenCookies.autoClick * FrozenCookies.cookieClickSpeed);
  var frenzyCps = FrozenCookies.autoFrenzy ? baseClickingCps(FrozenCookies.autoFrenzy * FrozenCookies.frenzyClickSpeed) : clickCps;
  var luckyMod = Game.Has('Get lucky') ? 2 : 1;
  var clickFrenzyMod = (Game.clickFrenzy > 0) ? 777 : 1
  var wrathValue = Game.elderWrath;
  var value = 0;
  // Clot
  value -= cookieInfo.clot.odds[wrathValue] * (cps + clickCps) * luckyMod * 66 * 0.5;
  // Frenzy
  value += cookieInfo.frenzy.odds[wrathValue] * (cps + clickCps) * luckyMod * 77 * 7;
  // Blood
  value += cookieInfo.blood.odds[wrathValue] * (cps + clickCps) * luckyMod * 666 * 6;
  // Chain
  value += cookieInfo.chain.odds[wrathValue] * calculateChainValue(bankAmount, cps, (7 - (wrathValue / 3)));
  // Ruin
  value -= cookieInfo.ruin.odds[wrathValue] * (Math.min(bankAmount * 0.05, cps * 60 * 10) + 13);
  // Frenzy + Ruin
  value -= cookieInfo.frenzyRuin.odds[wrathValue] * (Math.min(bankAmount * 0.05, cps * 60 * 10 * 7) + 13);
  // Clot + Ruin
  value -= cookieInfo.clotRuin.odds[wrathValue] * (Math.min(bankAmount * 0.05, cps * 60 * 10 * 0.5) + 13);
  // Lucky
  value += cookieInfo.lucky.odds[wrathValue] * (Math.min(bankAmount * 0.1, cps * 60 * 20) + 13);
  // Frenzy + Lucky
  value += cookieInfo.frenzyLucky.odds[wrathValue] * (Math.min(bankAmount * 0.1, cps * 60 * 20 * 7) + 13);
  // Clot + Lucky
  value += cookieInfo.clotLucky.odds[wrathValue] * (Math.min(bankAmount * 0.1, cps * 60 * 20 * 0.5) + 13);
  // Click
  value += cookieInfo.click.odds[wrathValue] * frenzyCps * luckyMod * 13 * 777;
  // Frenzy + Click
  value += cookieInfo.click.odds[wrathValue] * frenzyCps * luckyMod * 13 * 777 * 7;
  // Clot + Click
  value += cookieInfo.click.odds[wrathValue] * frenzyCps * luckyMod * 13 * 777 * 0.5;
  // Blah
  value += 0;
  return value;
}

function calculateChainValue(bankAmount, cps, digit) { 
  x = Math.min(bankAmount, (cps * 60 * 60 * 6 * 4));
  n = Math.floor(Math.log((9*x)/(4*digit))/Math.LN10);
  return 125 * Math.pow(9,(n-3)) * digit;
}

/* Old way, less efficient
function calculateChainValue(bankAmount, cps) {
  var payoutTotal = 0;
  var payoutNext = '6';
  var step = 1;
  var remainingProbability = 1;
  while (payoutNext < bankAmount * 0.25 || payoutNext <= cps * 60 * 60 * 6) {
    step += 1;
    payoutTotal += remainingProbability * 0.1 * payoutNext;
    remainingProbability -= remainingProbability * 0.1
    payoutNext += '6';
  }
  payoutTotal += remainingProbability * payoutNext.substr(0,payoutNext.length-1);
  return payoutTotal;
}
*/

function luckyBank() {
  return baseCps() * 60 * 20 * 10;
}

function luckyFrenzyBank() {
  return baseCps() * 60 * 20 * 7 * 10;
}

function chainBank() {
//  More exact
  var digit = 7 - Math.floor(Game.elderWrath / 3);
  return 4 * Math.floor(digit / 9 * Math.pow(10, Math.floor(Math.log(194400*baseCps()/digit)/Math.LN10 )));
//  return baseCps() * 60 * 60 * 6 * 4;
}

function cookieEfficiency(startingPoint, bankAmount) {
  var results = Number.MAX_VALUE;
  var currentValue = cookieValue(startingPoint);
  var bankValue = cookieValue(bankAmount);
  var bankCps = gcPs(bankValue);
  if (bankCps > 0) {
    if (bankAmount <= startingPoint) {
      results = 0;
    } else {
      var cost = Math.max(0,(bankAmount - startingPoint));
      var deltaCps = gcPs(bankValue - currentValue);
      results = divCps(cost, deltaCps);
    }
  } else if (bankAmount <= startingPoint) {
    results = 0;
  }
  return results;
}

function bestBank(minEfficiency) {
  var results = {};
  var bankLevels = [0, luckyBank(), luckyFrenzyBank(), chainBank()].sort(function(a,b){return b-a;}).map(function(bank){
    return {'cost': bank, 'efficiency': cookieEfficiency(Game.cookies, bank)};
  }).filter(function(bank){
    return (bank.efficiency <= minEfficiency) ? bank : null;
  });
  return bankLevels[0];
}

function weightedCookieValue(useCurrent) {
  var cps = baseCps();
  var lucky_mod = Game.Has('Get lucky');
  var base_wrath = lucky_mod ? 401.835 * cps : 396.51 * cps;
//  base_wrath += 192125500000;
  var base_golden = lucky_mod ? 2804.76 * cps : 814.38 * cps;
  if (Game.cookiesEarned >= 100000) {
    var remainingProbability = 1;
    var startingValue = '6666';
    var rollingEstimate = 0;
    for (var i = 5; i < Math.min(Math.floor(Game.cookies).toString().length,12); i++) {
      startingValue += '6';
      rollingEstimate += 0.1 * remainingProbability * startingValue;
      remainingProbability -= remainingProbability * 0.1;
    }
    rollingEstimate += remainingProbability * startingValue;
//    base_golden += 10655700000;
    base_golden += rollingEstimate * 0.0033;
    base_wrath += rollingEstimate * 0.0595;
  }
  if (useCurrent && Game.cookies < maxLuckyValue() * 10) {
    if (lucky_mod) {
      base_golden -= ((1200 * cps) - Math.min(1200 * cps, Game.cookies * 0.1)) * 0.49 * 0.5 + (maxLuckyValue() - (Game.cookies * 0.1)) * 0.49 * 0.5;
    } else {
      base_golden -= (maxLuckyValue() - (Game.cookies * 0.1)) * 0.49;
      base_wrath  -= (maxLuckyValue() - (Game.cookies * 0.1)) * 0.29;
    }
  }
  return Game.elderWrath / 3.0 * base_wrath + (3 - Game.elderWrath) / 3.0 * base_golden;
}

function reindeerValue() {
  var reindeerMod = Game.Has('Ho ho ho-flavored frosting') ? 120 : 60;
  return (baseCps() * reindeerMod > 25) ? baseCps() * reindeerMod : 25;
}
function maxLuckyValue() {
  var gcMod = Game.Has('Get lucky') ? 8400 : 1200;
  return baseCps() * gcMod;
}

function maxCookieTime() {
  return Game.goldenCookie.maxTime
}

function reindeercPs() {
  var cps = reindeerValue();
  var averageReindeerTime = Game.Has('Reindeer baking grounds') ? 4311.606 / Game.fps : 7011.606 / Game.fps;
  cps /= averageReindeerTime;
  cps *= (FrozenCookies.autoReindeer) ? 100 : 0;
  return cps;
}

function seasoncPs(gcValue) {
  switch (Game.season) {
    case 'christmas': return reindeercPs();
  }
  return 0;
}

/*
function seasonEfficiency(gcValue) {
  switch (Game.season) {
    case 'christmas': return reindeerEfficiency(gcValue);
    case default: Number.MAX_VALUE;
  } 
}*/

function gcPs(gcValue) {
  var averageGCTime = probabilitySpan('golden', 0, 0.5) / Game.fps;
  gcValue /= averageGCTime;
  gcValue *= FrozenCookies.simulatedGCPercent;
  return gcValue;
}

function gcEfficiency() {
  if (gcPs(weightedCookieValue()) <= 0) {
    return Number.MAX_VALUE;
  }
  var cost = Math.max(0,(maxLuckyValue() * 10 - Game.cookies));
  var deltaCps = gcPs(weightedCookieValue() - weightedCookieValue(true));
  return divCps(cost, deltaCps);
}

function delayAmount() {
  return bestBank(nextChainedPurchase().efficiency).cost;
/*
  if (nextChainedPurchase().efficiency > gcEfficiency() || (Game.frenzy && Game.Has('Get lucky'))) {
    return maxLuckyValue() * 10;
  } else if (weightedCookieValue() > weightedCookieValue(true)) {
    return Math.min(maxLuckyValue() * 10, Math.max(0,(nextChainedPurchase().efficiency - (gcEfficiency() * baseCps())) / gcEfficiency()));
  } else {
   return 0;
  }
*/
}

function haveAllHalloween() {
  return _.every(halloweenCookies, function(id) {return Game.UpgradesById[id].unlocked;});
}

// Use this for changes to future efficiency calcs
function purchaseEfficiency(price, deltaCps, baseDeltaCps, currentCps) {
  var efficiency = Number.POSITIVE_INFINITY;
  if (deltaCps > 0) {
    efficiency = FrozenCookies.efficiencyWeight * divCps(price, currentCps) + divCps(price, deltaCps);
  }
  return efficiency;
}

function checkCostCompensation(completeList, recalculate){
  var purchase = completeList[0];
  var costReductionList = getCostReductionArray(purchase.type, recalculate);
  var winner = purchase;
  var counter = 0;
  var efficiency = purchase.efficiency;
  if(purchase.type != 'santa') {
    for(var x = 1; x < costReductionList.length;x++){
      var existingAchievements = Game.AchievementsById.map(function(item){return item.won});
      var reverseFunctions = upgradeToggle(costReductionList[x]);
      switch (purchase.type) {
        case 'building': calcBuilding(upgrade); break;
        case 'upgrade': calcUpgrade(upgrade); break;
      }
      
      if (purchase.efficiency <= efficiency) {
        winner = costReductionList[0];
        counter = x;
      }
      upgradeToggle(purchase, existingAchievements, reverseFunctions);
      switch (purchase.type) {
        case 'building': calcBuilding(upgrade); break;
        case 'upgrade': calcUpgrade(upgrade); break;
      }
    }
    if(!counter){
      //find the upgrade, give it a fixed efficiency. code will figure out later which comes on top after buying that one.
      for(x in completeList){
        if(comepleteList[x].upgrade === winner){
          comepleteList[x].efficiency = 0;
        }
      }
      completeList[0].efficiency = efficiency;
    }
  }
  return completeList;
}

function recommendationList(recalculate) {
  if (recalculate) {
    var upgradeRecList = upgradeStats(recalculate);
    var buildingRecList = buildingStats(recalculate);
    var santaRecList = santaStats();
    var completeList = upgradeRecList.concat(buildingRecList).concat(santaRecList).sort(function(a,b){return (a.efficiency - b.efficiency)});

    completeList = checkCostCompensation(completeList, recalculate).sort(function(a,b){return (a.efficiency - b.efficiency)});
    FrozenCookies.caches.recommendationList = addScores(upgradeRecList.concat(buildingRecList).concat(santaRecList).sort(function(a,b){return (a.efficiency - b.efficiency)}));
  }
  return FrozenCookies.caches.recommendationList;
//  return upgradeStats(recalculate).concat(buildingStats(recalculate)).sort(function(a,b){return (a.efficiency - b.efficiency)});
}

function addScores(recommendations) {
  var filteredList = recommendations.filter(function(a){return a.efficiency < Number.POSITIVE_INFINITY && a.efficiency > Number.NEGATIVE_INFINITY;})
  if (filteredList.length > 0) {
    var minValue = Math.log(recommendations[0].efficiency);
    var maxValue = Math.log(recommendations[filteredList.length - 1].efficiency);
    var spread = maxValue - minValue;
    recommendations.forEach(function(purchaseRec, index){
      if (purchaseRec.efficiency < Number.POSITIVE_INFINITY && purchaseRec.efficiency > Number.NEGATIVE_INFINITY) {
        var purchaseValue = Math.log(purchaseRec.efficiency);
        var purchaseSpread = purchaseValue - minValue;
        recommendations[index].efficiencyScore = 1 - (purchaseSpread / spread);
      } else {
        recommendations[index].efficiencyScore = 0;
      }
    });
  } else {
    recommendations.forEach(function(purchaseRec,index){recommendations[index].efficiencyScore = 0;});
  }
  return recommendations;
}

function nextPurchase(recalculate) {
  if (recalculate) {
    var recList = recommendationList(recalculate);
    var purchase = recList[0];
    if (purchase.type == 'upgrade' && unfinishedUpgradePrereqs(Game.UpgradesById[purchase.id])) {
      var prereqList = unfinishedUpgradePrereqs(Game.UpgradesById[purchase.id]);
      purchase = recList.filter(function(a){return prereqList.some(function(b){return b.id == a.id && b.type == a.type})})[0];
    }
    FrozenCookies.caches.nextPurchase = purchase;
    FrozenCookies.recalculateCaches = false;
  }
  return FrozenCookies.caches.nextPurchase;
//  return purchase;
}

function nextChainedPurchase() {
  return recommendationList()[0];
}

function getCostReductionArray(type, recalculate) {
  if (recalculate) {
    //todo make dynamic
    var buildingRedux = [Game.UpgradesById[160], Game.UpgradesById[168]];
    var upgradeRedux = [Game.UpgradesById[161], Game.UpgradesById[168]];

    FrozenCookies.caches.costReduction = [];
    FrozenCookies.caches.costReduction[0] = [null];
    FrozenCookies.caches.costReduction[1] = [null];
    //buildings
    for (x in buildingRedux) {
      var upgrade = buildingRedux[x];
      if(!upgrade[0].bought){
        FrozenCookies.caches.costReduction[0].push([upgrade]);
      }
    }
    
    //upgrades
    for (x in upgradeRedux) {
      var upgrade = upgradeRedux[x];
      if(!upgrade[0].bought){
        FrozenCookies.caches.costReduction[1].push([upgrade]);
      }
    }
    
    /*

    
    for(x in buildingRedux) {
      var upgrade = buildingRedux[x];
      if(!upgrade.bought){
        for(y in FrozenCookies.caches.costReduction[0]){
          var entry = FrozenCookies.caches.costReduction[0][y];
          if(entry.indexOf(upgrade) < 0){
            var res = FrozenCookies.caches.costReduction[0][y].concat(upgrade);
            FrozenCookies.caches.costReduction[0].push(res);
          }
        }
      }
    }
    FrozenCookies.caches.costReduction[0].unshift([]);

    for(x in upgradeRedux) {
      var upgrade = upgradeRedux[x];
      if(!upgrade.bought){
        for(y in FrozenCookies.caches.costReduction[1]){
          var entry = FrozenCookies.caches.costReduction[1][y];
          if(entry.indexOf(upgrade) < 0){
            var res = FrozenCookies.caches.costReduction[1][y].concat(upgrade);
            FrozenCookies.caches.costReduction[1].push(res);
          }
        }
      }
    }
    FrozenCookies.caches.costReduction[1].unshift([]);
    */
  }
  switch (type) {
    case 'building': return FrozenCookies.caches.costReduction[0];
    case 'upgrade': return FrozenCookies.caches.costReduction[1];
  }
}

function calcBuilding(current, index) {
  var buildingBlacklist = blacklist[FrozenCookies.blacklist].buildings;
  var currentBank = bestBank(0).cost;
  if (buildingBlacklist === true || _.contains(buildingBlacklist, current.id)) {
      return null;
  }
  var baseCps
