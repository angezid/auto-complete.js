import pkg from './package.json';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import cleanup from 'rollup-plugin-cleanup';
import babel from '@rollup/plugin-babel';
import terser from "@rollup/plugin-terser";

const src = "src/auto-complete.js";

const output = {
    name: 'autoComplete',
    file: pkg.main,
    format: 'umd',
  },
  output_es6 = Object.assign({}, output, {
    format : 'es'
  }),
  plugins = [
    resolve(),
    commonjs(),
    cleanup()
  ],
  pluginsES5 = (() => {
    const newPlugins = plugins.slice();
    newPlugins.push(babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      'presets': [
        ['@babel/preset-env', {
          'modules': false
        }]
      ]/*,
      'plugins': [
        '@babel/plugin-transform-object-assign'
      ]*/
    }));
    return newPlugins;
  })(),
  minifyPlugins = (() => {
    const newPlugins = plugins.slice();
    newPlugins.push(terser());
    return newPlugins;
  })();

// Actual config export
export default [
// es6
{
  input: src,
  output: Object.assign({}, output_es6, {
    file: output_es6.file.replace('.js', '.es6.js')
  }),
  plugins
},
// ES5
{
  input: src,
  output,
  plugins: pluginsES5
},
// minified es6
{
  input: src,
  output : Object.assign({}, output_es6, {
    file: output_es6.file.replace('.js', '.es6.min.js')
  }),
  plugins: minifyPlugins,
},
// minified ES5
{
  input: src,
  output: Object.assign({}, output, {
    file: output.file.replace('.js', '.min.js')
  }),
  plugins: minifyPlugins
}];
