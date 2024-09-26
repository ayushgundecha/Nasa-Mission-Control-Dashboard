require('dotenv').config();

const mongoose= require('mongoose');

const MONGO_URL = process.env.MONGO_URL;

mongoose.connection.once('open', ()=> {
    console.log("MongoDB Connection Ready!");
});

mongoose.connection.on('error', (error)=>{
    console.error("error");
});

async function mongoConnection(params) {
    await mongoose.connect(MONGO_URL);
}

module.exports = {
    mongoConnection,
}