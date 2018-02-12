(function () {
  //"use strict";
  const Discord = require("discord.js");
  const ytdl = require("ytdl-core");
  const bot = new Discord.Client();
  const fs = require("fs");
  const gameData = require("./gameData.js");
  const charClass = require("./characterClass.js");
  const tokenDat = require("./token.js");
  const token = tokenDat.AUTH_TOKEN;

  let characters = JSON.parse(fs.readFileSync("./CharData.json", "utf8"));
  let workLimiter = {};
  let songQueue = [];
  let songTitle = [];
  let streamOptions = {
    seek: 0,
    volume: 1
  };
  let dispatcher = null;
  let musicOptions = {
    volume: 1,
    isChanged: false
  };
  const QUEUE_SIZE = 10;

  /* Back bone of the bot */

  bot.on('ready', () => {
    console.log(`Logged in as ${bot.user.username}!`);
    bot.user.setGame("Type '!syn help' for commands!").then(function() {
      console.log("Game message updated.");
    }, function() {
      console.log("Game message not updated.");
    });
  });

  bot.on("message", m => {
    if (m.author.bot) return;

    if (m.content.indexOf("!syn") === 0) {
      let mArray = m.content.split(" ");
      if (mArray[1].toLowerCase() == "role") {    /* ASSIGN ROLE */
        assignRole(m, mArray[2]);
      } else if (mArray[1].toLowerCase() == "whoinrole") {    /* WHO IS IN A ROLE */
        listPlayersInRole(m, mArray[2]);
      } else if (mArray[1].toLowerCase() == "coinflip") { /* COIN FLIP */
        coinResponse(m);
      } else if (mArray[1].toLowerCase() == "roll") { /* DICE ROLL */
        m.channel.send(diceRoll(mArray[2]));
      } else if (mArray[1].toLowerCase() == "help") {   /* HELP COMMAND */
        m.channel.send(listHelp());
      } else if (mArray[1].toLowerCase() == "listroles") {  /* LIST ROLES */
        m.channel.send(listRoles(m));
      } else if (mArray[1].toLowerCase() == "meeting") {    /* MEETING STUFF */
        if (mArray[2]) {
          if (mArray[2].toLowerCase() == "open") {
            openMeeting(m);
          } else if (mArray[2].toLowerCase() == "close") {
            closeMeeting(m);
          } else {
            m.channel.send("Sorry, I didn't recognize that meeting command.");
          }
        } else {
          let noxusMember = m.guild.roles.find("name", "Noxus Member");
          m.channel.send(`It's meeting time, ${noxusMember}! Please make your way to the meeting room!`);
        }
      } else if (mArray[1].toLowerCase() == "assignnoxus") {       /* ASSIGN NOXUS MEMBER ROLE */
        if (checkHasRoleOrAbove(m)) {
          assignNoxusMember(m);
        }
      } else if (mArray[1].toLowerCase() == "detilthavok") {		/* COMMAND TO REMOVE GUESTS FROM CLAN MEMBERS */
		if (checkHasRoleOrAbove(m)) {
			detilthavok(m);
		}
	  } else if (mArray[1].toLowerCase() == "music") {           /* MUSIC COMMANDS */
        if (mArray[2].toLowerCase() == "play") {
          playStream(m);
        } else if (mArray[2].toLowerCase() == "queue") {
          if (mArray[3]) {
            queueMusic(mArray[3], m);
          } else {
            m.channel.send("Please provide a Youtube URL!");
          }
        } else if (mArray[2].toLowerCase() == "pause") {
          if (dispatcher !== null) {
            dispatcher.pause();
          } else {
            m.channel.send("No music is playing! I can't pause nothing!");
          }
        } else if (mArray[2].toLowerCase() == "resume") {
          if (dispatcher !== null) {
            dispatcher.resume();
          } else {
            m.channel.send("No music is playing! I can't resume nothing!");
          }
        } else if (mArray[2].toLowerCase() == "stop") {
          endMusic(m);
        } else if (mArray[2].toLowerCase() == "volume") {
          if (mArray[3]) {
            musicVolume(m, Number(mArray[3]));
          } else {
            m.channel.send("Please provide a number between 0 and 100!");
          }
        } else if (mArray[2].toLowerCase() == "skip") {
          skipSong(m);
        } else if (mArray[2].toLowerCase() == "purgequeue") {
          songQueue = [];
          songTitle = [];
          m.channel.send("The queue is now empty!");
        } else if (mArray[2].toLowerCase() == "shuffle") {
          if (songQueue.length !== 0 || songQueue.length !== 1) {
            shuffleMusic(songQueue, songTitle);
            m.channel.send("I've shuffled the music queue!");
          } else {
            m.channel.send("I can't shuffle an empty queue/queue of one song!")
          }
        }
      } else {                                    /* COMMAND NOT RECOGNIZED */
        m.channel.send("Sorry, I didn't recognize that command. Use `!syn help` to view all usable commands!");
      }
    } else if (m.content.indexOf("!game") === 0) {
      let mArray = m.content.split(" ");
      if (mArray[1].toLowerCase() == "genchar") {   /* GENERATING NEW CHARACTER */
        gameGenChar(m);
      } else if (mArray[1].toLowerCase() == "work") {     /* WORKING IN GAME */
        gameWork(m, mArray);
      } else if (mArray[1].toLowerCase() == "list") {                        /* LISTING THINGS, LIKE, ALL THE THINGS! */
        if (mArray[2].toLowerCase() == "workplaces") {
          m.channel.send({
            embed: {
              "description": generateTextList(gameData.workplaces, "workplaces")
            }
          });
        } else if (mArray[2].toLowerCase() == "items") {
          m.channel.send({
            embed: {
              "description": generateTextList(gameData.itemList, "items")
            }
          });
        }
      }
      fs.writeFile("./CharData.json", JSON.stringify(characters), (err) => {
        if (err) console.error(err);
      });
    }
  });

  bot.login(token);

  /* COMMANDS */
  const generateTextList = function (list, listName) {
    let ret = "List of " + listName + ":\n```";
    for (let i = 0; i < list.length; i++) {
      ret += list[i].name + "\n";
    }
    return (ret + "```");
  };

  const listRoles = function (mes) {
    const basePos = mes.guild.roles.find("name", "Syn Bot").position;
    const roleArr = mes.guild.roles.array();
    let ret = "Roles you can assign with !syn role ROLENAME: \n```\n";
    for (let i = 0; i < roleArr.length; i++) {
      if (roleArr[i].position < basePos && roleArr[i].position !== 0 && roleArr[i].position !== 1) {
        ret += roleArr[i].name + "\n";
      }
    }
    ret += "```";
    return ret;
  };

  const openMeeting = function (m) {
    if (checkHasRoleOrAbove(m)) {
      m.guild.createChannel("Meetings", "voice").then(function () {
        console.log("Created meeting voice chat successfully.");
      }, function () {
        console.log("Encountered an error when trying to create the meeting voice chat!");
      }).catch(console.error);
      m.guild.createChannel("meeting-chat", "text").then(function () {
        console.log("Created meeting text chat successfully.");
        m.channel.send("@everyone It's time for the meeting! Please make your way into the chat room!\nPlease use #meeting-chat for text conversations relating to the meeting!");
      }, function () {
        console.log("Encountered an error when trying to create the meeting text chat!");
      }).catch(console.error);
    } else {
      m.channel.send("Sorry, you don't have permission to open a meeting. Get a Lieutenant or above!");
    }

  };

  const closeMeeting = function (m) {
    if (checkHasRoleOrAbove(m)) {
      const meetingText = m.guild.channels.find("name", "meeting-chat");
      const meetingVoice = m.guild.channels.find("name", "Meetings");
      meetingText.delete().then(function () {
        console.log("Successfully deleted the meeting text chat.");
      }, function () {
        console.log("Encountered an issue when removing the meeting text chat!");
      }).catch(console.error);
      meetingVoice.delete().then(function () {
        console.log("Successfully deleted the meeting voice chat.");
        m.channel.send("The meeting has been closed! Be there for the next one!");
      }, function () {
        console.log("Encountered an issue when removing the meeting voice chat!");
      }).catch(console.error);
    } else {
      m.channel.send("Sorry, you don't have permission to close a meeting. Get a Lieutenant or above!");
    }
  };

  const assignNoxusMember = function (m) {
    const mem = m.guild.members.array();
    const roleToAdd = m.guild.roles.find("name", "Noxus Member");
    const noxusRolesArr = ["Recruit", "Private", "Sergeant", "Lieutenant", "Captain", "General", "Section Leader", "Division Leader", "Community Leader"];
    for (let i = 0; i < mem.length; i++) {
      if (mem[i].hoistRole) {
        if (noxusRolesArr.indexOf(mem[i].hoistRole.name) >= 0) {
          mem[i].addRole(roleToAdd).then().catch(console.error);
        }
      }
    }
  };
  
  const detilthavok = function(m) {
	  const mem = m.guild.members.array();
	  const roleToDelete = m.guild.roles.find("name", "Guest");
	  const noxusRolesArr = ["Recruit", "Private", "Sergeant", "Lieutenant", "Captain", "General", "Section Leader", "Division Leader", "Community Leader"];
	  for (let i = 0; i < mem.length; i++) {
		  if (mem[i].hoistRole) {
			  if (noxusRolesArr.indexOf(mem[i].hoistRole.name) >= 0) {
				  mem[i].removeRole(roleToDelete).then().catch(console.error);
			  }
		  }
	  }
  };

  const assignRole = function (m, rolename) {
    try {
      const role = m.guild.roles.find("name", rolename);
      m.guild.member(m.author).addRole(role).then(function () {
        m.channel.send(m.author.username + ", you've been assigned the role " + role.name);
      }, function () {
        m.channel.send("That role isn't accessible!");
      }).catch(console.error);
    } catch (err) {
      m.channel.send("That role doesn't exist or you typed it wrong! Roles are case sensitive!");
      console.log(m.author.username + " tried to assign the non-existant role: " + rolename);
    }
  };

  const listPlayersInRole = function (m, rolename) {
    try {
      const role = m.guild.roles.find("name", rolename);
      const players = role.members.array();
      let ret = `Players apart of ${role.name} in ${m.guild.name}:\n`;
      ret += "```\n";
      for (let i = 0; i < players.length; i++) {
        if (players[i].nickname !== null) {
          ret += players[i].nickname + "\n";
        } else {
          ret += players[i].user.username + "\n";
        }
      }
      ret += "```";
      if (players.length > 10) {
        m.author.send(ret).then(function () {
          console.log(`Sent DM of players in ${role.name} to: ${m.author.user.username}`);
        }, function () {
          m.channel.send("Sorry, I wasn't able to DM you the list of players. Lists with more than 10 players will be DM'd to whoever used the command as to prevent flooding the server. Please check your settings!");
        }).catch(console.error);
      } else {
        m.channel.send(ret);
      }
    } catch (err) {
      m.channel.send("Sorry, that role doesn't exist. Roles are case sensitive. Use `!syn listroles` to see all available roles and their spelling.");
      console.log(m.author.username + " tried to view players in the non-existant role: " + rolename);
    }
  };


  const diceRoll = function (info) {
    const dind = info.indexOf("d");
    const num = info.substring(0, dind);
    const face = info.substring(dind + 1);
    if (num > 100 || face > 100) {
      return ("Sorry, I only support rolling 100 dice, or dice with 100 or less faces.");
    } else {
      return roll(num, face);
    }
  };

  const listHelp = function () {
    const commands = ["role", "listroles", "whoinrole", "coinflip", "roll", "meeting", "music", "help"];
    const usage = ["!syn role ROLENAME", "!syn listroles", "!syn whoinrole ROLENAME", "!syn coinflip", "!syn roll #d#", "!syn meeting [open/close]", "!syn music [play/queue/skip/stop/volume/pause/resume/purgequeue/shuffle] <SONG URL/Volume level (0-100)>", "!syn help"];
    const desc = ["Used to join a role for a game and opt in for @ pings related to that group.",
      "Lists all roles that can be assigned with !syn role ROLENAME.",
      "Sends a list of all players belonging to the specified role. If the list is more than 10 players it will be DM'd to you. Otherwise it is sent to the channel. This is done to prevent flooding the channel.",
      "Flips a coin! You\'ll get heads or tails back.",
      "Rolls a specificed number of dice with as many faces as provided. Maxes out at 100 rolls with 100 faces.",
      "Creates or removes a text and voice channel named #meeting-chat and Meetings respectively depending on whether `open` or `close` was typed. Only usable by a Lieutenant or above.",
      "Play: the music bot joins your voice channel and starts playing queued music.\nQueue: add a youtube URL after and the bot will add that video's audio to the queue.\nSkip, Pause, Resume: all fairly self explanatory.\nStop: the bot will leave the channel and clear any remaining songs in the queue.\nPurgeQueue: removes all songs from the queue.\nVolume: give it a number from 0 to 100 and it will set the bot's volume as that number.\nShuffle: this will randomize the order of songs in the queue. If music is already playing, that won't be shuffled.\n\nPlease note, default volume level is 25%, and be careful when setting the bot to 100%.",
      "Provides you with a list of commands as well as a description and their usage."];
    let ret = "";
    for (let i = 0; i < commands.length; i++) {
      if (i != 5) {
        ret += "**Command: **" + commands[i] + "\n";
        ret += "**Usage: **`" + usage[i] + "`\n";
        ret += desc[i] + "\n\n";
      }
    }
    return ret;
  };


  const joinVoiceChannel = function (channelName, m) {
    vChannelArr = m.guild.channels.findAll("type", "voice");
    vChannel = null;
    for (let i = 0; i < vChannelArr.length; i++) {
      if (vChannelArr[i].name == channelName) {
        vChannel = vChannelArr[i];
      }
    }
    if (vChannel) {
      vChannelID = vChannel.id;
      vChannel.join().then(connection => function () {
        console.log("Connected to: " + vChannel.name);

      })
        .catch(console.error);
    } else {
      m.channel.send("Sorry, I wasn't able to find that channel!");
    }
  };


  const coinFlip = function () {
    return (Math.floor(Math.random() * 2) === 0) ? "Heads" : "Tails";
  };

  const coinResponse = function (m) {
    m.channel.send(coinFlip() + "!");
  };


  /* HELPER METHODS */
  const getChannelByName = function (name) {
    const channel = bot.channels.find(val => val.name === name);
    return channel;
  };

  const getRandom = function (n) {
    return Math.floor((Math.random() * n) + 1);
  };

  const roll = function (num, faces) {
    let ret = "Rolling " + num + "d" + faces + "\'s. Rolled: `[";
    let total = 0;
    for (var i = 0; i < num; i++) {
      let nn = getRandom(faces);
      total += nn;
      if (i !== 0) {
        ret += ",";
      }
      ret += nn;
    }
    ret += "]` for a total of: " + total;
    return ret;
  };


  const checkHasRoleOrAbove = function (m) {
    const baseCheck = m.guild.roles.find("name", "Lieutenant").position;
    const userRoleArr = m.guild.member(m.author).roles.array();
    for (let i = 0; i < userRoleArr.length; i++) {
      if (userRoleArr[i].position >= baseCheck) {
        return true;
      }
    }
    return false;
  };



  /* GAME COMMANDS AND WHATNOT */
  const gameWork = function (m, mArray) {
    if (characters[m.author.id]) {
      const place = gameData.workplaces[gameData.workplaceMap[mArray.splice(2, 2).join(" ")]];
      if (!workLimiter[m.author.id]) {
        place.work(characters[m.author.id]);
        m.channel.send({
          embed: {
            "description": `${characters[m.author.id].name} went off to work at the ${place.name}. They were paid ${place.pay} gold and gained ${place.baseStatGain} point(s) in ${place.statToGrow}.`
          }
        });
        workLimiter[m.author.id] = Math.floor(Date.now() / 1000);
      } else {
        let diff = (Math.floor(Date.now() / 1000) - workLimiter[m.author.id]);
        if (diff >= place.workLength) {
          place.work(characters[m.author.id]);
          m.channel.send({
            embed: {
              "description": `${characters[m.author.id].name} went off to work at the ${place.name}. They were paid ${place.pay} gold and gained ${place.baseStatGain} point(s) in ${place.statToGrow}.`
            }
          });
          workLimiter[m.author.id] = Math.floor(Date.now() / 1000);
        } else {
          m.channel.send("Sorry, you can't do that right now. Please wait " + (place.workLength - diff) + " more seconds.");
        }
      }
    } else {
      m.channel.send("You don't have a character yet! Generate one with `!game genchar`!");
    }
  };

  const gameGenChar = function (m) {
    if (!characters[m.author.id]) {
      let char = new charClass(m.author.username);
      characters[m.author.id] = char;
      m.channel.send("Your character has been generated!");
      m.channel.send({
        embed: {
          "title": `@${m.author.username}'s Character`,
          "fields": [
            {
              "name": "**Character Information**",
              "value": `Name: ${char.name}\nRace: ${char.race}\nClass: ${char.class}\nLevel: ${char.level}`
            },
            {
              "name": "**Stats**",
              "value": `Strength: ${char.stats[0].point}\nDexterity: ${char.stats[1].point}\nConstitution: ${char.stats[2].point}\nIntelligence: ${char.stats[3].point}\nWisdom: ${char.stats[4].point}\nLuck: ${char.stats[5].point}`
            }
          ]
        }
      });
      console.log(`${m.author.username} has generated a character!`);
    } else {
      m.channel.send("You already have a character!");
    }
  };


  /* MUSIC COMMANDS */
  const playStream = function (m) {
    if (dispatcher === null) {
      if (m.member.voiceChannel) {
        if (songQueue.length !== 0) {
            m.member.voiceChannel.join().then(connection => {
              dispatcher = connection.playStream(songQueue[0], streamOptions);
              dispatcher.setVolume(0.25);     //Defaulting the volume to 25% at start
              if (musicOptions.isChanged) {
                dispatcher.setVolume(musicOptions.volume);
              }
              m.channel.send("Starting to play: " + songTitle[0] + "\nThere are " + (songQueue.length - 1) + " other songs in the queue.");

              dispatcher.on("end", () => {
                dispatcher = null;
                playNextInQueue(m);
              });
              dispatcher.on("error", (err) => {
                console.log(err);
              });
          }).catch(console.error);
        }
      }
    }
  };

  const queueMusic = function (songUrl, m) {
    if (songQueue.length < QUEUE_SIZE) {
      let info = ytdl.getInfo(songUrl, function(err, stuff) {
        if (err) {
          throw err;
        } else {
          songTitle.push(stuff.title);
        }
      });
      let stream = ytdl(songUrl, { filter: 'audioonly' }).on("error", (err) => {
        console.log("Issue with adding a song to the queue!");
        m.channel.send("Sorry, there was an issue adding that song to the queue. The video isn't available to me.");
        stream = null;
      }).on("readable", () => {
        if (songQueue.indexOf(stream) == -1) {
          songQueue.push(stream);
          if (dispatcher === null) {
            m.channel.send("The song was added to the queue! There are currently " + songQueue.length + " songs in the queue.");
          } else {
            m.channel.send("The song was added to the queue! There are currently " + (songQueue.length - 1) + " songs in the queue and there is one song playing, for a total of " + songQueue.length + ".");
          }
        }
      });
    } else {
      m.channel.send("Sorry, the music queue is full!");
    }
  };

  const playNextInQueue = function (m) {
    songQueue.splice(0, 1);
    songTitle.splice(0, 1);
    if (songQueue.length !== 0) {
      playStream(m);
    } else {
      m.channel.send("I'm out of songs to play!");
      m.member.voiceChannel.connection.disconnect();
      dispatcher = null;
      musicOptions.volume = 1;
      musicOptions.isChanged = false;
    }
  };

  const endMusic = function (m) {
    if (dispatcher !== null) {
      songQueue = [];
      songTitle = [];
      dispatcher.end();
      dispatcher = null;
      musicOptions.volume = 0.25;
      musicOptions.isChanged = false;
    } else {
      m.channel.send("I'm not playing any music! Should I just end the world...?");
    }
  };

  const skipSong = function(m) {
    if (dispatcher !== null) {
      dispatcher.end();
      dispatcher = null;
    }
  };

  const shuffleMusic = function(songs, titles) {
    if (dispatcher === null) {
      shuffle(songs, titles);
    } else {
      let song = songs[0];
      let title = titles[0];
      songs.splice(0,1);
      titles.splice(0,1);
      shuffle(songs, titles);
      songs.unshift(song);
      titles.unshift(title);
    }
  };

  const shuffle = function(songs, titles) {
    for (let i = songs.length; i; i--) {
      let j = Math.floor(Math.random() * i);
      [songs[i-1], songs[j]] = [songs[j], songs[i-1]];
      [titles[i-1], titles[j]] = [titles[j], titles[i-1]];
    }
  };

  const musicVolume = function(m, val) {
    if (dispatcher !== null) {
      if (0 <= val <= 100) {
        dispatcher.setVolume(val/100);
        musicOptions.volume = (val/100);
        musicOptions.isChanged = true;
        m.channel.send(`Music volume set to ${val}%`);
      } else {
        m.channel.send("Please enter a number between 0 and 100!");
      }
    } else {
      m.channel.send("I'm not playing any music. Please don't ask me to change the volume.");
    }
  };

})();