// const sequelize = require('./index');
const Sequelize = require('sequelize')
const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'database.sqlite',
});
const settings = require('./Models/settings.js')
const universe = require('./Models/universe.js')

sequelize.sync({ force: true })
//sequelize.sync({ alter: true })

settings.sync({ force: true })
//settings.sync({ alter: true })

universe.sync({ force: true })
//universe.sync({ alter: true })