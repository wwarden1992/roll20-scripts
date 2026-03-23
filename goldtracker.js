var moneyBox = null;
const MONEY_BOX_WIDTH = 210;
const MONEY_BOX_HEIGHT = 280;
const MONEY_TRACKER_TEXT_SIZE = 19;

const moneybagImgsrc = "https://files.d20.io/images/467909326/_BWr5VbPsyhCfAxVRs9pXg/original.png";

var moneyDataStore = null;
var moneyData = null;

const initialMoneyData = {};

on("ready", function(){
    readMoneyData();
    setupMoneyBox();
    
    on("change:campaign:playerpageid", async function() {
        setupMoneyBox();      
    });    
    
    on('chat:message', function(msg) {
        
        if (msg.content.indexOf('!money') == 0) {
            let msgStrs = msg.content.split(' ');
            if (msgStrs.length != 3) {
                warn('malformed money update msg:   ' + msg.content);
                return;
            }
            let operation = msgStrs[1];
            let amt = Number(msgStrs[2]);
            if (isNaN(amt)) {
                warn('attempted to add/remove non-numeric amount:   ' + msg.content);
                return;                
            }
            updateMoney(getPlayerName(msg.playerid), operation, amt);
        }
    });
            
});

function readMoneyData() {
    let handouts = findObjs({type: 'handout', name: 'Gold Tracking'});
    if (handouts != null && handouts.length > 0) {
        moneyDataStore = handouts[0];
    } else {
        moneyDataStore = createObj('handout', {
            name: 'Gold Tracking'
        });
        moneyDataStore.set('notes', JSON.stringify(initialMoneyData));   
        inform('money tracking data file created');
    }
    moneyDataStore.get('notes', function(text) {
        moneyData = JSON.parse(text);
    });
    updateAllBalances();
}

function setupMoneyBox() {
    moneyBox = null;
    let page = getObj('page', Campaign().get('playerpageid'));
    if (page == null) return;
    let h = MONEY_BOX_HEIGHT;
    let w = MONEY_BOX_WIDTH; 
    moneyBox = findObjs({_type: 'path', stroke: '#000000', fill: '#8b4513', layer: 'map', stroke_width: 5, width: w, height: h, _pageid: Campaign().get("playerpageid")});
    if (moneyBox != null && moneyBox.length > 0 ) {
        moneyBox = moneyBox[0];
    }
    else {
        moneyBox = createObj('path', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'map',
            left: w/2,
            top: h/2,
            width: w,
            height: h,
            stroke_width: 5,
            stroke: "#000000",
            fill: "#8b4513",
            path: JSON.stringify([
                ["M",0,0],
                ["L",w,0],
                ["L",w,h],
                ["L",0,h],
                ["L",0,0]
            ])
        });  
        let moneybag = createObj('graphic', {
            _subtype: 'token',
            pageid: Campaign().get("playerpageid"),
            layer: 'objects',
            imgsrc: moneybagImgsrc,
            left: 105,
            top: 35,
            width: 70,
            height: 70,
            name: 'Moneybag',
            showname: false,
            showplayers_name: false,
            has_bright_light_vision: true, 
            bright_light_distance: 25,
            emits_bright_light: true,
            controlledby: 'all'
        });        
        toFront(moneyBox);
        toFront(moneybag);
    }
    updateAllBalances();
}

function updateMoney(name, operation, amt) {
    let activeCharacters = getActiveCharacters();
    let character = Object.keys(characters).find(c => characters[c].controlled_by == name && activeCharacters.includes(c));
    if (character == null) {
        warn('failed to lookup character for ' + name);
        return;
    }
    if (operation == 'Adding/Subtracting') moneyData[character] += amt;
    else if (operation == 'Overwriting') moneyData[character] = amt;
    moneyDataStore.set('notes', JSON.stringify(moneyData));   
    updateAllBalances();
}

function updateAllBalances() {
    let activeCharacters = getActiveCharacters();
    activeCharacters.forEach(c => {
        if (moneyData[c] == null) moneyData[c] = 0;
    });    
    activeCharacters.sort();
    moneyTexts = findObjs({_type: 'text', layer: 'map', font_size: MONEY_TRACKER_TEXT_SIZE, _pageid: Campaign().get("playerpageid")});
    moneyTexts.forEach(t => t.remove());
    let i = 0;
    let total = 0;
    for (const key of activeCharacters) {
        let textColor = '#00FF00';
        const shortName = key.split(' ')[0];
        if (moneyData[key] < 0) textColor = '#FF0000';
        let moneyText = createObj('text', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'map',
            font_size: MONEY_TRACKER_TEXT_SIZE,
            left: MONEY_BOX_WIDTH/2,
            top: 70+i,
            font_family: "Arial",
            color: textColor,
            text: shortName + ': ' + moneyData[key].toLocaleString('en-US') 
        });  
        toFront(moneyText);
        i += MONEY_TRACKER_TEXT_SIZE;
        total += moneyData[key];
    }
    i += MONEY_TRACKER_TEXT_SIZE;
    let textColor = '#00FF00';    
    if (total < 0) textColor = '#FF0000';
    moneyText = createObj('text', {
        _pageid: Campaign().get("playerpageid"),      
        layer: 'map',
        font_size: MONEY_TRACKER_TEXT_SIZE,
        left: MONEY_BOX_WIDTH/2,
        top: 70+i,
        font_family: "Arial",
        color: textColor,
        text: 'TOTAL: ' + total.toLocaleString('en-US') 
    });  
    toFront(moneyText);
}
