# UBC CPEN 442 - Assignment 3 (VPN)

## Pre-requisites

Your computer must have `git` and `node` installed.  
We used Node.js version 12.18.4 LTS for development.

&nbsp;

## Usage

1. `git clone https://github.com/442JARM/VPN.git`
2. `cd A3`
3. `npm install`
4. `npm start`

### If `npm start` doesn't do anything

To solve this:
1. `vim ~/.npmrc`
2. change the line `ignore-scripts=true` to `ignore-scripts=false`.
3. Try `npm start`

If it shows an error message about node_modules... <br/>
1. `cd node_modules`<br/>
2. `rm -r electron`<br/>
3. `cd ...` 
4. `npm install` & `npm start`
