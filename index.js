const down = require('./downloader/down');
const express = require('express');
const app = express();
const path = require('path')
const port = process.env.PORT || 3000;


app.use(express.static('public'));
app.use(express.json())
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, './views'));
app.use(express.urlencoded({ extened: true }));

app.get('/', (req, res) => {
    res.render('form')
})

app.post('/run', (req, res) => {
    console.log(req.body);
    const { email, password, sender_email, date, time } = req.body;
    down.downloadAttach(email, password, sender_email, date, time);
    res.render('form', { msg: 'done' })
})

app.listen(port, () => {
    console.log('server running')
})