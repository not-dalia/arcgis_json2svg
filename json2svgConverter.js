const fs = require('fs');
const path = require('path');

class JSON2SVGConverter {
  constructor(options) {
    this.svg = {
      width: 0,
      height: 0,
      viewBox: "0 0 0 0",
      g: [],
      attr: {},
      xmlns: "http://www.w3.org/2000/svg"
    };
    this.options = options || {};
    this.minMaxDims = {
      x: {
        min: Infinity,
        max: 0
      },
      y: {
        min: Infinity,
        max: 0
      }
    };
    this.layers = [];
    this.fileNames = new Set();
    this.fileFeatureIndex = {};
    this.loadFiles();
  }

  loadFiles() {
    let fileNames = new Set();
    let combinedFiles = {
      features: []
    };
    this.options.layers && this.options.layers.forEach((layer, li) => {
      layer.source.forEach(s => {
        if (fileNames.has(s)) return;
        fileNames.add(s);
        let rawdata = fs.readFileSync(path.join(__dirname, './Maps/' + s + '.json'));
        let jsonData = JSON.parse(rawdata);
        jsonData.features.forEach((feature) => {
          feature.attributes._fileName = s;
        })
        combinedFiles.features = combinedFiles.features.concat(jsonData.features);
      });
    });
    this.json = combinedFiles;
  }

  generateSVG(filename, cmdOutput) {
    this.generateXMLNSAttributes();
    this.calculateViewBox();
    this.generateLayers();
    this.generateGroups();



    // this.calculateDisplayDims();
    let svg = this.getSVGElement();
    if (filename) fs.writeFile(filename, svg, (err) => {
      // throws an error, you could also catch it here
      if (err) throw err;
      console.log('SVG written to: ' + filename);
    });
    if (cmdOutput) {
      console.log(svg);
    }
    return svg;
  }

  getSVGElement() {
    let svg = `<?xml version="1.0" standalone="no"?>
    <svg xmlns="${this.svg.xmlns}" ${this.getXMLNSAttributes()} viewBox="${this.svg.viewBox}" ${this.svg.width ? 'width="' + this.svg.width + '"' : ''} ${this.svg.height ? 'height="' + this.svg.height + '"' : ''}>`;
    this.svg.g.forEach(g => {
      svg += g + '\n';
    })
    svg += `</svg>`;
    return svg;
  }

  generateXMLNSAttributes() {
    this.svg.attr = {};
    this.options.namespaces && this.options.namespaces.forEach(namespace => {
      this.svg.attr[`xmlns:${namespace.prefix}`] = namespace.value;
    });
  }

  getXMLNSAttributes() {
    let xmlns = "";
    for (let key in this.svg.attr) {
      xmlns += ` ${key}="${this.svg.attr[key]}"`;
    }
    return xmlns;
  }

  generateLayers() {
    this.populateFileNames();

    this.options.layers && this.options.layers.forEach((layer, li) => {
      layer.source.forEach(s => {
        let features = this.json.features.filter(f => f.attributes._fileName === s);
        this.layers[li] = this.layers[li] || {};
        features.forEach((feature, fi) => {
          feature._path = this.getPath(feature)
          feature._groupingId = layer.groupingid.map((groupingId) => {
            return groupingId.map(g => feature.attributes[g]).join(':')
          }).join('|');
          if (!this.layers[li][feature._groupingId]) this.layers[li][feature._groupingId] = [];
          !this.layers[li][feature._groupingId].push(feature);
        })
        this.fileNames.delete(s);
      })
    });
  }

  generateGroups() {
    let groups = []
    this.layers.forEach((layer, i) => {
      let group = this.getGroups(layer, this.options.layers[i].attributes);
      Object.keys(group).forEach(k => {
        groups.push(group[k]);
      })
    })

    groups.forEach((group, i) => {
      let groupPath = group.map(g => g._path).join('\n');
      let layerAttrib = '';
      let layerAttribs = this.options.layers[i].layerattribs;

      if (layerAttribs) {
        layerAttribs.forEach(la => {
          layerAttrib += `${la.name}="${la.value.map(v => {
            if (v[0] != '$') return v;
            else return group[0].attributes[v.substr(1)].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/\'/g, '&apos;');
          }).join('')}"`
        })
      }

      this.svg.g.push(`<g ${layerAttrib}>${groupPath}</g>`);
    })

    let remainingFiles = Array.from(this.fileNames);
    remainingFiles.forEach(s => {
      let fileGroup = '<g>';
      let features = this.json.features.filter(f => f.attributes._fileName === s);
      features.forEach((feature, fi) => {
        let path = this.getPath(feature);
        fileGroup += path + '\n';
      })
      fileGroup += '</g>';
      this.svg.g.push(fileGroup);
    })
  }

  getGroups(layer, attribs) {
    let groups = {};
    let groupIds = Object.keys(layer);
    let groupAttribs = [...attribs];
    for (let i = 0; i < groupIds.length; i++) {
      let groupId = groupIds[i];

      let splitIds = groupId.split('|');
      let currentId = splitIds.splice(0, 1);
      if (currentId == '') return layer;
      let newGroupId = splitIds.join('|');

      if (!groups[newGroupId]) groups[newGroupId] = [];
      let features = layer[groupId];
      let groupObj = {
        ...features[0]
      };
      let groupAttrib = '';
      groupAttribs[0].forEach(ga => {
        groupAttrib += ` ${ga.name}="${ga.value.map(v => {
          if (v[0] != '$') return v;
          else return features[0].attributes[v.substr(1)].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/\'/g, '&apos;');
        }).join('')}"`
      })
      let path = `<g ${groupAttrib}>`;
      features.forEach(f => {
        path = path + f._path + '\n';
      });

      path += `</g>`;
      groupObj._path = path;
      groups[newGroupId].push(groupObj);
    }
    let newAttribs = groupAttribs.slice(1);
    return this.getGroups(groups, newAttribs);
  }

  getPath(feature) {
    let geometry = feature.geometry;
    let svgBody = [];
    let svg = '';
    geometry.rings.forEach((ring, ri) => {
      svgBody[ri] = '';
      ring.forEach((point, pi) => {
        if (pi === 0) {
          svgBody[ri] += `M ${(point[0] - this.minMaxDims.x.min).toFixed(4)} ${(this.minMaxDims.y.max - point[1]).toFixed(4)} `;
        } else {
          svgBody[ri] += `L ${(point[0] - this.minMaxDims.x.min).toFixed(4)} ${(this.minMaxDims.y.max - point[1]).toFixed(4)} `;
        }
      });
    });
    svgBody.forEach(path => {
      svg += `<path d="${path}"/>`;
    });
    return svg;
  }

  populateFileNames() {
    let uniqueFileNames = new Set();
    let fileFeatureIndex = {};
    this.json.features.forEach((feature, fi) => {
      uniqueFileNames.add(feature.attributes._fileName);
      if (!fileFeatureIndex[feature.attributes._fileName]) fileFeatureIndex[feature.attributes._fileName] = [];
      fileFeatureIndex[feature.attributes._fileName].push(fi);
    });
    this.fileNames = uniqueFileNames;
    this.fileFeatureIndex = fileFeatureIndex;
  }

  findMinMaxDims() {
    let minMaxDims = {
      x: {
        min: Infinity,
        max: 0
      },
      y: {
        min: Infinity,
        max: 0
      }
    };
    let features = this.json.features;
    features.forEach((feature) => {
      let geometry = feature.geometry;
      geometry.rings.forEach((ring) => {
        ring.forEach((point) => {
          if (point[0] < minMaxDims.x.min) {
            minMaxDims.x.min = point[0];
          }
          if (point[0] > minMaxDims.x.max) {
            minMaxDims.x.max = point[0];
          }
          if (point[1] < minMaxDims.y.min) {
            minMaxDims.y.min = point[1];
          }
          if (point[1] > minMaxDims.y.max) {
            minMaxDims.y.max = point[1];
          }
        });
      });
    });
    minMaxDims.x.delta = minMaxDims.x.max - minMaxDims.x.min;
    minMaxDims.y.delta = minMaxDims.y.max - minMaxDims.y.min;
    this.minMaxDims = minMaxDims;
  }

  calculateViewBox() {
    this.findMinMaxDims();
    let viewBox = `${0} ${0} ${(this.minMaxDims.x.max - this.minMaxDims.x.min).toFixed(4)} ${(this.minMaxDims.y.max - this.minMaxDims.y.min).toFixed(4)}`;
    this.svg.viewBox = viewBox;
  }
}

module.exports = JSON2SVGConverter;