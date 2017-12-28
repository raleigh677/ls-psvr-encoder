#!/usr/bin/env node
'use strict'

const analyze = require('./analyze')
const checks = require('./checks')
const encode = require('./encode')
const header = require('./assets/ls')
const path = require('path')
const term = require('terminal-kit').terminal
const argv = require('yargs')
    .usage('Usage: $0 -i /path/to/video.mp4 [options]')
    .alias('i', 'input')
    .nargs('i', 1)
    .describe('i', 'Input video path')
    .alias('p', 'platform')
    .nargs('p', 1)
    .describe('Specify the platform target')
    .choices('p', ['psvr', 'gear', 'daydream'])
    .default('p', 'psvr')
    .alias('d', 'degrees')
    .nargs('d', 1)
    .describe('d', 'Specify video degrees, or 0 for flat/fixed-frame')
    .choices('d', [0, 180, 360])
    .default('d', 0)
    .alias('t', 'type')
    .nargs('t', 1)
    .describe('t', 'Input video type')
    .choices('t', ['sbs', 'ou', 'mono', '2d'])
    .default('t', 'mono')
    .alias('o', 'outputDirectory')
    .nargs('o', 1)
    .describe('o', 'Output directory (default: same as input path)')
    .help('h')
    .alias('h', 'help')
    .example('node $0 -i myvideo.mp4',
             'encode myvideo.mp4 with default options (360 degrees, monoscopic, outputs to same dir as input)')
    .example('node $0 -i myvideo.mp4 -d 180 -t ou',
             'encode 180 degree over-under stereoscopic video')
    .example('node $0 -i myvideo.mp4 -d 360 -t sbs -o /work/encodes',
             'encode 360 degree side-by-side stereoscopic video, output to /work/encodes directory')
    .example('node $0 -i myvideo.mp4 -d 0 -t 2d',
             'encode a 2D flat video for viewing in theater mode')
    .epilog('Email media@littlstar.com for assistance/accolades.\n\nCopyright 2018 Little Star Media, Inc.')
    .demandOption(['i'])
    .showHelpOnFail(false, 'Specify --help for options')
    .argv


/* Handle uncaught errors */

const unhandledRejections = new Map()
process.on('unhandledRejection', (reason, p) => {
  unhandledRejections.set(p, reason)
  term.red(`Unexpected error occurred: ${reason}`)
})
process.on('uncaughtException', (err) => {
  term.red(err)
})
process.on('exit', (code) => {
  term.red(`About to exit with code: ${code}`)
})

term.bold.red(header)

checks.deps().then(appBinaries => {
  term.bold(`Found all necessary dependencies.\n`)
}).catch(err => {
  term.bold(`Dependencies not satisfied. Exiting.\n`)
  process.exit(1)
})


/* Construct the output file name based upon CLI args */

const videoFile = path.resolve(argv.input)
const videoBase = path.basename(videoFile).split('.')[0]
const videoDir = path.dirname(videoFile)
let outputFilePath = `${argv.outputDirectory || videoDir}/${videoBase.toLowerCase()}_${argv.platform}`
switch (argv.degrees) {
  case 360:
  case 180:
    outputFilePath = `${outputFilePath}_${argv.degrees}_${argv.type}.mp4`
    break
  case 0:
    if (argv.type === 'mono' || argv.type === '2d') {
      outputFilePath = `${outputFilePath}_2dff.mp4`
    } else if (argv.type === 'sbs' || argv.type === 'ou') {
      outputFilePath = `${outputFilePath}_3dff_${argv.type}.mp4`
    }
    break
}
term.underline.red(`Outputting PSVR sideload video to ${outputFilePath}\n`)


/* Analyze the video file to determine exact encoding targets
 * Then perform the transcode and output an interleaved MP4 */

analyze(videoFile).then((videoData) => {
  return encode(videoFile, videoData, outputFilePath, argv.platform)
}).then((encodedVideoFile) => {
  term.bold(`Encoding complete. Output path: ${encodedVideoFile}`)
}).catch(err => console.error(err))


