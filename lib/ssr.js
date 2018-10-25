/**
 * Created by huangw1 on 2018/10/22.
 */

require('push-if')
require('babel-polyfill')
const path = require('path')
const fs = require('fs')
const React = require('react')
const babel = require('babel-core')
const ReactDOMServer = require('react-dom/server')
const webpack = require('webpack')
const DevServer = require('webpack-dev-server')

const makeWebpackConfig = require('./config/webpack.config')

const noCacheRequire = (pkg) => {
    delete require.cache[pkg]
    return require(pkg)
}

const jsxRequireInstall = () => {
    require.extensions['.jsx'] = (module, filename) => {
        const content = fs.readFileSync(filename, { encoding: 'utf8' })
        const code = babel.transform(content, {
            presets: ['env', 'react'],
            plugins: ['transform-regenerator']
        }).code
        module._compile(code, filename)
    }
}
jsxRequireInstall()

const Document = require('./components/Document')
const DEV_SERVER_HOST = '127.0.0.1'
const DEV_SERVER_PORT = 3000

class Ssr {

    constructor(options) {
        this.payload = {}
        this.options = Ssr.makeDefaultOptions(options)
        this.resolveOutput = (...args) => path.resolve(this.options.outputPath, ...args)
        this.resolveBaseDir = (...args) => path.resolve(this.options.baseDir, ...args)
    }

    static makeDefaultOptions(options) {
        let {
            baseDir = '',
            outputPath = path.resolve(baseDir, 'build'),
            publicPath = '/',
            dev = true
        } = options
        if(dev) {
            publicPath = `http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}/`
        }
        return {
            baseDir,
            outputPath,
            publicPath,
            dev
        }
    }

    makePageEntry(options) {
        const pages = {}
        const pagePath = this.resolveBaseDir('./page')
        const pageFileNames = fs.readdirSync(pagePath)
        pageFileNames.forEach((pageName) => {
            pageName = pageName.split('.').slice(0, -1).join('.')
            pages[pageName] = [this.resolveBaseDir('./page', pageName)]
        })
        if(!pages['404']) {
            const source = path.resolve(__dirname, './components/404.js')
            const target = path.resolve(options.baseDir, './page', '404.js')
            return this.copyFile(source, target).then(() => {
                pages['404'] = [this.resolveBaseDir('./page', '404')]
                return pages
            })
        } else {
            return Promise.resolve(pages)
        }

    }

    copyFile(source, target) {
        const rs = fs.createReadStream(source)
        const ws = fs.createWriteStream(target)
        return new Promise((resolve) => {
            ws.on('finish', resolve)
            rs.pipe(ws)
        })
    }

    makeWebpackConfig(options) {
        return this.makePageEntry(options).then((pages) => {
            return makeWebpackConfig({
                ...options,
                pages
            })
        })
    }

    makeCompilerDonePlugin() {
        return {
            apply: (compiler) => {
                compiler.hooks.done.tap('ssr', (stats) => {
                    const statsJson = stats.toJson()
                    if(!statsJson.chunks.find(stat => stat.id === 'vendor')) {
                        this.chunks = statsJson.chunks
                    }
                })
            }
        }
    }

    prepare() {
        return this.makeWebpackConfig({
            ...this.options,
            plugins: [this.makeCompilerDonePlugin()]
        }).then((webpackConfig) => {
            if(this.options.dev) {
                const compiler = webpack(webpackConfig)
                const devServer = new DevServer(compiler, {
                    stats: {
                        colors: true
                    },
                })
                return new Promise((resolve) => {
                    devServer.listen(DEV_SERVER_PORT, DEV_SERVER_PORT, resolve)
                })
            }

            // TODO 独立功能
            return new Promise((resolve, reject) => {
                webpack(webpackConfig, (err) => {
                    if(err) {
                        reject(err)
                    }
                    const assertPath = this.resolveOutput('assert.json')
                    if(fs.existsSync(assertPath)) {
                        reject(`${assertPath} not found.`)
                    } else {
                        this.assertMap = noCacheRequire(assertPath)
                        resolve(this.assertMap)
                    }
                })
            })
        })
    }

    inject(payload) {
        this.payload = payload
    }

    async render(pageName, payload = {}) {
        pageName = pageName.startsWith('/')? pageName.substring(1): pageName
        let page
        let pagePath
        let { dev, publicPath } = this.options
        if(dev) {
            pagePath = this.resolveOutput(`${pageName}.js`)

            if(!fs.existsSync(pagePath)) {
                pagePath = this.resolveOutput(`404.js`)
                page = noCacheRequire(pagePath)
            } else {
                page = noCacheRequire(pagePath)
            }
        } else {
            pagePath = this.resolveOutput(this.assertMap[pageName].js)
            if(fs.existsSync(pagePath)) {
                page = require(pagePath)
            } else {
                page = this.assertMap['404'].js
            }

        }

        // TODO 初始化数据
        let initialProps = {}
        if(page.default.getInitialProps) {
            initialProps = await page.default.getInitialProps({ ...this.payload, ...payload })
        }
        const body = ReactDOMServer.renderToString(React.createElement(page.default, payload))

        let pageScripts = []
        let pageStyles = []
        if(dev) {
            const chunk = this.chunks.find(chunk => chunk.id === pageName)
            if(chunk) {
                // 顺序
                const files = chunk.files
                pageScripts = ['vendor.js', ...files.filter(file => file.endsWith('.js')), 'main.js']
                pageStyles = files.filter(file => file.endsWith('.css'))
            } else {
                pageScripts = ['404.js']
            }
        } else {
            pageScripts = [ this.assertMap['vendor'].js, this.assertMap[pageName].js, this.assertMap['main'].js ]
            pageStyles = pageStyles.pushIf(this.assetsMap[pageName].css, this.assetsMap[pageName])
        }
        return {
            string: ReactDOMServer.renderToString(React.createElement(Document.default, {
                publicPath,
                pageScripts,
                pageStyles,
                pageName,
                body,
                initialProps
            }))
        }
    }
}

module.exports = Ssr