const http = require('http');

require('dotenv').config();

const app = require('./app');

const {mongoConnection} = require('./services/mongo');

const {loadPlanetsData}= require('./models/planets.model');

const {loadSpaceXLaunches} = require('./models/launches.model');

const server= http.createServer(app);

const PORT= process.env.PORT || 8000;


 async function startServer(){
        await mongoConnection(); // establishing mongo connection
        await loadPlanetsData(); // fetching planets data
        await loadSpaceXLaunches(); // fetching SpaceX launches
        server.listen(PORT, ()=> {
            console.log(`listening to the ${PORT} PORT `);
        });
    }

    startServer();

