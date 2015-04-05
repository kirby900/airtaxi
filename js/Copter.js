  function Copter(name, lat, lng, maxPassengers, maxSpeed){
    this.name = name;

    this.maxPassengers = maxPassengers || 1;
    this.maxSpeed = maxSpeed || 200;

    this.passengers = [];
    this.pickups = [];

    // Current position
    this.current = { "lat": lat, "lng": lng };

    // Current destination
    this.target = null;

    this.speed = 0;
    this.heading = "N";
    this.dx = 0;
    this.dy = 0;
  }

  Copter.prototype.addPickup = function(rqst){
    console.log( 'Added pickup to ' + this.name );
    this.pickups.push(rqst); 
  };

  Copter.prototype.dropPassengers = function(){
    this.passengers.forEach(function(p){
      //p.marker.setPosition({"lat": p.dropoffLat, "lng": p.dropoffLng });
      //p.marker.setAnimation(null);
    });
    this.passengers.length = 0; 
  };

  Copter.prototype.getPassengerCount = function(){ return this.passengers.length; };

  Copter.prototype.getAssignedCount = function(){ return this.pickups.length + this.passengers.length; };

  Copter.prototype.isFull = function(){ 
    return this.passengers.length + this.pickups.length >= this.maxPassengers; 
  };
  
  Copter.prototype.isAvailable = function(){ 
    return !this.isFull(); 
  };

  Copter.prototype.setLocation = function(lat,lng){
    this.current.lat = lat;
    this.current.lng = lng;
  };

  /*
  ** Based on current position, check what can be done. It's possible to do
  ** zero, one or more of the following things:
  **   1. Pick up a passenger
  **   2. Drop off a passenger
  **   3. Revise target location
  */
  Copter.prototype.evaluate = function(){
    // Check whether there's a pickup to be made
    this.processDropoffs();
    this.processPickups();
    this.adjustTarget();
  };

/*
** Based on current location, check whether copter can make a pickup.
*/
Copter.prototype.processPickups = function(){
  for ( var i = 0; i < this.pickups.length; ){
    var pu = this.pickups[i];
    var dist = distanceBetweenGeoPoints( this.current.lat, this.current.lng, pu.pickupLat, pu.pickupLng );
    if ( dist <= 0.1 ) {
      console.log( this.name + ' is picking up ' + pu.name );

      pu.setInTransit();

      this.pickups.splice( i, 1 );  // Remove from pickup list
      this.passengers.push( pu );   // Add to onboard list
      continue;
    }
    i++; 
  }
};

/*
** Based on current location, check whether copter can dropoff anyone.
*/
Copter.prototype.processDropoffs = function(){
  for ( var i = 0; i < this.passengers.length; ){
    var p = this.passengers[i];
    var dist = distanceBetweenGeoPoints( this.current.lat, this.current.lng, p.dropoffLat, p.dropoffLng );
    if ( dist <= 0.1 ) {
      console.log( this.name + ' is dropping off ' + p.name );
      p.setDelivered();
      this.passengers.splice( i, 1 );  // Remove from passenger list
      continue;
    }
    i++; 
  }
};

/*
** 
*/
Copter.prototype.adjustTarget = function(){
  var points = [];

  this.pickups.forEach(function(p){
    points.push({ lat: p.pickupLat, lng: p.pickupLng });
  });

  // If no pickups, look at dropoffs
  if ( points.length === 0 ){
    this.passengers.forEach(function(p){
      points.push({ lat: p.dropoffLat, lng: p.dropoffLng });
    });
  }

  if ( points.length == 0 ){
    this.setTarget( null, null );
    return;
  }

  var self = this;
  points.sort(function(a,b){
    var
      distA = distanceBetweenGeoPoints( a.lat, a.lng, self.current.lat, self.current.lng ),
      distB = distanceBetweenGeoPoints( b.lat, b.lng, self.current.lat, self.current.lng );
    return distA - distB;
  });

  this.setTarget( points[0].lat, points[0].lng );
};

/*
**
*/
Copter.prototype.setTarget = function(lat, lng){
  if ( lat === null ) {
    this.target = null;
  } else {
    this.target = { "lat": lat, "lng": lng };
  }
};
