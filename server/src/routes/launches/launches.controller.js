const {
    getAllLaunches,
    scheduleNewLaunch,
    existsLaunchWithID,
    abortLaunchByID
}= require('../../models/launches.model');

async function httpGetAllLaunches (req, res){
   return res.status(200).json(await getAllLaunches());
}

async function httpPostLaunch(req, res){

    const launch=req.body;
    if(!launch.mission || !launch.rocket || !launch.target || !launch.launchDate){
       return res.status(400).json({
            error: 'Missing required Launch property'
        });
    }
    launch.launchDate= new Date(launch.launchDate);
    if(isNaN(launch.launchDate)){
        return res.status(400).json({
            error:'Invalid Date '
        });
    }

    await scheduleNewLaunch(launch);
    return res.status(201).json(launch);
}

async function httpDeleteLaunchByID(req, res){
    const launchID = Number(req.params.id);
    const existPlanet = await existsLaunchWithID(launchID);

    if(!existPlanet){
       return res.status(404).json({
            error: 'launch not found',
        });
    }
   const launch = abortLaunchByID(launchID);

   if(!launch){
        return res.status(400).json({
            error : 'launch not aborted.'
        });
   }

   return res.status(200).json({
     ok : true,
   });
    
}

module.exports={
    httpGetAllLaunches,
    httpPostLaunch,
    httpDeleteLaunchByID
}