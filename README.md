# Esri ArcGIS JSON2SVG

CLI interface to convert Esri ArcGIS JSON files to SVG format.
**IMPORTANT:** Experimental. Made for a very specific use case. 


## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/esri-arcgis-json2svg.git
   ```

2. Navigate to the project directory:
   ```
   cd esri-arcgis-json2svg
   ```

3. Install dependencies:
   ```
   npm install
   ```

## Usage

Run the converter using the following command:

```
node json2svg [options]
```

### Options:

- `-o, --output`: Specify the output file directory and name for the generated SVG.
- `-q, --options`: Specify the query options file (See the example in `query.json`).
- `-p, --print`: Print the resulting SVG to the terminal.
- `-h, --help`: Display help information.

### Example:

```
node json2svg -q options.json -o output.svg
```
