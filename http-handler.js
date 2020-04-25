module.exports = {
	validateJsonBody, 
};

/**
 * validates that the body has the required format
 * developers can add MORE field but not LESS
 *
 * body format:
 * {
 *      service: "switchOne", // <optional>: data type must be string
 *      characteristic: "On", // <required>: data type must be string
 *      value: 56 // <required>
 * }
 *
 * @param body
 */
function validateJsonBody(body) {
	if (typeof body !== "object")
		throw new Error("Json string is not an object");

	if (!(body.hasOwnProperty("characteristic") || body.hasOwnProperty("value")))
		throw new Error("Missing required property");

	if (body.hasOwnProperty("service") && typeof body.service !== "string")
		throw new Error("property 'service' has an invalid data type");

	if (typeof body.characteristic !== "string")
		throw new Error("property 'characteristic' has an invalid data type");
}