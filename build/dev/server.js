var fs = require('fs')
var express = require('express')
var webpack = require('webpack')
var ora = require('ora')
var open = require("open");
var watch = require('gulp-watch');
var path = require('path')

var child_process = require('child_process');

//https://github.com/ampedandwired/html-webpack-plugin
var HtmlWebpackPlugin = require('html-webpack-plugin')

//https://github.com/webpack/webpack-dev-middleware#usage
var webpackDevMiddleware = require("webpack-dev-middleware");
var webpacHotMiddleware = require('webpack-hot-middleware')

//https://www.npmjs.com/package/write-file-webpack-plugin
var WriteFilePlugin = require('write-file-webpack-plugin');

var config = require('../../config')
var port = process.env.PORT || config.dev.port
var app = express()


//数据库
if (!fs.existsSync("./src/content/xxtebook.db")) {
    console.log('data not available!')
    return
}

var spinner = ora('Begin to pack , Please wait for\n')
spinner.start()

setTimeout(function () {
    spinner.stop()
}, 5000)

if (!fs.existsSync("./src/content/SQLResult.js")) {
    require('./sqlite/index').resolve()
}


//配置dev
var entry = {
    app: config.build.entry
}
Object.keys(entry).forEach(function (name) {
    entry[name] = ['./build/dev/client'].concat(entry[name])
})

var webpackConfig = {
    entry: entry,
    output: {
        path: config.build.assetsRoot,
        publicPath: config.build.assetsPublicPath,
        filename: 'app.js'
    },
    devtool: '#eval-source-map',
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015']
                }
            }
        ]
    },

    plugins: [
        // https://github.com/glenjamin/webpack-hot-middleware#installation--usage
        // 热替换、错误不退出
        new webpack.optimize.OccurenceOrderPlugin(),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin(),

        // 生成html文件
        new HtmlWebpackPlugin({
            filename: './index.html',
            template: './src/index.html',
            inject: true
        }),

        new WriteFilePlugin()
    ]
}

//启动代码测试
//eslint
if (config.dev.eslint.launch) {
    webpackConfig.module.preLoaders = [{
        test: /\.js$/,
        loader: 'eslint',
        include: config.dev.eslint.dir,
        exclude: /node_modules/
    }]
    // community formatter
    webpackConfig.eslint = {
        formatter: require("eslint-friendly-formatter")
    }
}

var compiler = webpack(webpackConfig)


var devMiddleware = webpackDevMiddleware(compiler, {
    //The path where to bind the middleware to the server.
    //In most cases this equals the webpack configuration option output.publicPath
    publicPath: webpackConfig.output.publicPath,

    //Output options for the stats. See node.js API.
    //http://webpack.github.io/docs/node.js-api.html
    stats: {
        //With console colors
        colors: true,
        //add chunk information
        chunks: false
    }
})


//Webpack热重载连接服务器
//https://github.com/glenjamin/webpack-hot-middleware
//Add webpack-hot-middleware attached to the same compiler instance
var hotMiddleware = webpacHotMiddleware(compiler)

// force page reload when html-webpack-plugin template changes
compiler.plugin('compilation', function (compilation) {
    //https://github.com/ampedandwired/html-webpack-plugin
    compilation.plugin('html-webpack-plugin-after-emit', function (data, cb) {
        hotMiddleware.publish({
            action: 'reload'
        })
        cb()
    })
})


// serve webpack bundle output
app.use(devMiddleware)

// enable hot-reload and state-preserving
// compilation error display
app.use(hotMiddleware)


app.use('/lib', express.static('src/lib'));
app.use('/css', express.static('src/css'));
app.use('/images', express.static('src/images'));
app.use('/content', express.static('src/content'));


if (config.dev.debugger.launch) {
    watch(config.build.assetsRoot + '/app.js', function () {
        console.log(
            '\n' +
            ' watch file change.....await....:\n'
        )
        var child = child_process.spawn('node', ['build/dev/build.js', ['debug=' + config.dev.debugger.dir]]);
        // 捕获标准输出并将其打印到控制台 
        child.stdout.on('data', function (data) {
            console.log('pack out：\n' + data);
        });
        // 捕获标准错误输出并将其打印到控制台 
        child.stderr.on('data', function (data) {
            console.log('pack fail out：\n' + data);
        });
        child.on('close', function (code) {
            console.log('pack complete：' + code);
        });
    })
}

module.exports = app.listen(port, function (err) {
    if (err) {
        console.log(err)
        return
    }
    console.log('Listening at http://localhost:' + port + '\n')
})

