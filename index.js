const { REST, Routes, Collection, Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.MessageContent] });

const fs = require('node:fs');
const path = require('node:path');
const Sequelize = require('sequelize')
const express = require('express');
// const { data } = require('./Commands/settings');
const app = express()
const datatable = {};

const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'database.sqlite',
});

module.exports = sequelize;

const commandsPath = path.join(__dirname, 'Commands');
const eventsPath = path.join(__dirname, 'Events');

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

client.commands = new Collection();
const commands = [];


for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.on('messageCreate', message => {
    const prefix = "!"
    if(!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(" ");
    if (args[0].toLowerCase() === "get") {
        const player = args[1]
        const playerData = datatable[player]
        if (playerData) {
            message.reply("Player " + player + " has " + playerData.money + " money");
        } else {
            message.reply("Player " + player + " does not exist in the data");
        }
    }
});

app.get("/update", function (req, res) {
    const player = req.query.player
    const money = req.query.money

    if (player && money) {
        if (!datatable[player]) {
            datatable[player] = {}
        }
        datatable[player].money = money
        console.log(`Update ${player} with ${money} money`)
        res.send(`Update ${player} with ${money} money`)
    } else {
        res.status(400).send('Missing player or money data.')
    }
})

app.listen(3000, () => {
    console.log(`Express is on Port 3000`)
})

async function startApp() {
    try {
        await client.login(process.env.TOKEN);
    } catch (error) {
        console.log(`Failed to login | ${error}`);
        process.exit(1);
    }
}

startApp();

module.exports = { client };
