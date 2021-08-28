const down = require('./down');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('hello')
})
app.get('/run', (req, res) => {
    down.downloadAttach('s1032190276@gmail.com', 'bhxshxn@9', 'bhushanchaudhary3333@gmail.com', 'Aug 27,2021')
    res.send('runned')
})

app.listen(Port, () => {
    console.log('server running')
})