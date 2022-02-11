const JSON2SVGConverter = require('./json2svgConverter');
var argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');
const path = require('path');

function getOptionsData(optionsFile) {
  try {
    let optionsRawData = fs.readFileSync(optionsFile);
    let jsonData = JSON.parse(optionsRawData);
    return jsonData;
  } catch (e) {
    console.error('Error opening options file \n' + e.name + ': ' + e.message);
  }
}

if (argv.h || argv.help) {
  console.log(`
    Usage: node json2svg [options]

    Options:

      -o, --output      output file dir and name
      -q, --options     query options file
      -p, --print       print resulting svg to terminal
  `);
  return;
}

if (!argv.q && !argv.options) {
  console.error('Missing options file');
  return;
}

if (!argv.p && !argv.print && !argv.o && !argv.output) {
  console.warn('Nothing will be output');
}

let options = getOptionsData(argv.q || argv.options);
let json2svg = new JSON2SVGConverter(options);
json2svg.generateSVG(argv.o || argv.output, argv.p || argv.print);




