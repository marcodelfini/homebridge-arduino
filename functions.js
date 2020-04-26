module.exports = {
	validateJsonData, validateCharacteristic
};

/**
 * validates that the data has the required format
 * developers can add MORE field but not LESS
 *
 * data format:
 * {
 *      auth: "AUTH TOKEN",		// <required>: data type must be string
 *      type: "get",			// <required>>: data type must be string and can only be: get or set
 *      service: "switchOne",	// <optional>: data type must be string
 *      characteristic: "On",	// <required>: data type must be string
 *      value: 56				// <required>
 * }
 *
 * @param data
 */
function validateJsonData(data) {
	if (typeof data !== "object")
		throw new Error("Json string is not an object");

	if (!(data.hasOwnProperty("auth") || data.hasOwnProperty("type") || data.hasOwnProperty("characteristic") || data.hasOwnProperty("value")))
		throw new Error("Missing required property");

	if (typeof data.auth !== "string")
		throw new Error("property 'auth' has an invalid data type");

	if (typeof data.type !== "string")
		throw new Error("property 'type' has an invalid data type");
	
	if (["get", "set"].includes(data.type) == false)
		throw new Error("type can only be: get or set");

	if (data.hasOwnProperty("service") && typeof data.service !== "string")
		throw new Error("property 'service' has an invalid data type");

	if (typeof data.characteristic !== "string")
		throw new Error("property 'characteristic' has an invalid data type");
}

function validateCharacteristic(char, type, self) {
	if (typeof char === "string"){
		if(self.AccessoryType == 0){ // Switch
			if(["On"].includes(char) == true && ["get", "set"].includes(type) == true){
				return true;
			}
		}else if(self.AccessoryType == 1){ // Lightbulb
			if((["On"].includes(char) == true && ["get", "set"].includes(type) == true) || (self.optionalCharac1 == true && ["Brightness"].includes(char) == true && ["get", "set"].includes(type) == true) || (self.optionalCharac2 == true && ["Hue"].includes(char) == true && ["get", "set"].includes(type) == true) || (self.optionalCharac3 == true && ["Saturation"].includes(char) == true && ["get", "set"].includes(type) == true) || (self.optionalCharac4 == true && ["ColorTemperature"].includes(char) == true && ["get", "set"].includes(type) == true)){
				return true;
			}
		}else if(self.AccessoryType == 2){ // Outlet
			if((["On"].includes(char) == true && ["get", "set"].includes(type) == true) || (["OutletInUse"].includes(char) == true && ["get"].includes(type) == true)){
				return true;
			}
		}else if(self.AccessoryType == 3){ // GarageDoorOpener
			if((["CurrentDoorState"].includes(char) == true && ["get"].includes(type) == true) && (["TargetDoorState"].includes(char) == true && ["get", "set"].includes(type) == true) && (["ObstructionDetected"].includes(char) == true && ["get"].includes(type) == true)){
				return true;
			}
		}else if(self.AccessoryType == 4){ // HumiditySensor
			if(["CurrentRelativeHumidity"].includes(char) == true && ["get"].includes(type) == true){
				return true;
			}
		}else if(self.AccessoryType == 5){ // Fan
			if((["On"].includes(char) == true && ["get", "set"].includes(type) == true) || (self.optionalCharac1 == true && ["RotationDirection"].includes(char) == true && ["get", "set"].includes(type) == true) || (self.optionalCharac2 == true && ["RotationSpeed"].includes(char) == true && ["get", "set"].includes(type) == true)){
				return true;
			}
		}else if(self.AccessoryType == 6){ // TemperatureSensor
			if(["CurrentTemperature"].includes(char) == true && ["get"].includes(type) == true){
				return true;
			}
		}else if(self.AccessoryType == 7){ // LightSensor
			if(["CurrentAmbientLightLevel"].includes(char) == true && ["get"].includes(type) == true){
				return true;
			}
		}else if(self.AccessoryType == 8){ // LockMechanism
			if((["LockCurrentState"].includes(char) == true && ["get"].includes(type) == true) || (["LockTargetState"].includes(char) == true && ["get", "set"].includes(type) == true)){
				return true;
			}
		}else if(self.AccessoryType == 9){ // MotionSensor
			if(["MotionDetected"].includes(char) == true && ["get"].includes(type) == true){
				return true;
			}
		}else if(self.AccessoryType == 10){ // LeakSensor
			if(["LeakDetected"].includes(char) == true && ["get"].includes(type) == true){
				return true;
			}
		}else if(self.AccessoryType == 11){ // Thermostat
			if((["CurrentHeatingCoolingState"].includes(char) == true && ["get"].includes(type) == true) || (["TargetHeatingCoolingState"].includes(char) == true && ["get", "set"].includes(type) == true) || (["CurrentTemperature"].includes(char) == true && ["get"].includes(type) == true) || (["TargetTemperature"].includes(char) == true && ["get", "set"].includes(type) == true) || (["TemperatureDisplayUnits"].includes(char) == true && ["get"].includes(type) == true)){
				return true;
			}
		}else if(self.AccessoryType == 12){ // Valve
			if((["Active"].includes(char) == true && ["get", "set"].includes(type) == true) || (["InUse"].includes(char) == true && ["get"].includes(type) == true) || (self.duration > 0 && ["SetDuration"].includes(char) == true && ["get", "set"].includes(type) == true) || (self.duration > 0 && ["RemainingDuration"].includes(char) == true && ["get"].includes(type) == true) || (["StatusFault"].includes(char) == true && ["get"].includes(type) == true)){
				return true;
			}
		}else if(self.AccessoryType == 13){ // AirQualitySensor
			if(["AirQuality"].includes(char) == true && ["get"].includes(type) == true){
				return true;
			}
		// (14) Dummy Switch not because is a virtual switch
		}else if(self.AccessoryType == 15){ // Windows
			if((["CurrentPosition"].includes(char) == true && ["get"].includes(type) == true) || (["TargetPosition"].includes(char) == true && ["set"].includes(type) == true) || (["PositionState"].includes(char) == true && ["get"].includes(type) == true)){
				return true;
			}
		}
	}
	return false;
}