var Service, Characteristic, DoorState, UUIDGen;
var http = require("http");
var url  = require('url');
var tools = require("./tools.js");
var f = require("./functions.js");

function arduino(log, config) {
	if (!config) {
		return;
	}
	
	this.log = log;
	this.ListeningPort = config["listening-port"] || 18080;
	
	// logLevel 0: disabled, 1: error, 2: info
	if (typeof config["logLevel"] === "undefined") {
		this.logLevel = 1;
	} else {
		this.logLevel = config["logLevel"];
	}
	
	this.AccTypeName = ["Switch", "Lightbulb", "Outlet", "GarageDoorOpener", "HumiditySensor", "Fan", "TemperatureSensor", "LightSensor", "LockMechanism", "MotionSensor", "LeakSensor", "Thermostat", "Valve", "AirQualitySensor", "DummySwitch"];
	
	/* AccessoryType
	0	Switch
	1	Lightbulb
	2	Outlet
	3	GarageDoorOpener
	4	HumiditySensor
	5	Fan
	6	TemperatureSensor
	7	LightSensor
	8	LockMechanism
	9	MotionSensor
	10	LeakSensor
	11	Thermostat
	12	Valve
	13	AirQualitySensor
	14	DummySwitch
	*/
	if (typeof config["accessory-type"] === "undefined") {
		this.AccessoryType = 0;
	} else {
		this.AccessoryType = config["accessory-type"];
	}
	this.ValveType = config["valve-type"] || 1;

	this.Manufacturer = config["manufacturer"] || "My manufacturer";
	this.Model = config["model"] || "My model";
	this.Serial = config["serial-number"] || "123-456-789";
	this.FirmwareRevision = config["firmware-revision"] || "1.0";
	this.HardwareRevision = config["hardware-revision"] || "1";
	this.Name = config["name"] || "Arduino";
	
	this.Lang = config["language"] || "enGB";

	this.auth = config["auth"] || "";
	this.host = config["host"] || "127.0.0.1";
	this.port = config["port"] || 80;
	this.baseUrl = config["base-url"] || "/";
	
	this.optionalCharac1 = config["optional-charac1"] || false;
	this.optionalCharac2 = config["optional-charac2"] || false;
	this.optionalCharac3 = config["optional-charac3"] || false;
	this.optionalCharac4 = config["optional-charac4"] || false;
	
	this.duration = parseInt(config["duration"]) || 0;
	
	this.defaultState = config["default-state"] || 0;
	
	this.uuid = UUIDGen.generate("uuid-hb-gen_"+this.Serial);
	
	this.log("lang: " + this.Lang + " accessory: " + this.AccTypeName[this.AccessoryType] + " (" + this.AccessoryType + ")");
	this.log("uuid: " + this.uuid);
	
	this.inTimer = false;
	
	this.ValveEndActivation = null;
	
	const self = this;
	// {"auth":"","type":"set","service":"Window","characteristic":"TargetPosition","value":"100"}
	// http://10.0.0.34:18089/?d=eyJhdXRoIjoiIiwidHlwZSI6InNldCIsInNlcnZpY2UiOiJXaW5kb3ciLCJjaGFyYWN0ZXJpc3RpYyI6IlRhcmdldFBvc2l0aW9uIiwidmFsdWUiOiIxMDAifQ==
	// {"auth":"","type":"get","service":"Window","characteristic":"CurrentPosition","value":"0"}
	// 10.0.0.34:18089/?d=eyJhdXRoIjoiIiwidHlwZSI6ImdldCIsInNlcnZpY2UiOiJXaW5kb3ciLCJjaGFyYWN0ZXJpc3RpYyI6IkN1cnJlbnRQb3NpdGlvbiIsInZhbHVlIjoiMCJ9
	this.requestServer = http.createServer(function(request, response) {
		var body = "";
		request.on("data", function (data) { body += data; });
		
		request.on("end", function () {
			try {
				var query = url.parse(request.url, true).query;
				if (query.d) {
					var jsonData = Buffer.from(query.d, 'base64').toString('utf-8');
					var data = JSON.parse(jsonData);
					f.validateJsonData(data);
					if(data.auth == self.auth){
						if (self.logLevel >= 2) { self.log("auth: "+data.auth+", type: "+data.type+", service: "+data.service+", characteristic: "+data.characteristic+", value: "+data.value); }
						if(f.validateCharacteristic(data.characteristic, data.type, self) == true){
							if(data.type == "set"){
								response.writeHead(200, {'Content-Type': 'text/plain'});
								self.functionService.setCharacteristic(Characteristic[data.characteristic], data.value);
								response.write("200 OK");
							}else{
								response.writeHead(200, {'Content-Type': 'text/plain'});
								response.write(self.functionService.getCharacteristic(Characteristic[data.characteristic]).value.toString());
							}
							response.end();
						}else{
							response.writeHead(406, {'Content-Type': 'text/html'});
							response.write("406 Not Acceptable");
							response.end();
							self.log("406 Not Acceptable");
						}
					}else{
						response.writeHead(401, {'Content-Type': 'text/html'});
						response.write("401 Unauthorized");
						response.end();
						self.log("401 Unauthorized");
					}
				}
			} catch (error) {
				response.writeHead(400, {'Content-Type': 'text/html'});
				response.write("Bad Request");
				response.end();
				self.log("sent malformed body: " + error.message);
				return;
			}
		});
	}.bind(this));
	
	this.requestServer.listen(this.ListeningPort, function() {
		self.log("Listen http at " + self.ListeningPort + " port");
	});
}

arduino.prototype.getServices = function () {	
	var infoService = new Service.AccessoryInformation()
		.setCharacteristic(Characteristic.Manufacturer, this.Manufacturer)
		.setCharacteristic(Characteristic.Model, this.Model)
		.setCharacteristic(Characteristic.SerialNumber, this.Serial)
		.setCharacteristic(Characteristic.FirmwareRevision, this.FirmwareRevision)
		.setCharacteristic(Characteristic.HardwareRevision, this.HardwareRevision);
	
	if(this.AccessoryType == 1){ // Lightbulb
		var functionService = new Service.Lightbulb(this.Name);
		functionService.getCharacteristic(Characteristic.On).updateValue(this.defaultState);
		
		functionService.getCharacteristic(Characteristic.On)
			.on("get", this.getStatus.bind(this))
			.on("set", this.setStatus.bind(this));
		
		if(this.optionalCharac1 == true){ // Brightness (unit -> int percentage)
			if(!functionService.getCharacteristic(Characteristic.Brightness)) {
				functionService.addCharacteristic(Characteristic.Brightness);
			}

			functionService.getCharacteristic(Characteristic.Brightness)
				.setProps({
						minValue: 0,
						maxValue: 100,
						minStep: 1
					})
				.on('get', this.getBrightness.bind(this))
				.on('set', this.setBrightness.bind(this));
		}
		if(this.optionalCharac2 == true){ // Hue (unit -> float 0-360)
			if(!functionService.getCharacteristic(Characteristic.Hue)) {
				functionService.addCharacteristic(Characteristic.Hue);
			}

			functionService.getCharacteristic(Characteristic.Hue)
				.setProps({
						minValue: 0,
						maxValue: 360,
						minStep: 1
					})
				.on('get', this.getHue.bind(this))
				.on('set', this.setHue.bind(this));
		}
		if(this.optionalCharac3 == true){ // Saturation (unit -> float percentage)
			if(!functionService.getCharacteristic(Characteristic.Saturation)) {
				functionService.addCharacteristic(Characteristic.Saturation);
			}

			functionService.getCharacteristic(Characteristic.Saturation)
				.setProps({
						minValue: 0,
						maxValue: 100,
						minStep: 1
					})
				.on('get', this.getSaturation.bind(this))
				.on('set', this.setSaturation.bind(this));
		}
		if(this.optionalCharac4 == true){
			// ColorTemperature (unit -> int megaKelvin (MK-1) - mirek scale (= 1000000/Kelvin)) or kelvin (=1000000/mirek)
			if(!functionService.getCharacteristic(Characteristic.ColorTemperature)) {
				functionService.addCharacteristic(Characteristic.ColorTemperature);
			}

			functionService.getCharacteristic(Characteristic.ColorTemperature)
				.setProps({
						minValue: 50,
						maxValue: 400,
						minStep: 1
					})
				.on('get', this.getColorTemperature.bind(this))
				.on('set', (newValue, next) => {
					var rgb = tools.colorTemperatureToRGB(tools.mirek2Kelvin(newValue));
					var hsv = tools.rgbToHsv(rgb.r, rgb.g, rgb.b);
					functionService.setCharacteristic(Characteristic.Hue, parseInt(360 * hsv.h));
					functionService.setCharacteristic(Characteristic.Saturation, parseInt(hsv.s * 100));
					functionService.setCharacteristic(Characteristic.Brightness, parseInt(hsv.v * 100));
					if(parseInt(hsv.v * 100) > 0){
						functionService.setCharacteristic(Characteristic.On, true)
					}else{
						functionService.setCharacteristic(Characteristic.On, false)
					}
					this.setColorTemperature(newValue, next);
				});
		}
	}else if(this.AccessoryType == 2){ // Outlet
		var functionService = new Service.Outlet(this.Name);
		functionService.getCharacteristic(Characteristic.On).updateValue(this.defaultState);

		functionService.getCharacteristic(Characteristic.On)
			.on("get", this.getStatus.bind(this))
			.on("set", this.setStatus.bind(this));
			
		functionService.getCharacteristic(Characteristic.OutletInUse).on("get", this.getStatus.bind(this));
	}else if(this.AccessoryType == 3){ // GarageDoorOpener
		var functionService = new Service.GarageDoorOpener(this.Name);
		functionService.getCharacteristic(Characteristic.CurrentDoorState).on("get", this.getCurrentDoorState.bind(this));
		
		functionService.getCharacteristic(Characteristic.TargetDoorState)
			.on("get", this.getTargetDoorState.bind(this))
			.on("set", this.setTargetDoorState.bind(this));
		
		functionService.getCharacteristic(Characteristic.ObstructionDetected).on("get", this.getObstructionDetected.bind(this));
	}else if(this.AccessoryType == 4){ // HumiditySensor (unit -> percentage)
		var functionService = new Service.HumiditySensor(this.Name);
		functionService.getCharacteristic(Characteristic.CurrentRelativeHumidity)
			.setProps({
					minValue: 0,
					maxValue: 100,
					minStep: 0.001
				})
			.on("get", this.getHumidity.bind(this));
	}else if(this.AccessoryType == 5){ // Fan
		var functionService = new Service.Fan(this.Name);
		functionService.getCharacteristic(Characteristic.On).updateValue(this.defaultState);
		
		functionService.getCharacteristic(Characteristic.On)
			.on("get", this.getStatus.bind(this))
			.on("set", this.setStatus.bind(this));
		
		if(this.optionalCharac1 == true){
			if(!functionService.getCharacteristic(Characteristic.RotationDirection)) {
				functionService.addCharacteristic(Characteristic.RotationDirection);
			}
			
			functionService.getCharacteristic(Characteristic.RotationDirection)
				.on("get", this.getRotationDirection.bind(this))
				.on("set", this.setRotationDirection.bind(this));
		}
		
		if(this.optionalCharac2 == true){
			if(!functionService.getCharacteristic(Characteristic.RotationSpeed)) {
				functionService.addCharacteristic(Characteristic.RotationSpeed);
			}
		
			functionService.getCharacteristic(Characteristic.RotationSpeed) // (unit -> percentage)
				.setProps({
					minValue: 0,
					maxValue: 100,
					minStep: 0.01
				})
				.on('get', this.getRotationSpeed.bind(this))
				.on('set', this.setRotationSpeed.bind(this));
		}
	}else if(this.AccessoryType == 6){ // TemperatureSensor (unit -> celsius)
		var functionService = new Service.TemperatureSensor(this.Name);
		functionService.getCharacteristic(Characteristic.CurrentTemperature)
			.setProps({
					minValue: -100,
					maxValue: 100,
					minStep: 0.001
				})
			.on("get", this.getTemperature.bind(this));
	}else if(this.AccessoryType == 7){ // LightSensor (unit -> lux)
		var functionService = new Service.LightSensor(this.Name);
		functionService.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
			.setProps({
					minValue: 0.0001,
					maxValue: 100000,
					minStep: 0.0001
				})
			.on("get", this.getLight.bind(this));
	}else if(this.AccessoryType == 8){ // LockMechanism
		var functionService = new Service.LockMechanism(this.Name);
		functionService.getCharacteristic(Characteristic.LockCurrentState)
			.on("get", this.getLockCurrentState.bind(this));
		
		functionService.getCharacteristic(Characteristic.LockTargetState)
			.on("get", this.getLockTargetState.bind(this))
			.on("set", this.setLockTargetState.bind(this));
	}else if(this.AccessoryType == 9){ // MotionSensor
		var functionService = new Service.MotionSensor(this.Name);
		functionService.getCharacteristic(Characteristic.MotionDetected)
			.on("get", this.getStatus.bind(this));
	}else if(this.AccessoryType == 10){ // LeakSensor
		var functionService = new Service.LeakSensor(this.Name);
		functionService.getCharacteristic(Characteristic.LeakDetected)
			.on("get", this.getStatus.bind(this));
	}else if(this.AccessoryType == 11){ // Thermostat
		var functionService = new Service.Thermostat(this.Name);
		functionService.getCharacteristic(Characteristic.CurrentHeatingCoolingState) // 0 OFF, 1 HEAT, 2 COOL
			.on("get", this.getCurrentHeatingCoolingState.bind(this));
		
		functionService.getCharacteristic(Characteristic.TargetHeatingCoolingState) // 0 OFF, 1 HEAT, 2 COOL, 3 AUTO
			.on("get", this.getTargetHeatingCoolingState.bind(this))
			.on("set", this.setTargetHeatingCoolingState.bind(this));
		
		functionService.getCharacteristic(Characteristic.CurrentTemperature)
			.on("get", this.getCurrentTemperature.bind(this));
			
		if(this.optionalCharac1 == true){
			functionService.getCharacteristic(Characteristic.CurrentTemperature)
			.setProps({
				format: Characteristic.Formats.FLOAT,
				unit: 'fahrenheit',
				minValue: 0,
				maxValue: 122,
				minStep: 0.1
			});
		}else{
			functionService.getCharacteristic(Characteristic.CurrentTemperature)
			.setProps({
				format: Characteristic.Formats.FLOAT,
				unit: Characteristic.Units.CELSIUS,
				minValue: 0,
				maxValue: 50,
				minStep: 0.1
			});
		}
		
		functionService.getCharacteristic(Characteristic.TargetTemperature)
			.on('get', this.getTargetTemperature.bind(this))
			.on('set', this.setTargetTemperature.bind(this));
		
		if(this.optionalCharac1 == true){
			functionService.getCharacteristic(Characteristic.TargetTemperature)
			.setProps({
				format: Characteristic.Formats.FLOAT,
				unit: 'fahrenheit',
				minValue: 50,
				maxValue: 100.4,
				minStep: 0.1
			});
		}else{
			functionService.getCharacteristic(Characteristic.TargetTemperature)
			.setProps({
				format: Characteristic.Formats.FLOAT,
				unit: Characteristic.Units.CELSIUS,
				minValue: 10,
				maxValue: 38,
				minStep: 0.1
			});
		}

		if(this.optionalCharac1 == false){
			functionService.setCharacteristic(Characteristic.TemperatureDisplayUnits, Characteristic.TemperatureDisplayUnits.CELSIUS);
			this.setTemperatureDisplayUnits(Characteristic.TemperatureDisplayUnits.CELSIUS);
		}else{
			functionService.setCharacteristic(Characteristic.TemperatureDisplayUnits, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
			this.setTemperatureDisplayUnits(Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
		}
		
		functionService.setCharacteristic(Characteristic.TemperatureDisplayUnits) // 0 CELSIUS, 1 FAHRENHEIT
			.on("get", this.getTemperatureDisplayUnits.bind(this));
	}else if(this.AccessoryType == 12){ // Valve
		var functionService = new Service.Valve(this.Name);
		// 0 GENERIC, 1 IRRIGATION/SPRINKLER, 2 SHOWER_HEAD, 3 WATER_FAUCET
		if(this.ValveType == 1){
			functionService.getCharacteristic(Characteristic.ValveType).updateValue(Characteristic.ValveType.IRRIGATION);
		}else if(this.ValveType == 2){
			functionService.getCharacteristic(Characteristic.ValveType).updateValue(Characteristic.ValveType.SHOWER_HEAD);
		}else if(this.ValveType == 3){
			functionService.getCharacteristic(Characteristic.ValveType).updateValue(Characteristic.ValveType.WATER_FAUCET);
		}else{ // 0 Valve Type by default
			functionService.getCharacteristic(Characteristic.ValveType).updateValue(Characteristic.ValveType.GENERIC_VALVE);
		}
		
		const characteristicActive = functionService.getCharacteristic(Characteristic.Active)
										.on("get", this.getValveActive.bind(this))
										.on("set", (newValue, next) => {
											if(characteristicStatusFault.value == Characteristic.StatusFault.NO_FAULT){
												if(newValue == "1"){
													functionService.setCharacteristic(Characteristic.InUse, 1);
													if(this.duration > 0){
														this.ValveEndActivation = this.duration + Math.floor(new Date().getTime() / 1000);
														functionService.setCharacteristic(Characteristic.RemainingDuration, this.duration);
														this.setValveActive(newValue, next);
														const self = this;
														setTimeout(function() {
															self.ValveEndActivation = null;
															functionService.setCharacteristic(Characteristic.RemainingDuration, 0);
															functionService.getCharacteristic(Characteristic.Active).updateValue(0);
															self.setValveActive(Characteristic.Active.INACTIVE, null);
															functionService.setCharacteristic(Characteristic.InUse, 0);
														}, (this.duration*1000));
													}
												}else{
													this.setValveActive(newValue, next);
													functionService.setCharacteristic(Characteristic.InUse, 0);
													if(this.duration > 0){
														this.ValveEndActivation = null;
														functionService.setCharacteristic(Characteristic.RemainingDuration, 0);
													}
												}
											}else{
												next(null, Characteristic.Active.INACTIVE);
											}
										});
		
		const characteristicInUse = functionService.getCharacteristic(Characteristic.InUse)
										.on('get', (next) => {
											next(null, characteristicActive.value);
										});

		if(this.duration > 0){
			functionService.getCharacteristic(Characteristic.SetDuration)
					.on('get', (next) => {
						next(null, this.duration);
					})
					.on('set', (newValue, next) => {
						this.duration = newValue;
						next(null, this.duration);
					});
			
			functionService.getCharacteristic(Characteristic.RemainingDuration)
					.on('get', (next) => {
						var remainingTime = this.duration - Math.floor(((new Date()).getTime() - this.ValveEndActivation) / 1000);
						if (!remainingTime || remainingTime < 0) {
							remainingTime = 0;
						}
						next(null, remainingTime);
					});
		}
		
		const characteristicStatusFault = functionService.getCharacteristic(Characteristic.StatusFault)
											.on("get", (next) => {
												if (this.optionalCharac1 == true){
													this.getValveStatusFault(next);
												}else{
													return Characteristic.StatusFault.NO_FAULT;
												}
											});
								
		// if Homebridge crash when valve is on reset all to inactive
		if (this.duration > 0) {
			this.ValveEndActivation = null;
			functionService.setCharacteristic(Characteristic.RemainingDuration, 0);
			functionService.getCharacteristic(Characteristic.Active).updateValue(0);
			this.setValveActive(Characteristic.Active.INACTIVE, null);
			functionService.setCharacteristic(Characteristic.InUse, 0);
		}
		
		if (this.optionalCharac1 == true){
			setInterval(()=> {
					// use 'getvalue' when the timer ends so it triggers the .on('get'...) event
					characteristicStatusFault.getValue();
					//this.log("update characteristicStatusFault "+characteristicStatusFault.value + " "+ Characteristic.StatusFault.GENERAL_FAULT);
					if(characteristicStatusFault.value == Characteristic.StatusFault.GENERAL_FAULT){
						characteristicActive.setValue(0);
						characteristicInUse.setValue(0);
						if(this.duration > 0){
							this.ValveEndActivation = null;
							functionService.getCharacteristic(Characteristic.RemainingDuration).updateValue(0);
						}
					}
				}, (5*1000));
		}
	}else if(this.AccessoryType == 13){ // AirQualitySensor
		// 0 Unknown, 1 Excellent, 2 Good, 3 Fair, 4 Inferior, 5 Poor
		var functionService = new Service.AirQualitySensor(this.Name);
		functionService.getCharacteristic(Characteristic.AirQuality)
			.on("get", this.getAirQuality.bind(this));
	}else if(this.AccessoryType == 14){ // Dummy Switch
		var functionService = new Service.Switch(this.Name);
		var dummySwitch = functionService.getCharacteristic(Characteristic.On).updateValue(this.defaultState)
			.on("get", (next) => {
					if (this.logLevel >= 2) { this.log("DummySwitch get "+dummySwitch.value); }
					next(null, dummySwitch.value);
			})
			.on("set", (newValue, next) => {
					if (this.logLevel >= 2) { this.log("DummySwitch set "+dummySwitch.value+" -> "+newValue); }
					next(null, newValue);
					if(newValue != this.defaultState && this.duration > 0){
						const self = this;
						setTimeout(function() {
							dummySwitch.updateValue(this.defaultState);
							if (self.logLevel >= 2) { self.log("DummySwitch set return "+newValue+" -> "+this.defaultState); }
						}, (this.duration*1000));
					}
			});
	}else if(this.AccessoryType == 15){ // Windows
		var functionService = new Service.Window(this.Name);
		
		functionService.getCharacteristic(Characteristic.CurrentPosition) // percentage 0 full closed 100 full opened
			.on('get', this.getWindowCurrentPosition.bind(this));
		
		functionService.getCharacteristic(Characteristic.TargetPosition) // percentage 0 full closed 100 full opened
			.on('set', this.setWindowTargetPosition.bind(this));
			
		functionService.getCharacteristic(Characteristic.PositionState)
			.on('get', this.getWindowPositionState.bind(this));
	}else{ // Switch (0)
		var functionService = new Service.Switch(this.Name);
		functionService.getCharacteristic(Characteristic.On).updateValue(this.defaultState);
		
		functionService.getCharacteristic(Characteristic.On)
			.on("get", this.getStatus.bind(this))
			.on("set", this.setStatus.bind(this));
	}

	this.informationService = infoService;
	this.functionService = functionService;

	return [this.informationService, this.functionService];
};

// All
arduino.prototype.getStatus = function (next) {
	this._makeRequest("?status" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setStatus = function (newVal, next) {
	const self = this;
	// Switch (becomes a button), Lightbulb, Outlet
	var AccessoryToggle = [0,1,2];
	if(this.inTimer == false){
		this._makeRequest((newVal ? "?enable" : "?disable") + "&auth=" + this.auth + "&uuid=" + this.uuid, next);
		if(this.duration > 0 && AccessoryToggle.includes(this.AccessoryType) == true && this.inTimer == false){
			setTimeout(function() {
				self.inTimer = true;
				self._makeRequest((this.defaultState ? "?enable" : "?disable") + "&auth=" + self.auth + "&uuid="+self.uuid);
			}, (this.duration*1000));
		}
	}
};

// Lightbulb
arduino.prototype.getBrightness = function (next) {
	this._makeRequest("?getBrightness" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setBrightness = function (newVal, next) {
	this._makeRequest("?setBrightness=" + newVal + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.getHue = function (next) {
	this._makeRequest("?getHue" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setHue = function (newVal, next) {
	this._makeRequest("?setHue=" + newVal + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.getSaturation = function (next) {
	this._makeRequest("?getSaturation" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setSaturation = function (newVal, next) {
	this._makeRequest("?setSaturation=" + newVal + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.getColorTemperature = function (next) {
	this._makeRequest("?getColorTemperature" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setColorTemperature = function (newVal, next) {
	this._makeRequest("?setColorTemperature=" + newVal + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

// Garage Door
arduino.prototype.getCurrentDoorState = function (next) {
	this._makeRequest("?getCurrentDoorState" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.getTargetDoorState = function (next) {
	this._makeRequest("?getTargetDoorState" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setTargetDoorState = function (newVal, next) {
	this._makeRequest("?setTargetDoorState=" + newVal + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.getObstructionDetected = function (next) {
	this._makeRequest("?getObstructionDetected" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

// Fan
arduino.prototype.getRotationSpeed = function (next) {
	this._makeRequest("?getRotationSpeed" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setRotationSpeed = function (newVal, next) {
	this._makeRequest("?setRotationSpeed=" + newVal + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.getRotationDirection = function (next) {
	this._makeRequest("?getRotationDirection" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setRotationDirection = function (newVal, next) {
	if (newVal == Characteristic.RotationDirection.CLOCKWISE){
		this._makeRequest("?setRotationDirection=" + Characteristic.RotationDirection.CLOCKWISE + "&auth=" + this.auth+"&uuid="+this.uuid, next);
	}else{
		this._makeRequest("?setRotationDirection=" + Characteristic.RotationDirection.COUNTER_CLOCKWISE + "&auth=" + this.auth+"&uuid="+this.uuid, next);
	}
};

// Temperature Sensor
arduino.prototype.getTemperature = function (next) {
	this._makeRequest("?getTemperature" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

// Humidity Sensor
arduino.prototype.getHumidity = function (next) {
	this._makeRequest("?getHumidity" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

// Light Sensor
arduino.prototype.getLight = function (next) {
	this._makeRequest("?getLight" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

// Lock Mechanism
arduino.prototype.getLockCurrentState = function (next) {
	this._makeRequest("?getLockCurrentState" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.getLockTargetState = function (next) {
	this._makeRequest("?getLockTargetState" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setLockTargetState = function (newVal, next) {
	if (newVal == Characteristic.LockTargetState.UNSECURED){
		this._makeRequest("?setLockTargetState=" + Characteristic.LockTargetState.UNSECURED + "&auth=" + this.auth+"&uuid="+this.uuid, next);
	}else{
		this._makeRequest("?setLockTargetState=" + Characteristic.LockTargetState.SECURED + "&auth=" + this.auth+"&uuid="+this.uuid, next);
	}
};

// Thermostat
arduino.prototype.getCurrentHeatingCoolingState = function (next) {
	// 0 OFF, 1 HEAT, 2 COOL
	this._makeRequest("?getCurrentHeatingCoolingState" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.getTargetHeatingCoolingState = function (next) {
	// 0 OFF, 1 HEAT, 2 COOL, 3 AUTO
	this._makeRequest("?getTargetHeatingCoolingState" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setTargetHeatingCoolingState = function (newVal, next) {
	// 0 OFF, 1 HEAT, 2 COOL, 3 AUTO
	this._makeRequest("?setTargetHeatingCoolingState=" + newVal + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.getCurrentTemperature = function (next) {
	// unit -> Celasius
	this._makeRequest("?getCurrentTemperature" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.getTargetTemperature = function (next) {
	// unit -> Celsius
	this._makeRequest("?getTargetTemperature" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setTargetTemperature = function (newVal, next) {
	// unit -> Celsius
	this._makeRequest("?setTargetTemperature=" + newVal + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.getTemperatureDisplayUnits = function (next) {
	// 0 CELSIUS, 1 FAHRENHEIT
	this._makeRequest("?getTemperatureDisplayUnits" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setTemperatureDisplayUnits = function (newVal) {
	// 0 CELSIUS, 1 FAHRENHEIT
	this._makeRequest("?setTemperatureDisplayUnits=" + newVal + "&auth=" + this.auth+"&uuid="+this.uuid, null);
};

// Valve
arduino.prototype.getValveActive = function (next) {
	this._makeRequest("?getValveActive" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setValveActive = function (newVal, next) {
	this._makeRequest("?setValveActive=" + newVal + "&auth=" + this.auth + "&uuid=" + this.uuid, next);
};

arduino.prototype.getValveStatusFault = function (next) {
	this._makeRequest("?getValveStatusFault" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

// AirQuality Sensor
arduino.prototype.getAirQuality = function (next) {
	this._makeRequest("?getAirQuality" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

// Window
arduino.prototype.getWindowCurrentPosition = function (next) {
	this._makeRequest("?getWindowCurrentPosition" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};

arduino.prototype.setWindowTargetPosition = function (newVal, next) {
	this._makeRequest("?setWindowTargetPosition=" + newVal + "&auth=" + this.auth + "&uuid=" + this.uuid, next);
};

arduino.prototype.getWindowPositionState = function (next) {
	this._makeRequest("?getWindowPositionState" + "&auth=" + this.auth+"&uuid="+this.uuid, next);
};







arduino.prototype._responseHandler = function (res, next) {
	let body = "";

	res.on("data", (data) => { body += data; });
	res.on("end", () => {
		if (this.logLevel >= 2) { this.log(body); }

		try {
			let jsonBody = JSON.parse(body);
			
			// All
			if (typeof jsonBody.status !== 'undefined') {
				if (jsonBody.status == true){
					if(this.inTimer == false){
						next(null, true);
					}else{
						this.functionService.getCharacteristic(Characteristic.On).updateValue(true);
						this.inTimer = false;
					}
				}else{
					if(this.inTimer == false){
						next(null, false);
					}else{
						this.functionService.getCharacteristic(Characteristic.On).updateValue(false);
						this.inTimer = false;
					}
				}
			// Light Bulb
			} else if (typeof jsonBody.Brightness !== 'undefined') {
				next(null, jsonBody.Brightness);
			} else if (typeof jsonBody.Hue !== 'undefined') {
				next(null, jsonBody.Hue);
			} else if (typeof jsonBody.Saturation !== 'undefined') {
				next(null, jsonBody.Saturation);
			} else if (typeof jsonBody.ColorTemperature !== 'undefined') {
				next(null, jsonBody.ColorTemperature);
			// Garage Door
			} else if (typeof jsonBody.CurrentDoorState !== 'undefined') {
				if(jsonBody.CurrentDoorState == 0){
					next(null, Characteristic.CurrentDoorState.OPEN);
				}else if(jsonBody.LockCurrentState == 1){
					next(null, Characteristic.CurrentDoorState.CLOSED);
				}else if(jsonBody.LockCurrentState == 2){
					next(null, Characteristic.CurrentDoorState.OPENING);
				}else if(jsonBody.LockCurrentState == 3){
					next(null, Characteristic.CurrentDoorState.CLOSING);
				}else{
					next(null, Characteristic.CurrentDoorState.STOPPED);
				}
			} else if (typeof jsonBody.TargetDoorState !== 'undefined') {
				if(jsonBody.TargetDoorState == 0){
					this.functionService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
					next(null, Characteristic.TargetDoorState.OPEN);
				}else{
					this.functionService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
					next(null, Characteristic.TargetDoorState.CLOSED);
				}
			} else if (typeof jsonBody.ObstructionDetected !== 'undefined') {
				if (jsonBody.ObstructionDetected == 1){
					next(null, true);
				}else{
					next(null, false);
				}
			// Fan
			} else if (typeof jsonBody.RotationSpeed !== 'undefined') {
				next(null, jsonBody.RotationSpeed);
			} else if (typeof jsonBody.RotationDirection !== 'undefined') {
				if(jsonBody.RotationDirection == 0){
					next(null, Characteristic.RotationDirection.CLOCKWISE);
				}else{
					next(null, Characteristic.RotationDirection.COUNTER_CLOCKWISE);
				}
			// Temperature Sensor
			} else if (typeof jsonBody.Temperature !== 'undefined') {
				next(null, jsonBody.Temperature);
			// Humidity Sensor
			} else if (typeof jsonBody.Humidity !== 'undefined') {
				next(null, jsonBody.Humidity);
			// Light Sensor
			} else if (typeof jsonBody.Light !== 'undefined') {
				next(null, jsonBody.Light);
			// Lock Mechanism
			} else if (typeof jsonBody.LockCurrentState !== 'undefined') {
				if(jsonBody.LockCurrentState == 0){
					next(null, Characteristic.LockCurrentState.UNSECURED);
				}else if(jsonBody.LockCurrentState == 1){
					next(null, Characteristic.LockCurrentState.SECURED);
				}else if(jsonBody.LockCurrentState == 2){
					next(null, Characteristic.LockCurrentState.JAMMED);
				}else{
					next(null, Characteristic.LockCurrentState.UNKNOWN);
				}
			} else if (typeof jsonBody.LockTargetState !== 'undefined') {
				if(jsonBody.LockTargetState == 0){
					this.functionService.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);
					next(null, Characteristic.LockTargetState.UNSECURED);
				}else{
					this.functionService.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
					next(null, Characteristic.LockTargetState.SECURED);
				}
			// Thermostat
			} else if (typeof jsonBody.CurrentHeatingCoolingState !== 'undefined') {
				next(null, jsonBody.CurrentHeatingCoolingState);
			} else if (typeof jsonBody.TargetHeatingCoolingState !== 'undefined') {
				next(null, jsonBody.TargetHeatingCoolingState);
			} else if (typeof jsonBody.CurrentTemperature !== 'undefined') {
				next(null, jsonBody.CurrentTemperature);
			} else if (typeof jsonBody.TargetTemperature !== 'undefined') {
				next(null, jsonBody.TargetTemperature);
			} else if (typeof jsonBody.TemperatureDisplayUnits !== 'undefined') {
				if (typeof jsonBody.next === 'function') {
					next(null, jsonBody.TemperatureDisplayUnits);
				}
			// Valve
			} else if (typeof jsonBody.ValveActive !== 'undefined') {
				if(jsonBody.ValveActive == 1){
					if (typeof next === 'function') {
						next(null, Characteristic.Active.ACTIVE);
					}else{
						this.functionService.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.ACTIVE);
					}
				}else{
					if (typeof next === 'function') {
						next(null, Characteristic.Active.INACTIVE);
					}else{
						this.functionService.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);
					}
				}
			} else if (typeof jsonBody.ValveStatusFault !== 'undefined') {
				// 0 NO_FAULT, 1 GENERAL_FAULT
				if(jsonBody.ValveStatusFault == 1){
					next(null, Characteristic.StatusFault.GENERAL_FAULT);
				}else{
					next(null, Characteristic.StatusFault.NO_FAULT);
				}
			// AirQuality Sensor
			} else if (typeof jsonBody.AirQuality !== 'undefined') {
				// 0 Unknown, 1 Excellent, 2 Good, 3 Fair, 4 Inferior, 5 Poor
				next(null, jsonBody.AirQuality);
			// Window
			} else if (typeof jsonBody.WindowCurrentPosition !== 'undefined') {
				next(null, jsonBody.WindowCurrentPosition);
				if (typeof jsonBody.WindowPositionState !== 'undefined') {
					// 0 DECREASING, 1 INCREASING, 2 STOPPED
					if(jsonBody.WindowPositionState == 0){
						this.functionService.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.DECREASING);
					}else if(jsonBody.WindowPositionState == 1){
						this.functionService.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.INCREASING);
					}else{
						this.functionService.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.STOPPED);
					}
				}
			} else if (typeof jsonBody.WindowTargetPosition !== 'undefined') {
				next(null, jsonBody.WindowTargetPosition);
				if (typeof jsonBody.WindowPositionState !== 'undefined') {
					// 0 DECREASING, 1 INCREASING, 2 STOPPED
					if(jsonBody.WindowPositionState == 0){
						this.functionService.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.DECREASING);
					}else if(jsonBody.WindowPositionState == 1){
						this.functionService.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.INCREASING);
					}else{
						this.functionService.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.STOPPED);
						this.functionService.getCharacteristic(Characteristic.CurrentPosition).updateValue(jsonBody.WindowTargetPosition);
					}
				}
			} else if (typeof jsonBody.WindowPositionState !== 'undefined') {
				// 0 DECREASING, 1 INCREASING, 2 STOPPED
				if(jsonBody.WindowPositionState == 0){
					next(null, Characteristic.PositionState.DECREASING);
				}else if(jsonBody.WindowPositionState == 1){
					next(null, Characteristic.PositionState.INCREASING);
				}else{
					next(null, Characteristic.PositionState.STOPPED);
				}
			// Error
			} else {
				this.log("nothing body: "+body);
				if (typeof next === 'function') {
					next({});
				}
			}
		} catch (e) {
			if (this.logLevel >= 1) { this.log(e); }
			if (typeof next === 'function') {
				next(e);
			}
		}
	});
};

arduino.prototype._makeRequest = function (path, next) {
	if (this.logLevel >= 2) { this.log("PATH: " + path); }
	let req = http.get({
		host: this.host,
		port: this.port,
		path: (this.baseUrl == "" ? this.baseUrl+"/" : this.baseUrl) + path,
	}, (res) => this._responseHandler(res, next));

	req.on("error", (err) => {
		if (this.logLevel >= 1) { this.log(err); }
	});
};

module.exports = function (hb) {
	Service = hb.hap.Service;
	Characteristic = hb.hap.Characteristic;
	UUIDGen = hb.hap.uuid;
	DoorState = hb.hap.Characteristic.CurrentDoorState;
	
	hb.registerAccessory("homebridge-arduino", "Arduino", arduino);
};
