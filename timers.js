var turnTimers = [];
var activeTimer = null;
var timerBox = null;
var timerText = null;
var dmTimerBox = null;
var dmTimerText = null;
var specialTimerBox = null;
var specialTimerText = null;
var timersActive = false;
var dmRoundTime = null;
var specialTimerTime = null;
var specialTimerRunning = false;

const TIMER_TEXT_SIZE = 70;
const DM_TIMER_TEXT_SIZE = 71;
const SPECIAL_TIMER_TEXT_SIZE = 72;
const BOX_WIDTH = 280;
const BOX_HEIGHT = 140;
const DM_TIME_PER_ROUND = 900;
const BLANK_IMG = 'https://files.d20.io/images/439157863/Z3JovwujPR1LQ8FW5CcgTg/thumb.png';

on("ready", function(){
    
    initializeTimers();
    monitorTurnTimers();
    specialTimerRunning = false;
    
    on("change:campaign:playerpageid", async function() {
        initializeTimers();      
    });
    
    on('chat:message', function(msg) {
        if (msg.content.indexOf('!timers') == 0 && playerIsGM(msg.playerid)) {
            let msgStrs = msg.content.split(' ');
            if (msgStrs.length == 2) {
                if (msgStrs[1] == 'on') {
                    initializeTimers();
                    timersActive = true;
                }
                else if (msgStrs[1] == 'off') timersActive = false;
                else if (msgStrs[1] == 'add') addMinuteToTimer();
                else if (msgStrs[1] == 'toggle_special') specialTimerRunning = !specialTimerRunning;
            } else if (msgStrs.length == 3 && msgStrs[1] == 'dmTime') {
                if (msgStrs[2].indexOf(':') > 0) {
                    let timeTokens = msgStrs[2].split(':');
                    dmRoundTime = 60*Number(timeTokens[0]) + Number(timeTokens[1]);
                }
                else dmRoundTime = Number(msgStrs[2]);
                if (isNaN(dmRoundTime)) dmRoundTime = DM_TIME_PER_ROUND;
            } else if (msgStrs.length == 3 && msgStrs[1] == 'special') {
                specialTimerRunning = true;
                if (msgStrs[2].indexOf(':') > 0) {
                    let timeTokens = msgStrs[2].split(':');
                    specialTimerTime = 60*Number(timeTokens[0]) + Number(timeTokens[1]);
                }
                else specialTimerTime = Number(msgStrs[2]);
                if (isNaN(specialTimerTime)) specialTimerTime = null;
                else initializeSpecialTimer();
            }
        }
    });    
    
});
    
function initializeTimers() {
    getTimerBox();
    getTimerText();  
    getDmTimerBox();
    getDmTimerText();       
}

function initializeSpecialTimer() {
    getSpecialTimerBox();
    getSpecialTimerText();
}

function addMinuteToTimer() {
    if (activeTimer != null && activeTimer['time'] != null) {
        activeTimer['time'] += 60;

        let turnOrderInfo = Campaign().get('turnorder');
        if (turnOrderInfo == null) return;
        turnOrderInfo = JSON.parse(turnOrderInfo);  
        let dmTurn = false;
        if (currentTurn == null && turnOrderInfo != null && turnOrderInfo.length > 0) {
            let token = tokens.find((t) => t.get('id') == turnOrderInfo[0].id);
            if (token != null) {
                currentTurn = token.get('name');
                if (token.get('controlledby') == getGM()) dmTurn = true;
            }
        }
        if (currentTurn != null) {
            let token = tokens.find((t) => t.get('name') == currentTurn);
            if (token != null && token.get('controlledby') == getGM()) dmTurn = true;  
        }
        if (!dmTurn) updateTimerDisplay(activeTimer['time']);
        else updateDmTimerDisplay(activeTimer['time']);    
    }
}

function monitorSpecialTimer() {
    if (!isNaN(specialTimerTime) && specialTimerTime > 0 && specialTimerRunning) {
        updateSpecialTimerDisplay(--specialTimerTime);
    }
}

function updateSpecialTimerDisplay(timeSec) {
    if(specialTimerText == null) return;
    if(timeSec <= 0) {
        specialTimerBox.remove();
        specialTimerText.remove();
        emphasis('TIMER EXPIRED!');
        return;
    }
    let minutes = Math.floor(timeSec/60);
    let seconds = timeSec % 60;
    if (seconds < 10) seconds = "0" + seconds;
    specialTimerText.set('text', minutes + ":" + seconds);
}

function updateDmTimerDisplay(timeSec) {
    if(dmTimerText == null) return;
    let minutes = Math.floor(timeSec/60);
    let seconds = timeSec % 60;
    if (seconds < 10) seconds = "0" + seconds;
    dmTimerText.set('text', minutes + ":" + seconds);
}

function updateTimerDisplay(timeSec) {
    if(timerText == null) return;
    let minutes = Math.floor(timeSec/60);
    let seconds = timeSec % 60;
    if (seconds < 10) seconds = "0" + seconds;
    timerText.set('text', minutes + ":" + seconds);
}

function getDmTimerText() {
    dmTimerText = null;
    dmTimerText = findObjs({_type: 'text', font_size: DM_TIMER_TEXT_SIZE, _pageid: Campaign().get("playerpageid")});
    if (dmTimerText != null && dmTimerText.length > 0) dmTimerText = dmTimerText[0];
    else {
        let page = currentPage = getObj('page', Campaign().get('playerpageid'));
        if (page == null) return;
        let pageWidth = 70 * Number(page.get('width'));
        let pageHeight = 70 * Number(page.get('height'));
        
        dmTimerText = createObj('text', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'map',
            font_size: DM_TIMER_TEXT_SIZE,
            left: (BOX_WIDTH/2),
            top: pageHeight - (BOX_HEIGHT/2),
            font_family: "Arial",
            stroke: "#00FF00",
            color: "#00FF00",
            text: "00:00"
        });  
        toFront(dmTimerText);
    }
    
}

function getSpecialTimerText() {
    specialTimerText = null;
    specialTimerText = findObjs({_type: 'text', font_size: SPECIAL_TIMER_TEXT_SIZE, _pageid: Campaign().get("playerpageid")});
    if (specialTimerText != null && specialTimerText.length > 0) specialTimerText = specialTimerText[0];
    else {
        let page = currentPage = getObj('page', Campaign().get('playerpageid'));
        if (page == null) return;
        let pageWidth = 70 * Number(page.get('width'));
        let pageHeight = 70 * Number(page.get('height'));
        
        specialTimerText = createObj('text', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'map',
            font_size: TIMER_TEXT_SIZE,
            left: (BOX_WIDTH/2),
            top: (BOX_HEIGHT/2),
            font_family: "Arial",
            stroke: "#FF0000",
            color: "#FF0000",
            text: "00:00"
        });  
        toFront(specialTimerText);
    }
}

function getTimerText() {
    timerText = null;
    timerText = findObjs({_type: 'text', font_size: TIMER_TEXT_SIZE, _pageid: Campaign().get("playerpageid")});
    if (timerText != null && timerText.length > 0) timerText = timerText[0];
    else {
        let page = currentPage = getObj('page', Campaign().get('playerpageid'));
        if (page == null) return;
        let pageWidth = 70 * Number(page.get('width'));
        let pageHeight = 70 * Number(page.get('height'));
        
        timerText = createObj('text', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'map',
            font_size: TIMER_TEXT_SIZE,
            left: pageWidth - (BOX_WIDTH/2),
            top: pageHeight - (BOX_HEIGHT/2),
            font_family: "Arial",
            stroke: "#FF0000",
            color: "#FF0000",
            text: "00:00"
        });  
        toFront(timerText);
    }
}

function getDmTimerBox() {
    dmTimerBox = null;
    dmTimerBox = findObjs({_type: 'path', stroke: '#000000', layer: 'map', stroke_width: 5, width: BOX_WIDTH, height: BOX_HEIGHT, fill: '#006600', _pageid: Campaign().get("playerpageid")});
    if (dmTimerBox != null && dmTimerBox.length > 0 ) dmTimerBox = dmTimerBox[0];
    else {
        let page = currentPage = getObj('page', Campaign().get('playerpageid'));
        if (page == null) return;
        let pageWidth = 70 * Number(page.get('width'));
        let pageHeight = 70 * Number(page.get('height'));
        
        dmTimerBox = createObj('path', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'map',
            fill: "#006600",
            left: (BOX_WIDTH/2),
            top: pageHeight - (BOX_HEIGHT/2),
            width: BOX_WIDTH,
            height: BOX_HEIGHT,
            stroke_width: 5,
            stroke: "#000000",
            path: JSON.stringify([
                ["M",0,0],
                ["L",280,0],
                ["L",280,140],
                ["L",0,140],
                ["L",0,0]
            ])
        });  
        dmLightBox = createObj('path', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'walls',
            left: (BOX_WIDTH/2),
            top: pageHeight - (BOX_HEIGHT/2),
            width: BOX_WIDTH,
            height: BOX_HEIGHT,
            stroke_width: 5,
            stroke: "#00ffff",
            path: JSON.stringify([
                ["M",0,0],
                ["L",280,0],
                ["L",280,140],
                ["L",0,140],
                ["L",0,0]
            ])
        });  
        let timerVis = createObj('graphic', {
            _subtype: 'token',
            pageid: Campaign().get("playerpageid"),
            layer: 'objects',
            imgsrc: BLANK_IMG,
            left: (BOX_WIDTH/2),
            top: pageHeight - (BOX_HEIGHT/2),
            width: 70,
            height: 70,
            name: 'DM Timer Light',
            showname: false,
            showplayers_name: false,
            has_bright_light_vision: true,  
            emits_bright_light: true,
            //controlledby: playerid
            controlledby: 'all' //everyone now controls every token for the sake of sharing vision
        });         
        toFront(dmTimerBox);
    }
}

function getSpecialTimerBox() {
    specialTimerBox = null;
    specialTimerBox = findObjs({_type: 'path', stroke: '#000000', layer: 'map', stroke_width: 5, width: BOX_WIDTH, height: BOX_HEIGHT, fill: '#000000', _pageid: Campaign().get("playerpageid")});
    if (specialTimerBox != null && specialTimerBox.length > 0 ) specialTimerBox = specialTimerBox[0];
    else {
        let page = currentPage = getObj('page', Campaign().get('playerpageid'));
        if (page == null) return;
        let pageWidth = 70 * Number(page.get('width'));
        let pageHeight = 70 * Number(page.get('height'));
        
        specialTimerBox = createObj('path', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'map',
            fill: "#000000",
            left: (BOX_WIDTH/2),
            top: (BOX_HEIGHT/2),
            width: BOX_WIDTH,
            height: BOX_HEIGHT,
            stroke_width: 5,
            stroke: "#000000",
            path: JSON.stringify([
                ["M",0,0],
                ["L",280,0],
                ["L",280,140],
                ["L",0,140],
                ["L",0,0]
            ])
        });  
        lightBox = createObj('path', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'walls',
            left: (BOX_WIDTH/2),
            top: 0 - (BOX_HEIGHT/2),
            width: BOX_WIDTH,
            height: BOX_HEIGHT,
            stroke_width: 5,
            stroke: "#00ffff",
            path: JSON.stringify([
                ["M",0,0],
                ["L",280,0],
                ["L",280,140],
                ["L",0,140],
                ["L",0,0]
            ])
        });
        let timerVis = createObj('graphic', {
            _subtype: 'token',
            pageid: Campaign().get("playerpageid"),
            layer: 'objects',
            imgsrc: BLANK_IMG,
            left: (BOX_WIDTH/2),
            top: 0 - (BOX_HEIGHT/2),
            width: 70,
            height: 70,
            showname: false,
            name: 'Player Timer Light',
            showplayers_name: false,
            has_bright_light_vision: true,  
            emits_bright_light: true,
            //controlledby: playerid
            controlledby: 'all' //everyone now controls every token for the sake of sharing vision
        });        
        toFront(specialTimerBox);
    }
}

function getTimerBox() {
    timerBox = null;
    timerBox = findObjs({_type: 'path', stroke: '#000000', layer: 'map', stroke_width: 5, width: BOX_WIDTH, height: BOX_HEIGHT, fill: '#660000', _pageid: Campaign().get("playerpageid")});
    if (timerBox != null && timerBox.length > 0 ) timerBox = timerBox[0];
    else {
        let page = currentPage = getObj('page', Campaign().get('playerpageid'));
        if (page == null) return;
        let pageWidth = 70 * Number(page.get('width'));
        let pageHeight = 70 * Number(page.get('height'));
        
        timerBox = createObj('path', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'map',
            fill: "#660000",
            left: pageWidth - (BOX_WIDTH/2),
            top: pageHeight - (BOX_HEIGHT/2),
            width: BOX_WIDTH,
            height: BOX_HEIGHT,
            stroke_width: 5,
            stroke: "#000000",
            path: JSON.stringify([
                ["M",0,0],
                ["L",280,0],
                ["L",280,140],
                ["L",0,140],
                ["L",0,0]
            ])
        });  
        lightBox = createObj('path', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'walls',
            left: pageWidth - (BOX_WIDTH/2),
            top: pageHeight - (BOX_HEIGHT/2),
            width: BOX_WIDTH,
            height: BOX_HEIGHT,
            stroke_width: 5,
            stroke: "#00ffff",
            path: JSON.stringify([
                ["M",0,0],
                ["L",280,0],
                ["L",280,140],
                ["L",0,140],
                ["L",0,0]
            ])
        });
        let timerVis = createObj('graphic', {
            _subtype: 'token',
            pageid: Campaign().get("playerpageid"),
            layer: 'objects',
            imgsrc: BLANK_IMG,
            left: pageWidth - (BOX_WIDTH/2),
            top: pageHeight - (BOX_HEIGHT/2),
            width: 70,
            height: 70,
            showname: false,
            name: 'Player Timer Light',
            showplayers_name: false,
            has_bright_light_vision: true,  
            emits_bright_light: true,
            //controlledby: playerid
            controlledby: 'all' //everyone now controls every token for the sake of sharing vision
        });        
        toFront(timerBox);
    }
}

function monitorTurnTimers() {
    let previousTurn = null;
    setInterval(() => {
        monitorSpecialTimer();
        if (!timersActive) return;
        let turnOrderInfo = Campaign().get('turnorder');
        if (turnOrderInfo == null) return;
        turnOrderInfo = JSON.parse(turnOrderInfo);  
        let dmTurn = false;
        if (currentTurn == null) {
            let token = tokens.find((t) => t.get('id') == turnOrderInfo[0].id);
            if (token != null) {
                currentTurn = token.get('name');
                if (token.get('controlledby') == getGM()) dmTurn = true;
            }
        }
        if (currentTurn != null) {
            let token = tokens.find((t) => t.get('name') == currentTurn);
            if (token != null && token.get('controlledby') == getGM()) dmTurn = true;  
        }
        let timerJustInitialized = false;
        activeTimer = turnTimers[dmTurn ? 'The DM' : currentTurn];
        if(activeTimer == null || activeTimer['time'] == null) {
            activeTimer = {'time': dmTurn ? ( dmRoundTime != null ? dmRoundTime : DM_TIME_PER_ROUND) : 240};
            timerJustInitialized = true;
            turnTimers[(dmTurn ? 'The DM' : currentTurn)] = activeTimer;
        }
        if (!dmTurn && (previousTurn != currentTurn && turnOrderInfo != null && turnOrderInfo.length > 0)) {
            let timeFromLastTurn = Math.max(0,Math.min(120, activeTimer['time']));
            activeTimer['time'] = 240 + (timerJustInitialized ? 0 : timeFromLastTurn);
        } else {
            activeTimer['time']--;
        }
        
        if (previousTurn != currentTurn && turnOrderInfo != null && turnOrderInfo.length > 1) {
           if ((turnOrderInfo[0].pr > turnOrderInfo[turnOrderInfo.length - 1].pr) || turnOrderInfo.length == 1) {
               turnTimers['The DM'] = {'time': (dmRoundTime != null ? dmRoundTime : DM_TIME_PER_ROUND)};
               updateDmTimerDisplay(turnTimers['The DM'].time);
           } 
        }
        if (activeTimer['time'] == 60) {
            emphasis(currentTurn + ' has one minute left to complete their turn!');
        }
        if (activeTimer['time'] <= 0) {
            emphasis(currentTurn + ' hesitates and misses their chance to act');
            advanceTurn();
        } else {
            if (!dmTurn) updateTimerDisplay(activeTimer['time']);
            else updateDmTimerDisplay(activeTimer['time']);            
        }   
        previousTurn = currentTurn;
    }, 1000);
}

