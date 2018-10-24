/**
 * Created by huangw1 on 2018/10/22.
 */

require('push-if')
const path = require('path')
const merge = require('webpack-merge')
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin')
const AssertWebpackPlugin = require('assets-webpack-plugin')
const WriteFileWebpackFile = require('write-file-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const WebpackBar = require('webpackbar')

const resolveLib = (...args) => path.resolve(__dirname, '..', ...args)

module.exports = ({
    baseDir,
    outputPath,
    publicPath,
    dev,
    webpackConfig = {},
    plugins = [],
    pages
}) => {
    const common = merge.smart({
        context: baseDir,
        mode: dev? 'development': 'production',
        resolve: {
            extensions: ['.js', 'jsx']
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['env', 'react'],
                            plugins: ['transform-regenerator']
                        }
                    }
                },
                {
                    test: /\.css$/,
                    exclude: /node_modules/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        { loader: 'css-loader', options: { importLoaders: 1 } }
                    ]
                }
            ]
        },
        plugins: [
            ...plugins,
            new WriteFileWebpackFile(),
            new MiniCssExtractPlugin({
                filename: '[name].css'
            }),
            new FriendlyErrorsWebpackPlugin()
        ].pushIf(!dev, new AssertWebpackPlugin({
            path: outputPath,
            filename: 'assert.json',
            fullPath: false
        })).pushIf(!dev, new WebpackBar())
    }, webpackConfig)

    return [
        merge.smart({
            entry: {
                ...pages,
                main: resolveLib('./client/render')
            },
            externals: {
                'react': 'React',
                'react-dom': 'ReactDOM'
            },
            output: {
                filename: dev? '[name].js': '[name]-[chunkhash].js',
                path: outputPath,
                publicPath,
                library: '__ssr',
                libraryTarget: 'umd',
                globalObject: 'this'
            }
        }, common),
        merge.smart({
            entry: {
                vendor: [ 'babel-polyfill', resolveLib('./client/common')
                ]
            },
            output: {
                filename: dev? '[name].js': '[name]-[chunkhash].js',
                path: outputPath,
                publicPath,
            }
        }, common)
    ]
}