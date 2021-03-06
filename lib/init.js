'use strict'

const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const ejs = require('ejs');
const jsyaml = require('js-yaml');

var chalk       = require('chalk');
var clear       = require('clear');
var CLI         = require('clui');
var figlet      = require('figlet');
var inquirer    = require('inquirer');

const Utils = require('./utils');

const template = `{
    "AWSTemplateFormatVersion": "2010-09-09",
    "Description": "CloudFormation template",
    "Parameters": {},
    "Resources": {},
    "Mappings": {},
    "Outputs": {}
}
`

const config = `{
  "region": "<%- region %>",
  "templateName": "<%- templateName %>",
  "stackName": "<%- stackName %>",
  "s3": {
    "bucket": "<%- bucket %>",
    "key": "<%- key %>"
  },
  "src": "<%- src %>",
  "dist": "<%- dist %>"
}
`

module.exports = function init(dir) {
  showTitle();
  initialPrompt(createFiles);
}

function showTitle() {
  clear();
  console.log(
    chalk.yellow(
      figlet.textSync('Cfn', { horizontalLayout: 'full' })
    )
  );
}

function initialPrompt(fn) {
  Utils.describeRegions().then(regions => {
    let defaultStackName = path.basename(process.cwd());
    let questions = [
      {
        name: 'stackName',
        type: 'input',
        message: 'input your stack name',
        default: defaultStackName,
        validate: (input) => { return required(input, "stack name is required") }
      },
      {
        name: 'region',
        type: 'list',
        message: 'select a region of stack',
        choices: regions.map(r => r.RegionName),
        validate: (input) => { return required(input, "region is required") }
      },
      {
        name: 'templateFormat',
        type: 'list',
        message: 'select a region of stack',
        choices: [ 'json', 'yaml' ],
        default: 'json',
        validate: (input) => { return required(input, "template format is required") }
      },
      {
        name: 'templateName',
        type: 'input',
        message: 'input root template file name',
        default: 'template',
        validate: (input) => { return required(input, "root template file name is required") }
      },
      {
        name: 'src',
        type: 'input',
        message: 'input template source directory',
        default: 'src',
        validate: (input) => { return required(input, "template source directory is required") }
      },
      {
        name: 'dist',
        type: 'input',
        message: 'input template distination directory',
        default: 'dist',
        validate: (input) => { return required(input, "template distination directory is required") }
      },
      {
        name: 'bucket',
        type: 'input',
        message: 'input bucket name to upload template',
        default: 'YOUR_BUCKET_NAME',
        validate: (input) => { return required(input, "bucket name is required") }
      },
      {
        name: 'key',
        type: 'input',
        message: 'input object key of template (optional)',
      },
    ];

    inquirer.prompt(questions).then(fn);
  });
}

function required(value, message) {
  if (value) {
    return true;
  } else {
    return message;
  }
}

function createFiles(opt) {
  let templateFormat = opt.templateFormat;
  let templateName = opt.templateName;
  let src = opt.src;

  let templateNameExt = `${templateName}.${templateFormat}.ejs`;
  let srcPath = path.resolve(src);
  let templatePath = path.join(srcPath, templateNameExt);
  let configPath = path.resolve('./cfn.json');

  let body = template;
  if (templateFormat === 'yaml') {
    body = jsyaml.safeDump(jsyaml.safeLoad(body));
  }

  Utils.mkdir(srcPath);
  fs.writeFileSync(templatePath, body, { encoding: 'utf8' });
  console.log(`create ${templatePath}`);

  opt.templateName = templateNameExt;
  let configStr = ejs.render(config, opt, { filename: 'cfn.json' });
  fs.writeFileSync(configPath, configStr, { encoding: 'utf8' });
  console.log(`create ${configPath}`);
}
