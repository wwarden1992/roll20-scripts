var fortuneTokenBox = null;
const FT_BOX_WIDTH = 2240;
const FT_BOX_HEIGHT = 140;

const fortuneTokenImgsrc = "https://files.d20.io/images/467510179/wsaiU6s_yUkPxCsV9L8b1g/original.png";
const misfortuneTokenImgsrc = "https://files.d20.io/images/467510178/ncRtrv8hyvM1CMZpn5ln7w/original.png";

const totalTokens = 9; //set to number of players in the campaign

var fortuneTokens = 0;
var fortuneTokenDataStore = null;

var fortuneTokensArray = [];
var misfortuneTokensArray = [];

const initialFortuneTokenData = {
    lastUpdated: (new Date()).toString(),
    fortuneTokens: Math.ceil((1+totalTokens)/2),
    misfortuneTokens: totalTokens - Math.ceil((1+totalTokens)/2)
};

on("ready", function(){
    readTokenData();
    initializeFortuneTokens();
    
    on("change:campaign:playerpageid", async function() {
        initializeFortuneTokens();      
    });    
    
    on('chat:message', function(msg) {
        if (msg.content.indexOf('!fortunetoken') == 0) {
            let msgStrs = msg.content.split(' ');
            if (msgStrs.length != 2) {
                warn('malformed fortune token msg:   ' + msg.content);
                return;
            }
            let tokenType = msgStrs[1];
            if (tokenType == 'fortune') {
                spendFortuneToken(getPlayerName(msg.playerid));
            } else if (tokenType == 'misfortune') {
                spendMisfortuneToken();
            }
        }
    });
            
});

function readTokenData() {
    let handouts = findObjs({type: 'handout', name: 'Fortune Token Tracking'});
    if (handouts != null && handouts.length > 0) {
        fortuneTokenDataStore = handouts[0];
    } else {
        fortuneTokenDataStore = createObj('handout', {
            name: 'Fortune Token Tracking'
        });
        fortuneTokenDataStore.set('notes', JSON.stringify(initialFortuneTokenData));   
        inform('fortune token data file created');
    }
    fortuneTokens = Math.ceil((1+totalTokens)/2);
    fortuneTokenDataStore.get('notes', function(text) {
        let data = JSON.parse(text);
        let lastUpdated = new Date(data['lastUpdated']);
        if (lastUpdated != null && !isNaN(lastUpdated.valueOf())) {
            let now = new Date();
            if (now - lastUpdated < 86400000) {
                fortuneTokens = data['fortuneTokens'];
            }
        }
    });    
}

function initializeFortuneTokens() {
    readTokenData();
    setupFortuneTokenBox();
}

function setupFortuneTokenBox() {
    fortuneTokenBox = null;
    fortuneTokensArray = [];
    misfortuneTokensArray = [];
    let page = getObj('page', Campaign().get('playerpageid'));
    if (page == null) return;
    let pageWidth = 70 * Number(page.get('width'));
    let pageHeight = 70 * Number(page.get('height'));    
    let h = FT_BOX_HEIGHT;
    let w = Math.min(FT_BOX_WIDTH, pageWidth - 2*BOX_WIDTH); //don't make the token box so big it overlaps with the timers
    fortuneTokenBox = findObjs({_type: 'path', stroke: '#00ffff', fill: '#3f3f3f', layer: 'map', stroke_width: 5, width: w, height: h, _pageid: Campaign().get("playerpageid")});
    if (fortuneTokenBox != null && fortuneTokenBox.length > 0 ) {
        fortuneTokenBox = fortuneTokenBox[0];
        fortuneTokensArray = findObjs({_type: 'graphic', name: 'Fortune Token', _pageid: Campaign().get("playerpageid")});
        misfortuneTokensArray = findObjs({_type: 'graphic', name: 'Misfortune Token', _pageid: Campaign().get("playerpageid")});
        fortuneTokensArray.sort((a, b) => a.get('left') - b.get('left'));
        misfortuneTokensArray.sort((a, b) => b.get('left') - a.get('left'));
        log('fortune token array lookup complete');        
    }
    else {
        fortuneTokenBox = createObj('path', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'map',
            left: pageWidth/2,
            top: pageHeight - (h/2),
            width: w,
            height: h,
            stroke_width: 5,
            stroke: "#00ffff",
            fill: "#3f3f3f",
            path: JSON.stringify([
                ["M",0,0],
                ["L",w,0],
                ["L",w,h],
                ["L",0,h],
                ["L",0,0]
            ])
        });  
        tokenDivider = createObj('path', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'map',
            left: pageWidth/2,
            top: pageHeight - (h/2),
            width: 10,
            height: h,
            stroke_width: 5,
            stroke: "#00ffff",
            path: JSON.stringify([
                ["M",0,0],
                ["L",0,h]
            ])
        });  
        lightBox = createObj('path', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'walls',
            left: pageWidth/2,
            top: pageHeight - (h/2),
            width: w,
            height: h,
            stroke_width: 5,
            stroke: "#00ffff",
            path: JSON.stringify([
                ["M",0,0],
                ["L",w,0],
                ["L",w,h],
                ["L",0,h],
                ["L",0,0]
            ])
        });
        let misfortuneTokens = totalTokens - fortuneTokens;
        const tokenWidth = w/(2*totalTokens);
        const tokenHeight = tokenWidth;
        const numTokens = misfortuneTokens+fortuneTokens;
        const initialOffset = tokenWidth/2
        for(let i = 0; i < totalTokens; i++) {
            let fortuneToken = createObj('graphic', {
                _subtype: 'token',
                pageid: Campaign().get("playerpageid"),
                layer: 'objects',
                imgsrc: BLANK_IMG,
                left: pageWidth/2 + i*tokenWidth + initialOffset,
                top: pageHeight - (h/2),
                width: tokenWidth,
                height: tokenHeight,
                name: 'Fortune Token',
                showname: false,
                showplayers_name: false,
                has_bright_light_vision: true,  
                emits_bright_light: true,
                controlledby: 'all' //everyone now controls every token for the sake of sharing vision
            });  
            fortuneTokensArray.push(fortuneToken);
            let misfortuneToken = createObj('graphic', {
                _subtype: 'token',
                pageid: Campaign().get("playerpageid"),
                layer: 'objects',
                imgsrc: BLANK_IMG,
                left: pageWidth/2 - i*tokenWidth - initialOffset,
                top: pageHeight - (h/2),
                width: tokenWidth,
                height: tokenHeight,
                name: 'Misfortune Token',
                showname: false,
                showplayers_name: false,
                has_bright_light_vision: true,  
                emits_bright_light: true,
                controlledby: 'all' //everyone now controls every token for the sake of sharing vision
            });  
            misfortuneTokensArray.push(misfortuneToken);            
        }
        toFront(fortuneTokenBox);
    }
    updateTokenImages();
}

function spendFortuneToken(name) {
    if (fortuneTokens <= 0) {
        emphasis('THE PARTY IS OUT OF FORTUNE TOKENS');
        return;
    }
    emphasis(name.toUpperCase() + ' IS SPENDING A FORTUNE TOKEN');
    fortuneTokens--;
    updateTokenImages();
}

function spendMisfortuneToken() {
    if (fortuneTokens >= totalTokens) {
        emphasis('THE DM IS OUT OF MISFORTUNE TOKENS');
        return;
    }    
    emphasis('THE DM IS SPENDING A MISFORTUNE TOKEN');
    fortuneTokens++;
    updateTokenImages();
}

function updateTokenImages() {
    let misfortuneTokens = totalTokens - fortuneTokens;
    for(const token in fortuneTokensArray) {
        if (token < fortuneTokens) fortuneTokensArray[token].set('imgsrc', fortuneTokenImgsrc);
        else fortuneTokensArray[token].set('imgsrc', BLANK_IMG);
    }
    for(const token in misfortuneTokensArray) {
        if (token < misfortuneTokens) misfortuneTokensArray[token].set('imgsrc', misfortuneTokenImgsrc);
        else misfortuneTokensArray[token].set('imgsrc', BLANK_IMG);
    }
    fortuneTokenData = {
        lastUpdated: (new Date()).toString(),
        fortuneTokens: fortuneTokens,
        misfortuneTokens: totalTokens-fortuneTokens,
    };
    fortuneTokenDataStore.set('notes', JSON.stringify(fortuneTokenData));       
}
