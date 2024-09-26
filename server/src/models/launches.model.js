const launchesDataBase = require('./launches.mongo');
const planetDataBase = require('./planets.mongo');

const launches= new Map();

const DEFAULT_LAUNCH_NUMBER = 100;

async function existsLaunchWithID(launchID){
    return await launchesDataBase.find({
        flightNumber: launchID,
    });
}

async function scheduleNewLaunch(launch){
    const newFlightNumber = await getLatestLaunchNumber() + 1 ;

    const newlaunch = Object.assign(launch,{
            customers: ['Google', 'Amazon','Microsoft' ],
            upcoming: true,
            success: true,
            flightNumber: newFlightNumber,
        });

    await addLaunches(newlaunch);
}

async function getLatestLaunchNumber() {
    const latestLaunch = await launchesDataBase.findOne().sort('-flightNumber');

    if(!latestLaunch){
        return DEFAULT_LAUNCH_NUMBER;
    }

    return latestLaunch.flightNumber;

}

async function getAllLaunches(){
    return await launchesDataBase.find({},{'__v' : 0 , '_id' : 0});
}

async function addLaunches(launch) {
    const planet = await planetDataBase.findOne({
        keplerName : launch.target
    });

    if(!planet){
        throw new Error(" No matching planet was found");
    }
    
    await launchesDataBase.findOneAndUpdate({
        flightNumber : launch.flightNumber,
    },launch,{
        upsert : true,
    });
}

async function abortLaunchByID(launchID){

    const data = await launchesDataBase.updateOne({
        flightNumber : launchID,
    },{
        upcoming : false,
        success : false,
    });

    return data.modifiedCount === 1;
}

module.exports= {
    getAllLaunches,
    scheduleNewLaunch,
    existsLaunchWithID,
    abortLaunchByID
};