const { parse } = require('csv-parse');
const fs = require('fs');
const path= require('path');

const planets = require('./planets.mongo');


function isHabitablePlanet(planet) {
  return planet['koi_disposition'] === 'CONFIRMED'
    && planet['koi_insol'] > 0.36 && planet['koi_insol'] < 1.11
    && planet['koi_prad'] < 1.6;
}

function loadPlanetsData(){
    return new Promise((resolve, reject)=>{
    fs.createReadStream(path.join(__dirname,'..','..','data','KEPLER_DATA.csv'))
  .pipe(parse({
    comment: '#',
    columns: true,
  }))
  .on('data',async (data) => {
    if (isHabitablePlanet(data)) {
        await addPlanet(data);
    }
  })
  .on('error', (err) => {
    console.log(err);
    reject();
  })
  .on('end', async() => {
    const habitablePlanetsLength = (await getAllPlanets()).length;
    console.log(`${habitablePlanetsLength} habitable planets found!`);
    resolve();
  });
    });
}

async function getAllPlanets(){
  return await planets.find({});
}

async function addPlanet(planet){

    try {
      await planets.updateOne({
        keplerName : planet.kepler_name,
      },{
        keplerName : planet.kepler_name,
      },{
        upsert : true,
      });
    } catch (error) {
        console.log(`Error occured while adding planet : ${error}`);
    }
    
}


  module.exports={
    getAllPlanets,
    loadPlanetsData
  }