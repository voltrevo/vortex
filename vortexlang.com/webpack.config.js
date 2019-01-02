const path = require('path');

module.exports = {
  entry: {
    playground: './src/playground/index.ts',
    'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
	output: {
		globalObject: 'self',
		filename: '[name].bundle.js',
		path: path.resolve(__dirname, 'build', 'webpack')
	},
};
