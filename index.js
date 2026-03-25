require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let queue = [];
let player = createAudioPlayer();
let connection;
let currentMessage;

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

function playNext(message) {
  if (queue.length === 0) {
    message.channel.send('Queue sesh 😴');
    return;
  }

  const url = queue[0];

  try {
    const stream = ytdl(url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);

    player.play(resource);
    connection.subscribe(player);

    message.channel.send(`🎶 Now playing: ${url}`);
  } catch (err) {
    message.channel.send('❌ Error playing');
    queue.shift();
    playNext(message);
  }
}

player.on(AudioPlayerStatus.Idle, () => {
  queue.shift();
  if (queue.length > 0 && currentMessage) {
    playNext(currentMessage);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const args = message.content.split(' ');
  const command = args[0];

  if (command === '!play') {
    const url = args[1];
    if (!url) return message.reply('Link dao!');

    const vc = message.member.voice.channel;
    if (!vc) return message.reply('Voice e join koro!');

    queue.push(url);

    if (!connection) {
      connection = joinVoiceChannel({
        channelId: vc.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
      });
    }

    currentMessage = message;

    if (queue.length === 1) {
      playNext(message);
    } else {
      message.reply('Queue te add hoise ✅');
    }
  }

  if (command === '!skip') {
    player.stop();
    message.reply('⏭️ Skip!');
  }

  if (command === '!pause') {
    player.pause();
    message.reply('⏸️ Pause!');
  }

  if (command === '!resume') {
    player.unpause();
    message.reply('▶️ Resume!');
  }
});

// safety check
if (!process.env.TOKEN) {
  console.log("❌ TOKEN missing!");
  process.exit(1);
}

client.login(process.env.TOKEN);
