const launchesDataBase = require('./launches.mongo');
const planetDataBase = require('./planets.mongo');

const axios = require('axios');

const launches= new Map();

const DEFAULT_LAUNCH_NUMBER = 100;

const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';

async function populateLaunches() {

    const response = await axios.post(SPACEX_API_URL, {
        query: {},
        options: {
            pagination : false,
            populate: [
                {
                    path: 'rocket',
                    select: {
                        'name': 1
                    }
                },
                {
                    path: 'payloads',
                    select: {
                        'customers': 1
                    }
                }

            ]
        }
    });

    if(response.status != 200){
        console.log("Error Downloading the launch Data");
        throw new Error("Launch Data Download Failed");
    }

    const launchDocs = response.data.docs;

    for(const launchDoc of launchDocs){
        const payloads = launchDoc['payloads'];
        const customers = payloads.flatMap((payload) => {
            return payload['customers'];
        });

        const launch = {
            flightNumber : launchDoc['flight_number'],
            mission : launchDoc['name'],
            rocket : launchDoc['rocket']['name'],
            launchDate : launchDoc['date_local'],
            upcoming : launchDoc['upcoming'],
            success : launchDoc['success'],
            customers,  
        };

        addLaunch(launch);

    }
}

async function loadSpaceXLaunches() {
    console.log("Downloading SpaceX data");

    const firstLaunch = await findLaunch({
        flightNumber : 1,
        rocket : 'Falcon 1',
        mission : 'FalconSat'
    });

    if(firstLaunch){
        console.log('Launch Data already Loaded');
    }
    else{
        await populateLaunches();
    }
   

}

async function findLaunch(filter) {
    return await launchesDataBase.findOne(filter);
}

async function existsLaunchWithID(launchID){
    return await findLaunch({
        flightNumber: launchID,
    });
}

async function scheduleNewLaunch(launch){

    const planet = await planetDataBase.findOne({
        keplerName : launch.target
    });

    if(!planet){
        throw new Error(" No matching planet was found");
    }

    const newFlightNumber = await getLatestLaunchNumber() + 1 ;

    const newlaunch = Object.assign(launch,{
            customers: ['ISRO', 'USSR','Google'],
            upcoming: true,
            success: true,
            flightNumber: newFlightNumber,
        });

    await addLaunch(newlaunch);
}

async function getLatestLaunchNumber() {
    const latestLaunch = await launchesDataBase.findOne().sort('-flightNumber');

    if(!latestLaunch){
        return DEFAULT_LAUNCH_NUMBER;
    }

    return latestLaunch.flightNumber;

}

async function getAllLaunches(limit, offset){
    return await launchesDataBase.find({},{'__v' : 0 , '_id' : 0})
                                 .sort({flightNumber : 1})
                                 .limit(limit)
                                 .skip(offset);
}

async function addLaunch(launch) {    
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
    loadSpaceXLaunches,
    getAllLaunches,
    scheduleNewLaunch,
    existsLaunchWithID,
    abortLaunchByID
};