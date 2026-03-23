var currentTurn = null;
var INDIVIDUAL_TURNS = false; // if set to true, the group_size enemy param will be ignored in favor of giving each individual enemy their own turn

var initiativeRequests = [];

on("ready", function(){
    
    setInterval(watchForTurnRequests, 1000);
    
    let turnOrderInfo = Campaign().get('turnorder');
    turnOrderInfo = JSON.parse(turnOrderInfo);  
    let dmTurn = false;
    if (currentTurn == null && turnOrderInfo != null && turnOrderInfo.length > 0) {
        let token = tokens.find((t) => t.get('id') == turnOrderInfo[0].id);
        if (token != null) {
            currentTurn = token.get('name');
            if (token.get('controlledby') == getGM()) dmTurn = true;
        }
    }
    
    on('change:campaign:turnorder', function(msg, prev) {
        if (msg == null) return;
        let turnOrderInfo = msg.get('turnorder');
        const turnOrderInfoJson = JSON.parse(turnOrderInfo);
        if(turnOrderInfoJson.length > JSON.parse(prev.turnorder).length) {
            //this interval check thing is meant to help account for the fact that right clicking and selecting 'Add Turn'
            //for multiple elements does not result in all being added at once. Rather, you get change events one-by-one
            //for each entry given a turn, and if not careful we could run into race conditions.
            initiativeRequests.push(...turnOrderInfoJson.map(turn => turn.id));
            initiativeRequests = [...new Set(initiativeRequests)];
        }
        let previousTurn = currentTurn;
        //this function figures out whose turn it is and updates currentTurn
        evaluateCurrentTurn(turnOrderInfo);
        if (previousTurn != currentTurn) {
            evaluateEndOfTurnEffects(previousTurn);
            clearAoeHazardTriggerMarkers();
            if (currentTurn != null) {
                printCurrentTurn();
                evaluateStartOfTurnEffects(currentTurn);
                takeAutomatedTurns(currentTurn);
            }
        }
        initializeTimers();   
    });
});

var turnorder;

async function printCurrentTurn() {
    if (currentTurn == null) return;
    await delayMS(750); //give any end of turn effects/messages a chance to print first
    emphasis((currentTurn + (currentTurn.slice(-1) == 's' ? "'" : "'s") + ' turn').toUpperCase());
}

function getCurrentTurn() {
    if (currentTurn != null) return currentTurn;
    let turnOrderInfo = Campaign().get('turnorder');
    if (turnOrderInfo == null) return null;
    turnOrderInfo = JSON.parse(turnOrderInfo); 
    if (tokens == null || turnOrderInfo == null || turnOrderInfo.length == 0) return;
    let token = tokens.find((t) => t.get('id') == turnOrderInfo[0].id);
    if (token != null) currentTurn = token.get('name');
    return currentTurn;
}

function advanceTurn() {
    let turnOrder = Campaign().get('turnorder');
    if (turnOrder == null) return;
    turnOrder = JSON.parse(turnOrder);
    let thisTurn = turnOrder[0];
    let newTurnOrder = turnOrder.slice(1);
    newTurnOrder.push(thisTurn);
    let token = tokens.find((t) => t.get('id') == newTurnOrder[0].id);
    if (token != null) currentTurn = token.get('name');
    Campaign().set("turnorder", JSON.stringify(newTurnOrder));
}

async function populateTurnOrder() {
    turnorder = [];
    refreshTokens();
    playerTokens.forEach((pt) => {
        let imgsrc = pt.get('imgsrc')
        if(imgsrc.indexOf(BLANK_IMG) < 0 && 
           imgsrc.indexOf(fortuneTokenImgsrc.substring(0,50)) < 0 && 
           imgsrc.indexOf(misfortuneTokenImgsrc.substring(0,50)) < 0 &&
           imgsrc.indexOf(moneybagImgsrc.substring(0,50)) < 0
        ) {
            //Add a new custom entry to the end of the turn order.
            turnorder.push({
                id: pt.get("id"),
                pr: "0",
                custom: pt.get("name"),
                _pageid: Campaign().get("playerpageid")
            })
        }
        
    });
    if (enemies.length > 0) {
        await rollAllEnemyInitiatives();
    }
    let lairActionToken = getToken(LAIR_ACTIONS);
    if (lairActionToken != null) {
        turnorder.push({
            id: lairActionToken.get("id"),
            pr: 0,
            custom: lairActionToken.get("name"),
            _pageid: Campaign().get("playerpageid")
        });        
    }
    if (turnorder.length == 0) {
        log('turn order list is empty. Double check that you\'ve actually made the map you\'re looking at the active one');
    }    
    Campaign().set("turnorder", JSON.stringify(turnorder));
}

async function watchForTurnRequests(){
    if(initiativeRequests == null || initiativeRequests.length == 0) return;
    log('processing these ids:');
    log(initiativeRequests);
    let turnOrder = Campaign().get('turnorder');
    if (turnOrder == null) return;
    turnOrder = JSON.parse(turnOrder);  
    log('turnorder data at request time:');
    log(turnOrder);        
    while (initiativeRequests.length > 0) {
        const id = initiativeRequests.pop();
        log('checking initiative request for ' + id);
        let token = getObj('graphic', id);
        if (token == null) continue;
        log('got token for ' + id);
        let e = lookupEnemy(token);
        if (e == null) continue;
        log('got enemy for ' + id);
        let roll = await e.initiativeRoll();
        let turnData = turnOrder.find(t => t.id == id);
        log('got turn data:');
        log(turnData);
        if (turnData['pr'] != '0') continue;        
        if (roll != null) {
            let initiative_bonus = 0;
            if (e.stats != null && e.stats.initiative_bonus != null) initiative_bonus = e.stats.initiative_bonus;
            if (!isNaN(roll)) roll += initiative_bonus;  
            turnData['pr'] = roll;
        }
    }
    Campaign().set("turnorder", JSON.stringify(turnOrder));
}

async function rollAllEnemyInitiatives() {
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        let token = e.token;
        if (token == null) continue;
        let nameSubstrs = token.get('name').split(' ');
        let number = Number(nameSubstrs[nameSubstrs.length - 1]);
        if (e.stats != null && (INDIVIDUAL_TURNS == true || isNaN(number) || (e.stats.group_size == null) || e.stats.group_size == 1 || number % e.stats.group_size == 1)) {         
            let roll = await e.initiativeRoll();
            if (roll != null) {
                let initiative_bonus = 0;
                if (e.stats != null && e.stats.initiative_bonus != null) initiative_bonus = e.stats.initiative_bonus;
                if (!isNaN(roll)) roll += initiative_bonus;
                if (INDIVIDUAL_TURNS == true  || isNaN(number) || (e.stats.group_size == null) || (e.stats.group_size == 1)) {
                    turnorder.push({
                        id: token.get("id"),
                        pr: roll,
                        custom: token.get("name"),
                        _pageid: Campaign().get("playerpageid")
                    });        
                } else {
                    let placeholderToken = await createObj('graphic', {
                        _subtype: 'token',
                        pageid: Campaign().get("playerpageid"),
                        layer: 'objects',
                        imgsrc: token.get('imgsrc'),
                        name: token.get("name") + '-' + (number + e.stats.group_size - 1),
                        left: -140,
                        top: -140,
                        width: 70,
                        height: 70,
                    });
                    turnorder.push({
                        id: placeholderToken.get("id"),
                        pr: roll,
                        custom: placeholderToken.get("name"),
                        _pageid: Campaign().get("playerpageid")
                    });                       
                }
            }
        }                       
    }
}

async function takeAutomatedTurns(currentTurn) {
    let enemy = lookupEnemy(currentTurn);
    if (enemy == null) {
        log('checking automated turns for ' + currentTurn);
        try {
            let nameSubstrs = currentTurn.split(' ');
            let numberSubstrs = nameSubstrs[nameSubstrs.length - 1].split('-');
            let lowNumber = Number(numberSubstrs[0]);
            let highNumber = Number(numberSubstrs[1]);
            if (!isNaN(highNumber) && !isNaN(lowNumber) && highNumber > lowNumber) {
                log('going to run turns for ' + currentTurn.substr(0, currentTurn.indexOf(nameSubstrs[nameSubstrs.length-1])) + lowNumber + ' to ' + highNumber);
                for (let i = lowNumber; i <= highNumber; i++) {
                    let enemyName = currentTurn.substr(0, currentTurn.indexOf(nameSubstrs[nameSubstrs.length-1])) + i;
                    let enemy = lookupEnemy(enemyName);
                    if (enemy != null && enemy.stats != null && enemy.stats.turnFunction != null && enemy.stats.disableAutoTurn !== true) {
                        echo(enemy.token.get('name') + ' is thinking...');
                        enemy.stats.turnFunction(enemy);
                    }
                }
            }
        } catch {
            log('something went wrong when taking automated turns');
        }  
        return;
    }
    if (enemy.stats == null || enemy.token == null) return;
    let autoTurn = enemy.stats.turnFunction;
    if (autoTurn == null || typeof autoTurn != 'function' || enemy.stats.disableAutoTurn === true) return;
    let group_size = enemy.stats.group_size;
    if(group_size == null) {
        if (hasMarker(currentTurn, 'banishment')) {
            emphasis(enemy.token.get('name') + ' is banished and cannot move');
        }
        else if (!hasMarker(currentTurn, 'dead')) {
            echo(enemy.token.get('name') + ' is thinking...');
            enemy.autoTurn(enemy);
        }
        return;
    }
    let groupNumber = Math.ceil((Number(currentTurn.split(" ").slice(-1)))/group_size);
    if (isNaN(groupNumber)) {
        if (hasMarker(currentTurn, 'banishment')) {
            emphasis(enemy.token.get('name') + ' is banished and cannot move');
        }        
        else if (!hasMarker(currentTurn, 'dead')) {
            echo(enemy.token.get('name') + ' is thinking...');
            enemy.autoTurn(enemy);
        }
        return;
    }
    let groupmates = enemies.filter((e) => 
            e.stats == enemy.stats && e.token != null &&
            Math.ceil(Number(e.token.get('name').split(" ").slice(-1))/group_size) == groupNumber && 
            !hasMarker(e.token, 'dead')
    );
    if (groupmates == null) {
        inform('no other enemies in group');
        if (hasMarker(currentTurn, 'banishment')) {
            emphasis(enemy.token.get('name') + ' is banished and cannot move');
        }
        if (!hasMarker(currentTurn, 'dead')) {
            echo(enemy.token.get('name') + ' is thinking...');
            enemy.autoTurn(enemy);
        }
        return;
    }
    for (let i = 0; i < groupmates.length; i++) {
        if (hasMarker(groupmates[i].token, 'banishment')) {
            emphasis(enemy.token.get('name') + ' is banished and cannot move');
        } else if (!hasMarker(groupmates[i].token, 'dead')) {
            echo(groupmates[i].token.get('name') + ' is thinking...');
            let target = await groupmates[i].stats.turnFunction(groupmates[i]);
        }
    }
}

function evaluateEndOfTurnEffects(previousTurn) {
    if (previousTurn == null) return;
    let token = getToken(previousTurn);
    let name = token.get('name');
    if (hasMarker(name, 'concentration')) {
        let badge = getBadge(name, 'concentration');
        let badgeStrs = badge.split("/");
        if (badgeStrs.length > 1) {
            let duration = Number(badgeStrs[1]);
            if(!isNaN(duration)) {
                duration--;
                if (duration > 0) {
                    badgeStrs[1] = duration;
                    clearMarker(name, 'concentration', null, true);
                    addTokenStatusMarker(name, 'concentration', badgeStrs.join("/"));
                } else {
                    dropConcentration(name);
                }
            }
        }
    }
    let enemy = lookupEnemy(previousTurn);
    if (token != null && enemy == null) {
        enemies.forEach((e) => {
            if (e.stats != null && e.stats.endOfTurnTrait != null) e.stats.endOfTurnTrait(e,token);
        });
    }
    let nameSubstrs = previousTurn.split(' ');
    let numberSubstrs = nameSubstrs[nameSubstrs.length - 1].split('-');
    if (numberSubstrs.length == 2) {
        let lowNumber = Number(numberSubstrs[0]);
        let highNumber = Number(numberSubstrs[1]);
        if (!isNaN(highNumber) && !isNaN(lowNumber) && highNumber > lowNumber) {
            debugging('checkingMarkers for ' + currentTurn.substr(0, currentTurn.indexOf(nameSubstrs[nameSubstrs.length-1])) + lowNumber + ' to ' + highNumber);
            for (let i = lowNumber; i <= highNumber; i++) {
                let enemyName = currentTurn.substr(0, currentTurn.indexOf(nameSubstrs[nameSubstrs.length-1])) + i;
                let enemy = lookupEnemy(enemyName);
                evaluateAoeHazards(enemyName, END_OF_TURN);    
                if (enemy != null) {
                    token = enemy.token;
                    let tokenMarkers = getMarkers(token);
                    if(tokenMarkers != null && tokenMarkers.length > 0) {
                        tokenMarkers.forEach((tm) => {
                            let marker = markers.find((m) => m.marker == tm || m.marker == tm.slice(0,tm.indexOf('::')) || m.marker == tm.slice(0,tm.indexOf('@')));
                            if (marker != null && marker.startOfTurnCallback != null) {
                                marker.startOfTurnCallback(token);
                            }
                        });
                    }                    
                }
            }
            return;
        }
    }
    let tokenMarkers = getMarkers(token);
    if(tokenMarkers != null && tokenMarkers.length > 0) {
        tokenMarkers.forEach((tm) => {
           let marker = markers.find((m) => m.marker == tm || m.marker == tm.slice(0,tm.indexOf('::')) || m.marker == tm.slice(0,tm.indexOf('@')));
           if (marker != null && marker.endOfTurnCallback != null) {
               marker.endOfTurnCallback(token);
           }
        });
    }   
    let markerTrackingData = getMarkerTrackingData();
    if (markerTrackingData != null && markerTrackingData.length > 0) {
        debugging('looking at:');
        debugging(markerTrackingData);
        let applicableMarkerTrackers = markerTrackingData.filter(d => d.source.durationRef == token.get('id') && (d.source.duration == 'endOfTurn' || d.source.duration == 'endOfNextTurn'));
        if (applicableMarkerTrackers != null) {
            applicableMarkerTrackers.forEach(t => {
                debugging('analyzing ' + JSON.stringify(t));
                const obj = getObj('graphic', t.source.id);
                if (t.source.duration == 'endOfNextTurn') updateMarkerDuration(t, 'endOfTurn');
                else if (obj != null) {
                    if (t.source.marker != null) clearTokenMarker(obj, t.source.marker);
                    else handleCleanup(obj);
                }
            });
        }
    }    
    evaluateAoeHazards(previousTurn, END_OF_TURN);    
}

function evaluateStartOfTurnEffects(previousTurn) {
    let token = getToken(previousTurn);
    let enemy = lookupEnemy(previousTurn);
    if (token != null && enemy == null) {
        enemies.forEach((e) => {
            if (e.stats != null && e.stats.startOfTurnTrait != null) e.stats.startOfTurnTrait(e,token);
        });
    }
    let nameSubstrs = previousTurn.split(' ');
    let numberSubstrs = nameSubstrs[nameSubstrs.length - 1].split('-');
    if (numberSubstrs.length == 2) {
        let lowNumber = Number(numberSubstrs[0]);
        let highNumber = Number(numberSubstrs[1]);
        if (!isNaN(highNumber) && !isNaN(lowNumber) && highNumber > lowNumber) {
            debugging('checkingMarkers for ' + currentTurn.substr(0, currentTurn.indexOf(nameSubstrs[nameSubstrs.length-1])) + lowNumber + ' to ' + highNumber);
            for (let i = lowNumber; i <= highNumber; i++) {
                let enemyName = currentTurn.substr(0, currentTurn.indexOf(nameSubstrs[nameSubstrs.length-1])) + i;
                let enemy = lookupEnemy(enemyName);
                evaluateAoeHazards(enemyName, START_OF_TURN);        
                if (enemy != null) {
                    token = enemy.token;
                    let tokenMarkers = getMarkers(token);
                    if(tokenMarkers != null && tokenMarkers.length > 0) {
                        tokenMarkers.forEach((tm) => {
                            let marker = markers.find((m) => m.marker == tm || m.marker == tm.slice(0,tm.indexOf('::')) || m.marker == tm.slice(0,tm.indexOf('@')));
                            if (marker != null && marker.startOfTurnCallback != null) {
                                marker.startOfTurnCallback(token);
                            }
                        });
                    }                    
                }
            }
            return;
        }
    }
    let tokenMarkers = getMarkers(token);
    if(tokenMarkers != null && tokenMarkers.length > 0) {
        debugging('got markers for start of turn target:')
        debugging(tokenMarkers);
        tokenMarkers.forEach((tm) => {
            let marker = markers.find((m) => m.marker == tm || m.marker == tm.slice(0,tm.indexOf('::')) || m.marker == tm.slice(0,tm.indexOf('@')));
            if (marker != null && marker.startOfTurnCallback != null) {
                marker.startOfTurnCallback(token);
            }
        });
    }
    let markerTrackingData = getMarkerTrackingData();
    if (markerTrackingData != null && markerTrackingData.length > 0) {
        let applicableMarkerTrackers = markerTrackingData.filter(d => d.source.durationRef == token.get('id') && d.source.duration == 'startOfTurn');
        if (applicableMarkerTrackers != null) {
            applicableMarkerTrackers.forEach(t => {
                const obj = getObj('graphic', t.source.id);
                if (obj != null) {
                    if (t.source.marker != null) clearTokenMarker(obj, t.source.marker);
                    else handleCleanup(obj);
                }
            });
        }
    }    
    evaluateAoeHazards(previousTurn, START_OF_TURN);        
}

function evaluateCurrentTurn(turnOrderInfo) {
    if (turnOrderInfo != null && turnOrderInfo.length > 0) {
        try {
            let turnInfo = JSON.parse(turnOrderInfo)[0];
            if (turnInfo == null || turnInfo.custom == null || turnInfo.custom == "") {
                let token = tokens.find((t) => t.get('id') == JSON.parse(turnOrderInfo)[0].id);
                if (token != null) {
                    if (currentTurn != token.get('name')) {
                        let enemy = lookupEnemy(currentTurn);
                        if (enemy != null && enemy.stats != null && enemy.stats.endOfTurn != null) {
                            enemy.stats.endOfTurn(enemy);
                        }  else if (currentTurn != null) {
                            try {
                                let nameSubstrs = currentTurn.split(' ');
                                let numberSubstrs = nameSubstrs[nameSubstrs.length - 1].split('-');
                                let lowNumber = Number(numberSubstrs[0]);
                                let highNumber = Number(numberSubstrs[1]);
                                if (!isNaN(highNumber) && !isNaN(lowNumber) && highNumber > lowNumber) {
                                    for (let i = lowNumber; i <= highNumber; i++) {
                                        let enemyName = currentTurn.substr(0, currentTurn.indexOf(nameSubstrs[nameSubstrs.length-1])) + i;
                                        let enemy = lookupEnemy(enemyName);
                                        if (enemy != null && enemy.stats != null && enemy.stats.startOfTurn != null) {
                                            enemy.stats.endOfTurn(enemy);
                                        }
                                    }
                                }
                            } catch {
                                log('something went wrong');
                            }   
                        }
                    } 
                    currentTurn = token.get('name');
                    inform('currentTurn: ' + currentTurn);
                }
            } else {
                if (currentTurn != turnInfo.custom) {
                    let enemy = lookupEnemy(currentTurn);
                    if (currentTurn != null) inform('currentTurn: ' + currentTurn);
                    if (enemy != null && enemy.stats != null && enemy.stats.endOfTurn != null) {
                        enemy.stats.endOfTurn(enemy);
                    }  else {
                        try {
                            let nameSubstrs = currentTurn.split(' ');
                            let numberSubstrs = nameSubstrs[nameSubstrs.length - 1].split('-');
                            let lowNumber = Number(numberSubstrs[0]);
                            let highNumber = Number(numberSubstrs[1]);
                            if (!isNaN(highNumber) && !isNaN(lowNumber) && highNumber > lowNumber) {
                                for (let i = lowNumber; i <= highNumber; i++) {
                                    let enemyName = currentTurn.substr(0, currentTurn.indexOf(nameSubstrs[nameSubstrs.length-1])) + i;
                                    let enemy = lookupEnemy(enemyName);
                                    if (enemy != null && enemy.stats != null && enemy.stats.endOfTurn != null) {
                                        enemy.stats.endOfTurn(enemy);
                                    }
                                }
                            }
                        } catch {
                            log('something went wrong');
                        }   
                    }                  
                }
                currentTurn = turnInfo.custom;
                inform('currentTurn: ' + currentTurn);
            }
            let enemy = lookupEnemy(currentTurn);
            if (enemy != null) {
                if(hasMarker(enemy.token, 'banishment')) {
                    emphasis(enemy.token.get('name') + ' is banished and cannot move');
                    advanceTurn();
                } else if (hasMarker(enemy.token, 'dead')) {
                    emphasis(enemy.token.get('name') + ' is dead and cannot move');
                    advanceTurn();
                } else if (enemy.stats != null && enemy.stats.startOfTurn != null) {
                    enemy.stats.startOfTurn();
                }
            } else if (currentTurn != null) {
                try {
                    let nameSubstrs = currentTurn.split(' ');
                    let numberSubstrs = nameSubstrs[nameSubstrs.length - 1].split('-');
                    let lowNumber = Number(numberSubstrs[0]);
                    let highNumber = Number(numberSubstrs[1]);
                    if (!isNaN(highNumber) && !isNaN(lowNumber) && highNumber > lowNumber) {
                        for (let i = lowNumber; i <= highNumber; i++) {
                            let enemyName = currentTurn.substr(0, currentTurn.indexOf(nameSubstrs[nameSubstrs.length-1])) + i;
                            let enemy = lookupEnemy(enemyName);
                            if (enemy != null) {
                                if(hasMarker(enemy.token, 'banishment')) {
                                    emphasis(enemy.token.get('name') + ' is banished and cannot move');
                                    advanceTurn();
                                } else if (hasMarker(enemy.token, 'dead')) {
                                    emphasis(enemy.token.get('name') + ' is dead and cannot move');
                                    advanceTurn();
                                } else if (enemy.stats != null && enemy.stats.startOfTurn != null) {                                
                                    enemy.stats.startOfTurn();
                                }
                            } 
                        }
                    }
                } catch {
                    log('something went wrong');
                }
            }
        } catch {
            warn('failed to parse turn order info from campaign');
        }
        
    } else {
        currentTurn = null;
        warn('currentTurn is null');
    }
}
