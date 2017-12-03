/*
 * Copyright 2017 Raphael Guntersweiler
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */
const debug = require('debug')('FileBrowser:HandlebarHelpers');
const package = require(__dirname + '/../package.json');
const config = require('config');

const HandlebarHelpers = {
    package: package,
    registeredMethods: {
        getObjectValue: (object, options) => {
            return options.fn(object[options.hash.key]);
        },
        fileSizes: [
            { maxExp: 1, shortUnit: 'B',  longUnit: 'bytes'    , decimals: 0 },
            { maxExp: 2, shortUnit: 'kB', longUnit: 'kilobytes', decimals: 2 },
            { maxExp: 3, shortUnit: 'MB', longUnit: 'megabytes', decimals: 2 },
            { maxExp: 4, shortUnit: 'GB', longUnit: 'gigabytes', decimals: 2 },
            { maxExp: 5, shortUnit: 'TB', longUnit: 'terabytes', decimals: 2 }
        ],
        formatFileSize: (o) => {
            let lastUnitDef = {};
            for (let size of HandlebarHelpers.registeredMethods.fileSizes) {
                lastUnitDef = size;
                if (o < Math.pow(1024, size.maxExp)) {
                    let result = HandlebarHelpers.roundNumber(o / Math.pow(1024, size.maxExp - 1), size.decimals);
                    return `${result.toFixed(size.decimals)} ${size.shortUnit}`;
                }
            }
            let result = HandlebarHelpers.roundNumber(o / Math.pow(1024, lastUnitDef.maxExp - 1), lastUnitDef.decimals);
            return `${result.toFixed(lastUnitDef.decimals)} ${lastUnitDef.shortUnit}`;
        },
        currentYear: () => new Date().getFullYear(),
        getConfig: (o) => {
            return config.get(o);
        }
    },
    roundNumber: (num, decimals) => {
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
    },
    registerHelperMethods: (hbs) => {
        for (let key in HandlebarHelpers.registeredMethods) {
            debug(` - Registering Helper ${key} ...`);
            hbs.registerHelper(key, HandlebarHelpers.registeredMethods[key]);
        }
    }
};
module.exports = HandlebarHelpers;
