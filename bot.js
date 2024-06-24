const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
const TOKEN = ""; // Replace with your bot token

const LAST_MESSAGE_DIR = "last_message";
if (!fs.existsSync(LAST_MESSAGE_DIR)) {
  fs.mkdirSync(LAST_MESSAGE_DIR);
}

const serversToScan = [
  {
    id: "1254782687995236434",
    name: "t1",
    channels: {
      "1254782687995236437": {
        keywords_to_roles: {
          "Series 1": "Series1Role",
          "Series 2": "Series2Role",
        },
      },
    },
  },
  {
    id: "1254784473900253235",
    name: "vtest3",
    channels: {
      "1254784473900253238": {
        keywords_to_roles: {
          "Series 5": "Series5Role",
        },
      },
    },
  },
];

const myServerId = "1254784535426629712";

const channelsToPost = {
  Series1Role: "1254790441354919948",
  Series2Role: "1254790441354919948",
  Series3Role: "1254790469368676403",
  Series4Role: "1254790469368676403",
  Series5Role: "1254790485902360587",
};

function loadLastMessageId(serverId, channelId) {
  try {
    const filePath = path.join(
      LAST_MESSAGE_DIR,
      `${serverId}_${channelId}.txt`
    );
    if (fs.existsSync(filePath)) {
      return parseInt(fs.readFileSync(filePath, "utf8").trim());
    } else {
      return 0;
    }
  } catch (error) {
    console.error(
      `Error loading last message ID for ${serverId}/${channelId}: ${error}`
    );
    return 0;
  }
}

function saveLastMessageId(serverId, channelId, lastMessageId) {
  try {
    const filePath = path.join(
      LAST_MESSAGE_DIR,
      `${serverId}_${channelId}.txt`
    );
    fs.writeFileSync(filePath, lastMessageId.toString(), "utf8");
  } catch (error) {
    console.error(
      `Error saving last message ID for ${serverId}/${channelId}: ${error}`
    );
  }
}

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  // Load last message IDs
  for (const server of serversToScan) {
    for (const channelId in server.channels) {
      server.channels[channelId].lastMessageId = loadLastMessageId(
        server.id,
        channelId
      );
    }
  }
  // Start scanning channels for new messages
  await scanChannels();
});
async function scanChannels() {
  try {
    for (const server of serversToScan) {
      for (const channelId in server.channels) {
        const channelData = server.channels[channelId];
        const channel = client.channels.cache.get(channelId);
        if (channel) {
          let lastMessageId = channelData.lastMessageId || 0;
          const messages = await channel.messages.fetch({
            limit: 100,
            after: lastMessageId,
          });
          messages.forEach((message) => {
            if (message.id > lastMessageId) {
              for (const [keyword, role] of Object.entries(
                channelData.keywords_to_roles
              )) {
                if (message.content.includes(keyword)) {
                  const resolution = checkForResolution(message.content);
                  if (resolution) {
                    notifyMyServer(role, resolution, message).catch((err) =>
                      console.error(`Error notifying server: ${err}`)
                    );
                  }
                }
              }
              lastMessageId = message.id;
            }
          });
          channelData.lastMessageId = lastMessageId;
          saveLastMessageId(server.id, channelId, lastMessageId);
        } else {
          console.log(
            `Channel ${channelId} not found or bot does not have access.`
          );
        }
      }
    }
  } catch (error) {
    console.error(`An error occurred: ${error}`);
  } finally {
    setTimeout(scanChannels, 20000); // Wait 20 seconds before scanning again
  }
}

async function notifyMyServer(roleName, resolution, message) {
  const guild = client.guilds.cache.get(myServerId);
  if (guild) {
    const role = guild.roles.cache.find((r) => r.name === roleName);
    if (role) {
      const channelId = channelsToPost[roleName];
      if (channelId) {
        const channel = guild.channels.cache.get(channelId);
        if (channel) {
          const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
          await channel.send(
            `${role.toString()} New update: ${roleName} - ${resolution}\nOriginal Message: ${messageLink}`
          );
        }
      }
    }
  }
}

function checkForResolution(content) {
  const resolutions = ["480p", "720p", "1080p", "2160p", "4K"];
  for (const resolution of resolutions) {
    if (content.includes(resolution)) {
      return resolution;
    }
  }
  return null;
}

client.login(TOKEN);
