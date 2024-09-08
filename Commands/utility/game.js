const { Collection, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js')
const { Universe } = require('../../Models/universe.js');
const { Settings } = require('../../Models/settings.js');
const axios = require('axios');
const crypto = require('crypto');


async function returnUniverses() {
    try {
        const universes = await Universe.findAll();

        return universes.map((universe) => ({
            name: universe.name,
            id: universe.id
        }));
    } catch (error) {
        console.error('Error fetching universes:', error);
        return [];
    }
}

async function returnDataKey(key) {
    const settings = await Settings.findAll();
    const dataKey = Object.values(settings).find((setting) => setting.id === key);
    if (dataKey) {
        return dataKey.name;
    }
    return false;
}

async function settingsCheck() {
    const msgServAPIKey = await returnDataKey('');
    const datastoreApiKey = await returnDataKey('');

    if (!msgServAPIKey) {
        return false;
    }

    if (!datastoreApiKey) {
        return false;
    }
    return true;
}

async function validatePlayer(userToCheck, userOrID) {
    let baseURL = '';

    if (typeof userOrID === 'string') {
        baseURL = `https://users.roblox.com/v1/usernames/users`;
    } else {
        baseURL = `https://api.roblox.com/users/${userToCheck}`;
    }
    let body = {
      "usernames": [userToCheck],
      "excludeBannedUsers": false
    }
    
    try {
        const response = await axios.post(baseURL, body);
        const returnedData = response.data.data[0];
        if (returnedData.id !== undefined) {
        
            return {id: returnedData.id, name: returnedData.name};
        } else {
            return false;
        }
    } catch (error) {
        return (`Error with name check API: ${error.message}`);
    }
}

async function getAvatarUrl(userId) {
    const robloxResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
    const avatarUrl = robloxResponse.data.data[0].imageUrl;

    if (avatarUrl) {
        return avatarUrl;
    }
  
    return false;
}

async function handleMessageServiceAPI(Data, Topic, UniverseID) {
    const msgServAPIKey = await returnDataKey('msgServAPIKey')

    const jsonData = JSON.stringify(Data)
    try {
        const response = await axios.post(
            `https://apis.roblox.com/messaging-service/v1/universes/${UniverseID}/topics/${Topic}`,
            {
                "message": jsonData
            },
            {
                headers: {
                    'x-api-key': msgServAPIKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.status === 200) {
            return true;
        } else {
            return `**Error:** An unknown issue has occurred.`;
        }
    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            if (status === 401) {
                return (`**Error:** API key not valid for operation, user does not have authorization`);
            } else if (status === 403) {
                return (`**Error:** Publish is not allowed on the universe.`);
            } else if (status === 500) {
                return (`**Error:** Server internal error / Unknown error.`);
            } else if (status === 400) {
                if (error.response.data === "requestMessage cannot be longer than 1024 characters. (Parameter 'requestMessage')") {
                    return (`**Error:** The request message cannot be longer than 1024 characters.`);
                }
                console.log(error.response.data);
                return (`**Error:** Bad request.`);
            } else {
                return (`**Error:** An unknown issue has occurred.`);
            }
        } else {
            return (`Error with messageService API | ${error.message}`);
        }
    }
}

async function handleDatastoreAPI(entryKey, data, universeID) {
    const datastoreApiKey = await returnDataKey('datastoreAPIKey')
    const JSONValue = JSON.stringify(data);
    const contentMD5 = crypto.createHash("md5").update(JSONValue).digest("base64");

    try {
        const response = await axios.post(`https://apis.roblox.com/datastores/v1/universes/${universeID}/standard-datastores/datastore/entries/entry`, JSONValue, {
            params: {
                "datastoreName": "DTR_Production001",
                "entryKey": entryKey
            },
            headers: {
                "x-api-key": datastoreApiKey,
                "content-md5": contentMD5,
                "content-type": "application/json"
            }
        });

        return response.data;
    } catch (error) {
        return (`Error with datastore API | ${error.message}`);
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('game')
        .setDescription('Manage game-related actions')
        .addSubcommand(subcommand => subcommand
            .setName('kick')
            .setDescription('Kick a player from the game')
            .addStringOption(option => option
                .setName('server')
                .setDescription('The Name of the Server to kick the user from')
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addStringOption(option => option
                .setName('player')
                .setDescription('Kick user by Username or User ID')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('reason')
                .setDescription('Reason for kicking the player')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('warn')
            .setDescription('Warn a player in the game')
            .addStringOption(option => option
                .setName('server')
                .setDescription('The name of the server to warn the user')
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addStringOption(option => option
                .setName('player')
                .setDescription('The Player to warn')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('reason')
                .setDescription('Reason for warning the player')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('ban')
            .setDescription('Ban a player from the game')
            .addStringOption(option => option
                .setName('server')
                .setDescription('The name of the Server to ban the user from')
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addStringOption(option => option
                .setName('player')
                .setDescription('The player to ban')
                .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('reason')
                    .setDescription('Reason for banning the player')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option.setName('time')
                    .setDescription('Time to ban the user for')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('length')
                    .setDescription('Length of time to ban the user for')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Minute', value: 'mi' },
                        { name: 'Hour', value: 'hr' },
                        { name: 'Day', value: 'day' },
                        { name: 'Week', value: 'wk' },
                        { name: 'Month', value: 'mo' },
                        { name: 'Year', value: 'yr' },
                    )
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('unban')
            .setDescription('Unban a player from the game')
            .addStringOption(option => option
                .setName('server')
                .setDescription('The name of the server to unban the user from')
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addStringOption(option => option
                .setName('player')
                .setDescription('The player to unban')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('shutdown')
            .setDescription('Shutdown an entire universe')
            .addStringOption(option => option
                .setName('server')
                .setDescription('The name of the server to shutdown')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = await returnUniverses();

        const filtered = choices.filter((choice) => {
            if (typeof focusedValue === 'string') {
                return choice.name.toLowerCase().startsWith(focusedValue.toLowerCase());
            }
            return false;
        });
        await interaction.respond(filtered.map((choice) => ({ name: choice.name, value: choice.id })));
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'kick') {
            const player = interaction.options.getString('player');
            const reason = interaction.options.getString('reason');
            const server = interaction.options.getString('server');

            const usernameOrId = isNaN(player) ? player : Number(player);
            const logSnowflake = await returnDataKey('logChannel');
            let logChannel = false;

            if (logSnowflake) {
                logChannel = interaction.guild.channels.cache.get(logSnowflake)
            }

            try {
                const settingsCheck = await settingsCheck();
                if (!settingsCheck) {
                    const setupEmbed = new EmbedBuilder()
                        .setTitle('Settings Setup: ❌')
                        .setDescription(`Be sure you have configured your API Keys! Run /db `)
                        .setColor('#eb4034')
                        .setTimestamp();

                    await interaction.reply({ embeds: [setupEmbed] });
                } else {
                    const isPlayerValid = await validatePlayer(player, usernameOrId);
                    if (isPlayerValid.id) {
                        const UserId = isPlayerValid.id;
                        const UserAvatar = await getAvatarUrl(UserId);

                        const confirmationEmbed = new EmbedBuilder()
                            .setTitle(`Kick ${player}❓`)
                            .setDescription(`Are you sure you want to kick **${player}**?\n\n**Reason:**\n${reason}`)
                            .setThumbnail(UserAvatar)
                            .setColor('#333333')
                            .setTimestamp();

                        const message = await interaction.reply({ embeds: [confirmationEmbed], fetchReply: true });
                        await message.react('👍');
                        await message.react('👎');

                        const filter = (reaction, user) => {
                            return ['👍', '👎'].includes(reaction.emoji.name) && user.id === interaction.user.id;
                        };

                        message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                            .then(async collected => {
                                const reaction = collected.first();

                                if (reaction.emoji.name === '👍') {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const data = {
                                        Method: 'Warn',
                                        Message: reason,
                                        Time: null,
                                        Length: null,
                                        Player: isPlayerValid.id,
                                    }

                                    try {
                                        const response = await handleMessageServiceAPI(data, 'DTR', server);
                                        const responseColor = response ? '#5dca83' : '#eb4034';

                                        const responseEmbed = new EmbedBuilder()
                                            .setTitle(`📢 Kick ${response ? 'Successful' : 'Failed'}`)
                                            .addFields({ name: 'Username', value: `${isPlayerValid.name}` })
                                            .addFields({ name: 'User ID', value: `${isPlayerValid.id}` })
                                            .setColor(responseColor)
                                            .setThumbnail(UserAvatar)
                                            .setTimestamp();

                                        if (message) {
                                            message.edit({ embeds: [responseEmbed] });

                                            if (logChannel) {
                                                const logEmbed = new EmbedBuilder()
                                                    .setTitle('📝 Command Executed')
                                                    .addFields({ name: 'Administrator', value: `${interaction.user}` })
                                                    .addFields({ name: 'Action', value: `Kick ${player} ${reason}` })
                                                    .setColor('#eb4034')
                                                    .setThumbnail(interaction.user.displayAvatarURL())
                                                    .setTimestamp();

                                                logChannel.send({ embeds: [logEmbed] })
                                            }
                                        } else {
                                            return console.error('No message object found')
                                        }
                                    } catch (error) {
                                        return console.error(`MessageServ API | ${error}`)
                                    }
                                } else {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const updatedEmbed = {
                                        title: '❌ Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Kick Cancelled', value: 'Cancelled the kick process'}
                                        ]
                                    };

                                    await message.edit({ embeds: [updatedEmbed] });
                                }
                            })
                            .catch(error => {
                                if (error instanceof Collection) {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const timeoutEmbed = {
                                        title: '🕔 Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Timeout', value: 'Timed out'}
                                        ]
                                    };
                                    message.edit({ embeds: [timeoutEmbed] });
                                } else {
                                    console.error(`Error awaiting reactions: ${error}`);
                                    interaction.followUp('An error occurred while awaiting reactions.');
                                }
                            });
                    } else if (!isPlayerValid) {
                        await interaction.reply('Unable to find that user on Roblox.');
                    } else {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.reply('An error occurred while trying to fetch data from the Roblox API.');
                        }
                    }
                }
            } catch (err) {
                return console.error(`MessageServiceAPI API | ${err}`)
            }
        } else if (subcommand === 'warn') {
            const player = interaction.options.getString('player');
            const reason = interaction.options.getString('reason');
            const server = interaction.options.getString('server');

            const usernameOrId = isNaN(player) ? player : Number(player);
            const logSnowflake = await returnDataKey('logChannel');
            let logChannel = false;

            if (logSnowflake) {
                logChannel = interaction.guild.channels.cache.get(logSnowflake)
            }

            try {
                const settingsCheck = await settingCheck();
                if (!settingsCheck) {
                    const setupEmbed = new EmbedBuilder()
                    .setTitle('Settings Setup: ❌')
                    .setDescription(`Be sure you have configured your API Keys! Run /db `)
                    .setColor('#eb4034')
                    .setTimestamp();
    
                    await interaction.reply({ embeds: [setupEmbed] });
                } else {
                    const isPlayerValid = await validatePlayer(player, usernameOrId);
    
                    if (isPlayerValid.id) {
                        const UserId = isPlayerValid.id;
                        const UserAvatar = await getAvatarUrl(UserId);
    
                        const confirmationEmbed = new EmbedBuilder()
                            .setTitle(`Warn ${player}❓`)
                            .setDescription(`Are you sure you want to warn **${player}**?\n\n**Reason:**\n${reason}`)
                            .setThumbnail(UserAvatar)
                            .setColor('#333333')
                            .setTimestamp();
                        
                        const message = await interaction.reply({ embeds: [confirmationEmbed], fetchReply: true });
                        await message.react('👍');
                        await message.react('👎');
    
                        const filter = (reaction, user) => {
                            return ['👍', '👎'].includes(reaction.emoji.name) && user.id === interaction.user.id;
                        };
    
                        message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                            .then(async collected => {
                                const reaction = collected.first();

                                if (reaction.emoji.name === '👍') {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const data = {
                                        Method: 'Warn',
                                        Message: reason,
                                        Time: null,
                                        Length: null,
                                        Player: isPlayerValid.id,
                                    }
                                    
                                    try {
                                        const response = await handleMessageServiceAPI(data, 'DTR', server);
                                        const responseColor = response ? '#5dca83' : '#eb4034';

                                        const responseEmbed = new EmbedBuilder()
                                            .setTitle(`📢 Warn ${response ? 'Successful' : 'Failed'}`)
                                            .addFields({ name: 'Username', value: `${isPlayerValid.name}` })
                                            .addFields({ name: 'User ID', value: `${isPlayerValid.id}` })
                                            .setColor(responseColor)
                                            .setThumbnail(UserAvatar)
                                            .setTimestamp();

                                        if (message) {
                                            message.edit({ embeds: [responseEmbed] });

                                            if (logChannel) {
                                                const logEmbed = new EmbedBuilder()
                                                    .setTitle('📝 Command Executed')
                                                    .addFields({ name: 'Administrator', value: `${interaction.user}` })
                                                    .addFields({ name: 'Action', value: `Warn ${player} ${reason}` })
                                                    .setColor('#eb4034')
                                                    .setThumbnail(interaction.user.displayAvatarURL())
                                                    .setTimestamp();

                                                logChannel.send({ embeds: [logEmbed] })
                                            }
                                        } else {
                                            return console.error('No message object found')
                                        }
                                    } catch (error) {
                                        return console.error(`MessageServ API | ${error}`)
                                    }
                                } else {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const updatedEmbed = {
                                        title: '❌ Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Warn Cancelled', value: 'Cancelled the warn process'}
                                        ]
                                    };

                                    await message.edit({ embeds: [updatedEmbed] });
                                }
                            })
                            .catch(error => {
                                if (error instanceof Collection) {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const timeoutEmbed = {
                                        title: '🕔 Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Timeout', value: 'Timed out'}
                                        ]
                                    };
                                    message.edit({ embeds: [timeoutEmbed] });
                                } else {
                                    console.error(`Error awaiting reactions: ${error}`);
                                    interaction.followUp('An error occurred while awaiting reactions.');
                                }
                            });
                    } else if (!isPlayerValid) {
                        await interaction.reply('Unable to find that user on Roblox.');
                    } else {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.reply('An error occurred while trying to fetch data from the Roblox API.');
                        }
                    }
                }
            } catch (err) {
                return console.error(`MessageService API | ${err}`)
            }
        } else if (subcommand === 'ban') {
            const player = interaction.options.getString('player');
            const reason = interaction.options.getString('reason');
            const server = interaction.options.getString('server');
            const TimeToBan = interaction.options.getInteger('time');
            const LengthToBan = interaction.options.getString('length');

            const usernameOrId = isNaN(player) ? player : Number(player);
            const logSnowflake = await returnDataKey('logChannel');
            let logChannel = false;

            if (logSnowflake) {
                logChannel = interaction.guild.channels.cache.get(logSnowflake)
            }

            try {
                const settingsCheck = await settingCheck();
                if (!settingsCheck) {
                    const setupEmbed = new EmbedBuilder()
                    .setTitle('Settings Setup: ❌')
                    .setDescription(`Be sure you have configured your API Keys! Run /db `)
                    .setColor('#eb4034')
                    .setTimestamp();
    
                    await interaction.reply({ embeds: [setupEmbed] });
                } else {
                    const isPlayerValid = await validatePlayer(player, usernameOrId);
    
                    if (isPlayerValid.id) {
                        const UserId = isPlayerValid.id;
                        const UserAvatar = await getAvatarUrl(UserId);
    
                        const confirmationEmbed = new EmbedBuilder()
                            .setTitle(`Ban ${player}❓`)
                            .setDescription(`Are you sure you want to ban **${player}**?\n\n**Reason:**\n${reason}\n\n**Time:**\n${TimeToBan}${LengthToBan}`)
                            .setThumbnail(UserAvatar)
                            .setColor('#333333')
                            .setTimestamp();
                        
                        const message = await interaction.reply({ embeds: [confirmationEmbed], fetchReply: true });
                        await message.react('👍');
                        await message.react('👎');
    
                        const filter = (reaction, user) => {
                            return ['👍', '👎'].includes(reaction.emoji.name) && user.id === interaction.user.id;
                        };
    
                        message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                            .then(async collected => {
                                const reaction = collected.first();

                                if (reaction.emoji.name === '👍') {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const data = {
                                        Method: 'Ban',
                                        Message: reason,
                                        Time: TimeToBan,
                                        Length: LengthToBan,
                                        Player: isPlayerValid.id,
                                        Timestamp: Math.floor(Date.now() / 1000)
                                    }

                                    try {
                                        //const response = await handleMessageServiceAPI(data, 'DTR', server);
                                        const response = await handleDatastoreAPI(isPlayerValid.id, data, server);
                                        const responseColor = response ? '#5dca83' : '#eb4034';

                                        const responseEmbed = new EmbedBuilder()
                                            .setTitle(`📢 Ban ${response ? 'Successful' : 'Failed'}`)
                                            .addFields({ name: 'Username', value: `${isPlayerValid.name}` })
                                            .addFields({ name: 'User ID', value: `${isPlayerValid.id}` })
                                            .setColor(responseColor)
                                            .setThumbnail(UserAvatar)
                                            .setTimestamp();

                                        if (message) {
                                            message.edit({ embeds: [responseEmbed] });

                                            if (logChannel) {
                                                const logEmbed = new EmbedBuilder()
                                                    .setTitle('📝 Command Executed')
                                                    .addFields({ name: 'Administrator', value: `${interaction.user}` })
                                                    .addFields({ name: 'Action', value: `Ban ${player} ${reason} ${TimeToBan}${LengthToBan}` })
                                                    .setColor('#eb4034')
                                                    .setThumbnail(interaction.user.displayAvatarURL())
                                                    .setTimestamp();

                                                logChannel.send({ embeds: [logEmbed] })
                                            }
                                        } else {
                                            return console.error('No message object found')
                                        }
                                    } catch (error) {
                                        return console.error(`Datastore API | ${error}`)
                                    }
                                } else {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const updatedEmbed = {
                                        title: '❌ Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Ban Cancelled', value: 'Cancelled the ban process'}
                                        ]
                                    };

                                    await message.edit({ embeds: [updatedEmbed] });
                                }
                            })
                            .catch(error => {
                                if (error instanceof Collection) {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const timeoutEmbed = {
                                        title: '🕔 Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Timeout', value: 'Timed out'}
                                        ]
                                    };
                                    message.edit({ embeds: [timeoutEmbed] });
                                } else {
                                    console.error(`Error awaiting reactions: ${error}`);
                                    interaction.followUp('An error occurred while awaiting reactions.');
                                }
                            });
                    } else if (!isPlayerValid) {
                        await interaction.reply('Unable to find that user on Roblox.');
                    } else {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.reply('An error occurred while trying to fetch data from the Roblox API.');
                        }
                    }
                }
            } catch (err) {
                return console.error(`MessageServiceAPI API | ${err}`)
            }
            

        } else if (subcommand === 'unban') {
            const player = interaction.options.getString('player');
            const server = interaction.options.getString('server');

            const usernameOrId = isNaN(player) ? player : Number(player);
            const logSnowflake = await returnDataKey('logChannel');
            let logChannel = false;

            if (logSnowflake) {
                logChannel = interaction.guild.channels.cache.get(logSnowflake)
            }

            try {
                const settingsCheck = await settingCheck();
                if (!settingsCheck) {
                    const setupEmbed = new EmbedBuilder()
                    .setTitle('Settings Setup: ❌')
                    .setDescription(`Be sure you have configured your API Keys! Run /db `)
                    .setColor('#eb4034')
                    .setTimestamp();
    
                    await interaction.reply({ embeds: [setupEmbed] });
                } else {
                    const isPlayerValid = await validatePlayer(player, usernameOrId);
    
                    if (isPlayerValid.id) {
                        const UserId = isPlayerValid.id;
                        const UserAvatar = await getAvatarUrl(UserId);
    
                        const confirmationEmbed = new EmbedBuilder()
                            .setTitle(`Unban ${player}❓`)
                            .setDescription(`Are you sure you want to unban **${player}**?`)
                            .setThumbnail(UserAvatar)
                            .setColor('#333333')
                            .setTimestamp();
                        
                        const message = await interaction.reply({ embeds: [confirmationEmbed], fetchReply: true });
                        await message.react('👍');
                        await message.react('👎');
    
                        const filter = (reaction, user) => {
                            return ['👍', '👎'].includes(reaction.emoji.name) && user.id === interaction.user.id;
                        };
    
                        message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                            .then(async collected => {
                                const reaction = collected.first();

                                if (reaction.emoji.name === '👍') {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const data = {
                                        Method: "Unban",
                                        Message: null,
                                        Time: null,
                                        Length: null,
                                        Player: isPlayerValid.id
                                    }

                                    try {
                                        //const response = await handleMessageServiceAPI(data, 'DTR', server);
                                        const response = await handleDatastoreAPI(isPlayerValid.id, data, server);
                                        const responseColor = response ? '#5dca83' : '#eb4034';

                                        const responseEmbed = new EmbedBuilder()
                                            .setTitle(`📢 Unban ${response ? 'Successful' : 'Failed'}`)
                                            .addFields({ name: 'Username', value: `${isPlayerValid.name}` })
                                            .addFields({ name: 'User ID', value: `${isPlayerValid.id}` })
                                            .setColor(responseColor)
                                            .setThumbnail(UserAvatar)
                                            .setTimestamp();

                                        if (message) {
                                            message.edit({ embeds: [responseEmbed] });

                                            if (logChannel) {
                                                const logEmbed = new EmbedBuilder()
                                                    .setTitle('📝 Command Executed')
                                                    .addFields({ name: 'Administrator', value: `${interaction.user}` })
                                                    .addFields({ name: 'Action', value: `Unban ${server} ${player}` })
                                                    .setColor('#eb4034')
                                                    .setThumbnail(interaction.user.displayAvatarURL())
                                                    .setTimestamp();

                                                logChannel.send({ embeds: [logEmbed] })
                                            }
                                        } else {
                                            return console.error('No message object found')
                                        }
                                    } catch (error) {
                                        return console.error(`Datastore API | ${error}`)
                                    }
                                } else {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const updatedEmbed = {
                                        title: '❌ Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Unban Cancelled', value: 'Cancelled the unban process'}
                                        ]
                                    };

                                    await message.edit({ embeds: [updatedEmbed] });
                                }
                            })
                            .catch(error => {
                                if (error instanceof Collection) {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const timeoutEmbed = {
                                        title: '🕒 Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Timeout', value: 'Timed out'}
                                        ]
                                    };
                                    message.edit({ embeds: [timeoutEmbed] });
                                } else {
                                    console.error(`Error awaiting reactions: ${error}`);
                                    interaction.followUp('An error occurred while awaiting reactions.');
                                }
                            });
                    } else if (!isPlayerValid) {
                        await interaction.reply('Unable to find that user on Roblox.');
                    } else {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.reply('An error occurred while trying to fetch data from the Roblox API.');
                        }
                    }
                }
            } catch (err) {
                return console.error(`MessageServiceAPI API | ${err}`)
            }
        } else if (subcommand === 'shutdown') {
            const server = interaction.options.getString('server');

            const data = {
                Method: 'Shutdown'
            }

            try {
                const response = await handleMessageServiceAPI(data, 'DTR', server)
                if (!response) {
                    return console.log(response)
                }
                const responseColor = response ? '#5dca83' : '#eb4034';

                const responseEmbed = new EmbedBuilder()
                    .setTitle(`📢 Shutdown ${response ? 'Successful' : 'Failed'}`)
                    .addFields({ name: 'Server ID', value: `${server}` })
                    .setColor(responseColor)
                    .setTimestamp();

                await interaction.reply({ embeds: [responseEmbed] })
            } catch (err) {
                console.log(err);
            }
        }
    }
}