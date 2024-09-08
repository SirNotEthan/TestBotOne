const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Hello'),
    async execute(interaction) {
        await interaction.reply('Hello')
    }
}