require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const yts = require('yt-search');

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

// Play next track
async function playNext(message) {
  if (queue.length === 0) {
    message.channel.send('Queue sesh 😴');
    return;
  }

  const track = queue[0];
  let url = track.url;

  try {
    const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
    const resource = createAudioResource(stream);

    player.play(resource);
    if (connection) connection.subscribe(player);

    message.channel.send(`🎶 Now playing: **${track.title}**`);
  } catch (err) {
    console.error('YTDL Error:', err);
    message.channel.send('❌ Error playing that track, skipping...');
    queue.shift();
    if (queue.length > 0) playNext(message);
  }
}

// Auto play next
player.on(AudioPlayerStatus.Idle, () => {
  queue.shift();
  if (queue.length > 0 && currentMessage) {
    playNext(currentMessage);
  }
});

// Commands
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const args = message.content.split(' ');
  const command = args[0].toLowerCase();

  if (command === '!play') {
    const query = args.slice(1).join(' ');
    if (!query) return message.reply('Song name or link dao!');

    const vc = message.member.voice.channel;
    if (!vc) return message.reply('Voice e join koro!');

    // Detect if YouTube URL or search by name
    let video;
    if (ytdl.validateURL(query)) {
      const info = await ytdl.getInfo(query);
      video = { title: info.videoDetails.title, url: query };
    } else {
      const result = await yts(query);
      if (!result || !result.videos || result.videos.length === 0) return message.reply('Video pawa jai nai!');
      video = { title: result.videos[0].title, url: result.videos[0].url };
    }

    queue.push(video);

    if (!connection) {
      connection = joinVoiceChannel({
        channelId: vc.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
      });
    }

    currentMessage = message;

    if (queue.length === 1) playNext(message);
    else message.reply('Queue te add hoise ✅');
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
    let list = queue.map((song, i) => `${i + 1}. ${song.title}`).join('\n');
    message.reply(`📜 Queue:\n${list}`);
  }
});

// Safety check
if (!process.env.TOKEN) {
  console.log("❌ TOKEN missing!");
  process.exit(1);
}

client.login(process.env.TOKEN);
