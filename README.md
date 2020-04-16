# Homebridge Arduino

[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Requirements

- [Homebridge](https://github.com/homebridge/homebridge) - *HomeKit support for the impatient*

## Installation

1. Install this plugin `npm install -g homebridge-arduino`
2. Update your configuration file. See sample-config.json in this repository for a sample.

## Configuration

There are four options:

- `name` Required. Accessory name, default is *Arduino*.
- `auth` auth token (e simple password setted inside Arduino).
- `host` arduino host, default is `127.0.0.1` (NO add http:// before, only the ip or domain name).
- `port` arduino port, default is `80`.
- `time-enable` How long Arduino will be enable, in seconds, default is 0 that means permanently enabled.
- `time-disable` How long Arduino will be disabled, in seconds, default is 0 that means permanently disabled.
- `logLevel` Logging level, three different levels: 0: logging disabled, 1: logs only HTTP errors, 2: logs each HTTP response. Default is set to 1.

See the [sample-config.json](sample-config.json) file to see an example of how to configure the accessory. In the example the configured accessory will enable arduino for a time interval of two minutes (120 seconds).

## Licence

(The MIT License)

Copyright (c) 2020

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
