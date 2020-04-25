module.exports = {
	validateJsonData
};

/**
 * validates that the data has the required format
 * developers can add MORE field but not LESS
 *
 * data format:
 * {
 *      auth: "AUTH TOKEN", // <required>: data type must be string
 *      service: "switchOne", // <optional>: data type must be string
 *      characteristic: "On", // <required>: data type must be string
 *      value: 56 // <required>
 * }
 *
 * @param data
 */
function validateJsonData(data) {
	if (typeof data !== "object")
		throw new Error("Json string is not an object");

	if (!(data.hasOwnProperty("type") || data.hasOwnProperty("characteristic") || data.hasOwnProperty("value") || data.hasOwnProperty("auth")))
		throw new Error("Missing required property");

	if (data.hasOwnProperty("service") && typeof data.service !== "string")
		throw new Error("property 'service' has an invalid data type");

	if (typeof data.type !== "string")
		throw new Error("property 'type' has an invalid data type");

	if (typeof data.characteristic !== "string")
		throw new Error("property 'characteristic' has an invalid data type");

	if (typeof data.characteristic !== "string")
		throw new Error("property 'auth' has an invalid data type");
	
	if (["get", "set"].indexOf(data.type) == -1)
		throw new Error("type can only be: get or set");
}