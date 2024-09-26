const express= require('express');

const {
    httpGetAllLaunches,
    httpPostLaunch,
    httpDeleteLaunchByID
} = require('./launches.controller');

const launchesRouter= express.Router();


launchesRouter.get('/', httpGetAllLaunches);
launchesRouter.post('/',httpPostLaunch);
launchesRouter.delete('/:id', httpDeleteLaunchByID);


module.exports=launchesRouter;