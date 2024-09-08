const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const Settings = require('../Models/settings.js')

async function returnDataKey(key) {
    const settings = await Settings.findAll();
    const dataKey = Object.values(settings).find((setting) => setting.id === key);
    if (dataKey) {
        return dataKey.name;
    }
    return false;
}

module.exports = {
    name: 'unbanModal',
    async execute(interaction) {
        await interaction.deferReply();
        const logChan = await returnDataKey('logChannel')
        const appChan = await returnDataKey('applicationChannel')
        const modChan = await returnDataKey('appealChannel')

        let channelsSet = [];

        if (logChan) {
            const logChannel = interaction.guild.channels.cache.get(logChan)
            channelsSet.push(`Commands will be sent to: ${logChannel}`);
        }

        if (appChan) {
            const appChannel = interaction.guild.channels.cache.get(appChan)
            channelsSet.push(`Application Responses will be sent to: ${appChannel}`);
        }

        if (modChan) {
            channelsSet.push(`Appeal modal will appear on:` + interaction.guild.channels.cache.get(appChan));

            const row = new ActionRowBuilder()
                .addComponents(
                new ButtonBuilder()
                    .setCustomId('submitAppeal')
                    .setLabel('✅ Unban Appeal')
                    .setStyle(ButtonStyle.Secondary),
                );

            const embed = new EmbedBuilder()
                .setTitle('Unban Appeal')
                .setDescription('Please fill out the form below to appeal your ban')
                .setColor('#0099ff')
                .setTimestamp();

            const modChannel = interaction.guild.channels.cache.get(modChan);
            if (!modChannel) {
                interaction.followUp({ content: 'Channel not found', ephemeral: true });
            } else {
                try {
                    await modChannel.send({ embeds: [embed], components: [row] });
                    interaction.followUp({ content: `Modal sent to ${modChannel}`});
                } catch (err) {
                    console.error(err);
                    interaction.followUp({ content: 'Failed to send modal', ephemeral: true });
                    return;
                }
            }
        }
    },
};