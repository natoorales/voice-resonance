const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    app: './assets/js/src/main.js',
    admin: './assets/js/admin.js' // We'll create a placeholder for this too
  },
  output: {
    path: path.resolve(__dirname, 'assets/js/dist'),
    filename: '[name].min.js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '../css/[name].min.css'
    })
  ],
  resolve: {
    extensions: ['.js', '.css']
  }
};