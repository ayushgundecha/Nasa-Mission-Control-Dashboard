const path= require('path');
const express= require('express');
const cors= require('cors');
const morgan= require('morgan');

const planetsRouter= require('./routes/planets/planet.router');
const launchesRouter= require('./routes/launches/launches.router');

const app= express();

app.use(express.json());
app.use(cors());

app.use(morgan('combined'));

app.use(express.static(path.join(__dirname, '..','public')));

app.use(planetsRouter);
app.use('/launches',launchesRouter);
app.get('/*', (req, res)=> {
    res.sendFile(path.join(__dirname,'..','public', 'index.html'));
});



module.exports=app;