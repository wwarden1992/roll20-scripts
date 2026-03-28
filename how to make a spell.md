## **SPELL CREATION WITH AN EXAMPLE - MIND SPIKE**
Let's suppose I wanted to add the second level spell "Mind Spike"
<img width="909" height="522" alt="image" src="https://github.com/user-attachments/assets/d0504169-4cf9-4da6-9160-85a2ff6d5c1a" />
Based on the description, the spell has the following properties: A wisdom saving throw is involved, damage is involved, half damage is done on-save, the spell requires concentration (up to an hour, which is 600 turns), and the target has some kind of mechanical effect applied to it for which we may want a marker.
Of these properties, only two will require input from a user (the rest can be inferred from the character sheet): the target of the spell, and the damage dealt.
Thus, in spelltemplates.js, we'll add the key "MindSpike", and add the Roll Query syntax (and if you're wondering about the "\&#64;", it's for reasons described in the 'HTML Entities' section of the Roll20 Roll Query syntax wiki, see https://wiki.roll20.net/Roll_Query)
<img width="1357" height="579" alt="image" src="https://github.com/user-attachments/assets/5c0dd392-8d00-4c4f-bf9a-391e7c1b3d4c" />
Then in spell7.js, I add my spell to the spellbook
<img width="935" height="552" alt="image" src="https://github.com/user-attachments/assets/042d25de-f9e5-4800-b81d-530f4ca8f220" />
The arguments in order mean: 
- "MindSpike" is the key I want to look for in spelltemplates.js.
- 2 is the lowest level this spell can be cast at.
- The function that describes how this spell operates will be called 'mindSpike'.
- I will provide a sound file named 'mindspike' to the campaign that I want to play when this spell is cast
Now I actually write the 'mindSpike' function in spell7.js, so I'll start by writing this:

<pre>
function mindSpike(params) {
}
</pre>

Just because of the way I've set up spell7, "params" will already have the spell save DC, it'll have the level you're casting it at, and it'll have your selection of target and damage. But you need to specify the damage type, and the ability score for the saving throw. We also want to specify that even on a successful save, you take half damage. So we'll add those in:

<pre>
function mindSpike(params) {
  params.dmgType='psychic';
  params.stat='wis';
  params.onSave=halfDamage;
}
</pre>

I like to give players the option to leave damage blank, and have the spell autoroll damage for them. To do that, I'll use my 'autorollIfNeeded' function. The damage of the spell normally is 3d8, but increases by 1d8 per spell level. So I can express the damage dice as (level+1)d8. Passing that into my function, it'll now look like this:

<pre>
function mindSpike(params) {
  params.dmgType='psychic';
  params.stat='wis';
  params.onSave=halfDamage;  
  params.dmg=autorollIfNeeded(params, (1+Number(params.level)) + 'd8', 'dmg');  
}
</pre>

That says: "check my params for a param called 'dmg'. If it's there, great. If not, roll a number of d8 equal to 1 plus my spell level, and return it".
Now we need to prompt the target to make a saving throw. To do that' we'll use the "rollTokenSave" function, and store the result as params.saved. That way, when we later call 'damageToken', it'll know exactly what happened with the results.

<pre>
function mindSpike(params) {
  params.dmgType='psychic';
  params.stat='wis';
  params.onSave=halfDamage;  
  params.dmg=autorollIfNeeded(params, (1+Number(params.level)) + 'd8', 'dmg');  
  params.saved=rollTokenSave(params.target, params);  
}
</pre>


With that info gathered, we can just say "damageToken(params.target, params);", and the damage gets applied to the target when we cast the spell:

<pre>
function mindSpike(params) {
  params.dmgType='psychic';
  params.stat='wis';
  params.onSave=halfDamage;  
  params.dmg=autorollIfNeeded(params, (1+Number(params.level)) + 'd8', 'dmg');  
  params.saved=rollTokenSave(params.target, params);    
  damageToken(params.target, params);  
}
</pre>

But there's a slight problem that's inherent to javascript. Sometimes when you call functions, it'll just plow on ahead to the next line without waiting for the thing you're doing to finish up. This is true of autorollIfNeeded, rollTokenSave, and damageToken. To put it another way, if we're waiting for a roll to complete in autorollIfNeeded and rollTokenSave, we might try to damage the token before we know if the targed succeeded on its save or how much damage was rolled! That would be bad! The way we get around that is to put the word 'await' before we call autorollIfNeeded and rollTokenSave. This makes it so that you have to wait until the operation on that line succeeds before you go to the next one. But 'await' can only be used by asynchronous functions, so we have to put 'async' before the word 'function' in our definition, or else it makes the sandbox unhappy:

<pre>
async function mindSpike(params) {
  params.dmgType='psychic';
  params.stat='wis';
  params.onSave=halfDamage;  
  params.dmg= await autorollIfNeeded(params, (1+Number(params.level)) + 'd8', 'dmg');  
  params.saved= await rollTokenSave(params.target, params);    
  damageToken(params.target, params);  
}
</pre>

Next we want to put a marker on the caster to say they're concentrating on this, and we also want to put a marker on the target if they fail the save. We'll start with the marker on the token if it failed the save. Note that we WILL have to define a marker for Mind Spike shortly

<pre>
async function mindSpike(params) {
  params.dmgType='psychic';
  params.stat='wis';
  params.onSave=halfDamage;  
  params.dmg= await autorollIfNeeded(params, (1+Number(params.level)) + 'd8', 'dmg');  
  params.saved= await rollTokenSave(params.target, params);    
  damageToken(params.target, params);  
  if (!params.saved) {
    addMarker(params.target, 'mindspike');
  }
}
</pre>

Now let's add concentration for the spell caster. The 'concentrate' method will add the marker and also handle dropping concentration on any other spell they're currently concentrating on. Concentration lasts for 1 hour (600 turns), so we use that as our 3rd arg.

<pre>
async function mindSpike(params) {
  params.dmgType='psychic';
  params.stat='wis';
  params.onSave=halfDamage;  
  params.dmg= await autorollIfNeeded(params, (1+Number(params.level)) + 'd8', 'dmg');  
  params.saved= await rollTokenSave(params.target, params);    
  damageToken(params.target, params);  
  if (!params.saved) {
    addMarker(params.target, 'mindspike');
  }
  concentrate(params.caster, 'Mind Spike', 600);  
}
</pre>

Now let's tie the concentration marker on the caster to the Mind Spike marker on the target. Start by declaring a variable called 'links', that's going to be our fourth arg for concentrate (see explanation of 'concentrate' above, and marker.js section for marker tracking).
If the target fails the save, no marker appears on it and there's nothing to track. And that's reflected in the fact that 'links' stays null. But if it fails, then we get the token id for the target, and specify that we're talking about the 'mindspike' marker on it. Then that'll get passed into concentrate

<pre>
async function mindSpike(params) {
  params.dmgType='psychic';
  params.stat='wis';
  params.onSave=halfDamage;  
  params.dmg= await autorollIfNeeded(params, (1+Number(params.level)) + 'd8', 'dmg');  
  params.saved= await rollTokenSave(params.target, params);    
  damageToken(params.target, params);  
  let links = null;
  let token = getToken(params.target);  
  if (!params.saved) {
    addMarker(params.target, 'mindspike');
    links = [{'id': token.get('id'), 'marker': 'mindspike'}];
  }
  concentrate(params.caster, 'Mind Spike', 600, links);  
}
</pre>

Finally, we might want an FX to appear on the target when we cast the spell. I'm just going to use the roll20 baked in FX to keep it simple.

<pre>
async function mindSpike(params) {
  params.dmgType='psychic';
  params.stat='wis';
  params.onSave=halfDamage;  
  params.dmg= await autorollIfNeeded(params, (1+Number(params.level)) + 'd8', 'dmg');  
  params.saved= await rollTokenSave(params.target, params);    
  damageToken(params.target, params);  
  let links = null;
  let token = getToken(params.target);  
  if (!params.saved) {
    addMarker(params.target, 'mindspike');
    links = [{'id': token.get('id'), 'marker': 'mindspike'}];
  }
  concentrate(params.caster, 'Mind Spike', 600, links); 
  spawnFx(token.get('left'), token.get('top'), 'glow-charm');  
}
</pre>

And that's the full callback!
<img width="618" height="223" alt="image" src="https://github.com/user-attachments/assets/fd122a63-93ad-45ee-b883-ac407804aeda" />

The final thing we'll do is go over to markers.js and add a marker definition here
<img width="997" height="692" alt="image" src="https://github.com/user-attachments/assets/0488f970-0d62-44df-b092-db2e97a7654d" />

Then we'll need to upload an image named 'mindspike' to our own marker set that we've imported into our game (just standard roll20 functionality, not going to walk through that).

Upload a sound file named 'mindspike', and it's done!


Not included on our list of 1st level spells
<img width="328" height="945" alt="image" src="https://github.com/user-attachments/assets/b8faa2ff-dff0-4831-95a2-f4bdeec086af" />

But it included on our list of second level spells
<img width="301" height="1103" alt="image" src="https://github.com/user-attachments/assets/04409c36-163a-43f8-a5eb-3a5d885379aa" />

It prompts me to select a target
<img width="449" height="149" alt="image" src="https://github.com/user-attachments/assets/79201db3-bd4a-463d-83c1-fe0141f55b98" />

It prompts me to specify damage (which I'll leave blank so it can autoroll)
<img width="389" height="194" alt="image" src="https://github.com/user-attachments/assets/8e2b12ac-02fe-4e67-b4af-37f6178a70c7" />

Looks like they succeeded! They don't have the mindspike marker on them
<img width="296" height="195" alt="image" src="https://github.com/user-attachments/assets/2a8a4230-afbc-404e-a56d-18f997955d07" />
<img width="142" height="181" alt="image" src="https://github.com/user-attachments/assets/fc01175e-4e31-4bda-9bc4-f606cf572662" />

Let's try again. This time, they failed!
<img width="277" height="186" alt="image" src="https://github.com/user-attachments/assets/7649e642-ae60-4414-9da5-02b93a280fc9" />
Damage is applied correctly, there's concentration and mindspike markers on the respective characters
<img width="446" height="241" alt="image" src="https://github.com/user-attachments/assets/f01eac37-3b1a-4fe2-9d7f-ba591f350b7c" />

The two markers are logically linked together
<img width="512" height="185" alt="image" src="https://github.com/user-attachments/assets/f231744d-cc4e-4f9c-b3f5-1f451e77a7eb" />

Clearing the concentration marker on Halcyon removed the marker from centurion 1 automatically
<img width="503" height="439" alt="image" src="https://github.com/user-attachments/assets/6818effa-7e8c-4343-acb8-fc547f6a2ca7" />
And the marker tracker cleaned itself up
<img width="529" height="222" alt="image" src="https://github.com/user-attachments/assets/6eeedb93-80a0-48ab-ae2a-2d7676ab51b5" />


