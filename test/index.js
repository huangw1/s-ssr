/**
 * Created by huangw1 on 2018/10/23.
 */

const path = require('path')
const http = require('http')

const Ssr = require('../lib/ssr')

const SERVER_HOST = '127.0.0.1'
const SERVER_PORT = '8080'

const ssr = new Ssr({
    baseDir: path.resolve(__dirname, './'),
})

ssr.prepare().then(() => {
    http.createServer((req, res) => {
        const rendered = ssr.render('page1')
        res.writeHead(200, {
            'Content-Type': 'text/html'
        })
        res.write(rendered.string)
    }).listen(SERVER_PORT, SERVER_HOST, () => { })
})