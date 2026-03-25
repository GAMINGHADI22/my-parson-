require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Queue & player
let queue = [];
let player = createAudioPlayer();
let connection;
let currentMessage;

// Bot ready
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Play function
function playNext(message) {
  if (queue.length === 0) {
    message.channel.send('Queue sesh 😴');
    return;
  }

  const url = queue[0];

  try {
    const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
    const resource = createAudioResource(stream);

    player.play(resource);
    if (connection) connection.subscribe(player);

    message.channel.send(`🎶 Now playing: ${url}`);
  } catch (err) {
    console.error('YTDL Error:', err);
    message.channel.send('❌ Error playing that track, skipping...');
    queue.shift();
    if (queue.length > 0) playNext(message);
  }
}

// Auto play next track
player.on(AudioPlayerStatus.Idle, () => {
  queue.shift();
  if (queue.length > 0 && currentMessage) {
    playNext(currentMessage);
  }
});

// Message commands
client.on('messageCreate', async message => {
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

  if (command === '!queue') {
    if (queue.length === 0) return message.reply('Queue empty!');
    let list = queue.map((song, i) => `${i + 1}. ${song}`).join('\n');
    message.reply(`📜 Queue:\n${list}`);
  }
});

// Safety check
if (!process.env.TOKEN) {
  console.log("❌ TOKEN missing!");
  process.exit(1);
}

// Login bot
client.login(process.env.TOKEN);
