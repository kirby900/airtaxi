/*
** Computes distance in statute miles between two points,
** where points are specified with lat and lng coordinates.
*/
function distanceBetweenGeoPoints(lat1, lng1, lat2, lng2){
  var
    latMiles = calcLatMiles(lat1, lat2),
    lngMiles = calcLngMiles(lng1, lng2);

    return Math.sqrt( latMiles * latMiles + lngMiles * lngMiles );
}


/*
** Computes compass heading to travel from source to destination,
** where points are specified with lat and lng coordinates.
**
** Returns either N, S, E, W, NW, NE, SW, or SE.
*/
function computeHeading(sourceLat, sourceLng, destLat, destLng){
  var
    latMiles = calcLatMiles(sourceLat, destLat),
    lngMiles = calcLngMiles(sourceLng, destLng),
    latDirection = latMiles < 0 ? "S" : "N",
    lngDirection = lngMiles < 0 ? "W" : "E";

    if ( Math.abs(latMiles) > 2.0 * Math.abs(lngMiles) ) return latDirection;
    if ( Math.abs(lngMiles) > 2.0 * Math.abs(latMiles) ) return lngDirection;
    return latDirection + lngDirection;
}


function calcLatMiles(beginLat, endLat){
  var
    milesPerLatDegree = 68.68,
    deltaLat = endLat - beginLat;

  return deltaLat * milesPerLatDegree;
}

function calcLngMiles(beginLng, endLng){
  var
    milesPerLngDegree = 57.68,
    deltaLng = endLng - beginLng;

  return deltaLng * milesPerLngDegree;
}

function convertLatMilesToDegrees(miles){
    return miles / 68.68;
}

function convertLngMilesToDegrees(miles){
    return miles / 57.68;
}
