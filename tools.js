module.exports = {
    loxoneToHomekitColorTemperature, homekitToLoxoneColorTemperature, rgbToHsl, rgbToHsv, colorTemperatureToRGB
};

function kelvin2Mirek(kelvin) {
	return 1000000 / kelvin;
};

function mirek2Kelvin(mirek) {
	return 1000000 / mirek;
};


// transform Loxone color temperature (expressed in Kelvins 2700-6500k to Homekit values 140-500)
function loxoneToHomekitColorTemperature(ct, obj) {

    var minCtLoxone = 2500;
    var maxCtLoxone = 20000;

    var minCtHomekit = 50;
    var maxCtHomekit = 400;

    var percent = 1 - ((ct - minCtLoxone) / (maxCtLoxone - minCtLoxone));
    var newValue = Math.round(minCtHomekit + ((maxCtHomekit - minCtHomekit) * percent));

    //obj.log('loxoneToHomekitColorTemperature - Loxone Value: ' + ct);
    //obj.log('loxoneToHomekitColorTemperature - Percent: ' + percent + '%');
    //obj.log('loxoneToHomekitColorTemperature - Homekit Value: ' + newValue);

    return newValue;
}

// transform Homekit color temperature (expressed 140-500 to Loxone values expressed in Kelvins 2700-6500k)
function homekitToLoxoneColorTemperature(ct, obj) {

    var minCtLoxone = 2500;
    var maxCtLoxone = 20000;

    var minCtHomekit = 50;
    var maxCtHomekit = 400;

    var percent = 1 - ((ct - minCtHomekit) / (maxCtHomekit - minCtHomekit));
    var newValue = Math.round(minCtLoxone + ((maxCtLoxone - minCtLoxone) * percent));

    //obj.log('homekitToLoxoneColorTemperature - Homekit Value: ' + ct);
    //obj.log('homekitToLoxoneColorTemperature - Percent: ' + percent + '%');
    //obj.log('homekitToLoxoneColorTemperature - Loxone Value: ' + newValue);

    return newValue;
}

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
function rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return {
        h : h,
        s : s,
        l : l
    }
}

/**
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSV representation
 */
function rgbToHsv(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, v = max;

  var d = max - min;
  s = max == 0 ? 0 : d / max;

  if (max == min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  //return [ h, s, v ];

  return {
        h : h,
        s : s,
        v : v
    }

}

// From http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
// Start with a temperature, in Kelvin, somewhere between 1000 and 40000.  (Other values may work,
//  but I can't make any promises about the quality of the algorithm's estimates above 40000 K.)
function colorTemperatureToRGB(kelvin){
    var temp = kelvin / 100;
    var red, green, blue;

    if( temp <= 66 ){ 

        red = 255; 
        
        green = temp;
        green = 99.4708025861 * Math.log(green) - 161.1195681661;

        
        if( temp <= 19){

            blue = 0;

        } else {

            blue = temp-10;
            blue = 138.5177312231 * Math.log(blue) - 305.0447927307;

        }

    } else {

        red = temp - 60;
        red = 329.698727446 * Math.pow(red, -0.1332047592);
        
        green = temp - 60;
        green = 288.1221695283 * Math.pow(green, -0.0755148492 );

        blue = 255;

    }


    return {
        r : parseInt(clamp(red,   0, 255)),
        g : parseInt(clamp(green, 0, 255)),
        b : parseInt(clamp(blue,  0, 255))
    }
}

function clamp( x, min, max ) {
    if(x<min){ return min; }
    if(x>max){ return max; }
    return x;
}