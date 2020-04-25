module.exports = {
	validateJsonData
};

/**
 * validates that the data has the required format
 * developers can add MORE field but not LESS
 *
 * data format:
 * {
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

	if (!(data.hasOwnProperty("characteristic") || data.hasOwnProperty("value")))
		throw new Error("Missing required property");

	if (data.hasOwnProperty("service") && typeof data.service !== "string")
		throw new Error("property 'service' has an invalid data type");

	if (typeof data.characteristic !== "string")
		throw new Error("property 'characteristic' has an invalid data type");
}